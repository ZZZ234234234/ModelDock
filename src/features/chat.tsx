'use client';
import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from '../components/link';
import Link from '../components/link';
import {
  Plus,
  ArrowUp,
  Square,
  RotateCcw,
  Pencil,
  Trash2,
  Layers,
  SlidersHorizontal,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { toast } from 'sonner';
import { useApp } from '../store/app-store';
import {
  Button,
  Picker,
  ProviderIcon,
  CopyButton,
  Confirm,
  EmptyState,
  Spinner,
} from '../components/ui';
import { Markdown } from '../components/markdown';
import { ParameterControls } from '../components/parameters';
import { executeRequest } from '../lib/run';
import { uid, duration, number, money } from '../lib/utils';
import { DEFAULT_PARAMETERS, type Parameters, type Message } from '../types';
export function ChatPage() {
  const { data, update, models, providers, t } = useApp();
  const query = useSearchParams();
  const requested = query.get('model');
  const [modelId, setModelId] = useState(
    requested && models.some((m) => m.id === requested)
      ? requested
      : models.some((m) => m.id === data.settings.defaultModel)
        ? data.settings.defaultModel
        : (models.find((m) => m.providerId === data.settings.defaultProvider)?.id ??
          models[0]?.id ??
          ''),
  );
  const [chatId, setChatId] = useState(query.get('chat') ?? '');
  const [input, setInput] = useState('');
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [params, setParams] = useState<Parameters>({ ...DEFAULT_PARAMETERS });
  const [busy, setBusy] = useState(false);
  const [partial, setPartial] = useState('');
  const [pending, setPending] = useState<Message[]>([]);
  const [showParams, setShowParams] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const chat = data.chats.find((c) => c.id === chatId && c.demo === data.settings.demo);
  const messages = busy ? pending : (chat?.messages ?? []);
  const model = models.find((m) => m.id === modelId) ?? models[0];
  const provider = providers.find((p) => p.id === model?.providerId);
  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'instant', block: 'end' });
  }, [partial, busy]);
  async function send(override?: Message[]) {
    if (busy || !model || !provider) return;
    if (!override && !input.trim()) return;
    const current = override ?? [
      ...(editIndex === null ? (chat?.messages ?? []) : (chat?.messages ?? []).slice(0, editIndex)),
      { id: uid(), role: 'user' as const, content: input.trim() },
    ];
    const id = chat?.id ?? uid();
    setChatId(id);
    setInput('');
    setEditIndex(null);
    setBusy(true);
    setPartial('');
    setPending(current);
    const controller = new AbortController();
    abort.current = controller;
    const record = await executeRequest({
      provider,
      model,
      messages: current,
      parameters: params,
      source: 'chat',
      signal: controller.signal,
      timeout: data.settings.timeout,
      english: data.settings.language === 'en',
      onDelta: setPartial,
    });
    const next = [
      ...current,
      { id: uid(), role: 'assistant' as const, content: record.response, requestId: record.id },
    ];
    update((d) => ({
      ...d,
      chats: [
        {
          id,
          title: current.find((m) => m.role === 'user')?.content.slice(0, 50) ?? 'New chat',
          modelId: model.id,
          messages: next,
          updatedAt: Date.now(),
          demo: d.settings.demo,
        },
        ...d.chats.filter((c) => c.id !== id),
      ].slice(0, 500),
      requests: d.settings.saveHistory ? [record, ...d.requests].slice(0, 5000) : d.requests,
    }));
    if (record.status === 'error') toast.error(record.error);
    setBusy(false);
    setPartial('');
  }
  const suggestions = [
    t('解释 Self-Attention 的工作原理', 'Explain how self-attention works'),
    t('写一个 TypeScript 防抖函数', 'Write a TypeScript debounce function'),
    t('比较 RAG 与模型微调', 'Compare RAG with fine-tuning'),
    t('帮我设计一个 REST API', 'Help me design a REST API'),
  ];
  return (
    <div className="page-with-aside">
      <main className="chat-layout" style={{ width: '100%' }}>
        <div className="chat-top">
          <div className="inline" style={{ maxWidth: 300 }}>
            {provider && <ProviderIcon provider={provider} />}
            <Picker
              value={model?.id ?? ''}
              disabled={busy}
              onChange={setModelId}
              options={models.map((m) => ({ value: m.id, label: m.label }))}
              placeholder={t('选择模型', 'Choose model')}
            />
          </div>
          <div className="actions">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowParams(true)}
              aria-label={t('模型参数', 'Model parameters')}
            >
              <SlidersHorizontal size={16} />
            </Button>
            <Confirm
              title={t('清空本次对话？', 'Clear this conversation?')}
              description={t(
                '对话消息会被删除，请求历史保留。',
                'Conversation messages will be removed. Request history remains.',
              )}
              onConfirm={() => {
                update((d) => ({ ...d, chats: d.chats.filter((c) => c.id !== chatId) }));
                setChatId('');
                setEditIndex(null);
                setInput('');
              }}
            >
              <Button
                variant="ghost"
                size="icon"
                disabled={busy || !chat}
                aria-label={t('清空对话', 'Clear conversation')}
              >
                <Trash2 size={15} />
              </Button>
            </Confirm>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setChatId('');
                setInput('');
                setEditIndex(null);
              }}
            >
              <Plus size={15} />
              {t('新对话', 'New chat')}
            </Button>
          </div>
        </div>
        {!model ? (
          <EmptyState
            title={t('先连接一个模型', 'Connect a model first')}
            description={t(
              '接入真实 API，或在顶部打开演示模式。',
              'Configure a provider or enable Demo mode.',
            )}
          >
            <Button asChild>
              <Link href="/providers">{t('添加服务商', 'Add provider')}</Link>
            </Button>
          </EmptyState>
        ) : (
          <>
            <div className="chat-feed">
              {messages.length === 0 && !busy ? (
                <div className="chat-empty">
                  <div className="brand-mark">
                    <Layers size={26} />
                  </div>
                  <h1>{t('一个问题，无限可能。', 'One question. Endless possibilities.')}</h1>
                  <p className="muted">
                    {t(
                      '选择一个模型，让想法从这里开始。',
                      'Choose a model. Start building your next idea.',
                    )}
                  </p>
                  <div className="suggestions">
                    {suggestions.map((s) => (
                      <button key={s} className="suggestion" onClick={() => setInput(s)}>
                        {s}
                        <ArrowUp size={13} style={{ float: 'right', transform: 'rotate(45deg)' }} />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m, i) => {
                  const r = data.requests.find((r) => r.id === m.requestId);
                  return (
                    <article className={`message ${m.role}`} key={m.id}>
                      <div className="message-head">
                        {m.role === 'assistant' ? (
                          <ProviderIcon
                            provider={providers.find((p) => p.id === r?.providerId) ?? provider}
                          />
                        ) : (
                          <span className="provider-icon" style={{ fontSize: 12 }}>
                            YOU
                          </span>
                        )}
                        <strong>
                          {m.role === 'user' ? t('你', 'You') : (r?.modelName ?? model.label)}
                        </strong>
                        <span className="muted" style={{ fontSize: 12 }}>
                          {m.role === 'assistant' && data.settings.demo ? 'DEMO' : ''}
                        </span>
                      </div>
                      <div className="message-body">
                        {m.role === 'user' ? m.content : <Markdown text={m.content} />}
                      </div>
                      {r?.error && <div className="notice error-box">{r.error}</div>}
                      <div className="message-foot">
                        <CopyButton text={m.content} />
                        {m.role === 'user' && !busy && (
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={t('编辑问题', 'Edit question')}
                            onClick={() => {
                              setEditIndex(i);
                              setInput(m.content);
                            }}
                          >
                            <Pencil size={13} />
                          </Button>
                        )}
                        {r && (
                          <>
                            <span>{duration(r.latency)}</span>
                            <span>{number(r.usage.total)} tokens</span>
                            <span>{money(r.cost)}</span>
                          </>
                        )}
                        {m.role === 'assistant' && i === messages.length - 1 && !busy && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const j = messages.map((m) => m.role).lastIndexOf('user');
                              if (j >= 0) void send(messages.slice(0, j + 1));
                            }}
                          >
                            <RotateCcw size={13} />
                            {t('重新生成', 'Regenerate')}
                          </Button>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
              {busy && (
                <article className="message">
                  <div className="message-head">
                    <ProviderIcon provider={provider} />
                    <strong>{model.label}</strong>
                    <Spinner />
                  </div>
                  <div className="message-body">
                    <Markdown text={partial || t('正在等待模型响应…', 'Waiting for the model…')} />
                  </div>
                </article>
              )}
              <div ref={bottom} />
            </div>
            <div className="composer-wrap">
              {editIndex !== null && (
                <div className="inline muted" style={{ marginBottom: 10, fontSize: 13 }}>
                  {t('编辑后将重新生成后续对话', 'Editing will regenerate subsequent messages')}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditIndex(null);
                      setInput('');
                    }}
                  >
                    {t('取消', 'Cancel')}
                  </Button>
                </div>
              )}
              <form
                className="composer"
                onSubmit={(e) => {
                  e.preventDefault();
                  void send();
                }}
              >
                <textarea
                  aria-label={t('消息', 'Message')}
                  value={input}
                  placeholder={t('发送消息，开始探索…', 'Send a message. Start exploring…')}
                  disabled={busy}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                />
                <div className="composer-bottom">
                  <span className="muted" style={{ fontSize: 12 }}>
                    {provider?.name} / {model.label}
                  </span>
                  {busy ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => abort.current?.abort()}
                    >
                      <Square size={13} />
                      {t('停止', 'Stop')}
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      size="icon"
                      disabled={!input.trim()}
                      aria-label={t('发送消息', 'Send message')}
                    >
                      <ArrowUp size={17} />
                    </Button>
                  )}
                </div>
              </form>
              <div className="composer-hint">
                {data.settings.demo
                  ? t(
                      '演示模式 · 本地模拟回答，不消耗 API 额度',
                      'Demo mode · simulated answers, no API charges',
                    )
                  : t(
                      'Enter 发送 · Shift + Enter 换行 · AI 回答可能有误',
                      'Enter to send · Shift + Enter for newline · AI can make mistakes',
                    )}
              </div>
            </div>
          </>
        )}
      </main>
      <aside className="rail">
        <div className="rail-section">
          <h3>{t('模型参数', 'MODEL PARAMETERS')}</h3>
          <ParameterControls value={params} onChange={setParams} format={provider?.format} />
        </div>
        <div className="rail-section">
          <h3>{t('最近对话', 'RECENT CHATS')}</h3>
          {data.chats
            .filter((c) => c.demo === data.settings.demo)
            .slice(0, 8)
            .map((c) => (
              <button
                className="rail-item"
                style={{ width: '100%', textAlign: 'left' }}
                key={c.id}
                disabled={busy}
                onClick={() => {
                  setChatId(c.id);
                  setModelId(c.modelId);
                  setInput('');
                  setEditIndex(null);
                }}
              >
                <span className="text-ellipsis">{c.title}</span>
              </button>
            ))}
        </div>
      </aside>
      <Sheet open={showParams} onOpenChange={setShowParams}>
        <SheetContent style={{ overflowY: 'auto', padding: 24 }}>
          <SheetHeader>
            <SheetTitle>{t('模型参数', 'Model parameters')}</SheetTitle>
            <SheetDescription>
              {t('仅影响接下来的请求。', 'Applies to subsequent requests.')}
            </SheetDescription>
          </SheetHeader>
          <ParameterControls value={params} onChange={setParams} format={provider?.format} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
