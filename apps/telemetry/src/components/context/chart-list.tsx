import { usePaginatedQuery } from "convex/react";
import { ListSection } from "../layout/list-section";
import LoadMoreSentinel from "../layout/load-more-sentinel";

export function ChartList() {
  const charts = usePaginatedQuery();

  return (
    <ListSection list={[]}>
      {(chart) => <ChartItem key={chart.id} chart={chart} />}
      <LoadMoreSentinel />
      <ListSection.Empty>{/* Missing memory message */}</ListSection.Empty>
    </ListSection>
  );
}

function ChartItem() {
  return <>{/* Memory Item */}</>;
}
