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
