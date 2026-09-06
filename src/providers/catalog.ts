import { uid } from '../lib/utils';
import type { ProviderKind, Format, Provider, Model } from '../types';
export interface Preset {
  kind: ProviderKind;
  name: string;
  baseUrl: string;
  format: Format;
  symbol: string;
  color: string;
  example: string;
}
export const CATALOG: Preset[] = [
  {
    kind: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    format: 'openai',
    symbol: '◎',
    color: '#b8d9c3',
    example: 'gpt-4.1-mini',
  },
  {
    kind: 'anthropic',
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    format: 'anthropic',
    symbol: 'A',
    color: '#d5a17d',
    example: 'claude-sonnet-4-5',
  },
  {
    kind: 'gemini',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    format: 'gemini',
    symbol: '✧',
    color: '#8daff0',
    example: 'gemini-2.5-flash',
  },
  {
    kind: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    format: 'openai',
    symbol: 'ds',
    color: '#8da9ee',
    example: 'deepseek-chat',
  },
  {
    kind: 'qwen',
    name: 'Qwen',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    format: 'openai',
    symbol: 'Q',
    color: '#b7a7dd',
    example: 'qwen-plus',
  },
  {
    kind: 'glm',
    name: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    format: 'openai',
    symbol: 'Z',
    color: '#8fa6db',
    example: 'glm-4.5',
  },
  {
    kind: 'kimi',
    name: 'Moonshot Kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    format: 'openai',
    symbol: 'K',
    color: '#acbfd1',
    example: 'moonshot-v1-8k',
  },
  {
    kind: 'grok',
    name: 'xAI Grok',
    baseUrl: 'https://api.x.ai/v1',
    format: 'openai',
    symbol: '𝕏',
    color: '#ddd',
    example: 'grok-3-mini',
  },
  {
    kind: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    format: 'openai',
    symbol: '↗',
    color: '#bccad4',
    example: 'openai/gpt-4.1-mini',
  },
  {
    kind: 'ollama',
    name: 'Ollama',
    baseUrl: 'http://localhost:11434/v1',
    format: 'openai',
    symbol: '◉',
    color: '#c7d0c6',
    example: 'qwen3:8b',
  },
  {
    kind: 'lmstudio',
    name: 'LM Studio',
    baseUrl: 'http://localhost:1234/v1',
    format: 'openai',
    symbol: 'LM',
    color: '#b6b8d7',
    example: '',
  },
  {
    kind: 'custom',
    name: 'Custom Provider',
    baseUrl: 'https://api.example.com/v1',
    format: 'openai',
    symbol: '<>',
    color: '#afbdc5',
    example: '',
  },
];
export function preset(kind: ProviderKind) {
  return CATALOG.find((p) => p.kind === kind) ?? CATALOG[11];
}
export const isLocal = (p: Provider) => p.kind === 'ollama' || p.kind === 'lmstudio';
export function newProvider(kind: ProviderKind): Provider {
  const p = preset(kind);
  return {
    id: uid(),
    name: p.name,
    kind,
    format: p.format,
    baseUrl: p.baseUrl,
    enabled: true,
    transport: 'direct',
    status: 'unconfigured',
  };
}
export function newModel(provider: Provider, name: string): Model {
  return {
    id: uid(),
    providerId: provider.id,
    name,
    label: name,
    enabled: true,
    contextWindow: null,
    inputPrice: isLocal(provider) ? 0 : null,
    outputPrice: isLocal(provider) ? 0 : null,
    tokenField: provider.kind === 'openai' ? 'max_completion_tokens' : 'max_tokens',
    sampling: !/^o[134]|^gpt-5/.test(name),
  };
}
