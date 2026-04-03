import { MimeTypeIcon } from "@/files/mime-type-icon.js";
import { Item, ItemContent, ItemTitle } from "@/components/ui/item.js";

export function ChatMessagePartFile({
  filename,
  mediaType,
}: {
  filename?: string;
  mediaType?: string;
}) {
  const name = filename ?? mediaType ?? "file";
  return (
    <Item size="sm" variant="outline" className="gap-2 p-2 px-3">
      <MimeTypeIcon
        mimeType={mediaType ?? undefined}
        className="size-4 shrink-0"
      />
      <ItemContent className="min-w-0">
        <ItemTitle className="truncate text-xs font-medium">{name}</ItemTitle>
      </ItemContent>
    </Item>
  );
}
