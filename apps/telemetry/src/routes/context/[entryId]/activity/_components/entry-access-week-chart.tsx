import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { RequiredResult } from "@/components/layout/required-result.js";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart.js";
import { Empty, EmptyContent } from "@/components/ui/empty.js";
import { api } from "@backend/api.js";

const chartConfig = {
  views: {
    label: "Views",
    color: "var(--chart-1)",
  },
  searches: {
    label: "Searches",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

function shortDayLabel(isoDay: string) {
  const d = new Date(`${isoDay}T12:00:00.000Z`);
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

export function EntryAccessWeekChart({
  namespace,
  entryId,
}: {
  namespace: string;
  entryId: string;
}) {
  return (
    <RequiredResult
      query={api.context.contextApi.getContextEntryAccessWeekByDay}
      args={{
        namespace,
        entryId,
      }}
    >
      {(data) => {
        const chartData =
          data?.map((row) => ({
            ...row,
            label: shortDayLabel(row.day),
          })) ?? [];

        if (data.length === 0) {
          return (
            <Empty>
              <EmptyContent>
                <p className="text-sm text-muted-foreground">
                  No usage data for this entry.
                </p>
              </EmptyContent>
            </Empty>
          );
        }

        return (
          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <BarChart accessibilityLayer data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                tickMargin={8}
                axisLine={false}
              />
              <ChartTooltip
                content={<ChartTooltipContent />}
                cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
              />
              <Bar dataKey="views" fill="var(--chart-1)" stackId="a" />
              <Bar dataKey="searches" fill="var(--chart-2)" stackId="a" />
            </BarChart>
          </ChartContainer>
        );
      }}
    </RequiredResult>
  );
}
