import type { Provider, Model, Message, Parameters, Usage, WireRequest, RunResult } from '../types';
import { EMPTY_USAGE } from '../types';
import { estimateCost } from '../lib/utils';
import { transport, readSSE, validateBaseUrl, ProviderError } from './transport';
interface Packet {
  type?: string;
  error?: unknown;
  choices?: {
    delta?: { content?: string };
    message?: { content?: string; refusal?: string };
    finish_reason?: string;
  }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
  message?: Packet;
  delta?: { text?: string; stop_reason?: string };
  content?: { type: string; text?: string }[];
  candidates?: {
    content?: { parts?: { text?: string; thought?: boolean }[] };
    finishReason?: string;
  }[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
    thoughtsTokenCount?: number;
  };
  data?: { id: string }[];
  models?: { name: string }[];
}
export interface AIProvider {
  testConnection(signal: AbortSignal): Promise<{ models: string[]; latency: number }>;
  listModels(signal: AbortSignal): Promise<string[]>;
  chat(
    model: Model,
    messages: Message[],
    params: Parameters,
    signal: AbortSignal,
  ): Promise<RunResult>;
  streamChat(
    model: Model,
    messages: Message[],
    params: Parameters,
    signal: AbortSignal,
    onDelta: (text: string) => void,
  ): Promise<RunResult>;
  getUsage(packet: unknown, current?: Usage): Usage;
  estimateCost(model: Model, usage: Usage): number | null;
  buildRequest(model: Model, messages: Message[], params: Parameters): WireRequest;
}
export class UnifiedProvider implements AIProvider {
  constructor(
    protected provider: Provider,
    protected key: string,
  ) {}
  headers() {
    const format = this.provider.format;
    return {
      'Content-Type': 'application/json',
      ...(this.key
        ? format === 'anthropic'
          ? {
              'x-api-key': this.key,
              'anthropic-version': '2023-06-01',
              'anthropic-dangerous-direct-browser-access': 'true',
            }
          : format === 'gemini'
            ? { 'x-goog-api-key': this.key }
            : { Authorization: `Bearer ${this.key}` }
        : {}),
    } as Record<string, string>;
  }
  buildRequest(model: Model, messages: Message[], p: Parameters): WireRequest {
    const base = validateBaseUrl(this.provider.baseUrl);
    const system = [p.system, ...messages.filter((m) => m.role === 'system').map((m) => m.content)]
      .filter(Boolean)
      .join('\n\n');
    const conversation = messages
      .filter((m) => m.role !== 'system')
      .map(({ role, content }) => ({ role, content }));
    let url: string;
    let body: unknown;
    if (this.provider.format === 'anthropic') {
      if (p.jsonMode)
        throw new ProviderError(
          'Unsupported',
          '此适配器暂不支持 Anthropic JSON Mode / Anthropic JSON mode is not supported by this adapter.',
        );
      url = `${base}/messages`;
      body = {
        model: model.name,
        messages: conversation,
        max_tokens: p.maxTokens,
        stream: p.stream,
        ...(system ? { system } : {}),
        ...(p.customSampling && model.sampling ? { temperature: p.temperature } : {}),
      };
    } else if (this.provider.format === 'gemini') {
      url = `${base}/models/${encodeURIComponent(model.name.replace(/^models\//, ''))}:${p.stream ? 'streamGenerateContent?alt=sse' : 'generateContent'}`;
      body = {
        contents: conversation.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        generationConfig: {
          maxOutputTokens: p.maxTokens,
          ...(p.customSampling && model.sampling
            ? { temperature: p.temperature, topP: p.topP }
            : {}),
          ...(p.jsonMode ? { responseMimeType: 'application/json' } : {}),
        },
      };
    } else {
      url = `${base}/chat/completions`;
      body = {
        model: model.name,
        messages: [...(system ? [{ role: 'system', content: system }] : []), ...conversation],
        stream: p.stream,
        [model.tokenField]: p.maxTokens,
        ...(p.stream ? { stream_options: { include_usage: true } } : {}),
        ...(p.customSampling && model.sampling
          ? {
              temperature: p.temperature,
              top_p: p.topP,
              ...(p.frequencyPenalty ? { frequency_penalty: p.frequencyPenalty } : {}),
              ...(p.presencePenalty ? { presence_penalty: p.presencePenalty } : {}),
            }
          : {}),
        ...(p.jsonMode ? { response_format: { type: 'json_object' } } : {}),
      };
    }
    return { url, method: 'POST', headers: this.headers(), body };
  }
  async listModels(signal: AbortSignal) {
    const response = await transport(
      this.provider,
      {
        url: `${validateBaseUrl(this.provider.baseUrl)}/models`,
        method: 'GET',
        headers: this.headers(),
      },
      signal,
    );
    const json: Packet = await response.json();
    return (
      json.data?.map((x) => x.id) ??
      json.models?.map((x) => x.name.replace(/^models\//, '')) ??
      []
    ).filter(Boolean);
  }
  async testConnection(signal: AbortSignal) {
    const started = performance.now();
    const models = await this.listModels(signal);
    return { models, latency: performance.now() - started };
  }
  getUsage(value: unknown, current: Usage = { ...EMPTY_USAGE }): Usage {
    const p = value as Packet;
    const usage = p.usage ?? p.message?.usage;
    let input = current.input,
      output = current.output,
      total = current.total;
    if (usage) {
      input = usage.prompt_tokens ?? usage.input_tokens ?? input;
      output = usage.completion_tokens ?? usage.output_tokens ?? output;
      if (this.provider.format === 'anthropic' && usage.input_tokens !== undefined)
        input =
          usage.input_tokens +
          (usage.cache_creation_input_tokens ?? 0) +
          (usage.cache_read_input_tokens ?? 0);
      total = usage.total_tokens ?? (input !== null && output !== null ? input + output : null);
    }
    if (p.usageMetadata) {
      input = p.usageMetadata.promptTokenCount ?? input;
      output =
        p.usageMetadata.candidatesTokenCount !== undefined
          ? p.usageMetadata.candidatesTokenCount + (p.usageMetadata.thoughtsTokenCount ?? 0)
          : output;
      total =
        p.usageMetadata.totalTokenCount ??
        (input !== null && output !== null ? input + output : null);
    }
    return { input, output, total };
  }
  estimateCost = estimateCost;
  private readText(p: Packet) {
    if (p.error || p.type === 'error')
      throw new ProviderError('Stream Error', JSON.stringify(p.error ?? p));
    return (
      p.choices?.[0]?.delta?.content ??
      p.choices?.[0]?.message?.content ??
      p.choices?.[0]?.message?.refusal ??
      p.delta?.text ??
      p.content
        ?.filter((x) => x.type === 'text')
        .map((x) => x.text ?? '')
        .join('') ??
      p.candidates?.[0]?.content?.parts
        ?.filter((x) => !x.thought)
        .map((x) => x.text ?? '')
        .join('') ??
      ''
    );
  }
  async chat(model: Model, messages: Message[], params: Parameters, signal: AbortSignal) {
    return this.streamChat(model, messages, { ...params, stream: false }, signal, () => {});
  }
  async streamChat(
    model: Model,
    messages: Message[],
    params: Parameters,
    signal: AbortSignal,
    onDelta: (text: string) => void,
  ): Promise<RunResult> {
    const started = performance.now();
    const response = await transport(
      this.provider,
      this.buildRequest(model, messages, params),
      signal,
    );
    const headers = Object.fromEntries(
      [...response.headers].filter(([k]) => !/cookie|authorization|api-key/i.test(k)),
    );
    let text = '',
      usage = { ...EMPTY_USAGE },
      ttft: number | null = null;
    const raw: unknown[] = [];
    let completed = false;
    const append = (value: unknown) => {
      const p = value as Packet;
      if (
        p.type === 'message_stop' ||
        p.delta?.stop_reason ||
        p.choices?.some((choice) => choice.finish_reason) ||
        p.candidates?.some((candidate) => candidate.finishReason)
      )
        completed = true;
      const delta = this.readText(p);
      if (delta) {
        if (ttft === null) ttft = performance.now() - started;
        text += delta;
        if (text.length > 2_000_000)
          throw new ProviderError(
            'Response Too Large',
            'Response exceeded 2 MB. Lower Max Tokens.',
          );
        onDelta(text);
      }
      usage = this.getUsage(p, usage);
      if (raw.length < 2000) raw.push(p);
    };
    if (params.stream && response.headers.get('content-type')?.includes('text/event-stream')) {
      if (!response.body) throw new ProviderError('Empty Stream', 'Provider returned no stream');
      for await (const value of readSSE(response.body, () => {
        completed = true;
      })) {
        signal.throwIfAborted();
        append(value);
      }
      if (!completed)
        throw new ProviderError(
          'Incomplete Stream',
          '响应流在完成标记前中断，请重试。 / The response stream ended before its completion marker. Please retry.',
          { events: raw },
        );
    } else append(await response.json());
    if (!text)
      throw new ProviderError(
        'Empty Response',
        '模型没有返回可显示的文本；检查安全过滤、Max Tokens 或模型类型。 / No text returned: check safety filters, output budget or model type.',
        raw,
      );
    return {
      text,
      usage,
      raw: params.stream ? { events: raw, eventsTruncated: raw.length >= 2000 } : raw[0],
      headers,
      ttft,
    };
  }
}
export class OpenAIProvider extends UnifiedProvider {}
export class AnthropicProvider extends UnifiedProvider {}
export class GeminiProvider extends UnifiedProvider {}
export class DeepSeekProvider extends UnifiedProvider {}
export class OpenRouterProvider extends UnifiedProvider {}
export class OllamaProvider extends UnifiedProvider {}
export class CustomProvider extends UnifiedProvider {}
export function createAdapter(p: Provider, key: string): AIProvider {
  const Adapter =
    p.format === 'anthropic'
      ? AnthropicProvider
      : p.format === 'gemini'
        ? GeminiProvider
        : p.kind === 'ollama' || p.kind === 'lmstudio'
          ? OllamaProvider
          : p.kind === 'deepseek'
            ? DeepSeekProvider
            : p.kind === 'openrouter'
              ? OpenRouterProvider
              : p.kind === 'custom'
                ? CustomProvider
                : OpenAIProvider;
  return new Adapter(p, key);
}
