import {
  useCallback,
  useMemo,
  useSyncExternalStore,
} from "react";

const DEFAULT_NAMESPACE = "default";
const FILTERS_EVENT = "context-filters-change";

type MemoryFocusMode = "hover" | "dialog";

type ContextFiltersState = {
  namespace: string;
  chartIds: string[];
  query: string;
  selectedMemoryId: string | null;
  memoryFocusMode: MemoryFocusMode | null;
};

function normalizeChartIds(chartIds: string[]) {
  return Array.from(
    new Set(
      chartIds.map((chartId) => chartId.trim()).filter((chartId) => chartId),
    ),
  );
}

function parseFilters(search: string): ContextFiltersState {
  const params = new URLSearchParams(search);
  const selectedMemoryId = params.get("memory")?.trim() || null;
  const mode = params.get("memoryMode");
  return {
    namespace: params.get("namespace")?.trim() || DEFAULT_NAMESPACE,
    chartIds: normalizeChartIds(
      (params.get("charts") || "")
        .split(",")
        .map((chartId) => chartId.trim())
        .filter(Boolean),
    ),
    query: params.get("query") ?? "",
    selectedMemoryId,
    memoryFocusMode:
      selectedMemoryId &&
      (mode === "hover" || mode === "dialog")
        ? mode
        : null,
  };
}

function getSearchSnapshot() {
  if (typeof window === "undefined") {
    return "";
  }
  return window.location.search;
}

function getServerSnapshot() {
  return "";
}

function getCurrentFilters() {
  if (typeof window === "undefined") {
    return {
      namespace: DEFAULT_NAMESPACE,
      chartIds: [],
      query: "",
      selectedMemoryId: null,
      memoryFocusMode: null,
    };
  }
  return parseFilters(window.location.search);
}

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handleChange = () => onStoreChange();
  window.addEventListener("popstate", handleChange);
  window.addEventListener(FILTERS_EVENT, handleChange);
  return () => {
    window.removeEventListener("popstate", handleChange);
    window.removeEventListener(FILTERS_EVENT, handleChange);
  };
}

function writeFilters(next: ContextFiltersState) {
  const url = new URL(window.location.href);
  const namespace = next.namespace.trim() || DEFAULT_NAMESPACE;
  const chartIds = normalizeChartIds(next.chartIds);
  const query = next.query;
  const selectedMemoryId = next.selectedMemoryId?.trim() || null;
  url.searchParams.set("namespace", namespace);
  if (chartIds.length > 0) {
    url.searchParams.set("charts", chartIds.join(","));
  } else {
    url.searchParams.delete("charts");
  }
  if (query.trim()) {
    url.searchParams.set("query", query);
  } else {
    url.searchParams.delete("query");
  }
  if (selectedMemoryId) {
    url.searchParams.set("memory", selectedMemoryId);
  } else {
    url.searchParams.delete("memory");
  }
  if (selectedMemoryId && next.memoryFocusMode) {
    url.searchParams.set("memoryMode", next.memoryFocusMode);
  } else {
    url.searchParams.delete("memoryMode");
  }
  if (url.search === window.location.search) {
    return;
  }
  window.history.replaceState(window.history.state, "", url);
  window.dispatchEvent(new Event(FILTERS_EVENT));
}

export function useContextFilters() {
  const search = useSyncExternalStore(
    subscribe,
    getSearchSnapshot,
    getServerSnapshot,
  );
  const filters = useMemo(() => parseFilters(search), [search]);

  const setFilters = useCallback(
    (
      updater:
        | Partial<ContextFiltersState>
        | ((current: ContextFiltersState) => Partial<ContextFiltersState>),
    ) => {
      const current = getCurrentFilters();
      const patch =
        typeof updater === "function" ? updater(current) : updater;
      writeFilters({
        namespace:
          patch.namespace !== undefined ? patch.namespace : current.namespace,
        chartIds:
          patch.chartIds !== undefined ? patch.chartIds : current.chartIds,
        query: patch.query !== undefined ? patch.query : current.query,
        selectedMemoryId:
          patch.selectedMemoryId !== undefined
            ? patch.selectedMemoryId
            : current.selectedMemoryId,
        memoryFocusMode:
          patch.memoryFocusMode !== undefined
            ? patch.memoryFocusMode
            : current.memoryFocusMode,
      });
    },
    [],
  );

  const setNamespace = useCallback(
    (namespace: string) => {
      setFilters({
        namespace,
        chartIds: [],
        selectedMemoryId: null,
        memoryFocusMode: null,
      });
    },
    [setFilters],
  );

  const setChartIds = useCallback(
    (chartIds: string[]) => {
      setFilters({ chartIds });
    },
    [setFilters],
  );

  const toggleChartId = useCallback(
    (chartId: string) => {
      setFilters((current) => ({
        chartIds: current.chartIds.includes(chartId)
          ? current.chartIds.filter((value) => value !== chartId)
          : [...current.chartIds, chartId],
      }));
    },
    [setFilters],
  );

  const clearChartIds = useCallback(() => {
    setFilters({ chartIds: [] });
  }, [setFilters]);

  const setQuery = useCallback(
    (query: string) => {
      setFilters({ query });
    },
    [setFilters],
  );

  const focusMemory = useCallback(
    (entryId: string, mode: MemoryFocusMode) => {
      setFilters({
        selectedMemoryId: entryId,
        memoryFocusMode: mode,
      });
    },
    [setFilters],
  );

  const clearFocusedMemory = useCallback(
    (mode?: MemoryFocusMode) => {
      setFilters((current) => {
        if (mode && current.memoryFocusMode !== mode) {
          return {};
        }
        return {
          selectedMemoryId: null,
          memoryFocusMode: null,
        };
      });
    },
    [setFilters],
  );

  const previewMemory = useCallback(
    (entryId: string) => {
      focusMemory(entryId, "hover");
    },
    [focusMemory],
  );

  const openMemoryDialog = useCallback(
    (entryId: string) => {
      focusMemory(entryId, "dialog");
    },
    [focusMemory],
  );

  const clearHoverPreview = useCallback(() => {
    clearFocusedMemory("hover");
  }, [clearFocusedMemory]);

  const closeMemoryDialog = useCallback(() => {
    clearFocusedMemory("dialog");
  }, [clearFocusedMemory]);

  return useMemo(
    () => ({
      namespace: filters.namespace,
      displayName: filters.namespace,
      chartIds: filters.chartIds,
      query: filters.query,
      selectedMemoryId: filters.selectedMemoryId,
      memoryFocusMode: filters.memoryFocusMode,
      selectedCount: filters.chartIds.length,
      setNamespace,
      setChartIds,
      toggleChartId,
      clearChartIds,
      setQuery,
      focusMemory,
      clearFocusedMemory,
      previewMemory,
      openMemoryDialog,
      clearHoverPreview,
      closeMemoryDialog,
    }),
    [
      clearChartIds,
      clearFocusedMemory,
      clearHoverPreview,
      closeMemoryDialog,
      filters,
      focusMemory,
      openMemoryDialog,
      previewMemory,
      setChartIds,
      setNamespace,
      setQuery,
      toggleChartId,
    ],
  );
}
