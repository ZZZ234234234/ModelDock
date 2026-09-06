import { CATALOG } from '../../../src/providers/catalog';
import { z } from 'zod';
const input = z.object({
  kind: z.string(),
  url: z.string().max(2000),
  method: z.enum(['GET', 'POST']),
  headers: z.record(z.string().max(10000)),
  body: z.unknown().optional(),
});
const fail = (message: string, status: number) =>
  Response.json({ error: { message } }, { status, headers: { 'Cache-Control': 'no-store' } });
/** Stateless, opt-in relay. Pinned official hosts only; never follows redirects. */
export async function POST(request: Request) {
  const own = new URL(request.url);
  const origin = request.headers.get('origin');
  if (!origin || origin !== own.origin || request.headers.get('x-modeldock') !== '1')
    return fail('Same-origin ModelDock requests only', 403);
  if (Number(request.headers.get('content-length') ?? 0) > 2_000_000)
    return fail('Request too large', 413);
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return fail('Invalid request', 400);
  }
  if (raw.length > 2_000_000) return fail('Request too large', 413);
  let parsed;
  try {
    parsed = input.parse(JSON.parse(raw));
  } catch {
    return fail('Invalid relay payload', 400);
  }
  const preset = CATALOG.find(
    (p) => p.kind === parsed.kind && !['custom', 'ollama', 'lmstudio'].includes(p.kind),
  );
  if (!preset)
    return fail(
      'Relay only supports official cloud presets. Use direct transport for custom and local endpoints.',
      403,
    );
  let url: URL;
  try {
    url = new URL(parsed.url);
  } catch {
    return fail('Invalid URL', 400);
  }
  const base = new URL(preset.baseUrl);
  if (url.origin !== base.origin || url.username || url.password || url.hash)
    return fail('Endpoint is not an allowed official host', 403);
  const path = url.pathname.slice(base.pathname.length);
  if (!url.pathname.startsWith(base.pathname + '/')) return fail('Invalid API path', 403);
  const allowed =
    parsed.method === 'GET'
      ? path === '/models' && !url.search
      : preset.format === 'gemini'
        ? /^\/models\/[a-zA-Z0-9._-]+:(streamGenerateContent|generateContent)$/.test(path) &&
          (url.search === '' || url.search === '?alt=sse')
        : path === (preset.format === 'anthropic' ? '/messages' : '/chat/completions') &&
          !url.search;
  if (!allowed) return fail('Unsupported API operation', 403);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  for (const name of ['authorization', 'x-api-key', 'x-goog-api-key', 'anthropic-version']) {
    const entry = Object.entries(parsed.headers).find(([k]) => k.toLowerCase() === name);
    if (entry) headers[name] = entry[1];
  }
  try {
    const result = await fetch(url, {
      method: parsed.method,
      headers,
      body: parsed.method === 'POST' ? JSON.stringify(parsed.body) : undefined,
      redirect: 'manual',
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(300000)]),
      cache: 'no-store',
    });
    if (result.status >= 300 && result.status < 400)
      return fail('Upstream redirects are blocked', 502);
    const responseHeaders = new Headers({
      'Content-Type': result.headers.get('content-type') ?? 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    for (const name of [
      'x-request-id',
      'request-id',
      'retry-after',
      'x-ratelimit-remaining-requests',
      'x-ratelimit-remaining-tokens',
    ]) {
      const v = result.headers.get(name);
      if (v) responseHeaders.set(name, v);
    }
    return new Response(result.body, { status: result.status, headers: responseHeaders });
  } catch {
    return fail('Upstream network error or timeout. Check provider availability.', 502);
  }
}
