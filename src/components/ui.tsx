'use client';
import type { ReactNode } from 'react';
import { Copy, Check, Inbox, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Empty } from '@/components/ui/empty';
import { preset } from '../providers/catalog';
import { useApp } from '../store/app-store';
import type { Provider } from '../types';
export { Button };
export function Picker({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
}: {
  value: string;
  onChange: (s: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value || '__none'}
      onValueChange={(v) => onChange(v === '__none' ? '' : v)}
      disabled={disabled}
    >
      <SelectTrigger className="select-control" aria-label={placeholder}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none">{placeholder ?? '—'}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export function ProviderIcon({ provider, index = 0 }: { provider?: Provider; index?: number }) {
  const p =
    provider?.kind === 'demo'
      ? preset(
          ['openai', 'anthropic', 'gemini', 'deepseek'][
            Number(provider.id.slice(-1))
          ] as Provider['kind'],
        )
      : preset(provider?.kind ?? 'custom');
  return (
    <span className="provider-icon" style={{ color: p.color }} aria-hidden="true">
      {p.symbol ?? index}
    </span>
  );
}
export function Status({ status, demo = false }: { status: string; demo?: boolean }) {
  const { t } = useApp();
  return (
    <span
      className={`badge ${status === 'connected' || status === 'success' ? 'green' : status === 'error' ? 'error' : ''}`}
    >
      {status === 'connected' && <i className="status-dot" />}
      {demo
        ? 'DEMO'
        : ({
            connected: t('已连接', 'Connected'),
            unconfigured: t('未验证', 'Not verified'),
            error: t('失败', 'Failed'),
            success: t('成功', 'Success'),
            cancelled: t('已停止', 'Stopped'),
            disabled: t('已停用', 'Disabled'),
          }[status] ?? status)}
    </span>
  );
}
export function PageTitle({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="actions">{children}</div>}
    </div>
  );
}
export function Panel({
  title,
  action,
  children,
  className = '',
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-title">
          <h2>{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <Empty className="empty-state">
      <Inbox size={30} strokeWidth={1.3} />
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </Empty>
  );
}
export function CopyButton({ text, label = false }: { text: string; label?: boolean }) {
  const [done, setDone] = useState(false);
  const { t } = useApp();
  return (
    <Button
      size="sm"
      variant="ghost"
      title={t('复制', 'Copy')}
      aria-label={t('复制', 'Copy')}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          toast.error(t('复制失败，请手动选择文本', 'Copy failed. Select the text manually.'));
        }
      }}
    >
      {done ? <Check size={14} /> : <Copy size={14} />}{' '}
      {label && (done ? t('已复制', 'Copied') : t('复制', 'Copy'))}
    </Button>
  );
}
export function Confirm({
  children,
  title,
  description,
  onConfirm,
}: {
  children: ReactNode;
  title: string;
  description: string;
  onConfirm: () => void;
}) {
  const { t } = useApp();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('取消', 'Cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{t('确认', 'Confirm')}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
export function Spinner() {
  return <LoaderCircle size={16} className="spinning" />;
}
