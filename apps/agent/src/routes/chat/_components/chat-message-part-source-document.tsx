import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item.js";

export function ChatMessagePartSourceDocument({ title }: { title: string }) {
  return (
    <Item size="sm" variant="outline">
      <ItemContent>
        <ItemTitle className="text-xs">Document</ItemTitle>
        <ItemDescription className="truncate">{title}</ItemDescription>
      </ItemContent>
    </Item>
  );
}
