'use client';
import { useState } from 'react';
import { Layers, ArrowRight, Check, PlugZap } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useApp } from '../store/app-store';
import { Button, ProviderIcon, Picker, Spinner } from './ui';
import { CATALOG, newProvider } from '../providers/catalog';
import { ProviderEditor } from '../features/providers';
import { createAdapter } from '../providers/adapter';
import { getSecret } from '../lib/vault';
import { duration, redact } from '../lib/utils';
import type { Provider } from '../types';
export function Onboarding() {
  const { data, update, t } = useApp();
  const [step, setStep] = useState(0);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [model, setModel] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const finish = (demo: boolean) =>
    update((d) => ({
      ...d,
      settings: {
        ...d.settings,
        demo,
        onboarded: true,
        ...(!demo
          ? {
              defaultModel: model || d.models[0]?.id || '',
              defaultProvider: provider?.id || d.providers[0]?.id || '',
            }
          : {}),
      },
    }));
  async function test() {
    if (!provider) return;
    setBusy(true);
    try {
      const r = await createAdapter(provider, getSecret(provider.id)).testConnection(
        AbortSignal.timeout(data.settings.timeout * 1000),
      );
      setStatus(
        `${t('连接成功', 'Connection successful')} · ${duration(r.latency)} · ${r.models.length} models`,
      );
      update((d) => ({
        ...d,
        providers: d.providers.map((p) =>
          p.id === provider.id
            ? { ...p, status: 'connected', latency: r.latency, lastChecked: Date.now() }
            : p,
        ),
      }));
    } catch (e) {
      setStatus(String(redact(e instanceof Error ? e.message : e, getSecret(provider.id))));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={!data.settings.onboarded}
      onOpenChange={(v) => {
        if (!v) finish(true);
      }}
    >
      <DialogContent style={{ maxWidth: 650, maxHeight: '92vh', overflowY: 'auto' }}>
        {step !== 1 && (
          <DialogHeader>
            <div className="brand-mark" style={{ marginBottom: 16 }}>
              <Layers size={22} />
            </div>
            <DialogTitle style={{ fontSize: 25 }}>
              {step === 0
                ? 'Welcome to ModelDock'
                : step === 2
                  ? t('验证你的连接', 'Verify your connection')
                  : t('选择默认模型', 'Choose your default model')}
            </DialogTitle>
            <DialogDescription>
              {step === 0
                ? t(
                    '你的 AI 模型，终于在同一个工作台。选择服务商开始配置，或直接体验演示。',
                    'Your AI models, finally in one workspace. Choose a provider or explore the demo.',
                  )
                : step === 2
                  ? t(
                      '测试会请求服务商的模型列表，不产生聊天回答。',
                      'This fetches the model catalog without generating a chat response.',
                    )
                  : t(
                      '设置完成后，就可以开始真实对话。',
                      'You are ready to start a real conversation.',
                    )}
            </DialogDescription>
          </DialogHeader>
        )}
        <div className="onboard-steps">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={i <= step ? 'active' : ''} />
          ))}
        </div>
        {step === 0 ? (
          <>
            <div className="onboard-choices">
              {CATALOG.slice(0, 9).map((p) => (
                <button
                  key={p.kind}
                  className="panel provider-row"
                  style={{ padding: 14, border: '1px solid var(--border)', fontSize: 13 }}
                  onClick={() => {
                    setProvider(newProvider(p.kind));
                    setStep(1);
                  }}
                >
                  <ProviderIcon
                    provider={{
                      ...p,
                      id: p.kind,
                      enabled: true,
                      transport: 'direct',
                      status: 'unconfigured',
                    }}
                  />
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
            <div className="dialog-actions">
              <Button variant="outline" onClick={() => finish(true)}>
                {t('先体验演示', 'Explore demo')}
                <ArrowRight size={14} />
              </Button>
            </div>
          </>
        ) : step === 1 && provider ? (
          <ProviderEditor
            initial={provider}
            onSaved={(p) => {
              setProvider(p);
              setStep(2);
            }}
            onClose={() => {}}
          />
        ) : step === 2 ? (
          <>
            <div className="notice">
              {provider?.name}
              <br />
              {provider?.baseUrl}
            </div>
            {status && (
              <div className="notice" style={{ whiteSpace: 'pre-wrap' }}>
                {status}
              </div>
            )}
            <div className="dialog-actions">
              <Button variant="outline" onClick={test} disabled={busy}>
                {busy ? <Spinner /> : <PlugZap size={15} />} {t('测试连接', 'Test connection')}
              </Button>
              <Button onClick={() => setStep(3)} disabled={busy}>
                {t('下一步', 'Continue')}
                <ArrowRight size={14} />
              </Button>
            </div>
          </>
        ) : (
          <>
            <Picker
              value={model}
              onChange={setModel}
              options={data.models
                .filter((m) => m.enabled)
                .map((m) => ({ value: m.id, label: m.label }))}
              placeholder={t('选择模型', 'Choose a model')}
            />
            {data.models.length === 0 && (
              <p className="muted">
                {t(
                  '还未添加模型，可以进入工作台后在模型页手动添加。',
                  'No models yet. Add a model ID on the Models page after setup.',
                )}
              </p>
            )}
            <div className="dialog-actions">
              <Button onClick={() => finish(false)}>
                <Check size={15} />
                {t('进入 ModelDock', 'Start using ModelDock')}
              </Button>
            </div>
          </>
        )}
        {step > 0 && (
          <Button
            variant="ghost"
            size="sm"
            style={{ justifySelf: 'start' }}
            onClick={() => setStep(step - 1)}
          >
            {t('上一步', 'Back')}
          </Button>
        )}
        <div className="inline muted" style={{ justifyContent: 'space-between', fontSize: 12 }}>
          <span>Local first. Open source.</span>
          <button
            onClick={() =>
              update((d) => ({
                ...d,
                settings: { ...d.settings, language: d.settings.language === 'zh' ? 'en' : 'zh' },
              }))
            }
          >
            {data.settings.language === 'zh' ? 'English' : '简体中文'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
