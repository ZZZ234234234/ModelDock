export type Format = 'openai' | 'anthropic' | 'gemini';
export type ProviderKind =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'deepseek'
  | 'qwen'
  | 'glm'
  | 'kimi'
  | 'grok'
  | 'openrouter'
  | 'ollama'
  | 'lmstudio'
  | 'custom'
  | 'demo';
export interface Provider {
  id: string;
  name: string;
  kind: ProviderKind;
  format: Format;
  baseUrl: string;
  enabled: boolean;
  transport: 'direct' | 'relay';
  status: 'unconfigured' | 'connected' | 'error';
  lastChecked?: number;
  latency?: number;
  error?: string;
}
export interface Model {
  id: string;
  providerId: string;
  name: string;
  label: string;
  enabled: boolean;
  contextWindow: number | null;
  inputPrice: number | null;
  outputPrice: number | null;
  tokenField: 'max_tokens' | 'max_completion_tokens';
  sampling: boolean;
}
export interface Message {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  requestId?: string;
}
export interface Chat {
  id: string;
  title: string;
  modelId: string;
  messages: Message[];
  updatedAt: number;
  demo: boolean;
}
export interface Usage {
  input: number | null;
  output: number | null;
  total: number | null;
}
export interface Parameters {
  temperature: number;
  topP: number;
  maxTokens: number;
  system: string;
  frequencyPenalty: number;
  presencePenalty: number;
  stream: boolean;
  jsonMode: boolean;
  customSampling: boolean;
}
export interface RequestRecord {
  id: string;
  time: number;
  source: 'chat' | 'compare' | 'playground' | 'judge';
  providerId: string;
  providerName: string;
  modelId: string;
  modelName: string;
  messages: Message[];
  response: string;
  status: 'success' | 'error' | 'cancelled';
  latency: number;
  ttft: number | null;
  usage: Usage;
  cost: number | null;
  demo: boolean;
  error?: string;
  request: unknown;
  raw: unknown;
  headers: Record<string, string>;
  parameters: Parameters;
}
export interface Settings {
  language: 'zh' | 'en';
  theme: 'dark' | 'light';
  demo: boolean;
  defaultModel: string;
  defaultProvider: string;
  onboarded: boolean;
  saveHistory: boolean;
  timeout: number;
}
export interface AppData {
  schemaVersion: 1;
  providers: Provider[];
  models: Model[];
  chats: Chat[];
  requests: RequestRecord[];
  settings: Settings;
}
export interface WireRequest {
  url: string;
  method: 'POST' | 'GET';
  headers: Record<string, string>;
  body?: unknown;
}
export interface RunResult {
  text: string;
  usage: Usage;
  raw: unknown;
  headers: Record<string, string>;
  ttft: number | null;
}
export const DEFAULT_PARAMETERS: Parameters = {
  temperature: 0.7,
  topP: 1,
  maxTokens: 2048,
  system: '',
  frequencyPenalty: 0,
  presencePenalty: 0,
  stream: true,
  jsonMode: false,
  customSampling: false,
};
export const EMPTY_USAGE: Usage = { input: null, output: null, total: null };
