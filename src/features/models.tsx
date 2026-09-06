'use client';
import { useState } from 'react';
import { Plus, Star, Pencil, Trash2, Search } from 'lucide-react';
import Link from '../components/link';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useApp } from '../store/app-store';
import {
  PageTitle,
  Button,
  Panel,
  Picker,
  Confirm,
  ProviderIcon,
  EmptyState,
} from '../components/ui';
import { DEMO_MODELS } from '../providers/demo';
import { newModel } from '../providers/catalog';
import { number, duration } from '../lib/utils';
import type { Model } from '../types';
export function Models() {
  const { data, update, providers, t } = useApp();
  const [edit, setEdit] = useState<Model | null>(null);
  const [search, setSearch] = useState('');
  const all = data.settings.demo ? DEMO_MODELS : data.models;
  const models = all.filter((m) =>
    `${m.label} ${m.name}`.toLowerCase().includes(search.toLowerCase()),
  );
  const save = () => {
    if (!edit) return;
    if (!edit.name.trim() || !edit.providerId)
      return toast.error(t('请填写模型 ID 和服务商', 'Model ID and provider are required'));
    if (
      data.models.some(
        (m) => m.id !== edit.id && m.providerId === edit.providerId && m.name === edit.name.trim(),
      )
    )
      return toast.error(t('此模型已存在', 'This model already exists'));
    update((d) => ({
      ...d,
      models: [
        ...d.models.filter((m) => m.id !== edit.id),
        { ...edit, name: edit.name.trim(), label: edit.label.trim() || edit.name.trim() },
      ],
    }));
    setEdit(null);
    toast.success(t('模型已保存', 'Model saved'));
  };
  return (
    <main className="page-body">
      <PageTitle
        title={t('模型库', 'Models')}
        subtitle={t(
          '每个模型独立配置参数、上下文与价格。价格单位：USD / 百万 Token。',
          'Configure context, capabilities and pricing per model. Prices: USD per million tokens.',
        )}
      >
        <Button
          disabled={!data.providers.length || data.settings.demo}
          onClick={() => setEdit(newModel(data.providers[0], ''))}
        >
          <Plus size={15} />
          {t('添加模型', 'Add model')}
        </Button>
      </PageTitle>
      {data.settings.demo && (
        <div className="notice" style={{ marginBottom: 20 }}>
          {t(
            '以下为演示模型与示例价格，不代表官方定价。切换真实模式管理自己的模型。',
            'Demo models use illustrative prices, not official pricing. Switch to Live mode to manage your models.',
          )}
        </div>
      )}
      <div className="toolbar">
        <div className="inline search">
          <Search size={16} className="muted" />
          <Input
            placeholder={t('搜索模型…', 'Search models…')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="muted">{models.length} models</span>
      </div>
      <Panel>
        {models.length ? (
          <Table className="data-table">
            <TableHeader>
              <TableRow>
                {[
                  t('模型 / 服务商', 'Model / provider'),
                  t('上下文', 'Context'),
                  t('输入价格', 'Input price'),
                  t('输出价格', 'Output price'),
                  t('调用次数', 'Requests'),
                  t('平均耗时', 'Avg latency'),
                  t('启用', 'Enabled'),
                  t('操作', 'Actions'),
                ].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {models.map((m) => {
                const history = data.requests.filter(
                  (r) => r.modelId === m.id && r.status === 'success',
                );
                return (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="table-model">
                        <ProviderIcon provider={providers.find((p) => p.id === m.providerId)} />
                        <span>
                          {m.label}
                          <small>
                            {providers.find((p) => p.id === m.providerId)?.name} · {m.name}
                          </small>
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="mono muted">{number(m.contextWindow)}</TableCell>
                    <TableCell className="mono">
                      {m.inputPrice === null ? 'Unknown' : `$${m.inputPrice}`}
                    </TableCell>
                    <TableCell className="mono">
                      {m.outputPrice === null ? 'Unknown' : `$${m.outputPrice}`}
                    </TableCell>
                    <TableCell className="mono">{history.length}</TableCell>
                    <TableCell className="mono muted">
                      {history.length
                        ? duration(history.reduce((s, r) => s + r.latency, 0) / history.length)
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={m.enabled}
                        disabled={data.settings.demo}
                        aria-label={`${m.label} enabled`}
                        onCheckedChange={(v) =>
                          update((d) => ({
                            ...d,
                            models: d.models.map((x) => (x.id === m.id ? { ...x, enabled: v } : x)),
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="actions">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={data.settings.demo}
                          aria-label={t('设为默认', 'Set default')}
                          onClick={() =>
                            update((d) => ({
                              ...d,
                              settings: {
                                ...d.settings,
                                defaultModel: m.id,
                                defaultProvider: m.providerId,
                              },
                            }))
                          }
                        >
                          <Star
                            size={15}
                            fill={data.settings.defaultModel === m.id ? 'currentColor' : 'none'}
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={data.settings.demo}
                          aria-label={t('编辑模型', 'Edit model')}
                          onClick={() => setEdit({ ...m })}
                        >
                          <Pencil size={15} />
                        </Button>
                        <Confirm
                          title={t('删除模型？', 'Delete model?')}
                          description={t('历史记录会保留。', 'Existing history remains.')}
                          onConfirm={() =>
                            update((d) => ({
                              ...d,
                              models: d.models.filter((x) => x.id !== m.id),
                              settings: {
                                ...d.settings,
                                defaultModel:
                                  d.settings.defaultModel === m.id ? '' : d.settings.defaultModel,
                              },
                            }))
                          }
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={data.settings.demo}
                            aria-label={t('删除模型', 'Delete model')}
                          >
                            <Trash2 size={15} />
                          </Button>
                        </Confirm>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            title={t('还没有配置模型', 'No models configured')}
            description={t(
              '先添加服务商并获取模型列表，或手动添加模型 ID。',
              'Connect a provider to import its catalog, or add a model ID manually.',
            )}
          >
            <Button variant="outline" asChild>
              <Link href="/providers">{t('配置服务商', 'Configure providers')}</Link>
            </Button>
          </EmptyState>
        )}
      </Panel>
      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('模型配置', 'Model configuration')}</DialogTitle>
            <DialogDescription>
              {t(
                '价格留空表示未知；设为 0 表示免费。历史记录保留调用时的估算金额。',
                'Blank prices mean unknown; zero means free. Historical costs keep their original estimate.',
              )}
            </DialogDescription>
          </DialogHeader>
          {edit && (
            <div className="form-grid">
              <label className="field full">
                <span>Provider</span>
                <Picker
                  value={edit.providerId}
                  onChange={(v) => setEdit({ ...edit, providerId: v })}
                  options={data.providers.map((p) => ({ value: p.id, label: p.name }))}
                />
              </label>
              <label className="field">
                <span>Model ID</span>
                <Input
                  value={edit.name}
                  onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                />
              </label>
              <label className="field">
                <span>{t('显示名称', 'Display name')}</span>
                <Input
                  value={edit.label}
                  onChange={(e) => setEdit({ ...edit, label: e.target.value })}
                />
              </label>
              {(
                [
                  { key: 'contextWindow', name: 'Context window' },
                  { key: 'inputPrice', name: 'Input / 1M tokens ($)' },
                  { key: 'outputPrice', name: 'Output / 1M tokens ($)' },
                ] as const
              ).map((f) => (
                <label className="field" key={f.key}>
                  <span>{f.name}</span>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    placeholder="Unknown"
                    value={edit[f.key] ?? ''}
                    onChange={(e) =>
                      setEdit({
                        ...edit,
                        [f.key]: e.target.value === '' ? null : Math.max(0, Number(e.target.value)),
                      })
                    }
                  />
                </label>
              ))}
              <label className="field">
                <span>Token limit field</span>
                <Picker
                  value={edit.tokenField}
                  onChange={(v) => setEdit({ ...edit, tokenField: v as Model['tokenField'] })}
                  options={[
                    { value: 'max_tokens', label: 'max_tokens' },
                    { value: 'max_completion_tokens', label: 'max_completion_tokens' },
                  ]}
                />
              </label>
              <div
                className="field full inline"
                style={{ flexDirection: 'row', justifyContent: 'space-between' }}
              >
                <span>{t('允许自定义采样参数', 'Supports custom sampling')}</span>
                <Switch
                  checked={edit.sampling}
                  onCheckedChange={(v) => setEdit({ ...edit, sampling: v })}
                  aria-label="Supports custom sampling"
                />
              </div>
            </div>
          )}
          <div className="dialog-actions">
            <Button onClick={save}>{t('保存模型', 'Save model')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
