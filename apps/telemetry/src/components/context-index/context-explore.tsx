import { Bounds, Html, Line, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useAction, useQuery } from "convex/react";
import { RefreshCwIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDebounceValue } from "usehooks-ts";
import { api } from "../../../../../convex/_generated/api.js";
import { LoaderWithMessage } from "../blocks/loader-with-message.js";
import { PageSection } from "../layout/page-section";
import { Button } from "../ui/button.js";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Empty } from "../ui/empty.js";
import { Kbd } from "../ui/kbd.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Spinner } from "../ui/spinner.js";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip.js";
import { MimeTypeIcon } from "./mime-type-icon.js";
import { useNamespace } from "./use-namespace";

const LIMIT_OPTIONS = ["48", "96", "144", "240"];
const SCALE = 7;
const HOVER_DEBOUNCE_MS = 120;

type ProjectionPoint = {
  entryId: string;
  key: string;
  title?: string;
  textPreview: string;
  mimeType?: string;
  x: number;
  y: number;
  z: number;
};

function ProjectionMarker({
  point,
  dimmed,
  onSelect,
  onHoverStart,
  onHoverEnd,
}: {
  point: ProjectionPoint;
  dimmed: boolean;
  onSelect: (point: ProjectionPoint) => void;
  onHoverStart: (entryId: string) => void;
  onHoverEnd: (entryId: string) => void;
}) {
  return (
    <group position={[point.x * SCALE, point.y * SCALE, point.z * SCALE]}>
      <Html center zIndexRange={[250, -250]}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon-sm"
                className="rounded-full transition-opacity duration-200"
                style={{ opacity: dimmed ? 0.15 : 1 }}
                onClick={() => onSelect(point)}
                onPointerEnter={() => onHoverStart(point.entryId)}
                onPointerLeave={() => onHoverEnd(point.entryId)}
              >
                <MimeTypeIcon mimeType={point.mimeType} className="size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <span>{point.title || point.key}</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </Html>
    </group>
  );
}

function EdgeLines({
  hoveredId,
  neighbors,
  posMap,
}: {
  hoveredId: string;
  neighbors: Array<{ id: string; score: number }>;
  posMap: Map<string, [number, number, number]>;
}) {
  const origin = posMap.get(hoveredId);
  if (!origin) return null;

  const scores = neighbors.map((n) => n.score);
  const minScore = Math.min(...scores, 0);
  const maxScore = Math.max(...scores, 1);
  const range = maxScore - minScore || 1;

  return (
    <>
      {neighbors.map((n) => {
        const target = posMap.get(n.id);
        if (!target) return null;
        const normalized = (n.score - minScore) / range;
        const opacity = 0.15 + normalized * 0.85;
        const lineWidth = 0.5 + normalized * 1.5;
        return (
          <Line
            key={n.id}
            points={[origin, target]}
            color="var(--color-primary)"
            lineWidth={lineWidth}
            transparent
            opacity={opacity}
          />
        );
      })}
    </>
  );
}

function ExploreScene({
  points,
  onSelect,
  hoveredEntryId,
  onHoverStart,
  onHoverEnd,
  hoverData,
}: {
  points: ProjectionPoint[];
  onSelect: (point: ProjectionPoint) => void;
  hoveredEntryId: string | null;
  onHoverStart: (entryId: string) => void;
  onHoverEnd: (entryId: string) => void;
  hoverData:
    | {
        neighbors: Array<{ id: string; score: number }>;
        communityMembers: string[];
      }
    | undefined;
}) {
  const posMap = useMemo(() => {
    const m = new Map<string, [number, number, number]>();
    for (const p of points) {
      m.set(p.entryId, [p.x * SCALE, p.y * SCALE, p.z * SCALE]);
    }
    return m;
  }, [points]);

  const communitySet = useMemo(() => {
    if (!hoverData?.communityMembers.length) return null;
    return new Set(hoverData.communityMembers);
  }, [hoverData]);

  return (
    <Canvas camera={{ position: [0, 0, 4.8], fov: 50 }}>
      <color attach="background" args={["var(--card)"]} />
      <ambientLight intensity={0.8} />
      <pointLight position={[8, 8, 8]} intensity={40} />
      <pointLight position={[-8, -8, -4]} intensity={12} color="#8ab4ff" />
      <Bounds fit clip margin={2}>
        {points.map((point) => (
          <ProjectionMarker
            key={point.entryId}
            point={point}
            dimmed={
              communitySet !== null &&
              point.entryId !== hoveredEntryId &&
              !communitySet.has(point.entryId)
            }
            onSelect={onSelect}
            onHoverStart={onHoverStart}
            onHoverEnd={onHoverEnd}
          />
        ))}
        {hoveredEntryId && hoverData && (
          <EdgeLines
            hoveredId={hoveredEntryId}
            neighbors={hoverData.neighbors}
            posMap={posMap}
          />
        )}
      </Bounds>
      <OrbitControls enableDamping makeDefault />
    </Canvas>
  );
}

