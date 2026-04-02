/** URL builders for the agent app routes. */

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

export function contextList(): string {
  return "/context";
}

export function contextEntry(entryId: string): string {
  return `/context/${entryId}`;
}

export function contextActivity(): string {
  return "/context/activity";
}

export function eventsList(): string {
  return "/events";
}

export function eventsDetail(eventId: string): string {
  return `/events/${eventId}`;
}
