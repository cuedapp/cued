"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function StatisticsActivityChart({
  trend,
  label,
}: {
  trend: Array<{ day: string; titles: number; tooltip: string }>;
  label: string;
}) {
  const hasActivity = trend.some((item) => item.titles > 0);
  if (!hasActivity) return null;
  return (
    <div className="h-52" aria-label={label} role="img">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={trend} margin={{ top: 8, right: 4, left: -28, bottom: 0 }}>
          <XAxis
            dataKey="day"
            tickFormatter={(value) => value.slice(5)}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            minTickGap={24}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: "color-mix(in oklab, var(--primary) 10%, transparent)" }}
            content={({ active, payload }) =>
              active && payload?.[0]?.payload ? (
                <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-lg">
                  {payload[0].payload.tooltip}
                </div>
              ) : null
            }
          />
          <Bar dataKey="titles" fill="var(--primary)" radius={[5, 5, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
