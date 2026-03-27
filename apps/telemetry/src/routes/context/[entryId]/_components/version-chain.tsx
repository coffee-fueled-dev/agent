import {
  ArrowBigUpIcon,
  GitCommitVerticalIcon,
  HistoryIcon,
} from "lucide-react";
import { CollapsibleItemGroup } from "@/components/blocks/collapsible-item-group.js";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item.js";
import { formatTime } from "../../../../components/formatters";
import { Badge } from "../../../../components/ui/badge";

export function VersionChain({
  chain,
  currentEntryId,
  namespace,
}: {
  chain: Array<{
    entryId: string;
    kind: string;
    entryTime: number;
    payload?: unknown;
  }>;
  currentEntryId: string;
  namespace: string;
}) {
  return (
    <CollapsibleItemGroup itemCount={chain.length}>
      <CollapsibleItemGroup.Title>
        <HistoryIcon className="size-3.5 text-muted-foreground" /> Version
        history
      </CollapsibleItemGroup.Title>
      <CollapsibleItemGroup.Content>
        <CollapsibleItemGroup.ItemGroup>
          {chain.map((entry) => {
            const payload = entry.payload as
              | { title?: string; textPreview?: string }
              | undefined;
            const active = entry.entryId === currentEntryId;
            const href = `/context/${encodeURIComponent(entry.entryId)}?namespace=${encodeURIComponent(namespace)}`;
            const title = payload?.title ?? entry.entryId.slice(0, 12);

            const contextItemContent = (
              <ItemContent key={entry.entryId}>
                <span className="flex items-end gap-1">
                  <ItemTitle>{title}</ItemTitle>
                  <ItemDescription className="text-xs text-muted-foreground font-mono">
                    {entry.entryId}
                  </ItemDescription>
                </span>
                <span className="flex items-center gap-1">
                  {active && (
                    <Badge variant="outline" className="text-xs">
                      <ArrowBigUpIcon /> Current
                    </Badge>
                  )}
                  <ItemDescription>
                    {formatTime(entry.entryTime)}
                  </ItemDescription>
                </span>
              </ItemContent>
            );

            if (active) {
              return (
                <Item key={entry.entryId} size="sm" variant="outline">
                  <ItemMedia variant="icon">
                    <GitCommitVerticalIcon />
                  </ItemMedia>
                  {contextItemContent}
                </Item>
              );
            }
            return (
              <Item key={entry.entryId} asChild size="sm">
                <a href={href}>
                  <ItemMedia variant="icon">
                    <GitCommitVerticalIcon />
                  </ItemMedia>
                  {contextItemContent}
                </a>
              </Item>
            );
          })}
        </CollapsibleItemGroup.ItemGroup>
      </CollapsibleItemGroup.Content>
    </CollapsibleItemGroup>
  );
}
