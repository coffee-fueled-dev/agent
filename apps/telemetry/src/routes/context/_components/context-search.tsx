"use client";

import { api } from "@backend/api.js";
import type { FunctionReturnType } from "convex/server";
import { useSessionAction } from "convex-helpers/react/sessions";
import { ExternalLinkIcon, PaperclipIcon, SearchIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { LoaderWithMessage } from "@/components/blocks/loader-with-message.js";
import {
  type AttachedFileEmbeddingState,
  AttachedFileEmbedRow,
} from "@/components/files";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command.js";
import { Empty } from "@/components/ui/empty.js";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group.js";
import { contextEntry, useNavigate } from "@/navigation/index.js";
import { buildLexicalContextQuery } from "../../_hooks/context-search-query.js";
import { useNamespace } from "../_hooks/use-namespace.js";
import { MimeTypeIcon } from "./mime-type-icon.js";

type SearchResults = FunctionReturnType<
  typeof api.context.search.searchContext
>;

function hitSourceLabel(r: SearchResults[number]): string {
  const s = r.source;
  if (!s) return "Entry";
  if (s.kind === "document") {
    return s.sourceType === "binary" ? "Document · file" : "Document · text";
  }
  return s.sourceType === "binary" ? "Content · binary" : "Content · text";
}

export function ContextSearch() {
  const searchContext = useSessionAction(api.context.search.searchContext);
  const [results, setResults] = useState<SearchResults>([]);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const { namespace, sessionNamespaceResolved } = useNamespace();
  const navigate = useNavigate();

  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [embedState, setEmbedState] =
    useState<AttachedFileEmbeddingState | null>(null);

  const handleFileAttach = useCallback((file: File) => {
    setAttachedFile(file);
    setEmbedState(null);
  }, []);

  const handleEmbeddingStateChange = useCallback(
    (state: AttachedFileEmbeddingState) => {
      setEmbedState(state);
    },
    [],
  );

  const {
    getRootProps,
    getInputProps,
    open: openFilePicker,
  } = useDropzone({
    multiple: false,
    noClick: true,
    onDrop: (files) => {
      const f = files[0];
      if (f) handleFileAttach(f);
    },
  });

  const removeFile = useCallback(() => {
    setAttachedFile(null);
    setEmbedState(null);
  }, []);

  const runSearch = useCallback(
    async (
      userQuery: string,
      fileEmb: number[] | null,
      opts: { fileName: string | null; fileText: string | null },
    ) => {
      if (!sessionNamespaceResolved) {
        setResults([]);
        return;
      }
      const lexicalQuery = buildLexicalContextQuery({
        userQuery,
        fileName: opts.fileName,
        fileText: opts.fileText,
      });
      if (!lexicalQuery.trim() && !fileEmb?.length) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const res = await searchContext({
          namespace,
          query: lexicalQuery,
          limit: 10,
          retrievalMode: "hybrid",
          fileEmbeddings: fileEmb?.length ? [fileEmb] : undefined,
        });
        setResults(res);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    },
    [namespace, searchContext, sessionNamespaceResolved],
  );

  const handleValueChange = (value: string) => setQuery(value);

  useEffect(() => {
    if (!sessionNamespaceResolved) {
      setResults([]);
      return;
    }
    const embedding = embedState?.embedding ?? null;
    if (!query.trim() && !embedding && !attachedFile) {
      setResults([]);
      return;
    }
    const lexicalQuery = buildLexicalContextQuery({
      userQuery: query,
      fileName: attachedFile?.name ?? null,
      fileText: embedState?.fileTextForLexical ?? null,
    });
    if (!lexicalQuery.trim() && !embedding?.length) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runSearch(query, embedding, {
        fileName: attachedFile?.name ?? null,
        fileText: embedState?.fileTextForLexical ?? null,
      });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [attachedFile, embedState, query, runSearch, sessionNamespaceResolved]);

  const hasInput = query.trim() || embedState?.embedding || attachedFile;

  return (
    <Command shouldFilter={false} className="p-1" {...getRootProps()}>
      <input {...getInputProps()} />
      <InputGroup className="border-none shadow-none">
        <InputGroupAddon>
          <SearchIcon className="size-4 opacity-50" />
        </InputGroupAddon>
        <InputGroupInput
          value={query}
          onChange={(e) => handleValueChange(e.target.value)}
          placeholder={
            attachedFile ? "Search with file..." : "Search context..."
          }
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-xs"
            onClick={openFilePicker}
            title="Attach file for multimodal search"
          >
            <PaperclipIcon className="size-4" />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>

      {attachedFile && (
        <AttachedFileEmbedRow
          file={attachedFile}
          onRemove={removeFile}
          onEmbeddingStateChange={handleEmbeddingStateChange}
        />
      )}

      {hasInput && (
        <CommandList className="mt-2">
          {searching || embedState?.embeddingPending ? (
            <Empty>
              <LoaderWithMessage>Searching...</LoaderWithMessage>
            </Empty>
          ) : (
            <>
              <CommandEmpty>No results</CommandEmpty>
              <CommandGroup>
                {results.map((r) => (
                  <CommandItem
                    key={r.entryId}
                    value={r.entryId}
                    onSelect={() => {
                      navigate(contextEntry(r.entryId, { namespace }));
                    }}
                    className="cursor-pointer"
                  >
                    <div className="flex w-full flex-col gap-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          {r.title && (
                            <span className="text-sm font-medium">
                              {r.title}
                            </span>
                          )}
                        </div>
                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {hitSourceLabel(r)}
                        </span>
                      </div>
                      {r.filePublicUrl && r.mimeType && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MimeTypeIcon
                            mimeType={r.mimeType}
                            className="size-3.5 shrink-0"
                          />
                          <a
                            href={r.filePublicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-w-0 items-center gap-1 truncate text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            <span className="truncate">
                              {r.fileName ?? "File"}
                            </span>
                            <ExternalLinkIcon className="size-3 shrink-0 opacity-70" />
                          </a>
                        </div>
                      )}
                      <span className="line-clamp-2 text-xs text-muted-foreground">
                        {(r.textPreview ?? r.text).slice(0, 200)}
                      </span>
                      <span className="text-xs text-muted-foreground/60">
                        Score: {r.score.toFixed(3)}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      )}
    </Command>
  );
}
