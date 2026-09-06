import type { Model, Provider, Message, Parameters, RequestRecord } from '../types';
import { EMPTY_USAGE } from '../types';
import { createAdapter } from '../providers/adapter';
import { runDemo } from '../providers/demo';
import { getSecret } from './vault';
import { estimateCost, redact, uid } from './utils';
export async function executeRequest(args: {
  provider: Provider;
  model: Model;
  messages: Message[];
  parameters: Parameters;
  source: RequestRecord['source'];
  signal: AbortSignal;
  timeout: number;
  english: boolean;
  onDelta: (s: string) => void;
}): Promise<RequestRecord> {
  const { provider, model, messages, parameters, source, onDelta } = args;
  const key = getSecret(provider.id);
  const started = performance.now();
  const base: RequestRecord = {
    id: uid(),
    time: Date.now(),
    source,
    providerId: provider.id,
    providerName: provider.name,
    modelId: model.id,
    modelName: model.label,
    messages,
    response: '',
    status: 'error',
    latency: 0,
    ttft: null,
    usage: { ...EMPTY_USAGE },
    cost: null,
    demo: provider.kind === 'demo',
    request: null,
    raw: null,
    headers: {},
    parameters,
  };
  const timeout = AbortSignal.timeout(args.timeout * 1000);
  const signal = AbortSignal.any([args.signal, timeout]);
  let partial = '';
  try {
    if (provider.kind !== 'demo' && !provider.enabled) throw new Error('Provider disabled');
    const adapter = createAdapter(provider, key);
    if (provider.kind !== 'demo')
      base.request = redact(adapter.buildRequest(model, messages, parameters), key);
    else base.request = { demo: true, messages, parameters };
    const callback = (s: string) => {
      partial = s;
      onDelta(s);
    };
    const result =
      provider.kind === 'demo'
        ? await runDemo(model, messages, parameters, signal, callback, args.english)
        : await adapter.streamChat(model, messages, parameters, signal, callback);
    return {
      ...base,
      status: 'success',
      response: result.text,
      usage: result.usage,
      cost: estimateCost(model, result.usage),
      latency: performance.now() - started,
      ttft: result.ttft,
      raw: redact(result.raw, key),
      headers: redact(result.headers, key) as Record<string, string>,
    };
  } catch (e) {
    return {
      ...base,
      response: partial,
      latency: performance.now() - started,
      status: args.signal.aborted ? 'cancelled' : 'error',
      error: String(
        redact(
          timeout.aborted ? 'Timeout / 网络超时' : e instanceof Error ? e.message : String(e),
          key,
        ),
      ),
      raw: redact(e && typeof e === 'object' && 'details' in e ? e.details : null, key),
    };
  }
}
