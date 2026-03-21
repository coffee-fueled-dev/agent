import { usePaginatedQuery } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { ListSection } from "../layout/list-section";
import LoadMoreSentinel from "../layout/load-more-sentinel";

export function MemoryList({ chart }: { chart: Id<"memoryCharts"> | null }) {
  const { memories } = useMemories();

  return (
    <ListSection list={memories}>
      {(memory) => <MemoryItem key={memory.id} memory={memory} />}
      <LoadMoreSentinel />
      <ListSection.Empty>{/* Missing memory message */}</ListSection.Empty>
    </ListSection>
  );
}

function MemoryItem() {
  return <>{/* Memory Item */}</>;
}
