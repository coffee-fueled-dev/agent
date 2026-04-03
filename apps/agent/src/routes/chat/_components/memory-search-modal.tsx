"use client";

import { api } from "@very-coffee/backend/api";
import { useAction } from "convex/react";
import { CheckIcon, PaperclipIcon, SearchIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { LoaderWithMessage } from "@/components/blocks/loader-with-message.js";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { MimeTypeIcon } from "@/files/mime-type-icon.js";
import {
  buildLexicalContextQuery,
  lexicalSnippetFromFileText,
} from "@/routes/_hooks/context-search-query.js";
import { useChatComposerMemory } from "./chat-composer-memory-provider.js";

type SearchHit = {
  sourceRef: string;
  rrfScore: number;
  contributions: Array<{ armId: string; rank: number; score: number }>;
  lexical: {
    propertyHits?: Array<{ propKey: string; text: string }>;
  } | null;
  vector: unknown;
  mimeType: string | null;
  fileName: string | null;
};

function isTextLikeFile(file: File) {
  const t = file.type;
  return (
    t.startsWith("text/") ||
    t === "application/json" ||
    t === "application/xml" ||
    t === "application/javascript" ||
    t === "text/markdown"
  );
}

function hitPreviewText(hit: SearchHit): string {
  const lex = hit.lexical?.propertyHits?.[0]?.text;
  if (lex) return lex.slice(0, 220);
  return "";
}

export function MemorySearchModal({
  open,
  onOpenChange,
  namespace,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  namespace: string;
}) {
  const { memoryRecordIds, toggleMemoryRecordId } = useChatComposerMemory();
  const selectedSet = useMemo(
    () => new Set(memoryRecordIds),
    [memoryRecordIds],
  );

  const searchMemories = useAction(
    api.chat.memorySearch.searchMemoriesForComposer,
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchFile, setSearchFile] = useState<File | null>(null);
  const [fileTextSnippet, setFileTextSnippet] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (!searchFile || !isTextLikeFile(searchFile)) {
      setFileTextSnippet(null);
      return;
    }
    let cancelled = false;
    void searchFile.text().then((t) => {
      if (!cancelled) setFileTextSnippet(t);
    });
    return () => {
      cancelled = true;
    };
  }, [searchFile]);

  const runSearch = useCallback(async () => {
    const lexicalQuery = buildLexicalContextQuery({
      userQuery: query,
      fileName: searchFile?.name ?? null,
      fileText: fileTextSnippet,
    }).trim();
    const embedQuery = query.trim();
    const snippetForEmbed = fileTextSnippet?.trim()
      ? lexicalSnippetFromFileText(fileTextSnippet)
      : undefined;

    if (!lexicalQuery && !embedQuery && !snippetForEmbed) {
      setResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await searchMemories({
        namespace,
        query: embedQuery,
        lexicalQuery:
          lexicalQuery.length > 0 ? lexicalQuery : embedQuery || undefined,
        fileTextForEmbedding: snippetForEmbed,
        limit: 12,
      });
      setResults(res);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [namespace, query, searchFile, fileTextSnippet, searchMemories]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runSearch();
    }, 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, runSearch]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSearchFile(null);
      setFileTextSnippet(null);
      setResults([]);
    }
  }, [open]);

  const {
    getRootProps,
    getInputProps,
    open: openFilePicker,
  } = useDropzone({
    multiple: false,
    noClick: true,
    disabled: !open,
    noDragEventsBubbling: true,
    onDrop: (files) => {
      const f = files[0];
      if (f) setSearchFile(f);
    },
  });

  const hasInput = query.trim() || searchFile || fileTextSnippet?.trim();

  const searchLoadingMessage = <LoaderWithMessage>Searching</LoaderWithMessage>;

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      className="p-4"
      showCloseButton={false}
      title="Search memories"
      description="Search memories to attach to your message"
      contentProps={{
        onKeyDown: (e) => {
          if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
          e.preventDefault();
          onOpenChange(false);
        },
      }}
    >
      <Command shouldFilter={false} className="p-1" {...getRootProps()}>
        <input {...getInputProps()} />
        <InputGroup className="border-none shadow-none">
          <InputGroupAddon>
            <SearchIcon className="size-4 opacity-50" />
          </InputGroupAddon>
          <InputGroupInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchFile ? "Search with file…" : "Search memories…"}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              type="button"
              size="icon-xs"
              onClick={openFilePicker}
              title="Attach file for hybrid search"
            >
              <PaperclipIcon className="size-4" />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        {searchFile ? (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <MimeTypeIcon
              mimeType={searchFile.type || "application/octet-stream"}
              className="size-3.5 shrink-0"
            />
            <span className="min-w-0 flex-1 truncate">{searchFile.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => setSearchFile(null)}
            >
              Remove
            </Button>
          </div>
        ) : null}
        {hasInput ? (
          <CommandList className="mt-2 max-h-[min(50vh,320px)]">
            {searching ? (
              searchLoadingMessage
            ) : (
              <CommandGroup>
                {results.map((hit) => {
                  const isHitSelected = selectedSet.has(hit.sourceRef);
                  const mime = hit.mimeType ?? "application/octet-stream";
                  return (
                    <CommandItem
                      key={hit.sourceRef}
                      value={hit.sourceRef}
                      onSelect={() => toggleMemoryRecordId(hit.sourceRef)}
                      className="cursor-pointer flex-col items-stretch gap-1 py-2"
                    >
                      <Item>
                        <ItemMedia variant="icon">
                          <MimeTypeIcon mimeType={mime} />
                        </ItemMedia>
                        <ItemContent>
                          <ItemTitle className="flex justify-between items-center w-full">
                            <span className="truncate text-xs font-medium">
                              {hit.fileName ??
                                (hit.mimeType ? "File memory" : "Memory")}
                            </span>
                            {isHitSelected && (
                              <CheckIcon
                                size={6}
                                className="shrink-0 text-muted-foreground"
                              />
                            )}
                          </ItemTitle>
                          <ItemDescription className="line-clamp-2 text-xs space-x-2">
                            <span>{hitPreviewText(hit) || "—"}</span>
                            <span>Score: {hit.rrfScore.toFixed(3)}</span>
                          </ItemDescription>
                        </ItemContent>
                      </Item>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        ) : null}
      </Command>
    </CommandDialog>
  );
}
