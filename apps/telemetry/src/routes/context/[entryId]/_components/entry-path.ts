export type EntrySegment = "overview" | "activity" | "history";

/** `/context/:entryId` only (no sub-segment). */
export function parseEntryOverviewPath(
  pathname: string,
): { entryId: string } | null {
  const prefix = "/context/";
  if (!pathname.startsWith(prefix)) return null;
  const rest = pathname.slice(prefix.length);
  const segments = rest.split("/").filter(Boolean);
  if (segments.length !== 1) return null;
  const entryId = decodeURIComponent(segments[0] ?? "").trim();
  return entryId ? { entryId } : null;
}

/** `/context/:entryId/activity` or `/context/:entryId/history`. */
export function parseEntrySubPath(
  pathname: string,
  segment: "activity" | "history",
): { entryId: string } | null {
  const prefix = "/context/";
  if (!pathname.startsWith(prefix)) return null;
  const rest = pathname.slice(prefix.length);
  const segments = rest.split("/").filter(Boolean);
  if (segments.length !== 2) return null;
  const entryId = decodeURIComponent(segments[0] ?? "").trim();
  if (!entryId || segments[1] !== segment) return null;
  return { entryId };
}

/** `/context/:entryId/activity/:eventId` (single access event detail). */
export function parseEntryActivityEventPath(
  pathname: string,
): { entryId: string; eventId: string } | null {
  const prefix = "/context/";
  if (!pathname.startsWith(prefix)) return null;
  const rest = pathname.slice(prefix.length);
  const segments = rest.split("/").filter(Boolean);
  if (segments.length !== 3 || segments[1] !== "activity") return null;
  const entryId = decodeURIComponent(segments[0] ?? "").trim();
  const eventId = decodeURIComponent(segments[2] ?? "").trim();
  return entryId && eventId ? { entryId, eventId } : null;
}
