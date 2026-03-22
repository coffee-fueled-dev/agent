import { useAction } from "convex/react";
import {
  createContext,
  createElement,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "../../../../../convex/_generated/api.js";
import type { AgentMemorySearchResult } from "../../../../../convex/components/agentMemory/public/search.js";
import { useChart } from "./use-chart.js";
import { useNamespace } from "./use-namespace.js";

type MemoriesContextValue = {
  memories: AgentMemorySearchResult[];
  query: string;
  setQuery: (value: string) => void;
  search: (value?: string) => Promise<AgentMemorySearchResult[]>;
  refresh: () => Promise<AgentMemorySearchResult[]>;
  isSearching: boolean;
  error: string | null;
  hasSearched: boolean;
};

const MemoriesContext = createContext<MemoriesContextValue | null>(null);

const SEARCH_LIMIT = 20;

export function MemoriesProvider({ children }: PropsWithChildren) {
  const { namespace } = useNamespace();
  const { selectedChartIds } = useChart();
  const searchContextMemories = useAction(
    api.agentMemory.searchContextMemories,
  );
  const [query, setQuery] = useState("");
  const [memories, setMemories] = useState<AgentMemorySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const search = useCallback(
    async (value?: string) => {
      const nextQuery = (value ?? query).trim();
      if (!nextQuery) {
        setMemories([]);
        setError(null);
        setHasSearched(false);
        return [];
      }

      setIsSearching(true);
      setError(null);
      try {
        const results = await searchContextMemories({
          namespace,
          query: nextQuery,
          limit: SEARCH_LIMIT,
          chartIds: selectedChartIds.length > 0 ? selectedChartIds : undefined,
          vectorScoreThreshold: 0.1,
        });
        setMemories(results);
        setHasSearched(true);
        return results;
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Failed to search memories.";
        setError(message);
        setMemories([]);
        setHasSearched(true);
        return [];
      } finally {
        setIsSearching(false);
      }
    },
    [namespace, query, searchContextMemories, selectedChartIds],
  );

  const refresh = useCallback(() => search(query), [query, search]);

  useEffect(() => {
    if (!hasSearched || !query.trim()) {
      return;
    }
    void search(query);
  }, [hasSearched, query, search]);

  const value = useMemo(
    () => ({
      memories,
      query,
      setQuery,
      search,
      refresh,
      isSearching,
      error,
      hasSearched,
    }),
    [error, hasSearched, isSearching, memories, query, refresh, search],
  );

  return (
    <MemoriesContext.Provider value={value}>
      {children}
    </MemoriesContext.Provider>
  );
}

export function useMemories() {
  const context = useContext(MemoriesContext);
  if (!context) {
    throw new Error("useMemories must be used within MemoriesProvider");
  }
  return context;
}
