"use client";

import { api } from "@agent/backend/api";
import { useAction } from "convex/react";
import { CheckIcon, PaperclipIcon, SearchIcon } from "lucide-react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

export type SearchHit = {
  sourceRef: string;
  rrfScore: number;
  contributions: Array<{ armId: string; rank: number; score: number }>;
  lexical: {
    propertyHits?: Array<{ propKey: string; text: string }>;
  } | null;
  vector: unknown;
  mimeType: string | null;
  fileName: string | null;
  title: string | null;
};

type MemorySearchContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  disabled: boolean;
  namespace: string;
  onHitSelected?: (hit: SearchHit) => void;
  onResults?: (hits: SearchHit[]) => void;
  isHitSelected: (hit: SearchHit) => boolean;
  formatHitLabel: (hit: SearchHit) => string;
};

const MemorySearchContext = createContext<MemorySearchContextValue | null>(
  null,
);

export function useMemorySearch(): MemorySearchContextValue {
  const ctx = useContext(MemorySearchContext);
  if (!ctx) {
    throw new Error(
      "MemorySearch compound components must be used within MemorySearch",
    );
  }
  return ctx;
}

function defaultFormatHitLabel(hit: SearchHit): string {
  const t = hit.title?.trim();
  if (t) return t;
  const f = hit.fileName?.trim();
  if (f) return f;
  return hit.sourceRef;
}

export function MemorySearch({
  children,
  namespace,
  open,
  onOpenChange,
  disabled = false,
  onHitSelected,
  onResults,
  isHitSelected,
  formatHitLabel,
}: {
  children: ReactNode;
  namespace: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
  onHitSelected?: (hit: SearchHit) => void;
  onResults?: (hits: SearchHit[]) => void;
  isHitSelected?: (hit: SearchHit) => boolean;
  formatHitLabel?: (hit: SearchHit) => string;
}) {
  const value = useMemo(
    (): MemorySearchContextValue => ({
      open,
      setOpen: onOpenChange,
      disabled,
      namespace,
      onHitSelected,
      onResults,
      isHitSelected: isHitSelected ?? (() => false),
      formatHitLabel: formatHitLabel ?? defaultFormatHitLabel,
    }),
    [
      open,
      onOpenChange,
      disabled,
      namespace,
      onHitSelected,
      onResults,
      isHitSelected,
      formatHitLabel,
    ],
  );

  return (
    <MemorySearchContext.Provider value={value}>
      {children}
    </MemorySearchContext.Provider>
  );
}

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

export function MemorySearchModal() {
  const {
    open,
    setOpen,
    disabled,
    namespace,
    onHitSelected,
    onResults,
    isHitSelected,
    formatHitLabel,
  } = useMemorySearch();

  const searchMemories = useAction(api.memories.memorySearch.searchMemories);
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

  useEffect(() => {
    if (results.length === 0) return;
    onResults?.(results);
  }, [results, onResults]);

  const {
    getRootProps,
    getInputProps,
    open: openFilePicker,
    isDragGlobal,
  } = useDropzone({
    multiple: false,
    noClick: true,
    disabled: !open || disabled,
    noDragEventsBubbling: true,
    onDrop: (files) => {
      const f = files[0];
      if (f) setSearchFile(f);
    },
  });

  const showViewportCapture = open && !disabled && isDragGlobal;

  const hasInput = query.trim() || searchFile || fileTextSnippet?.trim();

  const searchLoadingMessage = <LoaderWithMessage>Searching</LoaderWithMessage>;

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      className="p-4"
      showCloseButton={false}
      title="Search memories"
      description="Search memories to attach to your message"
      contentProps={{
        onKeyDown: (e) => {
          if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
          e.preventDefault();
          setOpen(false);
        },
      }}
    >
      <div
        {...getRootProps({
          className:
            "relative flex min-h-0 w-full min-w-0 flex-1 flex-col outline-none",
        })}
      >
        <input {...getInputProps()} />
        {showViewportCapture ? (
          <div
            aria-hidden
            className="pointer-events-auto fixed inset-0 z-[60]"
          />
        ) : null}
        <div className="relative z-[70] flex min-h-0 min-w-0 flex-1 flex-col">
          <Command shouldFilter={false} className="min-h-0 p-1">
            <InputGroup className="border-none shadow-none">
          <InputGroupAddon>
            <SearchIcon className="size-4 opacity-50" />
          </InputGroupAddon>
          <InputGroupInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchFile ? "Search with file…" : "Search memories…"}
            disabled={disabled}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              type="button"
              size="icon-xs"
              onClick={openFilePicker}
              title="Attach file for hybrid search"
              disabled={disabled}
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
              disabled={disabled}
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
                  const hitSelected = isHitSelected(hit);
                  const mime = hit.mimeType ?? "application/octet-stream";
                  return (
                    <CommandItem
                      key={hit.sourceRef}
                      value={hit.sourceRef}
                      onSelect={() => onHitSelected?.(hit)}
                      className="cursor-pointer flex-col items-stretch gap-1 py-2"
                      disabled={disabled}
                    >
                      <Item>
                        <ItemMedia variant="icon">
                          <MimeTypeIcon mimeType={mime} />
                        </ItemMedia>
                        <ItemContent>
                          <ItemTitle className="flex justify-between items-center w-full">
                            <span className="truncate text-xs font-medium">
                              {formatHitLabel(hit)}
                            </span>
                            {hitSelected && (
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
        </div>
      </div>
    </CommandDialog>
  );
}

export function MemorySearchTrigger({
  children,
  type,
  variant,
  size,
  className,
  onClick,
  disabled: disabledProp,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { setOpen, disabled } = useMemorySearch();
  return (
    <Button
      type={type ?? "button"}
      variant={variant ?? "ghost"}
      size={size ?? "sm"}
      className={className}
      disabled={disabled || disabledProp}
      onClick={(e) => {
        setOpen(true);
        onClick?.(e);
      }}
      {...props}
    >
      {children}
    </Button>
  );
}
