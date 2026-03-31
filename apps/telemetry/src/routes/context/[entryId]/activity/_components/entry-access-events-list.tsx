"use client";

import { CollapsibleItemGroup } from "@/components/blocks/collapsible-item-group";
import { EventsStreamList } from "@/routes/_components/events-stream-list.js";

export function EntryAccessEventsList({ entryId }: { entryId: string }) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <CollapsibleItemGroup defaultOpen className="min-h-0 flex-1">
        <CollapsibleItemGroup.Title className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          Events
        </CollapsibleItemGroup.Title>
        <CollapsibleItemGroup.Content>
          <EventsStreamList
            scope={{ kind: "sourceStream", sourceStreamId: entryId }}
            variant="sidebar"
            emptyTitle="No events yet."
          />
        </CollapsibleItemGroup.Content>
      </CollapsibleItemGroup>
    </div>
  );
}
