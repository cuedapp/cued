"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function DashboardActivityChart({
  data,
  label,
}: {
  data: Array<{ day: string; shortLabel: string; tooltip: string; titles: number }>;
  label: string;
}) {
  return (
    <div className="h-full min-h-48 w-full" aria-label={label} role="img">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -28, bottom: 0 }}>
          <XAxis
            dataKey="shortLabel"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
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
          <Bar dataKey="titles" fill="var(--primary)" radius={[5, 5, 0, 0]} maxBarSize={44} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
