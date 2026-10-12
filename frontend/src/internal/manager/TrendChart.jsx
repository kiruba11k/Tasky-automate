import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Line,
} from 'recharts';
import { Yo as KPI_LABELS, Mw as ChartTooltip, Vw as formatKpi } from '@/internal/min';
import { useChartColors } from './chartTheme';

/** Y axis tick formatter for a KPI. (bundle: yle) */
const axisFormatter = (kpi) => (value) =>
  kpi === 'onTime' ? `${value}%` : kpi === 'hours' || kpi === 'extra' ? `${value}h` : String(value);

/** Line chart of one KPI across periods. (bundle: rL) */
export function TrendChart({ points, kpi, selectedKey, height = 224 }) {
  const colors = useChartColors();
  const data = points.map((p) => ({
    key: p.key,
    label: p.label,
    title: p.title,
    partial: p.partial,
    v: p.value,
  }));
  const byKey = new Map(data.map((p) => [p.key, p]));
  const hasData = data.some((p) => p.v != null && (kpi === 'onTime' || p.v > 0));

  const renderDot = (props) => {
    const { cx, cy, index, payload } = props;
    if (cx == null || cy == null || !payload || payload.v == null) {
      return <g key={`d${index}`} />;
    }
    const selected = payload.key === selectedKey;
    return (
      <g key={`d${index}`}>
        {selected && (
          <circle
            cx={cx}
            cy={cy}
            r={9}
            fill="none"
            stroke={colors.accent}
            strokeOpacity={0.45}
            strokeWidth={2}
          />
        )}
        <circle
          cx={cx}
          cy={cy}
          r={selected ? 5 : 4}
          fill={payload.partial ? colors.surface : colors.accent}
          stroke={colors.accent}
          strokeWidth={2}
        />
      </g>
    );
  };

  return (
    <div data-testid="kpi-trend" data-kpi={kpi} className="relative" style={{ height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 12, right: 16, left: -6, bottom: 0 }}>
          <CartesianGrid stroke={colors.line} vertical={false} />
          <XAxis
            dataKey="key"
            stroke={colors.muted}
            fontSize={12}
            tickLine={false}
            tickFormatter={(key) => byKey.get(key)?.label ?? key}
            minTickGap={14}
          />
          <YAxis
            stroke={colors.muted}
            fontSize={12}
            width={46}
            tickLine={false}
            allowDecimals={kpi === 'hours' || kpi === 'extra'}
            domain={
              kpi === 'onTime'
                ? [0, 100]
                : [0, (max) => Math.max(kpi === 'resubmits' ? 2 : 1, Math.ceil(max * 1.15))]
            }
            tickFormatter={axisFormatter(kpi)}
          />
          <Tooltip
            cursor={{ stroke: colors.line, strokeWidth: 1 }}
            content={
              <ChartTooltip
                labelFormatter={(label) => {
                  const point = byKey.get(String(label));
                  return point ? `${point.title}${point.partial ? ' (so far)' : ''}` : String(label);
                }}
                valueFormatter={(value) => formatKpi(kpi, Number(value))}
              />
            }
          />
          {kpi === 'onTime' && <ReferenceLine y={80} stroke={colors.muted} strokeDasharray="4 4" />}
          <Line
            type="monotone"
            dataKey="v"
            name={KPI_LABELS[kpi]}
            stroke={colors.accent}
            strokeWidth={3}
            connectNulls
            dot={renderDot}
            activeDot={{ r: 6, stroke: colors.surface, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      {!hasData && (
        <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted">
          Nothing recorded for this KPI yet.
        </p>
      )}
    </div>
  );
}

export default TrendChart;
