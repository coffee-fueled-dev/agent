import { Item, ItemDescription } from "@/components/ui/item.js";

export function ChatMessagePartData({ data }: { data: unknown }) {
  return (
    <Item size="sm" variant="muted">
      <ItemDescription className="font-mono text-[11px]">
        data · {JSON.stringify(data)}
      </ItemDescription>
    </Item>
  );
}
