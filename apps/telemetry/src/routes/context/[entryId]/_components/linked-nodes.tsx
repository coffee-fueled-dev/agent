import { api } from "@backend/api.js";
import { useSessionQuery } from "convex-helpers/react/sessions";
import { NetworkIcon } from "lucide-react";
import { useMemo } from "react";
import { CollapsibleItemGroup } from "@/components/blocks/collapsible-item-group.js";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item.js";
import { MimeTypeIcon } from "../../_components/mime-type-icon.js";
import { RebuildLinksButton } from "../../_components/rebuild-links-button.js";

export function LinkedNodes({
  namespace,
  entryId,
}: {
  namespace: string;
  entryId: string;
}) {
  const graphContext = useSessionQuery(
    api.context.communities.getEntryGraphContext,
    {
      namespace,
      entryId,
    },
  );

  const sorted = useMemo(() => {
    if (!graphContext?.neighbors) return [];
    return [...graphContext.neighbors].sort((a, b) => b.score - a.score);
  }, [graphContext?.neighbors]);

  if (!sorted.length) return null;

  return (
    <CollapsibleItemGroup itemCount={sorted.length}>
      <CollapsibleItemGroup.Title>
        <NetworkIcon className="size-3.5 text-muted-foreground" /> Linked nodes
      </CollapsibleItemGroup.Title>
      <CollapsibleItemGroup.Actions>
        <RebuildLinksButton
          variant="ghost"
          size="sm"
          tooltip="Re-run community detection to update similarity links"
        >
          Rebuild links
        </RebuildLinksButton>
      </CollapsibleItemGroup.Actions>
      <CollapsibleItemGroup.Content>
        <CollapsibleItemGroup.ItemGroup>
          {sorted.map((neighbor) => {
            const href = `/context/${encodeURIComponent(neighbor.id)}?namespace=${encodeURIComponent(namespace)}`;
            const label = neighbor.title || neighbor.id;
            return (
              <Item key={neighbor.id} asChild size="sm">
                <a href={href}>
                  <ItemMedia variant="icon">
                    <MimeTypeIcon
                      mimeType={neighbor.mimeType}
                      className="size-4 text-muted-foreground"
                    />
                  </ItemMedia>
                  <ItemContent className="min-w-0">
                    <ItemTitle className="truncate text-xs">{label}</ItemTitle>
                    <ItemDescription className="truncate">
                      {neighbor.textPreview ?? neighbor.score.toFixed(3)}
                    </ItemDescription>
                  </ItemContent>
                  <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                    {neighbor.score.toFixed(3)}
                  </span>
                </a>
              </Item>
            );
          })}
        </CollapsibleItemGroup.ItemGroup>
      </CollapsibleItemGroup.Content>
    </CollapsibleItemGroup>
  );
}
