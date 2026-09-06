import type { Provider, WireRequest } from '../types';
export class ProviderError extends Error {
  constructor(
    public status: number | string,
    message: string,
    public details: unknown = null,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}
export function validateBaseUrl(base: string) {
  const url = new URL(base);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (
    (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error('Use HTTPS, or HTTP on localhost. Do not put API keys in URLs.');
  return url.toString().replace(/\/$/, '');
}
export async function transport(
  provider: Provider,
  wire: WireRequest,
  signal: AbortSignal,
): Promise<Response> {
  let response: Response;
  try {
    if (provider.transport === 'relay') {
      response = await fetch('/api/relay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-ModelDock': '1' },
        body: JSON.stringify({ kind: provider.kind, ...wire }),
        signal,
        credentials: 'same-origin',
        cache: 'no-store',
        redirect: 'error',
      });
    } else {
      response = await fetch(wire.url, {
        method: wire.method,
        headers: wire.headers,
        ...(wire.body ? { body: JSON.stringify(wire.body) } : {}),
        signal,
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'error',
      });
    }
  } catch (error) {
    if (signal.aborted) throw signal.reason;
    throw new ProviderError(
      'Network Error',
      '网络连接或 CORS 失败 / Network or CORS error. Check the endpoint and network. Official cloud providers can opt into the relay; local models need the allowed browser origin.',
      String(error),
    );
  }
  if (!response.ok) {
    const raw = await response.text();
    let detail: unknown = raw;
    try {
      detail = JSON.parse(raw);
    } catch {}
    const hint: Record<number, string> = {
      400: '请求参数不受支持 / Unsupported request parameters',
      401: 'API Key 无效或已过期 / Invalid or expired API key',
      403: '没有访问权限 / Permission denied',
      404: '接口或模型不存在 / Endpoint or model not found',
      429: '速率或额度限制 / Rate or quota limit',
      500: '服务商内部错误 / Provider server error',
      502: '上游服务异常 / Upstream unavailable',
      503: '服务暂不可用 / Service unavailable',
    };
    throw new ProviderError(
      response.status,
      `${response.status} ${response.statusText}\n${hint[response.status] ?? 'API request failed'}\n${raw.slice(0, 2500)}`,
      detail,
    );
  }
  return response;
}
/** Handles UTF-8 split chunks, CRLF, comments, multiline data and trailing events. */
export async function* readSSE(
  body: ReadableStream<Uint8Array>,
  onDone?: () => void,
): AsyncGenerator<unknown> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let data: string[] = [];
  let eventSize = 0;
  const accept = (line: string) => {
    if (line.startsWith('data:')) {
      eventSize += line.length;
      if (eventSize > 2_000_000)
        throw new ProviderError('Stream Error', 'An SSE event exceeded the 2 MB safety limit.');
      data.push(line.slice(5).replace(/^ /, ''));
    }
  };
  try {
    while (true) {
      const chunk = await reader.read();
      buffer += chunk.done ? decoder.decode() : decoder.decode(chunk.value, { stream: true });
      let index: number;
      while ((index = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, index).replace(/\r$/, '');
        buffer = buffer.slice(index + 1);
        if (line === '') {
          const joined = data.join('\n');
          data = [];
          eventSize = 0;
          if (joined === '[DONE]') {
            onDone?.();
            return;
          }
          if (joined) yield JSON.parse(joined);
        } else accept(line);
      }
      if (chunk.done) {
        if (buffer) accept(buffer.replace(/\r$/, ''));
        const joined = data.join('\n');
        if (joined === '[DONE]') onDone?.();
        if (joined && joined !== '[DONE]') yield JSON.parse(joined);
        break;
      }
      if (buffer.length > 2_000_000)
        throw new ProviderError('Stream Error', 'An SSE event exceeded the 2 MB safety limit.');
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
