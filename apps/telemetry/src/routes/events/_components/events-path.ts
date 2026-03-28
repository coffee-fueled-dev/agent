/** `/events/:eventId` — unified timeline document id. */
export function parseEventsEventPath(
  pathname: string,
): { eventId: string } | null {
  const prefix = "/events/";
  if (!pathname.startsWith(prefix)) return null;
  const rest = pathname.slice(prefix.length);
  const segments = rest.split("/").filter(Boolean);
  if (segments.length !== 1) return null;
  const eventId = decodeURIComponent(segments[0] ?? "").trim();
  return eventId ? { eventId } : null;
}
