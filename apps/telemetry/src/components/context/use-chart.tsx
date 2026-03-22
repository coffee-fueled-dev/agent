import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

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
  initialChartIds = [],
}: PropsWithChildren<{
  initialChartIds?: string[];
}>) {
  const [selectedChartIds, setSelectedChartIds] = useState(initialChartIds);

  const isSelected = useCallback(
    (chartId: string) => selectedChartIds.includes(chartId),
    [selectedChartIds],
  );

  const toggleChart = useCallback((chartId: string) => {
    setSelectedChartIds((current) =>
      current.includes(chartId)
        ? current.filter((value) => value !== chartId)
        : [...current, chartId],
    );
  }, []);

  const clearCharts = useCallback(() => {
    setSelectedChartIds([]);
  }, []);

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
