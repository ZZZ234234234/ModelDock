'use client';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useState } from 'react';
import type { RequestRecord } from '../types';
import { number, money } from '../lib/utils';
export function TrendChart({
  records,
  metric = 'tokens',
  days = 7,
}: {
  records: RequestRecord[];
  metric?: 'tokens' | 'cost' | 'requests' | 'latency';
  days?: number;
}) {
  const [clock] = useState(() => Date.now());
  const now = records.length ? Math.max(clock, records[0].time) : clock;
  const count =
    days === 0
      ? Math.min(
          90,
          Math.max(
            7,
            Math.ceil((now - Math.min(...records.map((r) => r.time), now)) / 86400000) + 1,
          ),
        )
      : days;
  const points = Array.from({ length: count }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (count - 1 - i));
    d.setHours(0, 0, 0, 0);
    const group = records.filter((r) => r.time >= +d && r.time < +d + 86400000);
    const value =
      metric === 'tokens'
        ? group.reduce((s, r) => s + (r.usage.total ?? 0), 0)
        : metric === 'cost'
          ? group.reduce((s, r) => s + (r.cost ?? 0), 0)
          : metric === 'requests'
            ? group.length
            : group.length
              ? group.reduce((s, r) => s + r.latency, 0) / group.length
              : 0;
    return { date: d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }), value };
  });
  return (
    <div className="chart-box">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 12, bottom: 5, left: 0 }}>
          <defs>
            <linearGradient id={`fill-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.18} />
              <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 5" vertical={false} />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            minTickGap={25}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            width={54}
            tickFormatter={(v) => (metric === 'cost' ? `$${v}` : number(v))}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--popover)',
              border: '1px solid var(--border)',
              borderRadius: 5,
              color: 'var(--foreground)',
              fontSize: 12,
            }}
            formatter={(v) => [metric === 'cost' ? money(Number(v)) : number(Number(v)), metric]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill={`url(#fill-${metric})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
