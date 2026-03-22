import { Html, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useAction, useQuery } from "convex/react";
import { FileTextIcon, LinkIcon, LoaderCircleIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils.js";
import { api } from "../../../../../convex/_generated/api.js";
import { PageSection } from "../layout/page-section";
import { RequiredResult } from "../layout/required-result.js";
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
import { useContextFilters } from "./use-context-filters";

const LIMIT_OPTIONS = ["48", "96", "144", "240"];

type ProjectionPoint = {
  entryId: string;
  chartId: string;
  chartKey: string;
  key: string;
  title: string | null;
  sourceType: "text" | "textFile" | "binaryFile";
  mimeType?: string | null;
  fileUrl?: string | null;
  x: number;
  y: number;
  z: number;
};

function formatDate(value: number) {
  return new Date(value).toLocaleString();
}

function formatIcon(sourceType: ProjectionPoint["sourceType"]) {
  if (sourceType === "binaryFile") {
    return LinkIcon;
  }
  return FileTextIcon;
}

function pointLabel(point: {
  sourceType: ProjectionPoint["sourceType"];
  mimeType?: string | null;
}) {
  if (point.sourceType === "binaryFile") {
    return point.mimeType || "binary file";
  }
  return point.sourceType === "textFile" ? "text file" : "text memory";
}

function ProjectionMarker({
  point,
  onSelect,
}: {
  point: ProjectionPoint;
  onSelect: (entryId: string) => void;
}) {
  const Icon = formatIcon(point.sourceType);

  return (
    <group position={[point.x * 7, point.y * 7, point.z * 7]}>
      <Html center>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon-sm"
                className={cn("rounded-full")}
                onClick={() => onSelect(point.entryId)}
              >
                <Icon className="size-3" />
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
  onSelect: (entryId: string) => void;
}) {
  return (
    <Canvas camera={{ position: [0, 0, 4.8], fov: 50 }}>
      <color attach="background" args={["var(--card)"]} />
      <ambientLight intensity={0.8} />
      <pointLight position={[8, 8, 8]} intensity={40} />
      <pointLight position={[-8, -8, -4]} intensity={12} color="#8ab4ff" />
      {points.map((point) => (
        <ProjectionMarker
          key={point.entryId}
          point={point}
          onSelect={onSelect}
        />
      ))}
      <OrbitControls enableDamping makeDefault />
    </Canvas>
  );
}

export function MemoryExplore() {
  const { namespace, chartIds, query } = useContextFilters();
  const [limit, setLimit] = useState(LIMIT_OPTIONS[1] || "96");
  const [jobId, setJobId] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const startProjection = useAction(
    api.context.memoryProjections.startMemoryProjection,
  );
  const status = useQuery(
    api.context.memoryProjections.getMemoryProjectionStatus,
    jobId ? { jobId: jobId as never } : "skip",
  );
  const requestRef = useRef(0);
  const chartIdsKey = useMemo(() => chartIds.join(","), [chartIds]);
  const stableChartIds = useMemo(
    () => (chartIdsKey ? chartIdsKey.split(",") : []),
    [chartIdsKey],
  );

  useEffect(() => {
    let cancelled = false;
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setIsStarting(true);
    setStartError(null);
    setJobId(null);
    void startProjection({
      namespace,
      chartIds: stableChartIds.length > 0 ? stableChartIds : undefined,
      query,
      limit: Number(limit),
    })
      .then((result) => {
        if (cancelled || requestRef.current !== requestId) {
          return;
        }
        setJobId(result.jobId);
      })
      .catch((error) => {
        if (cancelled || requestRef.current !== requestId) {
          return;
        }
        setStartError(
          error instanceof Error
            ? error.message
            : "Failed to start projection.",
        );
      })
      .finally(() => {
        if (!cancelled && requestRef.current === requestId) {
          setIsStarting(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [limit, namespace, query, stableChartIds, startProjection]);

  const points = status?.points ?? [];
  const isWorking =
    isStarting ||
    status?.status === "pending" ||
    status?.status === "running" ||
    status === undefined;

  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  function handleOpenChange(open: boolean) {
    if (!open) setSelectedEntryId(null);
  }
  function handleSelect(entryId: string | null) {
    setSelectedEntryId(entryId);
  }

  return (
    <PageSection.Body variant="card" className="gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <PageSection.Title size="lg">Explore</PageSection.Title>
          <PageSection.Description>
            {namespace}
            {chartIds.length > 0
              ? ` · ${chartIds.length} charts`
              : " · all charts"}
            {query.trim() ? " · query synced" : ""}
          </PageSection.Description>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Result count</span>
          <Select value={limit} onValueChange={setLimit}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LIMIT_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span>
          Status: {startError ? "failed" : (status?.status ?? "starting")}
        </span>
        <span>Charts: {status?.resolvedChartCount ?? 0}</span>
        <span>Points: {status?.loadedPointCount ?? 0}</span>
      </div>
      <div
        className="relative h-[40rem] overflow-hidden rounded-xl border bg-muted/20"
        style={
          selectedEntryId ? { zIndex: 0, isolation: "isolate" } : undefined
        }
      >
        {startError ? (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-destructive">
            {startError}
          </div>
        ) : isWorking ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
            <LoaderCircleIcon className="size-5 animate-spin" />
            <span>
              {status?.phase === "projecting"
                ? "Projecting embeddings..."
                : "Loading projection..."}
            </span>
          </div>
        ) : points.length === 0 ? (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
            No projected points are available for the current namespace and
            chart filters.
          </div>
        ) : (
          <ExploreScene points={points} onSelect={handleSelect} />
        )}
      </div>

      <Dialog open={!!selectedEntryId} onOpenChange={handleOpenChange}>
        {selectedEntryId && (
          <DialogContent>
            <RequiredResult
              query={api.agentMemory.getMemoryChartMemberByEntryId}
              args={{ namespace, entryId: selectedEntryId }}
            >
              {(detail) => {
                const Icon = formatIcon(detail.sourceType);
                return (
                  <>
                    <DialogHeader>
                      <span className="flex items-center gap-2">
                        <div className="flex items-center justify-center gap-2 rounded-md bg-muted p-2 border border-border">
                          <Icon className="size-5" />
                        </div>
                        <span>
                          <DialogTitle>
                            {detail.title || detail.key}
                          </DialogTitle>
                          <DialogDescription>
                            {pointLabel(detail)}
                          </DialogDescription>
                        </span>
                      </span>
                      <DialogDescription>
                        {formatDate(detail.assignedAt)}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="text-sm bg-muted p-4 rounded-lg">
                      <DialogDescription>{detail.summary}</DialogDescription>
                    </div>
                    <DialogFooter>
                      <DialogClose>Close</DialogClose>
                    </DialogFooter>
                  </>
                );
              }}
            </RequiredResult>
          </DialogContent>
        )}
      </Dialog>
    </PageSection.Body>
  );
}
