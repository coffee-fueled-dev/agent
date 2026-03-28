import { LoaderWithMessage } from "@/components/blocks/loader-with-message.js";
import { PageSection } from "@/components/layout/page-section.js";
import { SidebarInsetFill } from "@/components/layout/sidebar.js";
import { Button } from "@/components/ui/button.js";
import { Empty } from "@/components/ui/empty.js";
import { Kbd } from "@/components/ui/kbd.js";
import { useProjection } from "../_hooks/use-projection.js";
import { ContextExploreDetailDialog } from "./context-explore-detail-dialog.js";
import { ContextExploreScene } from "./context-explore-scene.js";

export function ContextExplore({
  pushSceneBehind = false,
}: {
  pushSceneBehind?: boolean;
}) {
  return <ContextExploreInner pushSceneBehind={pushSceneBehind} />;
}

function ContextExploreInner({
  pushSceneBehind,
}: {
  pushSceneBehind: boolean;
}) {
  const {
    points,
    isLoading,
    isRefreshing,
    isStale,
    startError,
    phase,
    selected,
    setSelected,
    hoveredEntryId,
    clearHover,
    hoverData,
  } = useProjection();

  return (
    <SidebarInsetFill>
      <PageSection.Body className="gap-4 h-full relative">
        {isStale && (
          <p className="text-xs text-muted-foreground">
            New context has been added since this projection was computed.
          </p>
        )}

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

        <div
          className="h-full overflow-hidden fade-mask-x fade-mask-y bg-muted/20"
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
            <ContextExploreScene />
          )}
        </div>

        {selected && (
          <ContextExploreDetailDialog onClose={() => setSelected(null)} />
        )}
      </PageSection.Body>
    </SidebarInsetFill>
  );
}
