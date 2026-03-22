import { FileTextIcon, LinkIcon, SearchIcon } from "lucide-react";
import { ListSection } from "../layout/list-section";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "../ui/item";
import { useChart } from "./use-chart";
import { useMemories } from "./use-memories";

export function MemoryList() {
  const { selectedCount } = useChart();
  const { memories, isSearching, hasSearched, query, error } = useMemories();

  return (
    <ListSection list={memories} loading={isSearching}>
      <ListSection.Loading />
      {(memory) => <MemoryItem key={memory.entryId} memory={memory} />}
      <ListSection.Empty>
        {error
          ? error
          : hasSearched
            ? selectedCount > 0
              ? "No memories matched the current search and chart selection."
              : "No memories matched the current search."
            : query.trim()
              ? "Run a search to load memories."
              : "Type a search above to explore this namespace."}
      </ListSection.Empty>
    </ListSection>
  );
}

function MemoryItem({
  memory,
}: {
  memory: ReturnType<typeof useMemories>["memories"][number];
}) {
  return (
    <Item variant="outline">
      <ItemMedia variant="icon">
        {memory.type === "binaryFile" ? <LinkIcon /> : <FileTextIcon />}
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{memory.title ?? memory.key}</ItemTitle>
        <ItemDescription>
          {memory.type === "binaryFile" ? memory.mimeType : memory.text}
        </ItemDescription>
        <ItemDescription>
          <SearchIcon className="inline size-3" /> score {memory.score.toFixed(3)}
          {" · "}importance {memory.importance.toFixed(2)}
        </ItemDescription>
        {"url" in memory && memory.url ? (
          <ItemDescription>
            <a href={memory.url} target="_blank" rel="noreferrer">
              Open file
            </a>
          </ItemDescription>
        ) : null}
      </ItemContent>
    </Item>
  );
}
