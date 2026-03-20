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
import type { EventEntry } from "./types";

export function EventItem({
  entry,
  onSelect,
}: {
  entry: EventEntry;
  onSelect: (entry: EventEntry) => void;
}) {
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
                <ItemTitle>{entry.eventType}</ItemTitle>
              </ItemHeader>
              <div className="flex flex-col gap-1 justify-start">
                <ItemDescription className="line-clamp-1 break-all">
                  {entry.eventId}
                </ItemDescription>
                <ItemDescription className="line-clamp-1 break-all">
                  <TimeValue value={entry.eventTime} />
                </ItemDescription>
              </div>
            </ItemContent>
          </button>
        </Item>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-96">
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-sm font-medium">{entry.eventType}</div>
            <div className="mt-1 break-all text-xs text-muted-foreground">
              {entry.eventId}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            <TimeValue value={entry.eventTime} />
            {entry.correlationId ? (
              <div>Correlation: {entry.correlationId}</div>
            ) : null}
            {entry.causationId ? (
              <div>Causation: {entry.causationId}</div>
            ) : null}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
