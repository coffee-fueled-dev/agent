import { FileTextIcon, LinkIcon } from "lucide-react";
import { api } from "../../../../../convex/_generated/api.js";
import { formatTime } from "../formatters";
import { FadeOverflow } from "../layout/fade-overflow";
import { ListSection } from "../layout/list-section";
import LoadMoreSentinel from "../layout/load-more-sentinel";
import { RequiredPaginatedResult } from "../layout/required-result";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "../ui/item";
import { useNamespace } from "./use-namespace";

export function ContextList() {
  const { namespace } = useNamespace();
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
                    {formatTime(entry._creationTime)}
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
