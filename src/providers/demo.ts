import type {
  Provider,
  Model,
  AppData,
  RequestRecord,
  RunResult,
  Parameters,
  Message,
} from '../types';
import { DEFAULT_PARAMETERS } from '../types';
export const DEMO_PROVIDERS: Provider[] = ['OpenAI', 'Anthropic', 'Google Gemini', 'DeepSeek'].map(
  (name, i) => ({
    id: `demo-p-${i}`,
    name,
    kind: 'demo',
    format: 'openai',
    baseUrl: 'demo://local',
    enabled: true,
    transport: 'direct',
    status: 'connected',
  }),
);
export const DEMO_MODELS: Model[] = ['Mock GPT', 'Mock Claude', 'Mock Gemini', 'Mock DeepSeek'].map(
  (name, i) => ({
    id: `demo-m-${i}`,
    providerId: `demo-p-${i}`,
    name,
    label: name,
    enabled: true,
    contextWindow: 128000,
    inputPrice: [2, 3, 0.3, 0.2][i],
    outputPrice: [8, 15, 2.5, 0.8][i],
    tokenField: 'max_tokens',
    sampling: true,
  }),
);
export function demoSeed(now = Date.now()): AppData {
  const records: RequestRecord[] = [];
  const prompts = [
    '解释一下 Transformer 中的 Self-Attention',
    'Review this TypeScript function',
    '生成一个 REST API 设计方案',
    '比较 RAG 与微调的适用场景',
    'Write a binary search function',
    '为开源项目写一段介绍',
  ];
  for (let day = 6; day >= 0; day--) {
    for (let i = 0; i < 18 + (((6 - day) * 7) % 21); i++) {
      const model = DEMO_MODELS[i % 4],
        provider = DEMO_PROVIDERS[i % 4];
      const input = 280 + ((i * 197) % 1650),
        output = 180 + ((i * 133) % 2200);
      records.push({
        id: `demo-seed-${day}-${i}`,
        time: now - day * 86400000 - (i + 1) * 600000,
        source: i % 3 === 0 ? 'compare' : 'chat',
        providerId: provider.id,
        providerName: provider.name,
        modelId: model.id,
        modelName: model.name,
        messages: [{ id: `dm-${day}-${i}`, role: 'user', content: prompts[i % 6] }],
        response:
          '这是用于展示布局的模拟历史记录。进入对话页可以体验完整的演示流式输出。\n\nThis is simulated history, not a real model response.',
        status: i % 19 === 18 ? 'error' : 'success',
        latency: 680 + ((i * 173) % 2200),
        ttft: 150 + i * 12,
        usage: { input, output, total: input + output },
        cost: (input * (model.inputPrice ?? 0) + output * (model.outputPrice ?? 0)) / 1e6,
        demo: true,
        request: { demo: true, prompt: prompts[i % 6] },
        raw: { demo: true },
        headers: { 'x-modeldock-mode': 'demo' },
        parameters: { ...DEFAULT_PARAMETERS },
        ...(i % 19 === 18 ? { error: 'SIMULATED 429 · Rate limit exceeded' } : {}),
      });
    }
  }
  return {
    schemaVersion: 1,
    providers: [],
    models: [],
    chats: [],
    requests: records.sort((a, b) => b.time - a.time),
    settings: {
      language: 'zh',
      theme: 'dark',
      demo: true,
      defaultModel: '',
      defaultProvider: '',
      onboarded: false,
      saveHistory: true,
      timeout: 120,
    },
  };
}
function demoAnswer(model: Model, messages: Message[], p: Parameters, english: boolean) {
  const prompt = messages.filter((m) => m.role === 'user').at(-1)?.content ?? '';
  const i = Number(model.id.slice(-1));
  if (p.jsonMode)
    return JSON.stringify(
      {
        demo: true,
        model: model.name,
        prompt,
        summary: english
          ? 'This is a simulated response. Add an API key for live answers.'
          : '这是模拟回答。配置 API Key 后可以获得真实模型回答。',
      },
      null,
      2,
    );
  if (english)
    return `### ${['A clear starting point', 'Let’s break it down', 'The short version', 'A practical approach'][i]}\n\n> Demo response · ${model.name}. This is a locally generated example, not a real model evaluation.\n\nYour question: **${prompt.slice(0, 400)}**\n\n${i === 2 ? 'Self-attention lets each token look at relevant tokens in the same sequence, building a context-aware representation.' : 'Self-attention connects each token to the rest of the sequence. The model learns which relationships matter, rather than processing only neighboring words.'}\n\n1. **Query** — what information am I looking for?\n2. **Key** — what information can this token offer?\n3. **Value** — what information is passed forward?\n\n\`\`\`python\nscores = (query @ key.T) / math.sqrt(d_k)\nweights = torch.softmax(scores, dim=-1)\noutput = weights @ value\n\`\`\`\n\n${i === 1 ? 'The trade-off is quadratic attention memory for a sequence of length n. Positional information is supplied separately because attention alone does not encode token order.\n\n' : ''}Configure a provider to compare real answers, latency and token usage.`;
  return `### ${['让每个词，找到它需要的上下文', '先看关系，再理解含义', '核心：动态分配注意力', '从一个简单实现开始'][i]}\n\n> 演示回答 · ${model.name}。这是本地模拟文本，不代表该模型的真实能力。\n\n你的问题：**${prompt.slice(0, 400)}**\n\n${i === 2 ? 'Self-Attention 的核心很简单：让序列中的每个词，根据当前语境，决定应该关注哪些词。' : 'Self-Attention 让序列中的每个词都能直接参考其他词，形成带有上下文的信息表示。它学习的是词与词之间的关系，而不只是相邻位置的联系。'}\n\n1. **Query（查询）**：当前词想要寻找什么信息？\n2. **Key（键）**：其他词能提供什么线索？\n3. **Value（值）**：最终应该传递哪些内容？\n\n\`\`\`python\nscores = (query @ key.T) / math.sqrt(d_k)\nweights = torch.softmax(scores, dim=-1)\noutput = weights @ value\n\`\`\`\n\n${i === 1 ? '这里的缩放用于避免点积过大；softmax 把得分转成注意力权重。位置编码则补充单独的注意力计算所缺少的词序信息。\n\n全局注意力还存在序列长度增加后计算与显存开销较高的限制。\n\n' : ''}${i === 3 ? '实际实现时，可以把 Q、K、V 的线性映射分成多个头，让不同的头关注不同类型的关系。\n\n' : ''}接入真实 API 后，这里会显示模型生成的内容和服务商返回的 Token 用量。`;
}
export async function runDemo(
  model: Model,
  messages: Message[],
  p: Parameters,
  signal: AbortSignal,
  onDelta: (s: string) => void,
  english: boolean,
): Promise<RunResult> {
  const full = demoAnswer(model, messages, p, english);
  const started = performance.now();
  const step = [26, 19, 35, 23][Number(model.id.slice(-1))] ?? 26;
  let ttft: number | null = null;
  for (let i = 0; i < full.length; i += step) {
    await new Promise<void>((resolve, reject) => {
      const finish = () => {
        signal.removeEventListener('abort', cancel);
        resolve();
      };
      const t = setTimeout(finish, 25);
      const cancel = () => {
        clearTimeout(t);
        signal.removeEventListener('abort', cancel);
        reject(signal.reason);
      };
      if (signal.aborted) {
        clearTimeout(t);
        reject(signal.reason);
      } else signal.addEventListener('abort', cancel, { once: true });
    });
    if (ttft === null) ttft = performance.now() - started;
    if (p.stream) onDelta(full.slice(0, i + step));
  }
  onDelta(full);
  const input = Math.ceil(messages.map((m) => m.content).join('').length / 2.7),
    output = Math.ceil(full.length / 2.7);
  return {
    text: full,
    usage: { input, output, total: input + output },
    raw: {
      demo: true,
      model: model.name,
      text: full,
      token_source: 'simulated character estimate',
    },
    headers: { 'x-modeldock-mode': 'demo' },
    ttft,
  };
}
