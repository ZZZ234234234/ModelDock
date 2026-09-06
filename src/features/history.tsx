'use client';
import { useState } from 'react';
import { useSearchParams } from '../components/link';
import Link from '../components/link';
import { Search, Download, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem } from '@/components/ui/pagination';
import { useApp } from '../store/app-store';
import {
  PageTitle,
  Panel,
  Button,
  Picker,
  Status,
  Confirm,
  CopyButton,
  EmptyState,
} from '../components/ui';
import { Markdown } from '../components/markdown';
import { number, money, duration, download } from '../lib/utils';
export function History() {
  const { data, update, t } = useApp();
  const query = useSearchParams();
  const [selected, setSelected] = useState(query.get('request') ?? '');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const records = data.requests.filter(
    (r) =>
      r.demo === data.settings.demo &&
      (!status || r.status === status) &&
      `${r.modelName} ${r.messages.map((m) => m.content).join(' ')} ${r.providerName}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const lastPage = Math.max(0, Math.ceil(records.length / 20) - 1);
  const currentPage = Math.min(page, lastPage);
  const record = data.requests.find((r) => r.id === selected);
  return (
    <main className="page-body">
      <PageTitle
        title={t('请求历史', 'Request history')}
        subtitle={t(
          '完整请求、完整回答，以及失败的原因。',
          'Full requests, full answers, and the reason when something fails.',
        )}
      >
        <Confirm
          title={t('清除当前模式的所有历史？', 'Clear history for this mode?')}
          description={t(
            '此操作不可撤销。聊天会话仍保留。',
            'This cannot be undone. Chat sessions are retained.',
          )}
          onConfirm={() =>
            update((d) => ({
              ...d,
              requests: d.requests.filter((r) => r.demo !== d.settings.demo),
            }))
          }
        >
          <Button variant="outline">
            <Trash2 size={15} />
            {t('清除', 'Clear')}
          </Button>
        </Confirm>
        <Button
          variant="outline"
          onClick={() => download('modeldock-history.json', JSON.stringify(records, null, 2))}
        >
          <Download size={15} />
          {t('导出', 'Export')}
        </Button>
      </PageTitle>
      <div className="toolbar">
        <div className="search inline">
          <Search size={16} className="muted" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder={t('搜索问题、模型或服务商…', 'Search prompt, model or provider…')}
          />
        </div>
        <div style={{ width: 170 }}>
          <Picker
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(0);
            }}
            placeholder={t('所有状态', 'All statuses')}
            options={[
              { value: 'success', label: t('成功', 'Success') },
              { value: 'error', label: t('失败', 'Failed') },
              { value: 'cancelled', label: t('已停止', 'Stopped') },
            ]}
          />
        </div>
        <span className="muted" style={{ marginLeft: 'auto' }}>
          {records.length} {t('条请求', 'requests')}
        </span>
      </div>
      {!data.settings.saveHistory && (
        <div className="notice" style={{ marginBottom: 20 }}>
          {t(
            '请求历史保存已关闭，可在设置中开启。',
            'Request history saving is off. Enable it in Settings.',
          )}
        </div>
      )}
      <Panel>
        {records.length ? (
          <Table className="data-table">
            <TableHeader>
              <TableRow>
                {[
                  t('时间', 'Time'),
                  t('模型', 'Model'),
                  t('问题', 'Prompt'),
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
              {records.slice(currentPage * 20, currentPage * 20 + 20).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="mono muted">
                    {new Date(r.time).toLocaleString(
                      data.settings.language === 'zh' ? 'zh-CN' : 'en-US',
                      { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' },
                    )}
                  </TableCell>
                  <TableCell>
                    <button onClick={() => setSelected(r.id)} style={{ textAlign: 'left' }}>
                      {r.modelName}
                      <small className="muted" style={{ display: 'block', marginTop: 3 }}>
                        {r.providerName}
                      </small>
                    </button>
                  </TableCell>
                  <TableCell>
                    <button
                      className="text-ellipsis"
                      style={{ textAlign: 'left' }}
                      onClick={() => setSelected(r.id)}
                    >
                      {r.messages.find((m) => m.role === 'user')?.content ?? '—'}
                    </button>
                  </TableCell>
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
            title={t('没有请求记录', 'No request history')}
            description={t(
              '尝试调整筛选，或开始一次新的对话。',
              'Try adjusting your filters, or start a conversation.',
            )}
          >
            <Button asChild variant="outline">
              <Link href="/chat">{t('开始对话', 'Start chatting')}</Link>
            </Button>
          </EmptyState>
        )}
      </Panel>
      <Pagination style={{ marginTop: 20 }}>
        <PaginationContent>
          <PaginationItem>
            <Button
              variant="outline"
              size="sm"
              aria-label={t('上一页', 'Previous page')}
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            >
              <ChevronLeft size={14} />
            </Button>
          </PaginationItem>
          <PaginationItem>
            <span className="muted" style={{ padding: 15 }}>
              {currentPage + 1} / {lastPage + 1}
            </span>
          </PaginationItem>
          <PaginationItem>
            <Button
              variant="outline"
              size="sm"
              aria-label={t('下一页', 'Next page')}
              disabled={currentPage === lastPage}
              onClick={() => setPage(currentPage + 1)}
            >
              <ChevronRight size={14} />
            </Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
      <Sheet open={!!record} onOpenChange={(v) => !v && setSelected('')}>
        <SheetContent
          className="sm:max-w-2xl"
          style={{ width: '95vw', overflowY: 'auto', padding: 24 }}
        >
          {record && (
            <>
              <SheetHeader>
                <SheetTitle>{record.modelName}</SheetTitle>
                <SheetDescription>
                  {record.providerName} · {new Date(record.time).toLocaleString()} · {record.source}
                </SheetDescription>
              </SheetHeader>
              <div className="message-foot" style={{ marginBottom: 25 }}>
                <Status status={record.status} />
                <span>{duration(record.latency)}</span>
                <span>{number(record.usage.total)} tokens</span>
                <span>{money(record.cost)}</span>
                <CopyButton text={JSON.stringify(record, null, 2)} label />
              </div>
              {record.error && <div className="notice error-box">{record.error}</div>}
              <Tabs defaultValue="conversation">
                <TabsList>
                  <TabsTrigger value="conversation">{t('对话', 'Conversation')}</TabsTrigger>
                  <TabsTrigger value="request">Request JSON</TabsTrigger>
                  <TabsTrigger value="response">Response JSON</TabsTrigger>
                </TabsList>
                <TabsContent value="conversation">
                  {record.messages.map((m) => (
                    <div key={m.id} style={{ margin: '20px 0' }}>
                      <span className="eyebrow muted">{m.role}</span>
                      <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, marginTop: 10 }}>
                        {m.content}
                      </p>
                    </div>
                  ))}
                  <div className="eyebrow muted" style={{ marginTop: 25 }}>
                    Assistant
                  </div>
                  <Markdown text={record.response} />
                </TabsContent>
                <TabsContent value="request">
                  <pre className="json-view">{JSON.stringify(record.request, null, 2)}</pre>
                </TabsContent>
                <TabsContent value="response">
                  <pre className="json-view">
                    {JSON.stringify(
                      {
                        usage: record.usage,
                        headers: record.headers,
                        response: record.raw,
                        error: record.error,
                      },
                      null,
                      2,
                    )}
                  </pre>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </main>
  );
}
