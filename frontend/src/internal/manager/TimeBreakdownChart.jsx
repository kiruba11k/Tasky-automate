import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  LabelList,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { Mw as ChartTooltip, We as formatMinutes } from '@/internal/min';
import { useChartColors } from './chartTheme';

/** Truncates text with an ellipsis. (bundle: xle) */
export const truncate = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/** Keeps the first max-1 rows and folds the rest into "Other". (bundle: OM) */
export function groupRest(rows, max) {
  if (rows.length <= max) return rows;
  const rest = rows.slice(max - 1).reduce((sum, row) => sum + row.minutes, 0);
  return [...rows.slice(0, max - 1), { id: 'other-rest', label: 'Other', minutes: rest }];
}

/** Horizontal bar chart of minutes per row. (bundle: TM) */
export function TimeBreakdownChart({ title, rows, total, color }) {
  const colors = useChartColors();
  const data = rows.map((row) => ({ ...row, minutes: Math.round(row.minutes) }));
  const percent = (minutes) => (total ? Math.round((minutes / total) * 100) : 0);
  return (
    <figure className="min-w-0" data-testid={`time-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <figcaption className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
        {title}
      </figcaption>
      <div style={{ height: data.length * 34 + 6 }}>
        <ResponsiveContainer>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 96, bottom: 0, left: 0 }}
            barCategoryGap={8}
          >
            <XAxis type="number" hide domain={[0, 'dataMax']} />
            <YAxis
              type="category"
              dataKey="label"
              width={180}
              tickLine={false}
              axisLine={false}
              interval={0}
              tick={(props) => (
                <text
                  x={props.x}
                  y={props.y}
                  dy={4}
                  textAnchor="end"
                  fill={colors.ink}
                  fontSize={12}
                  className="recharts-cartesian-axis-tick-value"
                >
                  <title>{props.payload.value}</title>
                  {truncate(props.payload.value, 28)}
                </text>
              )}
            />
            <Tooltip
              cursor={{ fill: colors.surface2 }}
              content={
                <ChartTooltip
                  valueFormatter={(value) => `${formatMinutes(Number(value))} (${percent(Number(value))}%)`}
                />
              }
            />
            <Bar
              dataKey="minutes"
              name="Time"
              radius={[0, 4, 4, 0]}
              barSize={16}
              isAnimationActive={false}
            >
              {data.map((row) => (
                <Cell key={row.id} fill={color(row.id)} />
              ))}
              <LabelList
                dataKey="minutes"
                content={(props) => {
                  const { x = 0, y = 0, width = 0, height = 0, value = 0 } = props;
                  const minutes = Number(value);
                  return (
                    <text
                      x={Number(x) + Number(width) + 6}
                      y={Number(y) + Number(height) / 2}
                      dy={4}
                      fill={colors.muted}
                      fontSize={12}
                      className="tabular-nums"
                    >
                      {`${formatMinutes(minutes)} · ${percent(minutes)}%`}
                    </text>
                  );
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

export default TimeBreakdownChart;
