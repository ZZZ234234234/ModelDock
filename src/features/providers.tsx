'use client';
import { useState } from 'react';
import {
  Plus,
  Search,
  Eye,
  EyeOff,
  Trash2,
  Pencil,
  Unplug,
  PlugZap,
  Monitor,
  ArrowUpRight,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Button,
  PageTitle,
  ProviderIcon,
  Status,
  Picker,
  Confirm,
  Spinner,
  EmptyState,
} from '../components/ui';
import { useApp } from '../store/app-store';
import { CATALOG, newProvider, newModel, isLocal, preset } from '../providers/catalog';
import { createAdapter } from '../providers/adapter';
import { validateBaseUrl } from '../providers/transport';
import { getSecret, setSecret, deleteSecret, vaultUnlocked } from '../lib/vault';
import { duration, redact } from '../lib/utils';
import type { Provider, ProviderKind, Format } from '../types';
export function ProviderEditor({
  initial,
  onSaved,
  onClose,
}: {
  initial: Provider;
  onSaved?: (p: Provider) => void;
  onClose: () => void;
}) {
  const { data, update, t } = useApp();
  const [draft, setDraft] = useState(initial);
  const [key, setKey] = useState(() => getSecret(initial.id));
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');
  const [manual, setManual] = useState('');
  const [found, setFound] = useState<string[]>([]);
  const set = <K extends keyof Provider>(k: K, v: Provider[K]) => {
    setDraft((d) => ({ ...d, [k]: v, status: 'unconfigured', lastChecked: undefined }));
    setResult('');
  };
  async function test() {
    setBusy(true);
    setResult('');
    try {
      validateBaseUrl(draft.baseUrl);
      const r = await createAdapter(draft, key).testConnection(
        AbortSignal.timeout(data.settings.timeout * 1000),
      );
      setDraft((d) => ({
        ...d,
        status: 'connected',
        lastChecked: Date.now(),
        latency: r.latency,
        error: undefined,
      }));
      setFound(r.models);
      setResult(
        `${t('连接成功', 'Connection successful')} · ${duration(r.latency)} · ${r.models.length} ${t('个模型', 'models')}`,
      );
    } catch (e) {
      const error = String(redact(e instanceof Error ? e.message : String(e), key));
      setDraft((d) => ({ ...d, status: 'error', lastChecked: Date.now(), error }));
      setResult(error);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    try {
      if (!draft.name.trim()) throw new Error(t('请填写服务商名称', 'Enter a provider name'));
      const normalized = { ...draft, baseUrl: validateBaseUrl(draft.baseUrl) };
      await setSecret(draft.id, key.trim());
      update((d) => {
        const old = d.models.filter((m) => m.providerId === draft.id);
        const names = [
          ...new Set([
            ...found,
            ...manual
              .split(/[\n,]/)
              .map((s) => s.trim())
              .filter(Boolean),
          ]),
        ];
        const additions = names
          .filter((name) => !old.some((m) => m.name === name))
          .map((name) => newModel(normalized, name));
        return {
          ...d,
          providers: [...d.providers.filter((p) => p.id !== draft.id), normalized],
          models: [...d.models, ...additions],
        };
      });
      toast.success(t('服务商已保存', 'Provider saved'));
      onSaved?.(normalized);
      onClose();
    } catch (e) {
      toast.error(String(e instanceof Error ? e.message : e));
    }
  }
  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('配置服务商', 'Configure provider')}</DialogTitle>
        <DialogDescription>
          {t(
            'Key 只发送至你选择的 API 端点。模型列表测试不会生成回答。',
            'Keys are sent to your selected endpoint. Connection tests only fetch the model list.',
          )}
        </DialogDescription>
      </DialogHeader>
      <div className="form-grid" style={{ marginTop: 15 }}>
        <label className="field">
          <span>{t('服务商类型', 'Provider type')}</span>
          <Picker
            value={draft.kind}
            onChange={(v) => {
              const p = preset(v as ProviderKind);
              setDraft({
                ...draft,
                kind: p.kind,
                name: p.name,
                format: p.format,
                baseUrl: p.baseUrl,
                status: 'unconfigured',
                transport: 'direct',
                lastChecked: undefined,
              });
              setFound([]);
              setKey('');
              setResult('');
            }}
            options={CATALOG.map((p) => ({ value: p.kind, label: p.name }))}
            placeholder={t('选择平台', 'Choose provider')}
          />
        </label>
        <label className="field">
          <span>Provider name</span>
          <Input value={draft.name} onChange={(e) => set('name', e.target.value)} />
        </label>
        <label className="field full">
          <span>Base URL</span>
          <Input
            value={draft.baseUrl}
            onChange={(e) => set('baseUrl', e.target.value)}
            placeholder="https://api.example.com/v1"
            spellCheck={false}
          />
        </label>
        <div className="field full">
          <label htmlFor="provider-key">API Key</label>
          <div className="inline">
            <Input
              id="provider-key"
              type={visible ? 'text' : 'password'}
              autoComplete="off"
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setDraft((d) => ({ ...d, status: 'unconfigured', lastChecked: undefined }));
                setResult('');
              }}
              placeholder={
                isLocal(draft)
                  ? t('本地服务通常无需 Key', 'Local servers usually need no key')
                  : t('输入 API Key', 'Enter API key')
              }
            />
            <Button
              variant="outline"
              size="icon"
              aria-label={t('显示或隐藏密钥', 'Show or hide key')}
              onClick={() => setVisible(!visible)}
            >
              {visible ? <EyeOff size={16} /> : <Eye size={16} />}
            </Button>
          </div>
          <small>
            {vaultUnlocked()
              ? t(
                  '已解锁加密密钥库，将加密保存在本机。',
                  'Vault unlocked. Keys will be encrypted on this device.',
                )
              : t(
                  '仅本次会话有效；在设置中启用加密密钥库可持久保存。',
                  'Session only. Enable the encrypted vault in Settings to persist keys.',
                )}
          </small>
        </div>
        <label className="field">
          <span>API format</span>
          <Picker
            value={draft.format}
            onChange={(v) => set('format', v as Format)}
            options={[
              { value: 'openai', label: 'OpenAI compatible' },
              { value: 'anthropic', label: 'Anthropic Messages' },
              { value: 'gemini', label: 'Google Gemini' },
            ]}
          />
        </label>
        <label className="field">
          <span>{t('连接方式', 'Transport')}</span>
          <Picker
            value={draft.transport}
            onChange={(v) => set('transport', v as Provider['transport'])}
            options={[
              { value: 'direct', label: t('浏览器直连', 'Browser direct') },
              ...(!isLocal(draft) && draft.kind !== 'custom'
                ? [{ value: 'relay', label: t('本站临时转发', 'Same-origin relay') }]
                : []),
            ]}
          />
        </label>
        {draft.transport === 'relay' && (
          <div className="field full notice">
            {t(
              '启用转发后，本站服务器会在请求期间接收 Key 和对话内容，并转发到官方端点；不写入服务器数据库或应用日志。仅信任自己运行的实例。',
              'With relay enabled, this server transiently receives the key and conversation to forward to the official endpoint. No server database or application logging. Use an instance you trust.',
            )}
          </div>
        )}
        <label className="field full">
          <span>
            {t('手动添加模型（可选，逗号分隔）', 'Add model IDs (optional, comma-separated)')}
          </span>
          <Input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder={preset(draft.kind).example || 'model-name'}
          />
          <small>
            {t(
              '部分服务商不提供模型列表接口，可直接填写模型 ID 后保存。模型是否可调用需实际聊天验证。',
              'Some providers lack a models endpoint. Enter model IDs manually; chat access is verified by an actual request.',
            )}
          </small>
        </label>
      </div>
      {result && (
        <div
          className={`notice ${draft.status === 'error' ? 'error-box' : ''}`}
          style={{ marginTop: 16 }}
        >
          {result}
        </div>
      )}
      <div className="dialog-actions">
        <Button variant="outline" onClick={test} disabled={busy}>
          {busy ? <Spinner /> : <PlugZap size={15} />} {t('测试连接', 'Test connection')}
        </Button>
        <Button onClick={save} disabled={busy}>
          {t('保存配置', 'Save provider')}
        </Button>
      </div>
    </>
  );
}
export function Providers() {
  const { data, update, t } = useApp();
  const [editing, setEditing] = useState<Provider | null>(null);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState<string[]>([]);
  const configured = data.providers.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );
  async function test(p: Provider) {
    setBusy(p.id);
    try {
      const r = await createAdapter(p, getSecret(p.id)).testConnection(
        AbortSignal.timeout(data.settings.timeout * 1000),
      );
      update((d) => ({
        ...d,
        providers: d.providers.map((x) =>
          x.id === p.id
            ? {
                ...x,
                status: 'connected',
                latency: r.latency,
                lastChecked: Date.now(),
                error: undefined,
              }
            : x,
        ),
        models: [
          ...d.models,
          ...r.models
            .filter((n) => !d.models.some((m) => m.providerId === p.id && m.name === n))
            .map((n) => newModel(p, n)),
        ],
      }));
      toast.success(`${p.name} · ${duration(r.latency)} · ${r.models.length} models`);
    } catch (e) {
      const error = String(redact(e instanceof Error ? e.message : String(e), getSecret(p.id)));
      update((d) => ({
        ...d,
        providers: d.providers.map((x) =>
          x.id === p.id ? { ...x, status: 'error', lastChecked: Date.now(), error } : x,
        ),
      }));
      toast.error(error);
    } finally {
      setBusy(null);
    }
  }
  async function detect() {
    setBusy('local');
    try {
      let detected = 0;
      for (const kind of ['ollama', 'lmstudio'] as const) {
        const p = data.providers.find((p) => p.kind === kind) ?? newProvider(kind);
        try {
          const r = await createAdapter(p, getSecret(p.id)).testConnection(
            AbortSignal.timeout(3500),
          );
          detected++;
          update((d) => ({
            ...d,
            providers: [
              ...d.providers.filter((x) => x.id !== p.id),
              { ...p, status: 'connected', latency: r.latency, lastChecked: Date.now() },
            ],
            models: [
              ...d.models,
              ...r.models
                .filter((n) => !d.models.some((m) => m.providerId === p.id && m.name === n))
                .map((n) => newModel(p, n)),
            ],
          }));
        } catch {}
      }
      if (detected)
        toast.success(t(`检测到 ${detected} 个本地服务`, `Detected ${detected} local servers`));
      else
        toast.error(
          t(
            '未检测到本地服务。请启动 Ollama / LM Studio，并允许当前页面来源的跨域访问。',
            'No local server detected. Start Ollama / LM Studio and allow this page origin via CORS.',
          ),
        );
    } finally {
      setBusy(null);
    }
  }
  return (
    <main className="page-body">
      <PageTitle
        title={t('服务商', 'Providers')}
        subtitle={t(
          '连接云端与本地模型，所有配置由你掌控。',
          'Connect cloud and local models. Every configuration under your control.',
        )}
      >
        <Button variant="outline" disabled={busy !== null} onClick={detect}>
          {busy === 'local' ? <Spinner /> : <Monitor size={15} />}{' '}
          {t('检测本地模型', 'Detect local models')}
        </Button>
        <Button onClick={() => setEditing(newProvider('openai'))}>
          <Plus size={15} />
          {t('添加服务商', 'Add provider')}
        </Button>
      </PageTitle>
      {data.settings.demo && (
        <div className="notice" style={{ marginBottom: 22 }}>
          {t(
            '当前处于演示模式。你可以在这里配置真实 API，然后在顶部切换至真实模式。',
            'Demo mode is active. Configure real APIs here, then switch to Live mode in the top bar.',
          )}
        </div>
      )}
      <div className="toolbar">
        <div className="inline search">
          <Search size={16} className="muted" />
          <Input
            placeholder={t('搜索服务商…', 'Search providers…')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="muted">
          {data.providers.length} {t('个配置', 'configured')}
        </span>
      </div>
      {configured.length ? (
        <div className="provider-cards">
          {configured.map((p) => (
            <section className="panel provider-card" key={p.id}>
              <div className="provider-head">
                <ProviderIcon provider={p} />
                <h3>{p.name}</h3>
                <Status status={p.enabled ? p.status : 'disabled'} />
              </div>
              <code title={p.baseUrl}>{p.baseUrl}</code>
              <div className="inline" style={{ justifyContent: 'space-between' }}>
                <code>
                  {showKeys.includes(p.id)
                    ? getSecret(p.id) || t('未解锁或未配置', 'Locked / not set')
                    : getSecret(p.id)
                      ? `••••••••••${getSecret(p.id).slice(-3)}`
                      : t('未解锁或未配置', 'Locked / not set')}
                </code>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={t('显示或隐藏密钥', 'Show or hide key')}
                  onClick={() =>
                    setShowKeys((s) =>
                      s.includes(p.id) ? s.filter((id) => id !== p.id) : [...s, p.id],
                    )
                  }
                >
                  {showKeys.includes(p.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                </Button>
              </div>
              <div
                className="inline"
                style={{
                  justifyContent: 'space-between',
                  fontSize: 12,
                  color: 'var(--muted-foreground)',
                  marginTop: 8,
                }}
              >
                <span>
                  {data.models.filter((m) => m.providerId === p.id).length} models ·{' '}
                  {isLocal(p) ? 'LOCAL' : p.format}
                </span>
                <span>
                  {p.lastChecked
                    ? new Date(p.lastChecked).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : t('尚未测试', 'Not tested')}
                </span>
              </div>
              {p.error && (
                <div
                  className="notice error-box"
                  style={{ marginTop: 15, maxHeight: 120, overflow: 'auto' }}
                >
                  {p.error}
                </div>
              )}
              <div className="provider-actions">
                <Button size="sm" variant="outline" onClick={() => setEditing(p)}>
                  <Pencil size={13} />
                  {t('配置', 'Configure')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy !== null || !p.enabled}
                  onClick={() => test(p)}
                >
                  {busy === p.id ? <Spinner /> : <PlugZap size={13} />}
                </Button>
                <Switch
                  aria-label={`${p.name} enabled`}
                  checked={p.enabled}
                  onCheckedChange={(v) =>
                    update((d) => ({
                      ...d,
                      providers: d.providers.map((x) => (x.id === p.id ? { ...x, enabled: v } : x)),
                    }))
                  }
                  style={{ margin: 'auto 3px auto auto' }}
                />
                <Confirm
                  title={t('删除服务商？', 'Delete provider?')}
                  description={t(
                    '将删除该服务商、对应模型和密钥。已有历史记录保留。',
                    'Removes this provider, its model configurations and key. Existing request history remains.',
                  )}
                  onConfirm={() => {
                    void deleteSecret(p.id).catch(() =>
                      toast.error(t('密钥库写入失败', 'Vault write failed')),
                    );
                    update((d) => ({
                      ...d,
                      providers: d.providers.filter((x) => x.id !== p.id),
                      models: d.models.filter((m) => m.providerId !== p.id),
                      settings: {
                        ...d.settings,
                        defaultProvider:
                          d.settings.defaultProvider === p.id ? '' : d.settings.defaultProvider,
                        defaultModel: d.models.some(
                          (m) => m.id === d.settings.defaultModel && m.providerId === p.id,
                        )
                          ? ''
                          : d.settings.defaultModel,
                      },
                    }));
                  }}
                >
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={t('删除服务商', 'Delete provider')}
                  >
                    <Trash2 size={14} />
                  </Button>
                </Confirm>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          title={
            search
              ? t('没有匹配的服务商', 'No matching provider')
              : t('选择你的第一个服务商', 'Connect your first provider')
          }
          description={t(
            '添加 API Key，导入模型，就可以开始对话。',
            'Add an API key and import your models to start chatting.',
          )}
        />
      )}
      <div className="panel-title" style={{ border: 0, padding: '32px 0 18px' }}>
        <h2>{t('支持的平台', 'Provider catalog')}</h2>
        <span className="muted" style={{ fontSize: 12 }}>
          11 providers + custom
        </span>
      </div>
      <div className="provider-cards">
        {CATALOG.map((p) => (
          <button
            key={p.kind}
            className="panel provider-row"
            style={{ border: '1px solid var(--border)', textAlign: 'left', padding: 18 }}
            onClick={() => setEditing(newProvider(p.kind))}
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
            <div className="fill">
              <strong>{p.name}</strong>
              <p>
                {p.format === 'openai'
                  ? 'OpenAI compatible'
                  : p.format === 'anthropic'
                    ? 'Messages API'
                    : 'Native Gemini API'}
              </p>
            </div>
            <ArrowUpRight size={15} className="muted" />
          </button>
        ))}
      </div>
      <p className="footer-note">
        <Unplug size={13} style={{ display: 'inline', marginRight: 6 }} />
        {t(
          '连接测试验证模型列表接口；不能保证每个模型都有聊天权限。',
          'Connection tests verify the model-list endpoint, not chat access for every model.',
        )}
      </p>
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent style={{ maxWidth: 660, maxHeight: '92vh', overflowY: 'auto' }}>
          {editing && (
            <ProviderEditor key={editing.id} initial={editing} onClose={() => setEditing(null)} />
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
