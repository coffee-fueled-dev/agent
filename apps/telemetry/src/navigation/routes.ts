/** URL builders aligned with `apps/telemetry/src/index.ts` Bun `serve` routes. */

export function home(): string {
  return "/";
}

export function chat(opts?: { thread?: string; new?: boolean }): string {
  const path = "/chat";
  const sp = new URLSearchParams();
  if (opts?.thread !== undefined) sp.set("thread", opts.thread);
  if (opts?.new) sp.set("new", "1");
  const q = sp.toString();
  return q ? `${path}?${q}` : path;
}

export function contextList(opts?: { namespace?: string }): string {
  const path = "/context";
  if (!opts?.namespace) return path;
  return `${path}?namespace=${encodeURIComponent(opts.namespace)}`;
}

export function contextEntry(
  entryId: string,
  opts?: { namespace?: string },
): string {
  const base = `/context/${encodeURIComponent(entryId)}`;
  if (!opts?.namespace) return base;
  return `${base}?namespace=${encodeURIComponent(opts.namespace)}`;
}

export function contextActivity(
  entryId: string,
  opts?: { namespace?: string },
): string {
  const base = `/context/${encodeURIComponent(entryId)}/activity`;
  if (!opts?.namespace) return base;
  return `${base}?namespace=${encodeURIComponent(opts.namespace)}`;
}

export function contextActivityEvent(
  entryId: string,
  eventId: string,
  opts?: { namespace?: string },
): string {
  const base = `/context/${encodeURIComponent(entryId)}/activity/${encodeURIComponent(eventId)}`;
  if (!opts?.namespace) return base;
  return `${base}?namespace=${encodeURIComponent(opts.namespace)}`;
}

export function eventsList(): string {
  return "/events";
}

export function eventsDetail(eventId: string): string {
  return `/events/${encodeURIComponent(eventId)}`;
}
