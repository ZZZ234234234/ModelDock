import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { createServer } from 'vite';
const vite = await createServer({
  configFile: false,
  appType: 'custom',
  server: { middlewareMode: true },
  resolve: { alias: { '@': process.cwd() } },
});
after(() => vite.close());
const { createAdapter } = await vite.ssrLoadModule('/src/providers/adapter.ts');
const { readSSE, validateBaseUrl } = await vite.ssrLoadModule('/src/providers/transport.ts');
const { estimateCost, redact, toCsv, summarize } = await vite.ssrLoadModule('/src/lib/utils.ts');
const { runDemo, DEMO_MODELS, DEMO_PROVIDERS } = await vite.ssrLoadModule('/src/providers/demo.ts');
const { DEFAULT_PARAMETERS } = await vite.ssrLoadModule('/src/types/index.ts');
const { POST } = await vite.ssrLoadModule('/app/api/relay/route.ts');
const model = {
  id: 'test',
  providerId: 'p',
  name: 'test-model',
  label: 'Test',
  enabled: true,
  inputPrice: 2,
  outputPrice: 4,
  contextWindow: null,
  tokenField: 'max_completion_tokens',
  sampling: true,
};
const provider = {
  id: 'p',
  name: 'Test',
  kind: 'openai',
  format: 'openai',
  baseUrl: 'https://api.openai.com/v1',
  enabled: true,
  transport: 'direct',
  status: 'unconfigured',
};
const messages = [
  { id: 'u1', role: 'user', content: 'first' },
  { id: 'a1', role: 'assistant', content: 'answer' },
  { id: 'u2', role: 'user', content: 'follow up' },
];
const encoder = new TextEncoder();
function stream(s, chunkSize = 7) {
  const bytes = encoder.encode(s);
  return new ReadableStream({
    start(c) {
      for (let i = 0; i < bytes.length; i += chunkSize) c.enqueue(bytes.slice(i, i + chunkSize));
      c.close();
    },
  });
}
test('SSE preserves split UTF-8, CRLF, comments and final events', async () => {
  const events = [];
  for await (const e of readSSE(
    stream(
      ': ping\r\ndata: {"text":"你好"}\r\n\r\ndata: {"text":\n' +
        'data: "world"}\n\ndata: {"tail":true}',
      1,
    ),
  ))
    events.push(e);
  assert.deepEqual(events, [{ text: '你好' }, { text: 'world' }, { tail: true }]);
});
test('SSE DONE ends a stream without treating it as JSON', async () => {
  const events = [];
  for await (const e of readSSE(stream('data: {"ok":true}\n\ndata: [DONE]\n\ndata: invalid\n\n')))
    events.push(e);
  assert.deepEqual(events, [{ ok: true }]);
});
test('OpenAI wire preserves conversation, max-completion field, usage and JSON mode', () => {
  const a = createAdapter(provider, 'test-secret');
  const r = a.buildRequest(model, messages, {
    ...DEFAULT_PARAMETERS,
    system: 'helpful',
    jsonMode: true,
  });
  assert.equal(r.url, 'https://api.openai.com/v1/chat/completions');
  assert.equal(r.headers.Authorization, 'Bearer test-secret');
  assert.equal(r.body.messages.length, 4);
  assert.equal(r.body.messages[3].content, 'follow up');
  assert.equal(r.body.max_completion_tokens, 2048);
  assert.equal(r.body.temperature, undefined);
  assert.deepEqual(r.body.stream_options, { include_usage: true });
  assert.deepEqual(r.body.response_format, { type: 'json_object' });
});
test('Anthropic uses native role layout, auth and cumulative usage', () => {
  const a = createAdapter(
    {
      ...provider,
      format: 'anthropic',
      kind: 'anthropic',
      baseUrl: 'https://api.anthropic.com/v1',
    },
    'test-secret',
  );
  const r = a.buildRequest(model, messages, { ...DEFAULT_PARAMETERS, system: 'system' });
  assert.equal(r.body.system, 'system');
  assert.equal(r.body.messages.length, 3);
  assert.equal(r.body.max_tokens, 2048);
  assert.equal(r.headers['x-api-key'], 'test-secret');
  const first = a.getUsage({
    type: 'message_start',
    message: { usage: { input_tokens: 20, output_tokens: 1, cache_read_input_tokens: 10 } },
  });
  const last = a.getUsage({ type: 'message_delta', usage: { output_tokens: 50 } }, first);
  assert.deepEqual(last, { input: 30, output: 50, total: 80 });
  assert.throws(
    () => a.buildRequest(model, messages, { ...DEFAULT_PARAMETERS, jsonMode: true }),
    /JSON/,
  );
});
test('Gemini uses model roles, header auth and includes reasoning tokens', () => {
  const a = createAdapter(
    {
      ...provider,
      kind: 'gemini',
      format: 'gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    },
    'test-secret',
  );
  const r = a.buildRequest(model, messages, { ...DEFAULT_PARAMETERS, jsonMode: true });
  assert.match(r.url, /:streamGenerateContent\?alt=sse$/);
  assert.equal(r.headers['x-goog-api-key'], 'test-secret');
  assert.equal(r.body.contents[1].role, 'model');
  assert.equal(r.body.generationConfig.responseMimeType, 'application/json');
  assert.deepEqual(
    a.getUsage({
      usageMetadata: {
        promptTokenCount: 10,
        candidatesTokenCount: 20,
        thoughtsTokenCount: 30,
        totalTokenCount: 60,
      },
    }),
    { input: 10, output: 50, total: 60 },
  );
});
test('unknown tokens and prices stay unknown, zero local price stays zero', () => {
  assert.equal(estimateCost(model, { input: 1000, output: 2000, total: 3000 }), 0.01);
  assert.equal(
    estimateCost({ ...model, inputPrice: null }, { input: 1000, output: 1, total: 1001 }),
    null,
  );
  assert.equal(estimateCost(model, { input: null, output: 1, total: null }), null);
  assert.equal(
    estimateCost(
      { ...model, inputPrice: 0, outputPrice: 0 },
      { input: 1000, output: 2000, total: 3000 },
    ),
    0,
  );
});
test('recursive redaction preserves numeric token usage and scrubs echoed keys', () => {
  const r = redact(
    {
      headers: { Authorization: 'Bearer test-secret', 'x-api-key': 'test-secret' },
      usage: { prompt_tokens: 12, completion_tokens: 8 },
      error: 'echo test-secret',
    },
    'test-secret',
  );
  assert.equal(r.headers.Authorization, '[REDACTED]');
  assert.equal(r.headers['x-api-key'], '[REDACTED]');
  assert.equal(r.usage.prompt_tokens, 12);
  assert.equal(r.error, 'echo [REDACTED]');
});
test('URL validation rejects credentials, query secrets and cleartext remote hosts', () => {
  for (const url of [
    'http://api.example.com/v1',
    'https://secret@example.com/v1',
    'https://example.com/v1?key=secret',
    'https://example.com/v1#key',
  ])
    assert.throws(() => validateBaseUrl(url));
  assert.equal(validateBaseUrl('http://localhost:11434/v1/'), 'http://localhost:11434/v1');
});
test('relay blocks cross-origin, custom hosts, localhost and unapproved paths', async () => {
  const request = (payload, origin = 'http://localhost') =>
    new Request('http://localhost/api/relay', {
      method: 'POST',
      headers: { origin, 'x-modeldock': '1', 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
  assert.equal(
    (
      await POST(
        request(
          { kind: 'openai', url: 'https://api.openai.com/v1/models', method: 'GET', headers: {} },
          'https://evil.example',
        ),
      )
    ).status,
    403,
  );
  for (const url of [
    'http://localhost:11434/v1/models',
    'https://evil.example/v1/models',
    'https://api.openai.com/v1/../../anything',
    'https://api.openai.com/v1/models?key=test',
  ])
    assert.equal(
      (await POST(request({ kind: 'openai', url, method: 'GET', headers: {} }))).status,
      403,
    );
});
test('CSV export neutralizes spreadsheet formulas and quotes cells', () => {
  const csv = toCsv([['=HYPERLINK("evil")', 'hello,world']]);
  assert.match(csv, /"'=HYPERLINK/);
  assert.match(csv, /"hello,world"/);
});
test('demo emits a full response and supports cancellation', async () => {
  const signal = new AbortController();
  signal.abort();
  await assert.rejects(() =>
    runDemo(DEMO_MODELS[0], messages, DEFAULT_PARAMETERS, signal.signal, () => {}, false),
  );
  const result = await runDemo(
    DEMO_MODELS[2],
    [{ id: 'u', role: 'user', content: 'Self-attention' }],
    { ...DEFAULT_PARAMETERS, jsonMode: true },
    new AbortController().signal,
    () => {},
    true,
  );
  assert.equal(JSON.parse(result.text).demo, true);
  assert.ok(result.usage.total > 0);
  assert.equal(DEMO_PROVIDERS[0].kind, 'demo');
});
test('OpenAI streaming transport normalizes text and final usage from protocol fixture', async (t) => {
  t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response(
        stream(
          'data: {"choices":[{"delta":{"content":"Hello "}}]}\n\ndata: {"choices":[{"delta":{"content":"world"}}]}\n\ndata: {"choices":[],"usage":{"prompt_tokens":5,"completion_tokens":2,"total_tokens":7}}\n\ndata: [DONE]\n\n',
          3,
        ),
        { headers: { 'content-type': 'text/event-stream' } },
      ),
  );
  const a = createAdapter(provider, 'fixture-key');
  let last = '';
  const r = await a.streamChat(
    model,
    messages,
    DEFAULT_PARAMETERS,
    new AbortController().signal,
    (s) => (last = s),
  );
  assert.equal(r.text, 'Hello world');
  assert.equal(last, 'Hello world');
  assert.deepEqual(r.usage, { input: 5, output: 2, total: 7 });
  assert.ok(r.ttft >= 0);
});
test('upstream 401 retains actual status and reason', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json(
      { error: { message: 'Invalid API key' } },
      { status: 401, statusText: 'Unauthorized' },
    ),
  );
  await assert.rejects(
    () => createAdapter(provider, 'fixture-key').listModels(new AbortController().signal),
    (e) => e.status === 401 && /Invalid API key/.test(e.message),
  );
});
test('summaries distinguish unknown cost and usage from zero', () => {
  const s = summarize([
    {
      status: 'success',
      cost: null,
      usage: { input: null, output: null, total: null },
      latency: 42,
    },
  ]);
  assert.equal(s.cost, null);
  assert.equal(s.tokens, null);
  assert.equal(s.unknownCost, 1);
  assert.equal(s.latency, 42);
});

test('an interrupted SSE response is an error even after partial text', async (t) => {
  t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response(stream('data: {"choices":[{"delta":{"content":"partial"}}]}\n\n'), {
        headers: { 'content-type': 'text/event-stream' },
      }),
  );
  let partial = '';
  await assert.rejects(
    () =>
      createAdapter(provider, 'fixture-key').streamChat(
        model,
        messages,
        DEFAULT_PARAMETERS,
        new AbortController().signal,
        (text) => {
          partial = text;
        },
      ),
    /completion marker/,
  );
  assert.equal(partial, 'partial');
});

test('native Anthropic streaming preserves deltas and final cumulative usage', async (t) => {
  const packets = [
    { type: 'message_start', message: { usage: { input_tokens: 12, output_tokens: 1 } } },
    { type: 'content_block_delta', delta: { text: '你好' } },
    { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 6 } },
    { type: 'message_stop' },
  ];
  t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response(stream(packets.map((p) => `data: ${JSON.stringify(p)}\n\n`).join(''), 1), {
        headers: { 'content-type': 'text/event-stream' },
      }),
  );
  const result = await createAdapter(
    {
      ...provider,
      kind: 'anthropic',
      format: 'anthropic',
      baseUrl: 'https://api.anthropic.com/v1',
    },
    'fixture-key',
  ).streamChat(model, messages, DEFAULT_PARAMETERS, new AbortController().signal, () => {});
  assert.equal(result.text, '你好');
  assert.deepEqual(result.usage, { input: 12, output: 6, total: 18 });
});

