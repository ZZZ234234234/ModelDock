import type { Usage, Model, RequestRecord } from '../types';
export function uid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export function number(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('en-US', {
    notation: value >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value);
}
export const money = (v: number | null | undefined) =>
  v == null ? 'Unknown' : `$${v.toFixed(v < 0.01 ? 5 : 3)}`;
export const duration = (v: number | null | undefined) =>
  v == null ? '—' : v < 1000 ? `${Math.round(v)} ms` : `${(v / 1000).toFixed(2)} s`;
export function estimateCost(m: Model, u: Usage): number | null {
  if (u.input === null || u.output === null || m.inputPrice === null || m.outputPrice === null)
    return null;
  return (u.input * m.inputPrice + u.output * m.outputPrice) / 1e6;
}
export function redact(value: unknown, secret = ''): unknown {
  if (typeof value === 'string') return secret ? value.split(secret).join('[REDACTED]') : value;
  if (Array.isArray(value)) return value.map((v) => redact(v, secret));
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        /authorization|api[-_]?key|secret|cookie|token$/i.test(k) &&
        !/(max|input|output|prompt|completion|total).*token/i.test(k)
          ? '[REDACTED]'
          : redact(v, secret),
      ]),
    );
  return value;
}
export function summarize(records: RequestRecord[]) {
  const success = records.filter((r) => r.status === 'success');
  const withCost = records.filter((r) => r.cost !== null);
  const knownTokens = records.filter((r) => r.usage.total !== null);
  return {
    requests: records.length,
    input: records.reduce((s, r) => s + (r.usage.input ?? 0), 0),
    output: records.reduce((s, r) => s + (r.usage.output ?? 0), 0),
    tokens: knownTokens.length
      ? knownTokens.reduce((s, r) => s + (r.usage.total ?? 0), 0)
      : records.length
        ? null
        : 0,
    cost: withCost.length
      ? withCost.reduce((s, r) => s + (r.cost ?? 0), 0)
      : records.length
        ? null
        : 0,
    unknownCost: records.length - withCost.length,
    unknownTokens: records.length - knownTokens.length,
    latency: success.length ? success.reduce((s, r) => s + r.latency, 0) / success.length : null,
    successRate: records.length ? Math.round((success.length / records.length) * 100) : null,
  };
}
export function download(name: string, text: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function toCsv(rows: (string | number | null)[][]) {
  return rows
    .map((row) =>
      row
        .map((v) => {
          const s = String(v ?? '');
          return '"' + (/^[=+@\-\t\r]/.test(s) ? "'" : '') + s.replaceAll('"', '""') + '"';
        })
        .join(','),
    )
    .join('\r\n');
}
