import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item.js";

export function ChatMessagePartSourceUrl({
  title,
  url,
}: {
  title?: string;
  url: string;
}) {
  return (
    <Item size="sm" variant="outline">
      <ItemContent>
        <ItemTitle className="text-xs">Source</ItemTitle>
        <ItemDescription className="truncate">
          {String(title ?? url)}
        </ItemDescription>
      </ItemContent>
    </Item>
  );
}