function PointDetailDialog({
  point,
  namespace,
  onClose,
}: {
  point: ProjectionPoint;
  namespace: string;
  onClose: () => void;
}) {
  const file = useQuery(api.context.contextApi.getContextFile, {
    entryId: point.entryId,
  });
  const isImage = file?.mimeType?.startsWith("image/") && !!file?.url;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader className="flex flex-row items-center gap-2">
          <div className="flex items-center justify-center gap-2 rounded-md bg-muted p-2 border border-border">
            <MimeTypeIcon mimeType={point.mimeType} className="size-4" />
          </div>
          <DialogTitle>{point.title || point.key}</DialogTitle>
        </DialogHeader>
        <div className="text-sm bg-muted p-4 rounded-lg">
          <DialogDescription>{point.textPreview}</DialogDescription>
        </div>
        {isImage && file?.url && (
          <img
            src={file.url}
            alt={point.title || point.key}
            className="max-h-64 rounded-lg border object-contain mx-auto"
          />
        )}
        <DialogFooter>
          <Button asChild variant="outline">
            <a
              href={`/context/${encodeURIComponent(point.entryId)}?namespace=${encodeURIComponent(namespace)}`}
            >
              View details
            </a>
          </Button>
          <DialogClose>Close</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ContextExplore({
  pushSceneBehind = false,
}: {
  pushSceneBehind?: boolean;
}) {
  const { namespace } = useNamespace();
  const [limit, setLimit] = useState(LIMIT_OPTIONS[1] || "96");

  const cached = useQuery(api.context.projections.getLatestProjection, {
    namespace,
  });

  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const startProjection = useAction(
    api.context.projections.startContextProjection,
  );
  const startCommunity = useAction(
    api.context.communities.startContextCommunityWorkflow,
  );
  const activeStatus = useQuery(
    api.context.projections.getContextProjectionStatus,
    activeJobId ? { jobId: activeJobId } : "skip",
  );
  const requestRef = useRef(0);

  const launch = useCallback(() => {
    const requestId = ++requestRef.current;
    setIsStarting(true);
    setStartError(null);
    setActiveJobId(null);
    void Promise.all([
      startProjection({ namespace, limit: Number(limit) }),
      startCommunity({ namespace }),
    ])
      .then(([projResult]) => {
        if (requestRef.current !== requestId) return;
        setActiveJobId(projResult.jobId);
      })
      .catch((error) => {
        if (requestRef.current !== requestId) return;
        setStartError(
          error instanceof Error
            ? error.message
            : "Failed to start projection.",
        );
      })
      .finally(() => {
        if (requestRef.current === requestId) setIsStarting(false);
      });
  }, [namespace, limit, startProjection, startCommunity]);

  const isRefreshing =
    isStarting ||
    activeStatus?.status === "pending" ||
    activeStatus?.status === "running";

  const displayStatus = activeStatus ?? cached;
  const points: ProjectionPoint[] =
    displayStatus?.status === "completed" ? displayStatus.points : [];
  const isStale = displayStatus?.status === "completed" && displayStatus.stale;
  const hasNoData = cached === null && !activeJobId;
  const cachedIsStuck =
    !activeJobId &&
    (cached?.status === "running" || cached?.status === "pending");
  const canRegenerate =
    !isStarting &&
    (hasNoData ||
      isStale ||
      cachedIsStuck ||
      displayStatus?.status === "failed" ||
      displayStatus?.status === "completed");
  const isLoading = cached === undefined;
  const phase =
    activeStatus?.status === "running" ? activeStatus.phase : undefined;

  const [selected, setSelected] = useState<ProjectionPoint | null>(null);

  const [rawHoveredId, setRawHoveredId] = useState<string | null>(null);
  const [debouncedHoveredId] = useDebounceValue(
    rawHoveredId,
    HOVER_DEBOUNCE_MS,
  );

  const onHoverStart = useCallback((entryId: string) => {
    setRawHoveredId(entryId);
  }, []);

  const onHoverEnd = useCallback(() => {}, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setRawHoveredId(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const hoverData = useQuery(
    api.context.communities.getEntryGraphContext,
    debouncedHoveredId ? { namespace, entryId: debouncedHoveredId } : "skip",
  );

  return (
    <PageSection.Body variant="card" className="gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <PageSection.Title size="lg">Explore</PageSection.Title>
          <PageSection.Description>{namespace}</PageSection.Description>
        </div>
        <div className="flex items-center gap-2">
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
              {LIMIT_OPTIONS.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

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
            <ExploreScene
              points={points}
              onSelect={setSelected}
              hoveredEntryId={debouncedHoveredId}
              onHoverStart={onHoverStart}
              onHoverEnd={onHoverEnd}
              hoverData={hoverData ?? undefined}
            />
            {debouncedHoveredId && hoverData && (
              <div className="absolute top-3 right-3 flex items-center gap-1.5 text-xs text-muted-foreground z-10">
                <Kbd>Esc</Kbd>
                <span>clear edges</span>
              </div>
            )}
          </>
        )}
      </div>

      {selected && (
        <PointDetailDialog
          point={selected}
          namespace={namespace}
          onClose={() => setSelected(null)}
        />
      )}
    </PageSection.Body>
  );
}