test('native Gemini streaming omits thought text but counts thought usage', async (t) => {
  const packets = [
    { candidates: [{ content: { parts: [{ text: 'private thought', thought: true }] } }] },
    {
      candidates: [{ content: { parts: [{ text: 'Answer' }] }, finishReason: 'STOP' }],
      usageMetadata: {
        promptTokenCount: 3,
        candidatesTokenCount: 2,
        thoughtsTokenCount: 4,
        totalTokenCount: 9,
      },
    },
  ];
  t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response(stream(packets.map((p) => `data: ${JSON.stringify(p)}\n\n`).join('')), {
        headers: { 'content-type': 'text/event-stream' },
      }),
  );
  const result = await createAdapter(
    {
      ...provider,
      kind: 'gemini',
      format: 'gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    },
    'fixture-key',
  ).streamChat(model, messages, DEFAULT_PARAMETERS, new AbortController().signal, () => {});
  assert.equal(result.text, 'Answer');
  assert.deepEqual(result.usage, { input: 3, output: 6, total: 9 });
});

test('vault ciphertext hides keys, rejects wrong passwords and restores after lock', async (t) => {
  const { storage } = await vite.ssrLoadModule('/src/lib/storage.ts');
  const vault = await vite.ssrLoadModule('/src/lib/vault.ts');
  const persisted = new Map();
  t.mock.method(storage, 'read', async (key) => structuredClone(persisted.get(key)));
  t.mock.method(storage, 'write', async (key, value) => {
    persisted.set(key, structuredClone(value));
  });
  t.mock.method(storage, 'remove', async (key) => {
    persisted.delete(key);
  });
  await vault.setSecret('p', 'fixture-secret-never-cleartext');
  assert.equal(persisted.size, 0);
  await vault.unlockVault('fixture-password-123');
  const envelope = persisted.get('vault');
  assert.equal(JSON.stringify(envelope).includes('fixture-secret'), false);
  assert.equal(envelope.iv.length, 12);
  vault.lockVault();
  assert.equal(vault.getSecret('p'), '');
  await assert.rejects(() => vault.unlockVault('wrong-password'));
  assert.equal(vault.vaultUnlocked(), false);
  await vault.unlockVault('fixture-password-123');
  assert.equal(vault.getSecret('p'), 'fixture-secret-never-cleartext');
  await Promise.all([vault.setSecret('a', 'one'), vault.setSecret('b', 'two')]);
  vault.lockVault();
  await vault.unlockVault('fixture-password-123');
  assert.equal(vault.getSecret('a'), 'one');
  assert.equal(vault.getSecret('b'), 'two');
  await vault.forgetVault();
  assert.equal(persisted.has('vault'), false);
});
