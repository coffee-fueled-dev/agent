import { contentHashFromArrayBuffer } from "@convex-dev/rag";
import { useAction, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { LoaderIcon, PaperclipIcon, SearchIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { api } from "../../../../../convex/_generated/api.js";
import { LoaderWithMessage } from "../blocks/loader-with-message.js";
import { Button } from "../ui/button.js";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "../ui/command";
import { Empty } from "../ui/empty.js";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "../ui/input-group";
import { Skeleton } from "../ui/skeleton.js";
import { Spinner } from "../ui/spinner.js";
import { MimeTypeIcon } from "./mime-type-icon.js";
import { useNamespace } from "./use-namespace.js";

type SearchResults = FunctionReturnType<
  typeof api.context.contextApi.searchContext
>;

export function ContextSearch() {
  const searchContext = useAction(api.context.contextApi.searchContext);
  const embedForSearch = useAction(api.context.contextApi.embedForSearch);
  const generateUploadUrl = useMutation(
    api.context.files.generateContextUploadUrl,
  );
  const [results, setResults] = useState<SearchResults>([]);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const { namespace } = useNamespace();

  // File attachment state
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [contentHash, setContentHash] = useState<string | null>(null);
  const [embedding, setEmbedding] = useState<number[] | null>(null);
  const [embeddingPending, setEmbeddingPending] = useState(false);

  // Reactive query for the embedding cache
  const cachedEntry = useQuery(
    api.context.embeddingCacheStore.getByHash,
    contentHash ? { contentHash } : "skip",
  );

  // When the cache entry appears, capture the embedding
  useEffect(() => {
    if (cachedEntry?.embedding) {
      setEmbedding(cachedEntry.embedding);
      setEmbeddingPending(false);
    }
  }, [cachedEntry]);

  const handleFileAttach = useCallback(async (file: File) => {
    setAttachedFile(file);
    setEmbedding(null);
    setEmbeddingPending(true);

    const buffer = await file.arrayBuffer();
    const hash = await contentHashFromArrayBuffer(buffer);
    setContentHash(hash);
  }, []);

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

  // Dispatch embed job once we confirm cache is empty
  const dispatchedRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      contentHash &&
      attachedFile &&
      cachedEntry === null &&
      dispatchedRef.current !== contentHash
    ) {
      dispatchedRef.current = contentHash;
      (async () => {
        try {
          const uploadUrl = await generateUploadUrl({});
          const res = await fetch(uploadUrl, {
            method: "POST",
            headers: {
              "Content-Type": attachedFile.type || "application/octet-stream",
            },
            body: attachedFile,
          });
          if (!res.ok) throw new Error("Upload failed");
          const { storageId } = (await res.json()) as {
            storageId: string;
          };
          await embedForSearch({
            storageId: storageId as never,
            mimeType: attachedFile.type || "application/octet-stream",
            contentHash,
          });
        } catch (err) {
          console.error("Failed to dispatch embed job", err);
          setEmbeddingPending(false);
        }
      })();
    }
  }, [
    contentHash,
    attachedFile,
    cachedEntry,
    generateUploadUrl,
    embedForSearch,
  ]);

  const removeFile = useCallback(() => {
    setAttachedFile(null);
    setContentHash(null);
    setEmbedding(null);
    setEmbeddingPending(false);
    dispatchedRef.current = null;
  }, []);

  // Run search when text changes or embedding becomes available
  const runSearch = useCallback(
    async (text: string, fileEmb: number[] | null) => {
      if (!text.trim() && !fileEmb) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const res = await searchContext({
          namespace,
          query: text.trim() || (fileEmb as number[]),
          limit: 10,
          fileEmbedding: fileEmb ?? undefined,
        });
        setResults(res);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    },
    [namespace, searchContext],
  );

  const handleValueChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!value.trim() && !embedding) {
        setResults([]);
        return;
      }
      debounceRef.current = setTimeout(() => {
        void runSearch(value, embedding);
      }, 300);
    },
    [embedding, runSearch],
  );

  // Re-search when embedding arrives
  const queryRef = useRef(query);
  queryRef.current = query;
  useEffect(() => {
    if (embedding) {
      void runSearch(queryRef.current, embedding);
    }
  }, [embedding, runSearch]);

  const hasInput = query.trim() || embedding;

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
              <CommandGroup className="p-0 px-0">
                {results.map((r) => (
                  <CommandItem
                    key={r.entryId}
                    value={r.entryId}
                    onSelect={() => {
                      window.location.href = `/context/${encodeURIComponent(r.entryId)}?namespace=${encodeURIComponent(namespace)}`;
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
