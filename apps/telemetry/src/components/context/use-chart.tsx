import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { useContextFilters } from "./use-context-filters";

type ChartContextValue = {
  selectedChartIds: string[];
  selectedCount: number;
  isSelected: (chartId: string) => boolean;
  toggleChart: (chartId: string) => void;
  clearCharts: () => void;
};

const ChartContext = createContext<ChartContextValue | null>(null);

export function ChartProvider({
  children,
}: PropsWithChildren<{
  initialChartIds?: string[];
}>) {
  const filters = useContextFilters();
  const selectedChartIds = filters.chartIds;

  const isSelected = useCallback(
    (chartId: string) => selectedChartIds.includes(chartId),
    [selectedChartIds],
  );

  const toggleChart = useCallback(
    (chartId: string) => {
      filters.toggleChartId(chartId);
    },
    [filters],
  );

  const clearCharts = useCallback(() => {
    filters.clearChartIds();
  }, [filters]);

  const value = useMemo(
    () => ({
      selectedChartIds,
      selectedCount: selectedChartIds.length,
      isSelected,
      toggleChart,
      clearCharts,
    }),
    [clearCharts, isSelected, selectedChartIds, toggleChart],
  );

  return (
    <ChartContext.Provider value={value}>{children}</ChartContext.Provider>
  );
}

export function useChart() {
  const context = useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within ChartProvider");
  }
  return context;
}
