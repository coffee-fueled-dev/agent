import { useMemo, useSyncExternalStore } from "react";

/** Dispatched after `history.replaceState` so `useSyncExternalStore` subscribers update. */
export const EVENTS_FILTERS_CHANGE = "events-filters-change";

/**
 * Events list filter query params (short keys):
 * - `et` — event type dimension id (`unifiedTimelineDimensions`)
 * - `st` — source stream type dimension id
 * - `from` / `to` — `eventTime` bounds as ISO 8601 strings (UTC from `Date.toISOString()`)
 */
export type EventsFiltersState = {
  eventTypeId?: string;
  sourceStreamTypeId?: string;
  eventTimeMin?: number;
  eventTimeMax?: number;
};

export function readEventsFiltersFromSearch(
  search: string,
): EventsFiltersState {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const et = params.get("et")?.trim();
  const st = params.get("st")?.trim();
  const from = params.get("from");
  const to = params.get("to");
  const out: EventsFiltersState = {};
  if (et) out.eventTypeId = et;
  if (st) out.sourceStreamTypeId = st;
  if (from) {
    const t = Date.parse(from);
    if (!Number.isNaN(t)) out.eventTimeMin = t;
  }
  if (to) {
    const t = Date.parse(to);
    if (!Number.isNaN(t)) out.eventTimeMax = t;
  }
  return out;
}

export function writeEventsFiltersToUrl(next: EventsFiltersState) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (next.eventTypeId) url.searchParams.set("et", next.eventTypeId);
  else url.searchParams.delete("et");
  if (next.sourceStreamTypeId)
    url.searchParams.set("st", next.sourceStreamTypeId);
  else url.searchParams.delete("st");
  if (next.eventTimeMin != null)
    url.searchParams.set("from", new Date(next.eventTimeMin).toISOString());
  else url.searchParams.delete("from");
  if (next.eventTimeMax != null)
    url.searchParams.set("to", new Date(next.eventTimeMax).toISOString());
  else url.searchParams.delete("to");
  if (url.search === window.location.search) return;
  window.history.replaceState(window.history.state, "", url);
  window.dispatchEvent(new Event(EVENTS_FILTERS_CHANGE));
}

export function eventsFiltersToQueryArgs(f: EventsFiltersState): {
  eventTypeId?: string;
  sourceStreamTypeId?: string;
  eventTimeMin?: number;
  eventTimeMax?: number;
} {
  const o: {
    eventTypeId?: string;
    sourceStreamTypeId?: string;
    eventTimeMin?: number;
    eventTimeMax?: number;
  } = {};
  if (f.eventTypeId) o.eventTypeId = f.eventTypeId;
  if (f.sourceStreamTypeId) o.sourceStreamTypeId = f.sourceStreamTypeId;
  if (f.eventTimeMin != null) o.eventTimeMin = f.eventTimeMin;
  if (f.eventTimeMax != null) o.eventTimeMax = f.eventTimeMax;
  return o;
}

function getSearchSnapshot() {
  return typeof window === "undefined" ? "" : window.location.search;
}

function subscribe(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("popstate", onChange);
  window.addEventListener(EVENTS_FILTERS_CHANGE, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(EVENTS_FILTERS_CHANGE, onChange);
  };
}

export function useEventsFiltersFromUrl(): EventsFiltersState {
  const search = useSyncExternalStore(subscribe, getSearchSnapshot, () => "");
  return useMemo(() => readEventsFiltersFromSearch(search), [search]);
}
