'use client';
import { useState, useRef, useEffect } from 'react';
import Link from '../components/link';
import { Play, Square, Braces } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useApp } from '../store/app-store';
import { PageTitle, Button, Panel, Picker, CopyButton, EmptyState } from '../components/ui';
import { Markdown } from '../components/markdown';
import { ParameterControls } from '../components/parameters';
import { DEFAULT_PARAMETERS, type RequestRecord } from '../types';
import { createAdapter } from '../providers/adapter';
import { snippets } from '../lib/snippets';
import { executeRequest } from '../lib/run';
import { uid, duration, money, number } from '../lib/utils';
export function Playground() {
  const { data, update, models, providers, t } = useApp();
  const [modelId, setModelId] = useState(models[0]?.id ?? '');
  const [params, setParams] = useState({ ...DEFAULT_PARAMETERS });
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [partial, setPartial] = useState('');
  const [record, setRecord] = useState<RequestRecord | null>(null);
  const [tab, setTab] = useState('response');
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  const model = models.find((m) => m.id === modelId) ?? models[0];
  const provider = providers.find((p) => p.id === model?.providerId);
  let wire = null,
    error = '';
  try {
    if (model && provider && provider.kind !== 'demo')
      wire = createAdapter(provider, '${MODELDOCK_API_KEY}').buildRequest(
        model,
        [{ id: 'preview', role: 'user', content: prompt }],
        params,
      );
  } catch (e) {
    error = String(e instanceof Error ? e.message : e);
  }
  const codes = wire ? snippets(wire) : null;
  async function run() {
    if (!model || !provider || !prompt.trim() || busy) return;
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setRecord(null);
    setPartial('');
    setTab('response');
    const r = await executeRequest({
      provider,
      model,
      messages: [{ id: uid(), role: 'user', content: prompt.trim() }],
      parameters: params,
      source: 'playground',
      signal: controller.signal,
      timeout: data.settings.timeout,
      english: data.settings.language === 'en',
      onDelta: setPartial,
    });
    setRecord(r);
    update((d) => ({
      ...d,
      requests: d.settings.saveHistory ? [r, ...d.requests].slice(0, 5000) : d.requests,
    }));
    setBusy(false);
  }
  return (
    <main className="page-body">
      <PageTitle
        title="Playground"
        subtitle={t('检查每个参数、请求与响应。', 'Inspect every parameter, request and response.')}
      >
        <div style={{ width: 240 }}>
          <Picker
            value={model?.id ?? ''}
            onChange={setModelId}
            disabled={busy}
            options={models.map((m) => ({ value: m.id, label: m.label }))}
            placeholder={t('选择模型', 'Choose model')}
          />
        </div>
      </PageTitle>
      {!model ? (
        <EmptyState title={t('先添加模型', 'Add a model first')}>
          <Button asChild>
            <Link href="/providers">{t('接入服务商', 'Connect a provider')}</Link>
          </Button>
        </EmptyState>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: 22 }}>
          <div className="settings-grid">
            <Panel title={t('请求参数', 'Parameters')}>
              <div className="panel-content">
                <ParameterControls value={params} onChange={setParams} format={provider?.format} />
              </div>
            </Panel>
            <div className="stack">
              <Panel title={t('输入消息', 'User message')}>
                <form
                  className="panel-content"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run();
                  }}
                >
                  <Textarea
                    rows={8}
                    aria-label="Playground prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={busy}
                    placeholder={t(
                      '输入要发送给模型的内容…',
                      'Enter the message to send to the model…',
                    )}
                  />
                  <div className="dialog-actions">
                    {busy ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => abort.current?.abort()}
                      >
                        <Square size={14} />
                        {t('停止', 'Stop')}
                      </Button>
                    ) : (
                      <Button type="submit" disabled={!prompt.trim() || !!error}>
                        <Play size={14} />
                        {t('发送请求', 'Send request')}
                      </Button>
                    )}
                  </div>
                </form>
              </Panel>
              <Panel title={t('代码导出', 'Code export')}>
                <div className="panel-content">
                  {codes ? (
                    <Tabs defaultValue="curl">
                      <TabsList>
                        <TabsTrigger value="curl">cURL</TabsTrigger>
                        <TabsTrigger value="python">Python</TabsTrigger>
                        <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                      </TabsList>
                      {Object.entries(codes).map(([name, code]) => (
                        <TabsContent value={name} key={name}>
                          <div style={{ textAlign: 'right' }}>
                            <CopyButton text={code} label />
                          </div>
                          <pre className="json-view" style={{ padding: 0, maxHeight: 235 }}>
                            {code}
                          </pre>
                        </TabsContent>
                      ))}
                    </Tabs>
                  ) : (
                    <p className="muted">
                      {error ||
                        t(
                          '演示模型不发送网络请求。选择真实模型后可复制 API 代码。',
                          'Demo models do not send network requests. Select a live model to export API code.',
                        )}
                    </p>
                  )}
                </div>
              </Panel>
            </div>
          </div>
          <Panel>
            <Tabs value={tab} onValueChange={setTab}>
              <div className="panel-title">
                <TabsList>
                  <TabsTrigger value="response">Response</TabsTrigger>
                  <TabsTrigger value="request">Request</TabsTrigger>
                  <TabsTrigger value="raw">Raw JSON</TabsTrigger>
                  <TabsTrigger value="headers">Headers</TabsTrigger>
                </TabsList>
                <Braces size={17} className="muted" />
              </div>
              <TabsContent value="response">
                <div className="panel-content">
                  {record?.error && <div className="notice error-box">{record.error}</div>}
                  <Markdown
                    text={
                      record?.response ||
                      partial ||
                      t(
                        '发送请求后，响应会实时显示在这里。',
                        'Send a request to view the response here.',
                      )
                    }
                  />
                </div>
              </TabsContent>
              <TabsContent value="request">
                <pre className="json-view">
                  {JSON.stringify(
                    record?.request ?? wire ?? { demo: true, prompt, parameters: params },
                    null,
                    2,
                  )}
                </pre>
              </TabsContent>
              <TabsContent value="raw">
                <pre className="json-view">
                  {record
                    ? JSON.stringify(record.raw, null, 2)
                    : t('等待响应…', 'Waiting for a response…')}
                </pre>
              </TabsContent>
              <TabsContent value="headers">
                <pre className="json-view">
                  {record
                    ? JSON.stringify(record.headers, null, 2)
                    : t(
                        '浏览器直连仅能读取服务商通过 CORS 暴露的响应头。',
                        'Direct browser requests can only read response headers exposed by CORS.',
                      )}
                </pre>
              </TabsContent>
            </Tabs>
            {record && (
              <div
                className="message-foot"
                style={{ padding: 20, borderTop: '1px solid var(--border)', margin: 0 }}
              >
                <span>{record.modelName}</span>
                <span>{duration(record.latency)}</span>
                <span>TTFT {duration(record.ttft)}</span>
                <span>{number(record.usage.total)} tokens</span>
                <span>{money(record.cost)}</span>
              </div>
            )}
          </Panel>
        </div>
      )}
    </main>
  );
}
