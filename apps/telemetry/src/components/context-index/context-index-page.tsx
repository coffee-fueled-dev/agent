import { useAction } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { FileTextIcon, LinkIcon, PlusIcon } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { api } from "../../../../../convex/_generated/api.js";
import { formatTime } from "../formatters";
import { AppShell } from "../layout/app-shell";
import { FadeOverflow } from "../layout/fade-overflow";
import { ListSection } from "../layout/list-section";
import LoadMoreSentinel from "../layout/load-more-sentinel";
import { RequiredPaginatedResult } from "../layout/required-result";
import { Button } from "../ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "../ui/item";
import { FileDropzone } from "../context/file-dropzone";
import { AddContextDialog } from "./add-context-dialog";
import { NamespaceProvider, useNamespace } from "./use-namespace";

type SearchResults = FunctionReturnType<
  typeof api.context.contextApi.searchContext
>;

export function ContextIndexPage() {
  return (
    <NamespaceProvider>
      <ContextIndexPageInner />
    </NamespaceProvider>
  );
}

function ContextIndexPageInner() {
  const { namespace } = useNamespace();

  return (
    <FileDropzone>
      <AppShell
        current="context"
        eyebrow="Context index"
        title="Add and search context"
        description="Context entries indexed for semantic search. Add text or files and search across the namespace."
      >
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <AddContextDialog>
              <AddContextDialog.Trigger asChild>
                <Button variant="outline" size="sm">
                  <PlusIcon className="size-4" />
                  Context
                </Button>
              </AddContextDialog.Trigger>
            </AddContextDialog>
          </div>

          <ContextSearch namespace={namespace} />
          <ContextList namespace={namespace} />
        </div>
      </AppShell>
    </FileDropzone>
  );
}

function ContextSearch({ namespace }: { namespace: string }) {
  const searchContext = useAction(api.context.contextApi.searchContext);
  const [results, setResults] = useState<SearchResults>([]);
  const [query, setQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const handleValueChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!value.trim()) {
        setResults([]);
        return;
      }
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await searchContext({
            namespace,
            query: value.trim(),
            limit: 10,
          });
          setResults(res);
        } catch {
          setResults([]);
        }
      }, 300);
    },
    [namespace, searchContext],
  );

  return (
    <Command shouldFilter={false} className="rounded-md border">
      <CommandInput
        value={query}
        onValueChange={handleValueChange}
        placeholder="Search context..."
      />
      {query.trim() && (
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
          <CommandGroup>
            {results.map((r) => (
              <CommandItem key={r.entryId} value={r.entryId}>
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
        </CommandList>
      )}
    </Command>
  );
}

function ContextList({ namespace }: { namespace: string }) {
  return (
    <RequiredPaginatedResult
      query={api.context.contextApi.listContextWithFiles}
      args={{ namespace }}
      initialNumItems={20}
    >
      {({ results, status, loadMore }) => (
        <FadeOverflow className="max-h-[600px]">
          <ListSection list={results} loading={status === "LoadingFirstPage"}>
            <ListSection.Empty>No context entries yet.</ListSection.Empty>
            <ListSection.Loading />
            {(entry) => (
              <Item key={entry._id} variant="outline" size="sm">
                <ItemMedia variant="icon">
                  {entry.file ? <LinkIcon /> : <FileTextIcon />}
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{entry.title ?? entry.key}</ItemTitle>
                  <ItemDescription>
                    {entry.file
                      ? `${entry.file.mimeType}${entry.file.fileName ? ` · ${entry.file.fileName}` : ""}`
                      : entry.textPreview}
                  </ItemDescription>
                  {entry.file?.url && (
                    <ItemDescription>
                      <a
                        href={entry.file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        Open file
                      </a>
                    </ItemDescription>
                  )}
                  <span className="text-xs text-muted-foreground/60">
                    {formatTime(entry.createdAt)}
                  </span>
                </ItemContent>
              </Item>
            )}
          </ListSection>
          <LoadMoreSentinel
            onLoadMore={() => loadMore(20)}
            canLoadMore={status === "CanLoadMore"}
            isLoadingMore={status === "LoadingMore"}
          />
        </FadeOverflow>
      )}
    </RequiredPaginatedResult>
  );
}
