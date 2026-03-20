import { TimeValue } from "@/components/formatters";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemHeader,
  ItemTitle,
} from "@/components/ui/item";
import type { HistoryEntry } from "./types";

export function HistoryItem({
  entry,
  onSelect,
}: {
  entry: HistoryEntry;
  onSelect: (entry: HistoryEntry) => void;
}) {
  const parentsLabel =
    entry.parentEntryIds.length > 0 ? entry.parentEntryIds.join(", ") : "root";

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Item asChild hoverable variant="outline" size="sm">
          <button
            type="button"
            className="w-full text-left"
            onClick={() => onSelect(entry)}
          >
            <ItemContent>
              <ItemHeader className="items-start">
                <ItemTitle>{entry.kind}</ItemTitle>
              </ItemHeader>
              <div className="flex flex-col gap-1 justify-start">
                <ItemDescription className="line-clamp-1 break-all">
                  {entry.entryId}
                </ItemDescription>
                <ItemDescription className="line-clamp-1 break-all">
                  <TimeValue value={entry.entryTime} />
                </ItemDescription>
              </div>
            </ItemContent>
          </button>
        </Item>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-96">
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-sm font-medium">{entry.kind}</div>
            <div className="mt-1 break-all text-xs text-muted-foreground">
              {entry.entryId}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            <TimeValue value={entry.entryTime} />
            <div className="mt-1 break-all">Parents: {parentsLabel}</div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
