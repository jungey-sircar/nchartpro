'use client';

/**
 * Reusable 3-line recharts line chart.
 * Designed for broker time-series analysis (buy qty, sell qty, holding),
 * but accepts generic line names so it can be reused anywhere.
 *
 * Usage:
 *   import BrokerLineChart, { type LinePoint } from '@/app/components/BrokerLineChart';
 *
 *   <BrokerLineChart data={points} line1="Buy" line2="Sell" line3="Holding" />
 */

import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';

export interface LinePoint {
  name: string;          // x-axis label (e.g. date or day number)
  [key: string]: number | string;
}

interface Props {
  data: LinePoint[];
  line1?: string;  // defaults: "Buy Qty"
  line2?: string;  // defaults: "Sell Qty"
  line3?: string;  // defaults: "Holding"
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
}

const COLORS = {
  line1: '#34d399',  // --color-up   (buy = green)
  line2: '#f87171',  // --color-down (sell = red)
  line3: '#60a5fa',  // --color-info (holding = blue)
};

export default function BrokerLineChart({
  data,
  line1 = 'Buy Qty',
  line2 = 'Sell Qty',
  line3 = 'Holding',
  height = 220,
  showLegend = true,
  showGrid = true,
}: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
      >
        {showGrid && (
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
          />
        )}
        <XAxis
          dataKey="name"
          stroke="var(--text-muted)"
          tick={{ fontSize: 9, fill: 'var(--text-muted)', fontWeight: 400 }}
          axisLine={{ stroke: 'var(--border)' }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          stroke="var(--text-muted)"
          tick={{ fontSize: 9, fill: 'var(--text-muted)', fontWeight: 400 }}
          axisLine={false}
          tickLine={false}
          width={42}
          tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
        />
        <Tooltip
          cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
          contentStyle={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border)',
            borderRadius: 6,
            fontSize: 11,
            color: 'var(--text-primary)',
          }}
          labelStyle={{ color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4 }}
          formatter={(value, name) => {
            const n = typeof value === 'number' ? value : Number(value);
            return [n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(value), name];
          }}
        />
        {showLegend && (
          <Legend
            iconSize={8}
            iconType="circle"
            wrapperStyle={{ fontSize: 10, color: 'var(--text-secondary)' }}
          />
        )}
        <Line
          type="monotone"
          dataKey={line1}
          stroke={COLORS.line1}
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 4, stroke: 'var(--bg-elevated)', strokeWidth: 1 }}
        />
        <Line
          type="monotone"
          dataKey={line2}
          stroke={COLORS.line2}
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 4, stroke: 'var(--bg-elevated)', strokeWidth: 1 }}
        />
        <Line
          type="monotone"
          dataKey={line3}
          stroke={COLORS.line3}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, stroke: 'var(--bg-elevated)', strokeWidth: 1 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
