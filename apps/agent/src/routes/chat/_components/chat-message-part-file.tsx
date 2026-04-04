"use client";

import { api } from "@very-coffee/backend/api";
import {
  CHAT_CFD_FILE_METADATA_KEY,
  CHAT_PROVIDER_METADATA_NS,
} from "@very-coffee/backend/types";
import type { FileUIPart } from "ai";
import { useQuery } from "convex/react";
import { Item, ItemContent, ItemTitle } from "@/components/ui/item.js";
import { MimeTypeIcon } from "@/files/mime-type-icon.js";

function cfdFileStorageId(part: FileUIPart): string | null {
  const pm = part.providerMetadata;
  if (!pm || typeof pm !== "object") return null;
  const cfd = pm[CHAT_PROVIDER_METADATA_NS];
  if (!cfd || typeof cfd !== "object") return null;
  const file = (cfd as Record<string, unknown>)[CHAT_CFD_FILE_METADATA_KEY];
  if (
    !file ||
    typeof file !== "object" ||
    typeof (file as { storageId?: unknown }).storageId !== "string"
  ) {
    return null;
  }
  return (file as { storageId: string }).storageId;
}

export function ChatMessagePartFile({
  part,
  namespace,
}: {
  part: FileUIPart;
  /** Tenant namespace (e.g. user id); required to mint URLs from storage id. */
  namespace: string | undefined;
}) {
  const storageId = cfdFileStorageId(part);
  const mintedUrl = useQuery(
    api.files.store.getAttachmentPublicUrl,
    storageId && namespace ? { namespace, storageId } : "skip",
  );
  const href = mintedUrl ?? part.url;

  const name = part.filename ?? part.mediaType ?? "file";
  return (
    <Item size="sm" variant="outline" className="gap-2 p-2 px-3" asChild>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        download={part.filename}
        className="flex min-w-0 items-center gap-2 no-underline"
      >
        <MimeTypeIcon
          mimeType={part.mediaType ?? undefined}
          className="size-4 shrink-0"
        />
        <ItemContent className="min-w-0">
          <ItemTitle className="truncate text-xs font-medium">{name}</ItemTitle>
        </ItemContent>
      </a>
    </Item>
  );
}
