'use client';
import Link from '../components/link';
import {
  ArrowUpRight,
  Plus,
  ArrowRight,
  Activity,
  Layers,
  Plug,
  Zap,
  Coins,
  Timer,
  ShieldCheck,
  GitCompareArrows,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useApp } from '../store/app-store';
import { Button, PageTitle, Panel, ProviderIcon, Status, EmptyState } from '../components/ui';
import { TrendChart } from '../components/charts';
import { number, money, duration, summarize } from '../lib/utils';
export function Dashboard() {
  const { data, providers, models, t } = useApp();
  const records = data.requests.filter((r) => r.demo === data.settings.demo);
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const stats = summarize(records.filter((r) => r.time >= +midnight));
  const active = providers.filter((p) => p.enabled && p.status === 'connected');
  const statsList = [
    {
      label: t('已连接服务商', 'Connected providers'),
      value: number(active.length),
      icon: Plug,
      note: t('统一接入，一个工作台', 'One unified workspace'),
    },
    {
      label: t('可用模型', 'Available models'),
      value: number(models.length),
      icon: Layers,
      note: t('已启用的模型配置', 'Enabled model configurations'),
    },
    {
      label: t('今日请求', 'Requests today'),
      value: number(stats.requests),
      icon: Activity,
      note: t('包含成功、失败与停止', 'Success, failed and stopped'),
    },
    {
      label: t('今日 Token', 'Tokens today'),
      value: number(stats.tokens),
      icon: Zap,
      note: stats.unknownTokens
        ? `${stats.unknownTokens} ${t('条用量未知', 'unknown usage')}`
        : `${number(stats.input)} in / ${number(stats.output)} out`,
    },
    {
      label: t('预估费用', 'Estimated cost'),
      value: money(stats.cost),
      icon: Coins,
      note: stats.unknownCost
        ? `${stats.unknownCost} ${t('条费用未知', 'unknown costs')}`
        : t('USD · 按模型价格估算', 'USD · configured model prices'),
    },
    {
      label: t('平均响应时间', 'Average latency'),
      value: duration(stats.latency),
      icon: Timer,
      note: t('成功请求的完整生成耗时', 'Total duration of successful requests'),
    },
  ];
  return (
    <div className="page-with-aside">
      <main className="page-body">
        <PageTitle title={t('工作台概览', 'Overview')} subtitle="One dashboard for every AI model.">
          <Button variant="outline" asChild>
            <Link href="/compare">
              <GitCompareArrows size={15} />
              {t('模型对比', 'Compare models')}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/providers">
              <Plus size={15} />
              {t('接入服务商', 'Add provider')}
            </Link>
          </Button>
        </PageTitle>
        <div className="metric-grid">
          {statsList.map((s) => (
            <div className="metric" key={s.label}>
              <div className="metric-label">
                <s.icon size={14} />
                {s.label}
              </div>
              <span className="metric-value">{s.value}</span>
              <span className="metric-note">{s.note}</span>
            </div>
          ))}
        </div>
        <div className="two-cols">
          <Panel
            title={t('Token 使用趋势', 'Token usage')}
            action={<span className="badge">{t('近 7 天', 'Last 7 days')}</span>}
          >
            <TrendChart records={records} />
            <div className="inline muted" style={{ padding: '0 20px 18px', fontSize: 12 }}>
              <span className="status-dot accent" />
              {t('输入 + 输出 Token', 'Input + output tokens')}
              <span style={{ marginLeft: 'auto' }}>
                {data.settings.demo
                  ? t('演示数据', 'Simulated data')
                  : t('来自服务商返回的用量', 'Provider-reported usage')}
              </span>
            </div>
          </Panel>
          <Panel
            title={t('服务商连接', 'Provider connections')}
            action={
              <Link className="link-button" href="/providers">
                {t('管理', 'Manage')}
                <ArrowUpRight size={14} />
              </Link>
            }
          >
            {providers.length ? (
              providers.slice(0, 4).map((p) => (
                <div className="provider-row" key={p.id}>
                  <ProviderIcon provider={p} />
                  <div className="fill">
                    <strong>{p.name}</strong>
                    <p>
                      {models.filter((m) => m.providerId === p.id).length} {t('个模型', 'models')} ·{' '}
                      {p.kind === 'demo'
                        ? 'Simulated'
                        : p.transport === 'direct'
                          ? 'Direct'
                          : 'Relay'}
                    </p>
                  </div>
                  <Status status={p.enabled ? p.status : 'disabled'} demo={p.kind === 'demo'} />
                </div>
              ))
            ) : (
              <EmptyState
                title={t('连接你的第一个模型', 'Connect your first provider')}
                description={t(
                  '支持 OpenAI、DeepSeek、Claude 等主流平台。',
                  'Connect OpenAI, DeepSeek, Claude and more.',
                )}
              >
                <Button asChild variant="outline">
                  <Link href="/providers">{t('开始配置', 'Configure')}</Link>
                </Button>
              </EmptyState>
            )}
            <Link
              href="/providers"
              className="provider-row link-button"
              style={{ justifyContent: 'center' }}
            >
              <Plus size={14} />
              {t('添加更多服务商', 'Connect another provider')}
            </Link>
          </Panel>
        </div>
        <Panel
          title={t('最近请求', 'Recent requests')}
          action={
            <Link className="link-button" href="/history">
              {t('查看全部', 'View all')}
              <ArrowRight size={14} />
            </Link>
          }
        >
          {records.length ? (
            <Table className="data-table">
              <TableHeader>
                <TableRow>
                  {[
                    t('模型', 'Model'),
                    t('来源', 'Source'),
                    t('状态', 'Status'),
                    'Tokens',
                    t('耗时', 'Latency'),
                    t('费用', 'Cost'),
                  ].map((h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.slice(0, 5).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link href={`/history?request=${r.id}`} className="table-model">
                        <ProviderIcon provider={providers.find((p) => p.id === r.providerId)} />
                        <span>
                          {r.modelName}
                          <small>{r.providerName}</small>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="muted">{r.source}</TableCell>
                    <TableCell>
                      <Status status={r.status} />
                    </TableCell>
                    <TableCell className="mono">{number(r.usage.total)}</TableCell>
                    <TableCell className="mono muted">{duration(r.latency)}</TableCell>
                    <TableCell className="mono muted">{money(r.cost)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              title={t('还没有请求', 'No requests yet')}
              description={t(
                '开始一次对话，这里会记录实际用量。',
                'Start a conversation to see real usage here.',
              )}
            />
          )}
        </Panel>
      </main>
      <aside className="rail">
        <div className="rail-section">
          <div className="inline" style={{ justifyContent: 'space-between' }}>
            <h3>{t('工作空间', 'WORKSPACE')}</h3>
            <span className="badge green">{data.settings.demo ? 'DEMO' : 'LOCAL'}</span>
          </div>
          <div className="rail-item">
            <span className="muted">{t('已启用服务商', 'Enabled providers')}</span>
            <span>{providers.filter((p) => p.enabled).length}</span>
          </div>
          <div className="rail-item">
            <span className="muted">{t('当前成功率', 'Success rate')}</span>
            <span className="accent">
              {stats.successRate === null ? '—' : `${stats.successRate}%`}
            </span>
          </div>
          <div className="mini-bars">
            {records
              .slice(0, 28)
              .reverse()
              .map((r) => (
                <span
                  key={r.id}
                  title={`${r.modelName} · ${duration(r.latency)}`}
                  style={{
                    height: `${Math.min(100, Math.max(10, r.latency / 35))}%`,
                    background: r.status === 'error' ? 'var(--destructive)' : undefined,
                  }}
                />
              ))}
          </div>
          <span className="version">
            {t('最近请求 · 完整生成耗时', 'Recent requests · total latency')}
          </span>
        </div>
        <div className="rail-section">
          <h3>{t('常用模型', 'RECENT MODELS')}</h3>
          {[...new Set(records.map((r) => r.modelId))].slice(0, 4).map((id) => {
            const m = models.find((m) => m.id === id);
            return m ? (
              <Link key={id} href={`/chat?model=${id}`} className="rail-item">
                <span>{m.label}</span>
                <ArrowUpRight size={14} className="muted" />
              </Link>
            ) : null;
          })}
          {!records.length && (
            <p>{t('你的常用模型会出现在这里。', 'Your recent models will appear here.')}</p>
          )}
        </div>
        <div className="rail-section">
          <ShieldCheck size={22} className="muted" />
          <h3 style={{ margin: '14px 0 8px' }}>
            {t('你的数据，留在本机', 'Your data stays yours')}
          </h3>
          <p>
            {t(
              '配置与对话保存在此浏览器。API Key 可加密保存，随时导出或清除记录。',
              'Configurations and conversations stay in this browser. Encrypt keys, export records, or clear your data at any time.',
            )}
          </p>
          <Link href="/settings" className="link-button">
            {t('隐私与存储', 'Privacy & storage')}
            <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="version">
          ModelDock v1.0.0
          <br />
          <br />
          Built for the way you build.
        </div>
      </aside>
    </div>
  );
}
