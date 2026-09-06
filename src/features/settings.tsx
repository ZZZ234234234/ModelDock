'use client';
import { useState, useEffect } from 'react';
import Link from '../components/link';
import {
  LockKeyhole,
  UnlockKeyhole,
  Download,
  Trash2,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useApp } from '../store/app-store';
import { PageTitle, Panel, Button, Picker, Confirm, Spinner } from '../components/ui';
import { unlockVault, lockVault, vaultUnlocked, vaultExists, forgetVault } from '../lib/vault';
import { download } from '../lib/utils';
export function SettingsPage() {
  const { data, update, t } = useApp();
  const [password, setPassword] = useState('');
  const [unlocked, setUnlocked] = useState(vaultUnlocked);
  const [exists, setExists] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void vaultExists()
      .then(setExists)
      .catch(() => {});
  }, []);
  async function unlock() {
    setBusy(true);
    try {
      await unlockVault(password);
      setUnlocked(true);
      setExists(true);
      setPassword('');
      toast.success(t('密钥库已解锁', 'Vault unlocked'));
    } catch (error) {
      toast.error(
        error instanceof Error && error.message.includes('HTTPS')
          ? error.message
          : t(
              '无法解锁：请检查密码；新密码需至少 10 位。',
              'Cannot unlock: check your password. New passwords need at least 10 characters.',
            ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="page-body">
      <PageTitle
        title={t('设置', 'Settings')}
        subtitle={t('让工作台按你的方式运行。', 'Make this workspace your own.')}
      />
      <div className="settings-grid">
        <div className="stack">
          <Panel title={t('外观与语言', 'Appearance & language')}>
            <div className="panel-content">
              <div className="setting-row">
                <div>
                  {t('界面主题', 'Appearance')}
                  <p>{t('深色或浅色，随时切换。', 'Switch between dark and light.')}</p>
                </div>
                <Picker
                  value={data.settings.theme}
                  onChange={(v) =>
                    v && update((d) => ({ ...d, settings: { ...d.settings, theme: v as 'dark' } }))
                  }
                  options={[
                    { value: 'dark', label: t('深色', 'Dark') },
                    { value: 'light', label: t('浅色', 'Light') },
                  ]}
                  placeholder={t('主题', 'Theme')}
                />
              </div>
              <div className="setting-row">
                <div>
                  {t('界面语言', 'Language')}
                  <p>简体中文 / English</p>
                </div>
                <Picker
                  value={data.settings.language}
                  onChange={(v) =>
                    v && update((d) => ({ ...d, settings: { ...d.settings, language: v as 'zh' } }))
                  }
                  options={[
                    { value: 'zh', label: '简体中文' },
                    { value: 'en', label: 'English' },
                  ]}
                />
              </div>
            </div>
          </Panel>
          <Panel title={t('默认模型与 API', 'Defaults & API')}>
            <div className="panel-content">
              <div className="setting-row">
                <span>{t('默认服务商', 'Default provider')}</span>
                <Picker
                  value={data.settings.defaultProvider}
                  onChange={(v) =>
                    update((d) => ({
                      ...d,
                      settings: { ...d.settings, defaultProvider: v, defaultModel: '' },
                    }))
                  }
                  options={data.providers
                    .filter((p) => p.enabled)
                    .map((p) => ({ value: p.id, label: p.name }))}
                  placeholder={t('自动选择', 'Automatic')}
                />
              </div>
              <div className="setting-row">
                <span>{t('默认模型', 'Default model')}</span>
                <Picker
                  value={data.settings.defaultModel}
                  onChange={(v) =>
                    update((d) => ({ ...d, settings: { ...d.settings, defaultModel: v } }))
                  }
                  options={data.models
                    .filter(
                      (m) =>
                        m.enabled &&
                        (!data.settings.defaultProvider ||
                          m.providerId === data.settings.defaultProvider),
                    )
                    .map((m) => ({ value: m.id, label: m.label }))}
                  placeholder={t('自动选择', 'Automatic')}
                />
              </div>
              <div className="setting-row">
                <div>
                  {t('请求超时（秒）', 'Request timeout (seconds)')}
                  <p>10–300 s</p>
                </div>
                <Input
                  aria-label="Request timeout"
                  type="number"
                  min={10}
                  max={300}
                  style={{ width: 110 }}
                  value={data.settings.timeout}
                  onChange={(e) =>
                    update((d) => ({
                      ...d,
                      settings: {
                        ...d.settings,
                        timeout: Math.min(300, Math.max(10, Number(e.target.value) || 120)),
                      },
                    }))
                  }
                />
              </div>
              <div className="setting-row">
                <div>
                  {t('演示模式', 'Demo mode')}
                  <p>
                    {t(
                      '模拟回答与示例数据，不消耗额度。',
                      'Simulated answers and usage. No API charges.',
                    )}
                  </p>
                </div>
                <Switch
                  checked={data.settings.demo}
                  onCheckedChange={(v) =>
                    update((d) => ({ ...d, settings: { ...d.settings, demo: v } }))
                  }
                  aria-label="Demo mode"
                />
              </div>
            </div>
          </Panel>
          <Panel title={t('开发者设置', 'Developer settings')}>
            <div className="panel-content">
              <div className="setting-row">
                <div>
                  {t('查看原始请求', 'Inspect raw requests')}
                  <p>
                    {t(
                      '在 Playground 中查看 JSON、响应头并导出代码。',
                      'Inspect JSON, headers and code snippets in Playground.',
                    )}
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href="/playground">
                    Playground
                    <ExternalLink size={13} />
                  </Link>
                </Button>
              </div>
              <div className="setting-row">
                <div>
                  {t('首次启动引导', 'Welcome setup')}
                  <p>
                    {t('重新选择服务商与默认模型。', 'Choose providers and a default model again.')}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    update((d) => ({ ...d, settings: { ...d.settings, onboarded: false } }))
                  }
                >
                  {t('重新打开', 'Open again')}
                </Button>
              </div>
            </div>
          </Panel>
        </div>
        <div className="stack">
          <Panel
            title={t('本机加密密钥库', 'Encrypted key vault')}
            action={
              unlocked ? (
                <UnlockKeyhole size={17} className="accent" />
              ) : (
                <LockKeyhole size={17} className="muted" />
              )
            }
          >
            <div className="panel-content">
              <p className="muted" style={{ fontSize: 13, lineHeight: 1.9, marginTop: 0 }}>
                {t(
                  'API Key 默认仅留在内存中。启用密钥库后使用 AES-GCM 加密保存在此浏览器，每次重新打开需密码解锁。密码不会上传，也无法找回。',
                  'API keys are session-only by default. The vault encrypts keys with AES-GCM in this browser. Unlock it with your password after reopening. The password is never uploaded and cannot be recovered.',
                )}
              </p>
              {unlocked ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    lockVault();
                    setUnlocked(false);
                    toast.success(t('密钥已从内存锁定', 'Keys locked and removed from memory'));
                  }}
                >
                  <LockKeyhole size={14} />
                  {t('立即锁定', 'Lock now')}
                </Button>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void unlock();
                  }}
                >
                  <label className="field">
                    <span>
                      {exists
                        ? t('密钥库密码', 'Vault password')
                        : t('设置密码（至少 10 位）', 'Create a password (10+ characters)')}
                    </span>
                    <Input
                      type="password"
                      autoComplete={exists ? 'current-password' : 'new-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      aria-label="Vault password"
                    />
                  </label>
                  <Button style={{ marginTop: 15 }} disabled={busy || !password} type="submit">
                    {busy ? <Spinner /> : <UnlockKeyhole size={14} />}{' '}
                    {exists
                      ? t('解锁密钥库', 'Unlock vault')
                      : t('启用加密保存', 'Enable encrypted storage')}
                  </Button>
                </form>
              )}
              <p className="muted" style={{ fontSize: 12, lineHeight: 1.8, marginTop: 18 }}>
                {t(
                  '解锁状态下，浏览器扩展或页面漏洞仍可能读取密钥。密钥库不加密聊天内容。',
                  'While unlocked, browser extensions or page vulnerabilities could still access keys. The vault does not encrypt conversation history.',
                )}
              </p>
              {exists && (
                <Confirm
                  title={t('删除密钥库？', 'Delete encrypted vault?')}
                  description={t(
                    '所有已保存 API Key 将删除，需要重新输入。',
                    'All saved API keys will be deleted and must be entered again.',
                  )}
                  onConfirm={() => {
                    void forgetVault()
                      .then(() => {
                        setUnlocked(false);
                        setExists(false);
                        toast.success(t('密钥库已删除', 'Vault deleted'));
                      })
                      .catch(() => toast.error(t('删除失败', 'Delete failed')));
                  }}
                >
                  <Button variant="ghost" size="sm" className="text-destructive">
                    <Trash2 size={13} />
                    {t('删除密钥库', 'Delete vault')}
                  </Button>
                </Confirm>
              )}
            </div>
          </Panel>
          <Panel title={t('数据存储与隐私', 'Data storage & privacy')}>
            <div className="panel-content">
              <div className="setting-row">
                <div>
                  {t('保存请求历史', 'Save request history')}
                  <p>
                    {t(
                      '最多 5,000 条请求、500 个会话；不保存 Key。',
                      'Up to 5,000 requests and 500 chats; keys excluded.',
                    )}
                  </p>
                </div>
                <Switch
                  checked={data.settings.saveHistory}
                  aria-label="Save request history"
                  onCheckedChange={(v) =>
                    update((d) => ({ ...d, settings: { ...d.settings, saveHistory: v } }))
                  }
                />
              </div>
              <div className="setting-row">
                <div>
                  {t('导出本机数据', 'Export local data')}
                  <p>
                    {t(
                      '包括配置和对话，不包含 API Key 或密钥库。',
                      'Includes configurations and conversations, excludes API keys and vault.',
                    )}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => download('modeldock-backup.json', JSON.stringify(data, null, 2))}
                >
                  <Download size={14} />
                  {t('导出', 'Export')}
                </Button>
              </div>
              <div className="setting-row">
                <div>
                  {t('清除所有对话与请求', 'Clear all chats & requests')}
                  <p>{t('服务商和密钥库保留。', 'Providers and the key vault remain.')}</p>
                </div>
                <Confirm
                  title={t('清除全部历史数据？', 'Clear all history?')}
                  description={t(
                    '删除真实和演示模式的所有聊天及请求记录，不可撤销。',
                    'Deletes all live and demo chats and request records. This cannot be undone.',
                  )}
                  onConfirm={() => update((d) => ({ ...d, chats: [], requests: [] }))}
                >
                  <Button variant="outline" size="sm">
                    <Trash2 size={14} />
                    {t('清除', 'Clear')}
                  </Button>
                </Confirm>
              </div>
              <div className="notice" style={{ marginTop: 20 }}>
                <ShieldCheck size={16} style={{ display: 'inline', marginRight: 6 }} />
                {t(
                  '无账号数据库、无分析追踪。浏览器直连为默认；选择转发后，Key 与对话内容会在本站服务器内存中短暂停留。',
                  'No account database or analytics. Browser direct is the default. Opting into relay sends keys and conversation content through this server transiently.',
                )}
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </main>
  );
}
