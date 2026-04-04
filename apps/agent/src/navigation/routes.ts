/** URL builders for the agent app routes. */

export function chat(opts?: { thread?: string; new?: boolean }): string {
  const path = "/chat";
  const sp = new URLSearchParams();
  if (opts?.thread !== undefined) sp.set("thread", opts.thread);
  if (opts?.new) sp.set("new", "1");
  const q = sp.toString();
  return q ? `${path}?${q}` : path;
}
