import { Bounds, Html, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useAction, useQuery } from "convex/react";
import { LoaderCircleIcon, RefreshCwIcon } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { api } from "../../../../../convex/_generated/api.js";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip.js";
import { MimeTypeIcon } from "./mime-type-icon.js";
import { useNamespace } from "./use-namespace";

const LIMIT_OPTIONS = ["48", "96", "144", "240"];

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
  onSelect,
}: {
  point: ProjectionPoint;
  onSelect: (point: ProjectionPoint) => void;
}) {
  return (
    <group position={[point.x * 7, point.y * 7, point.z * 7]}>
      <Html center zIndexRange={[250, -250]}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon-sm"
                className="rounded-full"
                onClick={() => onSelect(point)}
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

function ExploreScene({
  points,
  onSelect,
}: {
  points: ProjectionPoint[];
  onSelect: (point: ProjectionPoint) => void;
}) {
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
            onSelect={onSelect}
          />
        ))}
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
    void startProjection({ namespace, limit: Number(limit) })
      .then((result) => {
        if (requestRef.current !== requestId) return;
        setActiveJobId(result.jobId);
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
  }, [namespace, limit, startProjection]);

  const isRefreshing =
    isStarting ||
    activeStatus?.status === "pending" ||
    activeStatus?.status === "running";

  const displayStatus = activeStatus ?? cached;
  const points: ProjectionPoint[] =
    displayStatus?.status === "completed" ? displayStatus.points : [];
  const isStale = displayStatus?.status === "completed" && displayStatus.stale;
  const hasNoData = cached === null && !activeJobId;
  const canRegenerate = !isRefreshing && (hasNoData || isStale || displayStatus?.status === "failed" || displayStatus?.status === "completed");
  const isLoading = cached === undefined;
  const phase =
    activeStatus?.status === "running" ? activeStatus.phase : undefined;

  const [selected, setSelected] = useState<ProjectionPoint | null>(null);

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
              <LoaderCircleIcon className="size-3.5 animate-spin" />
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
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-destructive">
            {startError}
          </div>
        ) : isLoading ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
            <LoaderCircleIcon className="size-5 animate-spin" />
            <span>Loading...</span>
          </div>
        ) : points.length === 0 ? (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
            {hasNoData
              ? "No projection yet. Click Generate to create one."
              : "No projected points available for this namespace."}
          </div>
        ) : (
          <ExploreScene points={points} onSelect={setSelected} />
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
