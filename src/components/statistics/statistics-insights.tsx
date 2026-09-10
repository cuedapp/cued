"use client";

import { Fragment, useState } from "react";
import {
  Button as AriaButton,
  Tooltip as AriaTooltip,
  TooltipTrigger as AriaTooltipTrigger,
} from "react-aria-components";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Treemap,
  type TreemapNode,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const colors = [
  "var(--primary)",
  "oklch(0.68 0.13 168)",
  "oklch(0.7 0.14 250)",
  "oklch(0.75 0.13 90)",
  "oklch(0.66 0.15 320)",
  "oklch(0.65 0.09 220)",
];
type Labels = {
  insightsTitle: string;
  insightsDescription: string;
  chart: string;
  table: string;
  empty: string;
  genres: string;
  completionTypes: string;
  ratings: string;
  viewingTimes: string;
  movie: string;
  series: string;
  count: string;
  viewingShare: string;
  hourlyBreakdown: string;
  noViewingActivity: string;
  days: Record<number, string>;
};
type Insights = {
  genres: Array<{ name: string; count: number }>;
  completionTypes: Array<{ type: "movie" | "series"; count: number }>;
  ratings: Array<{ rating: number; count: number }>;
  viewingTimes: Array<{ day: number; hour: number; count: number }>;
};

export function StatisticsInsights({ insights, labels }: { insights: Insights; labels: Labels }) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const hasData =
    insights.genres.length + insights.completionTypes.length + insights.ratings.length + insights.viewingTimes.length >
    0;
  const completionData = insights.completionTypes.map((item) => ({ name: labels[item.type], count: item.count }));
  const ratingData = [1, 2, 3, 4, 5].map((rating) => ({
    name: `${rating} / 5`,
    rating,
    count: insights.ratings.find((item) => item.rating === rating)?.count ?? 0,
  }));
  const viewingTable = insights.viewingTimes
    .map((item) => ({ name: `${labels.days[item.day]} · ${String(item.hour).padStart(2, "0")}:00`, count: item.count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 12);
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight">{labels.insightsTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{labels.insightsDescription}</p>
        </div>
        <div className="flex w-fit rounded-lg bg-muted p-1" aria-label={`${labels.chart} / ${labels.table}`}>
          <Button
            size="sm"
            variant={view === "chart" ? "default" : "ghost"}
            aria-pressed={view === "chart"}
            onClick={() => setView("chart")}
          >
            {labels.chart}
          </Button>
          <Button
            size="sm"
            variant={view === "table" ? "default" : "ghost"}
            aria-pressed={view === "table"}
            onClick={() => setView("table")}
          >
            {labels.table}
          </Button>
        </div>
      </div>
      {!hasData ? (
        <Card>
          <CardContent className="grid min-h-48 place-items-center text-sm text-muted-foreground">
            {labels.empty}
          </CardContent>
        </Card>
      ) : view === "chart" ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <GenreRanking title={labels.genres} data={insights.genres} />
          <CompletionPie title={labels.completionTypes} data={completionData} />
          <RatingArea title={labels.ratings} data={ratingData} />
          <ViewingHeatmap title={labels.viewingTimes} data={insights.viewingTimes} labels={labels} />
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <DataTable title={labels.genres} data={insights.genres} countLabel={labels.count} />
          <DataTable title={labels.completionTypes} data={completionData} countLabel={labels.count} />
          <DataTable title={labels.ratings} data={ratingData} countLabel={labels.count} />
          <DataTable title={labels.viewingTimes} data={viewingTable} countLabel={labels.count} />
        </div>
      )}
    </section>
  );
}

