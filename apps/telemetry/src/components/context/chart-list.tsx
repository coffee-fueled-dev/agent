import { usePaginatedQuery } from "convex/react";
import { BrainIcon, CheckIcon } from "lucide-react";
import { api } from "../../../../../convex/_generated/api.js";
import type { MemoryChartSummary } from "../../../../../convex/components/agentMemory/internal/runtime";
import { ListSection } from "../layout/list-section";
import LoadMoreSentinel from "../layout/load-more-sentinel";
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "../ui/item";
import { useChart } from "./use-chart";
import { useNamespace } from "./use-namespace";

const PAGE_SIZE = 12;

export function ChartList() {
  const { namespace } = useNamespace();
  const { isSelected, toggleChart } = useChart();
  const charts = usePaginatedQuery(
    api.agentMemory.listMemoryCharts,
    { namespace },
    { initialNumItems: PAGE_SIZE },
  );

  return (
    <ListSection list={charts.results} loading={charts.isLoading}>
      <ListSection.Loading />
      {(chart) => (
        <ChartItem
          key={chart.chartId}
          chart={chart}
          selected={isSelected(chart.chartId)}
          onToggle={() => toggleChart(chart.chartId)}
        />
      )}
      <LoadMoreSentinel
        onLoadMore={() => charts.loadMore(PAGE_SIZE)}
        canLoadMore={charts.status === "CanLoadMore"}
        isLoadingMore={charts.status === "LoadingMore"}
      />
      <ListSection.Empty>No charts exist for this namespace yet.</ListSection.Empty>
    </ListSection>
  );
}

function ChartItem({
  chart,
  selected,
  onToggle,
}: {
  chart: MemoryChartSummary;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <Item
      variant={selected ? "muted" : "outline"}
      hoverable
      onClick={onToggle}
      aria-pressed={selected}
    >
      <ItemMedia variant="icon">
        {selected ? <CheckIcon /> : <BrainIcon />}
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{chart.sampleTitle ?? chart.chartKey}</ItemTitle>
        <ItemDescription>
          {chart.sampleSummary ?? "No sample summary yet."}
        </ItemDescription>
        <ItemDescription>
          {chart.memberCount} members · {chart.boundaryCount} boundaries
        </ItemDescription>
      </ItemContent>
    </Item>
  );
}
