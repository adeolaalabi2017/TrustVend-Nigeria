"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const PALETTE = [
  "oklch(0.52 0.12 162)", // primary emerald
  "oklch(0.68 0.13 162)", // lighter emerald
  "oklch(0.78 0.15 75)", // amber
  "oklch(0.6 0.13 200)", // teal-blue
  "oklch(0.65 0.18 340)", // pink
  "oklch(0.7 0.16 30)", // orange
  "oklch(0.72 0.15 145)", // green
  "oklch(0.75 0.13 250)", // periwinkle
  "oklch(0.7 0.14 100)", // lime
  "oklch(0.68 0.15 290)", // violet
];

export function DonutChart({
  data,
  height = 200,
}: {
  data: { name: string; value: number }[];
  height?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const hasData = total > 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="relative" style={{ width: height, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={hasData ? data : [{ name: "None", value: 1 }]}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="100%"
              paddingAngle={hasData ? 2 : 0}
              stroke="none"
            >
              {(hasData ? data : [{ name: "None", value: 1 }]).map(
                (_, i) => (
                  <Cell
                    key={i}
                    fill={hasData ? PALETTE[i % PALETTE.length] : "var(--color-muted)"}
                  />
                )
              )}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="text-center">
            <p className="text-2xl font-extrabold leading-none">{total}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Total</p>
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-2 w-full">
        {(hasData ? data : [{ name: "No data", value: 0 }]).map((d, i) => {
          const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
          return (
            <div key={d.name} className="flex items-center gap-2 text-sm">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ background: PALETTE[i % PALETTE.length] }}
              />
              <span className="flex-1 truncate text-muted-foreground">
                {d.name}
              </span>
              <span className="font-semibold tabular-nums">{d.value}</span>
              <span className="text-xs text-muted-foreground w-9 text-right tabular-nums">
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MiniBarChart({
  data,
  height = 220,
  color = "oklch(0.52 0.12 162)",
  valueSuffix = "",
}: {
  data: { label: string; count: number }[];
  height?: number;
  color?: string;
  valueSuffix?: string;
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--color-border)"
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: "oklch(0.52 0.12 162 / 0.08)" }}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid var(--color-border)",
              background: "var(--color-popover)",
              color: "var(--color-popover-foreground)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              fontSize: 12,
            }}
            formatter={(v: any) => [`${v}${valueSuffix}`, "Count"]}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={42}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.count === max && max > 0 ? color : "oklch(0.78 0.08 162)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
