import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item.js";

export function ChatMessagePartReasoning({ text }: { text: string }) {
  return (
    <Item size="sm" variant="muted" className="text-xs">
      <ItemContent>
        <ItemTitle className="text-muted-foreground">Reasoning</ItemTitle>
        <ItemDescription className="font-mono text-[11px]">
          {text}
        </ItemDescription>
      </ItemContent>
    </Item>
  );
}
