"use client";

import { api } from "@backend/api.js";
import { contentHashFromArrayBuffer } from "@convex-dev/rag";
import type { FunctionReturnType } from "convex/server";
import { useSessionAction } from "convex-helpers/react/sessions";
import { LoaderIcon, PaperclipIcon, SearchIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { LoaderWithMessage } from "@/components/blocks/loader-with-message.js";
import { Button } from "@/components/ui/button.js";
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
import { isTextLikeFile, readFileText } from "../../_hooks/context-file.js";
import { buildLexicalContextQuery } from "../../_hooks/context-search-query.js";
import { useEmbedForSearchAttachedFile } from "../../_hooks/embed-for-search.js";
import { useNamespace } from "../_hooks/use-namespace.js";
import { MimeTypeIcon } from "./mime-type-icon.js";

type SearchResults = FunctionReturnType<
  typeof api.context.search.searchContext
>;

export function ContextSearch() {
  const searchContext = useSessionAction(api.context.search.searchContext);
  const [results, setResults] = useState<SearchResults>([]);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const { namespace, sessionNamespaceResolved } = useNamespace();
  const navigate = useNavigate();

  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [contentHash, setContentHash] = useState<string | null>(null);
  const [fileTextForLexical, setFileTextForLexical] = useState<string | null>(
    null,
  );

  const { embedding, embeddingPending, resetEmbeddingState } =
    useEmbedForSearchAttachedFile({
      file: attachedFile,
      contentHash,
      fileTextForLexical,
    });

  const handleFileAttach = useCallback(
    async (file: File) => {
      resetEmbeddingState();
      setAttachedFile(file);
      setFileTextForLexical(null);
      setContentHash(null);

      const buffer = await file.arrayBuffer();
      const hash = await contentHashFromArrayBuffer(buffer);

      let lexicalText: string | null = null;
      if (isTextLikeFile(file)) {
        try {
          lexicalText = await readFileText(file);
        } catch {
          lexicalText = null;
        }
      }
      setFileTextForLexical(lexicalText);
      setContentHash(hash);
    },
    [resetEmbeddingState],
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
      if (f) void handleFileAttach(f);
    },
  });

  const removeFile = useCallback(() => {
    setAttachedFile(null);
    setContentHash(null);
    setFileTextForLexical(null);
    resetEmbeddingState();
  }, [resetEmbeddingState]);

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

  const handleValueChange = useCallback((value: string) => {
    setQuery(value);
  }, []);

  useEffect(() => {
    if (!sessionNamespaceResolved) {
      setResults([]);
      return;
    }
    if (!query.trim() && !embedding && !attachedFile) {
      setResults([]);
      return;
    }
    const lexicalQuery = buildLexicalContextQuery({
      userQuery: query,
      fileName: attachedFile?.name ?? null,
      fileText: fileTextForLexical,
    });
    if (!lexicalQuery.trim() && !embedding?.length) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runSearch(query, embedding, {
        fileName: attachedFile?.name ?? null,
        fileText: fileTextForLexical,
      });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [
    attachedFile,
    embedding,
    fileTextForLexical,
    query,
    runSearch,
    sessionNamespaceResolved,
  ]);

  const hasInput = query.trim() || embedding || attachedFile;

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
        <div className="flex items-center gap-2 border-t px-3 py-1.5 text-xs">
          <MimeTypeIcon
            mimeType={attachedFile.type}
            className="size-3.5 shrink-0 text-muted-foreground"
          />
          <span className="min-w-0 truncate text-muted-foreground">
            {attachedFile.name}
          </span>
          {embeddingPending && (
            <LoaderIcon className="size-3 shrink-0 animate-spin text-muted-foreground" />
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={removeFile}
          >
            <XIcon className="size-3" />
          </Button>
        </div>
      )}

      {hasInput && (
        <CommandList className="mt-2">
          {searching || embeddingPending ? (
            <Empty>
              <LoaderWithMessage>
                {embeddingPending ? "Embedding file..." : "Searching..."}
              </LoaderWithMessage>
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
                    <div className="flex flex-col gap-0.5">
                      {r.title && (
                        <span className="text-sm font-medium">{r.title}</span>
                      )}
                      <span className="line-clamp-2 text-xs text-muted-foreground">
                        {r.text.slice(0, 200)}
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
