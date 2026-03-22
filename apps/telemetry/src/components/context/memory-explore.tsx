import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { useAction, useQuery } from "convex/react";
import { FileTextIcon, LinkIcon, LoaderCircleIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../../../../convex/_generated/api.js";
import { PageSection } from "../layout/page-section";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
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

function hashString(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function srgbToHex(value: number) {
  return Math.round(clamp01(value) * 255)
    .toString(16)
    .padStart(2, "0");
}

function oklchToHex(seed: string) {
  const a = hashString(seed);
  const b = hashString(`${seed}:light`);
  const c = hashString(`${seed}:chroma`);
  const lightness = 0.62 + (b % 18) / 100;
  const chroma = 0.1 + (c % 7) / 100;
  const hue = ((a % 360) * Math.PI) / 180;
  const A = chroma * Math.cos(hue);
  const B = chroma * Math.sin(hue);
  const l = lightness + 0.3963377774 * A + 0.2158037573 * B;
  const m = lightness - 0.1055613458 * A - 0.0638541728 * B;
  const s = lightness - 0.0894841775 * A - 1.291485548 * B;
  const l3 = l ** 3;
  const m3 = m ** 3;
  const s3 = s ** 3;
  const r =
    4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const g =
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const blue =
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;
  return `#${srgbToHex(r)}${srgbToHex(g)}${srgbToHex(blue)}`;
}

function pointLabel(point: ProjectionPoint) {
  if (point.sourceType === "binaryFile") {
    return point.mimeType || "binary file";
  }
  return point.sourceType === "textFile" ? "text file" : "text memory";
}

function ProjectionMarker({
  point,
  selected,
  onSelect,
}: {
  point: ProjectionPoint;
  selected: boolean;
  onSelect: (entryId: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const color = oklchToHex(point.chartId || point.chartKey);
  const scale = selected ? 1.25 : hovered ? 1.15 : 1;
  const Icon = point.sourceType === "binaryFile" ? LinkIcon : FileTextIcon;

  return (
    <group position={[point.x * 7, point.y * 7, point.z * 7]}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: react-three-fiber meshes use pointer events inside the canvas. */}
      <mesh
        scale={scale}
        onClick={() => onSelect(point.entryId)}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <sphereGeometry args={[0.14, 20, 20]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={selected || hovered ? 0.45 : 0.18}
        />
      </mesh>
      <Html center distanceFactor={14}>
        <div
          className="pointer-events-none flex size-5 items-center justify-center rounded-full border bg-background/85 text-foreground shadow-sm"
          style={{
            borderColor: color,
            boxShadow: selected ? `0 0 0 1px ${color}` : undefined,
          }}
        >
          <Icon className="size-3" />
        </div>
      </Html>
      {(hovered || selected) && (
        <Html position={[0, 0.38, 0]} center>
          <div className="rounded-md border bg-background/95 px-2 py-1 text-xs shadow-lg">
            <div className="font-medium">
              {point.title || point.key}
            </div>
            <div className="text-muted-foreground">{pointLabel(point)}</div>
            {point.fileUrl ? (
              <a
                className="pointer-events-auto text-primary underline-offset-4 hover:underline"
                href={point.fileUrl}
                rel="noreferrer"
                target="_blank"
              >
                Open file
              </a>
            ) : null}
          </div>
        </Html>
      )}
    </group>
  );
}

function ExploreScene({
  points,
  selectedEntryId,
  onSelect,
}: {
  points: ProjectionPoint[];
  selectedEntryId: string | null;
  onSelect: (entryId: string) => void;
}) {
  return (
    <Canvas camera={{ position: [0, 0, 4.8], fov: 50 }}>
      <color attach="background" args={["#050816"]} />
      <ambientLight intensity={0.8} />
      <pointLight position={[8, 8, 8]} intensity={40} />
      <pointLight position={[-8, -8, -4]} intensity={12} color="#8ab4ff" />
      {points.map((point) => (
        <ProjectionMarker
          key={point.entryId}
          point={point}
          selected={selectedEntryId === point.entryId}
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
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const startProjection = useAction(api.context.memoryProjections.startMemoryProjection);
  const status = useQuery(
    api.context.memoryProjections.getMemoryProjectionStatus,
    jobId ? { jobId: jobId as never } : "skip",
  );
  const requestRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setIsStarting(true);
    setStartError(null);
    setSelectedEntryId(null);
    setJobId(null);
    void startProjection({
      namespace,
      chartIds: chartIds.length > 0 ? chartIds : undefined,
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
          error instanceof Error ? error.message : "Failed to start projection.",
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
  }, [chartIds, limit, namespace, query, startProjection]);

  const points = status?.points ?? [];
  const isWorking =
    isStarting ||
    status?.status === "pending" ||
    status?.status === "running" ||
    status === undefined;

  return (
    <PageSection.Body variant="card" className="gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <PageSection.Title size="lg">Explore</PageSection.Title>
          <PageSection.Description>
            {namespace}
            {chartIds.length > 0 ? ` · ${chartIds.length} charts` : " · all charts"}
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
          Status: {startError ? "failed" : status?.status ?? "starting"}
        </span>
        <span>Charts: {status?.resolvedChartCount ?? 0}</span>
        <span>Points: {status?.loadedPointCount ?? 0}</span>
      </div>
      <div className="relative h-[40rem] overflow-hidden rounded-xl border bg-muted/20">
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
            No projected points are available for the current namespace and chart
            filters.
          </div>
        ) : (
          <ExploreScene
            points={points}
            selectedEntryId={selectedEntryId}
            onSelect={setSelectedEntryId}
          />
        )}
      </div>
    </PageSection.Body>
  );
}
