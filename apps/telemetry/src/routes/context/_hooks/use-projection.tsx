import { useAction, useQuery } from "convex/react";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useDebounceValue } from "usehooks-ts";
import { api } from "../../../../../../convex/_generated/api.js";
import type { ProjectionPoint } from "../_components/context-explore-types.js";
import { useNamespace } from "./use-namespace.js";

const LIMIT_OPTIONS = ["48", "96", "144", "240"];
const HOVER_DEBOUNCE_MS = 120;

type ProjectionValue = {
  namespace: string;
  limitOptions: string[];
  limit: string;
  setLimit: (v: string) => void;

  points: ProjectionPoint[];
  isLoading: boolean;
  isRefreshing: boolean;
  isStale: boolean;
  canRegenerate: boolean;
  hasNoData: boolean;
  startError: string | null;
  phase: string | undefined;
  launch: () => void;

  selected: ProjectionPoint | null;
  setSelected: (p: ProjectionPoint | null) => void;

  hoveredEntryId: string | null;
  onHoverStart: (entryId: string) => void;
  onHoverEnd: (entryId: string) => void;
  clearHover: () => void;
  hoverData:
    | {
        neighbors: Array<{ id: string; score: number }>;
        communityMembers: string[];
      }
    | undefined;
};

const ProjectionContext = createContext<ProjectionValue | null>(null);

export function ProjectionProvider({ children }: PropsWithChildren) {
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

  const clearHover = useCallback(() => setRawHoveredId(null), []);

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
    <ProjectionContext.Provider
      value={{
        namespace,
        limitOptions: LIMIT_OPTIONS,
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
        hoveredEntryId: debouncedHoveredId,
        onHoverStart,
        onHoverEnd,
        clearHover,
        hoverData: hoverData ?? undefined,
      }}
    >
      {children}
    </ProjectionContext.Provider>
  );
}

export function useProjection(): ProjectionValue {
  const ctx = useContext(ProjectionContext);
  if (!ctx)
    throw new Error("useProjection must be used within ProjectionProvider");
  return ctx;
}
