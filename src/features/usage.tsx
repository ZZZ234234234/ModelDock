'use client';
import { useState } from 'react';
import { Download } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useApp } from '../store/app-store';
import { Panel, PageTitle, Button, Picker } from '../components/ui';
import { TrendChart } from '../components/charts';
import { summarize, number, money, duration, toCsv, download } from '../lib/utils';
export function UsagePage() {
  const { data, providers, models, t } = useApp();
  const [days, setDays] = useState('7');
  const [providerId, setProviderId] = useState('');
  const [modelId, setModelId] = useState('');
  const [date, setDate] = useState('');
  const [group, setGroup] = useState('model');
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (days !== '0') start.setDate(start.getDate() - (Number(days) - 1));
  const records = data.requests.filter(
    (r) =>
      r.demo === data.settings.demo &&
      (days === '0' || r.time >= +start) &&
      (!providerId || r.providerId === providerId) &&
      (!modelId || r.modelId === modelId) &&
      (!date || new Date(r.time).toLocaleDateString('en-CA') === date),
  );
  const s = summarize(records);
  const groups = [
    ...new Set(records.map((r) => (group === 'provider' ? r.providerName : r.modelName))),
  ]
    .map((name) => ({
      name,
      ...summarize(
        records.filter((r) => (group === 'provider' ? r.providerName : r.modelName) === name),
      ),
    }))
    .sort((a, b) => b.requests - a.requests);
  return (
    <main className="page-body">
      <PageTitle
        title={t('用量统计', 'Usage & costs')}
        subtitle={t('每一次调用，都有迹可循。', 'A clear picture of every API call.')}
      >
        <Button
          variant="outline"
          onClick={() =>
            download(
              'modeldock-usage.csv',
              toCsv([
                [
                  'Time',
                  'Provider',
                  'Model',
                  'Status',
                  'Input',
                  'Output',
                  'Total',
                  'Estimated USD',
                  'Latency ms',
                  'Demo',
                ],
                ...records.map((r) => [
                  new Date(r.time).toISOString(),
                  r.providerName,
                  r.modelName,
                  r.status,
                  r.usage.input,
                  r.usage.output,
                  r.usage.total,
                  r.cost,
                  Math.round(r.latency),
                  String(r.demo),
                ]),
              ]),
              'text/csv;charset=utf-8',
            )
          }
        >
          <Download size={15} />
          {t('导出 CSV', 'Export CSV')}
        </Button>
      </PageTitle>
      <div className="toolbar">
        <Tabs value={days} onValueChange={setDays}>
          <TabsList>
            {[
              ['1', t('今天', 'Today')],
              ['7', t('7 天', '7 days')],
              ['30', t('30 天', '30 days')],
              ['0', t('全部', 'All time')],
            ].map(([v, l]) => (
              <TabsTrigger key={v} value={v}>
                {l}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div style={{ width: 185 }}>
          <Picker
            value={providerId}
            onChange={(v) => {
              setProviderId(v);
              setModelId('');
            }}
            placeholder={t('所有服务商', 'All providers')}
            options={providers.map((p) => ({ value: p.id, label: p.name }))}
          />
        </div>
        <div style={{ width: 185 }}>
          <Picker
            value={modelId}
            onChange={setModelId}
            placeholder={t('所有模型', 'All models')}
            options={models
              .filter((m) => !providerId || m.providerId === providerId)
              .map((m) => ({ value: m.id, label: m.label }))}
          />
        </div>
        <input
          type="date"
          className="rounded-md border border-input px-3 py-2 bg-transparent"
          aria-label={t('按日期筛选', 'Filter by date')}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <div className="metric-grid">
        {[
          {
            label: t('总请求', 'Total requests'),
            value: number(s.requests),
            note: `${s.successRate ?? '—'}% ${t('成功率', 'success rate')}`,
          },
          {
            label: t('总 Token', 'Total tokens'),
            value: number(s.tokens),
            note: `${number(s.input)} in / ${number(s.output)} out`,
          },
          {
            label: t('预估费用', 'Estimated cost'),
            value: money(s.cost),
            note: t('USD · 仅已知费用之和', 'USD · sum of known costs'),
          },
          {
            label: t('输入 Token', 'Input tokens'),
            value: number(s.input),
            note: t('服务商已返回的输入用量', 'Reported input usage'),
          },
          {
            label: t('输出 Token', 'Output tokens'),
            value: number(s.output),
            note: t('含服务商报告的推理用量', 'Includes reported reasoning usage'),
          },
          {
            label: t('平均耗时', 'Average latency'),
            value: duration(s.latency),
            note: t('成功请求的完整生成时间', 'Total generation, successful requests'),
          },
        ].map((m) => (
          <div className="metric" key={m.label}>
            <span className="metric-label">{m.label}</span>
            <span className="metric-value">{m.value}</span>
            <span className="metric-note">{m.note}</span>
          </div>
        ))}
      </div>
      {(s.unknownCost > 0 || s.unknownTokens > 0) && (
        <div className="notice" style={{ marginBottom: 22 }}>
          {t(
            `${s.unknownCost} 条请求费用未知，${s.unknownTokens} 条请求用量未知；图表和合计仅统计已知值。`,
            `${s.unknownCost} requests have unknown costs; ${s.unknownTokens} have unknown usage. Charts and totals include known values only.`,
          )}
        </div>
      )}
      <div className="two-cols">
        {[
          { label: t('Token 趋势', 'Token usage'), metric: 'tokens' },
          { label: t('费用趋势', 'API cost'), metric: 'cost' },
          { label: t('请求趋势', 'Requests'), metric: 'requests' },
          { label: t('响应耗时', 'Latency'), metric: 'latency' },
        ].map((c) => (
          <Panel key={c.metric} title={c.label}>
            <TrendChart records={records} metric={c.metric as 'tokens'} days={Number(days)} />
          </Panel>
        ))}
      </div>
      <Panel
        title={t('使用排行', 'Usage ranking')}
        action={
          <Tabs value={group} onValueChange={setGroup}>
            <TabsList>
              <TabsTrigger value="model">Model</TabsTrigger>
              <TabsTrigger value="provider">Provider</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      >
        <Table className="data-table">
          <TableHeader>
            <TableRow>
              {[
                group === 'model' ? 'Model' : 'Provider',
                t('占比', 'Share'),
                t('请求', 'Requests'),
                'Tokens',
                t('费用', 'Cost'),
                t('耗时', 'Latency'),
              ].map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((g) => (
              <TableRow key={g.name}>
                <TableCell>{g.name}</TableCell>
                <TableCell>
                  <div className="inline">
                    <span
                      style={{
                        height: 4,
                        width: Math.max(2, (g.requests / (s.requests || 1)) * 90),
                        background: 'var(--primary)',
                        display: 'inline-block',
                      }}
                    />
                    <span className="muted">
                      {Math.round((g.requests / (s.requests || 1)) * 100)}%
                    </span>
                  </div>
                </TableCell>
                <TableCell>{g.requests}</TableCell>
                <TableCell className="mono">{number(g.tokens)}</TableCell>
                <TableCell className="mono">{money(g.cost)}</TableCell>
                <TableCell className="mono muted">{duration(g.latency)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
      <p className="footer-note">
        {t(
          '费用为手动价格配置的估算，不含缓存折扣、阶梯定价、税费或额外工具调用费。',
          'Estimates use configured prices and exclude cache discounts, tier pricing, taxes and tool fees.',
        )}
      </p>
    </main>
  );
}
