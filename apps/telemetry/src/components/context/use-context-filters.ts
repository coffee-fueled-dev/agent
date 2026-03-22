import {
  useCallback,
  useMemo,
  useSyncExternalStore,
} from "react";

const DEFAULT_NAMESPACE = "default";
const FILTERS_EVENT = "context-filters-change";

type ContextFiltersState = {
  namespace: string;
  chartIds: string[];
  query: string;
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
  return {
    namespace: params.get("namespace")?.trim() || DEFAULT_NAMESPACE,
    chartIds: normalizeChartIds(
      (params.get("charts") || "")
        .split(",")
        .map((chartId) => chartId.trim())
        .filter(Boolean),
    ),
    query: params.get("query") ?? "",
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
      });
    },
    [],
  );

  const setNamespace = useCallback(
    (namespace: string) => {
      setFilters({
        namespace,
        chartIds: [],
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

  return useMemo(
    () => ({
      namespace: filters.namespace,
      displayName: filters.namespace,
      chartIds: filters.chartIds,
      query: filters.query,
      selectedCount: filters.chartIds.length,
      setNamespace,
      setChartIds,
      toggleChartId,
      clearChartIds,
      setQuery,
    }),
    [filters, setNamespace, setChartIds, toggleChartId, clearChartIds, setQuery],
  );
}
