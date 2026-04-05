"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { EventsFiltersState } from "../events/_hooks/use-events-filters-from-url.js";

export type EventBusStreamFiltersApi = {
  filters: EventsFiltersState;
  setFilters: React.Dispatch<React.SetStateAction<EventsFiltersState>>;
  resetFilters: () => void;
};

const EventBusStreamContext = createContext<EventBusStreamFiltersApi | null>(
  null,
);

export function EventBusStreamProvider({
  children,
  defaultFilters,
}: {
  children: ReactNode;
  defaultFilters?: EventsFiltersState;
}) {
  const [filters, setFilters] = useState<EventsFiltersState>(
    defaultFilters ?? {},
  );
  const resetFilters = useCallback(() => {
    setFilters(defaultFilters ?? {});
  }, [defaultFilters]);

  const value = useMemo(
    (): EventBusStreamFiltersApi => ({
      filters,
      setFilters,
      resetFilters,
    }),
    [filters, resetFilters],
  );

  return (
    <EventBusStreamContext.Provider value={value}>
      {children}
    </EventBusStreamContext.Provider>
  );
}

export function useOptionalEventBusStreamFilters(): EventBusStreamFiltersApi | null {
  return useContext(EventBusStreamContext);
}

export function useEventBusStreamFilters(): EventBusStreamFiltersApi {
  const ctx = useOptionalEventBusStreamFilters();
  if (!ctx) {
    throw new Error(
      "useEventBusStreamFilters must be used within EventBusStreamProvider.",
    );
  }
  return ctx;
}
