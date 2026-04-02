"use client";

import { CollapsibleItemGroup } from "@/components/blocks/collapsible-item-group";
import { FadeOverflow } from "@/components/layout/fade-overflow";
import { ListSection } from "@/components/layout/list-section";
import { EventsStreamList } from "@/routes/_components/events-stream-list.js";

export function ChatThreadEventsList({ threadId }: { threadId: string }) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <CollapsibleItemGroup defaultOpen className="min-h-0 flex-1">
        <CollapsibleItemGroup.Title className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          Event Stream
        </CollapsibleItemGroup.Title>
        <CollapsibleItemGroup.Content>
          <EventsStreamList
            scope={{ kind: "thread", threadId }}
            variant="sidebar"
            emptyTitle="Nothing yet."
          />
        </CollapsibleItemGroup.Content>
      </CollapsibleItemGroup>
    </div>
  );
}
