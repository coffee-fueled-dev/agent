import { RefreshCwIcon } from "lucide-react";
import { LoaderWithMessage } from "@/components/blocks/loader-with-message.js";
import { PageSection } from "@/components/layout/page-section.js";
import { Button } from "@/components/ui/button.js";
import { Empty } from "@/components/ui/empty.js";
import { Kbd } from "@/components/ui/kbd.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.js";
import { Spinner } from "@/components/ui/spinner.js";
import { ProjectionProvider, useProjection } from "../_hooks/use-projection.js";
import { ContextExploreDetailDialog } from "./context-explore-detail-dialog.js";
import { ContextExploreScene } from "./context-explore-scene.js";

export function ContextExplore({
  pushSceneBehind = false,
}: {
  pushSceneBehind?: boolean;
}) {
  return (
    <ProjectionProvider>
      <ContextExploreInner pushSceneBehind={pushSceneBehind} />
    </ProjectionProvider>
  );
}

function ContextExploreInner({
  pushSceneBehind,
}: {
  pushSceneBehind: boolean;
}) {
  const {
    namespace,
    limitOptions,
    limit,
    setLimit,
    points,
    isLoading,
    isRefreshing,
    isStale,
    canRegenerate,
    hasNoData,
    startError,
    phase,
    launch,
    selected,
    setSelected,
    hoveredEntryId,
    clearHover,
    hoverData,
  } = useProjection();

  return (
    <PageSection.Body className="gap-4">
      <PageSection.Header>
        <PageSection.HeaderRow className="flex-wrap items-start justify-between gap-3">
          <PageSection.HeaderColumn>
            <PageSection.Title size="lg">Explore</PageSection.Title>
            <PageSection.Description>{namespace}</PageSection.Description>
          </PageSection.HeaderColumn>
          <PageSection.HeaderActions className="flex flex-row flex-wrap items-center gap-2">
            {canRegenerate && (
              <Button variant="outline" size="sm" onClick={launch}>
                <RefreshCwIcon className="size-3.5" />
                {hasNoData ? "Generate" : "Refresh"}
              </Button>
            )}
            {isRefreshing && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Spinner />
                {phase === "projecting" ? "Projecting" : "Loading"}
              </span>
            )}
            <span className="text-sm text-muted-foreground">Limit</span>
            <Select value={limit} onValueChange={setLimit}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {limitOptions.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </PageSection.HeaderActions>
        </PageSection.HeaderRow>
      </PageSection.Header>

      {isStale && (
        <p className="text-xs text-muted-foreground">
          New context has been added since this projection was computed.
        </p>
      )}

      <div
        className="relative h-[40rem] overflow-hidden rounded-xl border bg-muted/20"
        style={
          selected || pushSceneBehind
            ? { zIndex: 0, isolation: "isolate" }
            : undefined
        }
      >
        {startError ? (
          <Empty className="h-full">
            <LoaderWithMessage>{startError}</LoaderWithMessage>
          </Empty>
        ) : isLoading ? (
          <Empty className="h-full">
            <LoaderWithMessage>Loading...</LoaderWithMessage>
          </Empty>
        ) : points.length === 0 && isRefreshing ? (
          <Empty className="h-full">
            <LoaderWithMessage>
              {phase === "projecting"
                ? "Projecting..."
                : "Loading embeddings..."}
            </LoaderWithMessage>
          </Empty>
        ) : (
          <>
            <ContextExploreScene />
            {hoveredEntryId && hoverData && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-3 right-3 z-10 text-xs text-muted-foreground"
                onClick={clearHover}
              >
                <Kbd>Esc</Kbd>
                clear edges
              </Button>
            )}
          </>
        )}
      </div>

      {selected && (
        <ContextExploreDetailDialog onClose={() => setSelected(null)} />
      )}
    </PageSection.Body>
  );
}