export function UserComparisonChart({
  users,
  title,
  description,
  watchTimeLabel,
  completedLabel,
  ratingsLabel,
}: {
  users: Array<{ name: string; watchHours: number; completed: number; ratings: number; fill: string }>;
  title: string;
  description: string;
  watchTimeLabel: string;
  completedLabel: string;
  ratingsLabel: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="h-72 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={users}
            dataKey="completed"
            nameKey="name"
            aspectRatio={4 / 3}
            nodeGap={4}
            content={<ComparisonTile completedLabel={completedLabel} />}
          >
            <Tooltip
              content={
                <ComparisonTip
                  watchTimeLabel={watchTimeLabel}
                  completedLabel={completedLabel}
                  ratingsLabel={ratingsLabel}
                />
              }
            />
          </Treemap>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function GenreRanking({ title, data }: { title: string; data: Array<{ name: string; count: number }> }) {
  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.slice(0, 6)} layout="vertical" margin={{ left: 8, right: 16 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={84}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          />
          <Tooltip content={<ValueTip />} />
          <Bar dataKey="count" fill="var(--primary)" radius={[0, 5, 5, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
function CompletionPie({ title, data }: { title: string; data: Array<{ name: string; count: number }> }) {
  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="name"
            outerRadius="82%"
            paddingAngle={1}
            labelLine={false}
            label={<PiePercentageLabel />}
          >
            {data.map((item, index) => (
              <Cell key={item.name} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip content={<ValueTip />} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
function RatingArea({ title, data }: { title: string; data: Array<{ name: string; rating: number; count: number }> }) {
  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 12, left: -24 }}>
          <defs>
            <linearGradient id="ratingFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.7} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 6" vertical={false} />
          <XAxis dataKey="rating" tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
          <Tooltip content={<ValueTip />} />
          <Area type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={3} fill="url(#ratingFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function PiePercentageLabel({
  cx = 0,
  cy = 0,
  midAngle = 0,
  outerRadius = 0,
  percent = 0,
}: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  outerRadius?: number;
  percent?: number;
}) {
  const radius = outerRadius * 0.58;
  const radians = (-midAngle * Math.PI) / 180;
  return (
    <text
      x={cx + radius * Math.cos(radians)}
      y={cy + radius * Math.sin(radians)}
      fill="var(--primary-foreground)"
      fontSize={13}
      fontWeight={650}
      textAnchor="middle"
      dominantBaseline="central"
    >
      {Math.round(percent * 100)}%
    </text>
  );
}
function ViewingHeatmap({ title, data, labels }: { title: string; data: Insights["viewingTimes"]; labels: Labels }) {
  const hours = [0, 4, 8, 12, 16, 20];
  const buckets = data.map((item) => ({ ...item, bucket: Math.floor(item.hour / 4) * 4 }));
  const bucketTotals = [1, 2, 3, 4, 5, 6, 0].flatMap((day) =>
    hours.map((hour) =>
      buckets.filter((item) => item.day === day && item.bucket === hour).reduce((sum, item) => sum + item.count, 0),
    ),
  );
  const maximum = Math.max(1, ...bucketTotals);
  const total = bucketTotals.reduce((sum, count) => sum + count, 0);
  return (
    <ChartCard title={title}>
      <div className="grid h-full grid-cols-[2.25rem_repeat(6,minmax(0,1fr))] grid-rows-[auto_repeat(7,minmax(0,1fr))] gap-1.5 text-[10px]">
        <span />
        {hours.map((hour) => (
          <span key={`hour-${hour}`} className="self-end text-center text-muted-foreground">
            {String(hour).padStart(2, "0")}
          </span>
        ))}
        {[1, 2, 3, 4, 5, 6, 0].map((day) => (
          <Fragment key={`day-${day}`}>
            <span className="self-center text-muted-foreground">{labels.days[day]}</span>
            {hours.map((hour) => {
              const hourlyData = Array.from({ length: 4 }, (_, offset) => {
                const exactHour = hour + offset;
                return {
                  hour: exactHour,
                  count: data.find((item) => item.day === day && item.hour === exactHour)?.count ?? 0,
                };
              });
              const count = hourlyData.reduce((sum, item) => sum + item.count, 0);
              const timeRange = `${String(hour).padStart(2, "0")}:00–${String(hour + 4).padStart(2, "0")}:00`;
              const share = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <HeatmapCell
                  key={`${day}-${hour}`}
                  day={labels.days[day]}
                  timeRange={timeRange}
                  count={count}
                  share={share}
                  hourlyData={hourlyData}
                  maximum={maximum}
                  labels={labels}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
    </ChartCard>
  );
}
function HeatmapCell({
  day,
  timeRange,
  count,
  share,
  hourlyData,
  maximum,
  labels,
}: {
  day: string;
  timeRange: string;
  count: number;
  share: number;
  hourlyData: Array<{ hour: number; count: number }>;
  maximum: number;
  labels: Labels;
}) {
  const countText = labels.count.replace("{count}", String(count));
  return (
    <AriaTooltipTrigger delay={150} closeDelay={100}>
      <AriaButton
        aria-label={`${day} ${timeRange}: ${countText}`}
        className="min-h-5 rounded-md border border-border/40 outline-none transition-transform hover:scale-[1.04] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card"
        style={{
          backgroundColor: count
            ? `color-mix(in oklab, var(--primary) ${18 + (count / maximum) * 82}%, transparent)`
            : "var(--muted)",
        }}
      />
      <AriaTooltip
        placement="top"
        offset={8}
        containerPadding={12}
        className="z-100 w-64 rounded-lg border border-border bg-card p-3 text-card-foreground shadow-xl"
      >
        <p className="text-xs font-semibold text-muted-foreground">
          {day} · {timeRange}
        </p>
        {count > 0 ? (
          <>
            <div className="mt-1 flex items-baseline justify-between gap-4">
              <p className="font-medium">{countText}</p>
              <p className="text-xs text-muted-foreground">{labels.viewingShare.replace("{share}", String(share))}</p>
            </div>
            <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {labels.hourlyBreakdown}
            </p>
            <div className="mt-1.5 grid grid-cols-4 gap-1">
              {hourlyData.map((item) => (
                <div key={item.hour} className="rounded-md bg-muted px-1.5 py-1 text-center">
                  <p className="text-[10px] text-muted-foreground">{String(item.hour).padStart(2, "0")}:00</p>
                  <p className="text-xs font-semibold tabular-nums">{item.count}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">{labels.noViewingActivity}</p>
        )}
      </AriaTooltip>
    </AriaTooltipTrigger>
  );
}
function DataTable({
  title,
  data,
  countLabel,
}: {
  title: string;
  data: Array<{ name: string; count: number }>;
  countLabel: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <tbody>
            {data.map((item) => (
              <tr key={item.name} className="border-t border-border/70">
                <td className="px-5 py-3">{item.name}</td>
                <td className="px-5 py-3 text-right text-muted-foreground">
                  {countLabel.replace("{count}", String(item.count))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-64 pt-2 sm:h-72">{children}</CardContent>
    </Card>
  );
}
function ValueTip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; payload?: { name?: string } }>;
}) {
  if (!active || !payload?.[0]) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-lg">
      <span className="font-medium">{payload[0].payload?.name ?? payload[0].name}</span>
      <span className="ml-2 text-muted-foreground">{payload[0].value}</span>
    </div>
  );
}
function ComparisonTip({
  active,
  payload,
  watchTimeLabel,
  completedLabel,
  ratingsLabel,
}: {
  active?: boolean;
  payload?: Array<{ payload?: { name: string; watchHours: number; completed: number; ratings: number } }>;
  watchTimeLabel: string;
  completedLabel: string;
  ratingsLabel: string;
}) {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-lg">
      <p className="font-semibold">{item.name}</p>
      <p className="mt-1 text-muted-foreground">
        {watchTimeLabel}: {item.watchHours}
      </p>
      <p className="text-muted-foreground">
        {completedLabel}: {item.completed}
      </p>
      <p className="text-muted-foreground">
        {ratingsLabel}: {item.ratings}
      </p>
    </div>
  );
}

function ComparisonTile({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  name = "",
  value = 0,
  fill,
  depth = 0,
  completedLabel,
}: Partial<TreemapNode> & { completedLabel: string }) {
  if (depth === 0 || width < 2 || height < 2) return <g />;
  const showDetails = width > 105 && height > 58;
  const showName = width > 52 && height > 30;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={8}
        fill={typeof fill === "string" ? fill : "var(--primary)"}
        fillOpacity={0.86}
        stroke="var(--card)"
        strokeWidth={2}
      />
      {showName && (
        <text x={x + 12} y={y + 24} fill="var(--primary-foreground)" fontSize={13} fontWeight={650}>
          {name}
        </text>
      )}
      {showDetails && (
        <text x={x + 12} y={y + 44} fill="var(--primary-foreground)" fillOpacity={0.8} fontSize={11}>
          {value} {completedLabel.toLocaleLowerCase()}
        </text>
      )}
    </g>
  );
}
