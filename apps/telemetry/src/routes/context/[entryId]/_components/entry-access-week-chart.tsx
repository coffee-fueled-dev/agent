import { useQuery } from "convex/react";
import { BarChart3Icon } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { CollapsibleItemGroup } from "@/components/blocks/collapsible-item-group.js";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart.js";
import { api } from "../../../../../../../convex/_generated/api.js";

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
  const data = useQuery(api.context.contextApi.getContextEntryAccessWeekByDay, {
    namespace,
    entryId,
  });

  const chartData =
    data?.map((row) => ({
      ...row,
      label: shortDayLabel(row.day),
    })) ?? [];

  const total = chartData?.reduce((a, r) => a + r.views + r.searches, 0) ?? 0;

  return (
    <CollapsibleItemGroup itemCount={total}>
      <CollapsibleItemGroup.Title>
        <BarChart3Icon className="size-3.5 text-muted-foreground" /> Usage (7
        days)
      </CollapsibleItemGroup.Title>
      <CollapsibleItemGroup.Content>
        {data === undefined ? (
          <div className="text-sm text-muted-foreground py-4">
            Loading chart…
          </div>
        ) : data.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4">
            No usage data for this entry.
          </div>
        ) : (
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
        )}
      </CollapsibleItemGroup.Content>
    </CollapsibleItemGroup>
  );
}
