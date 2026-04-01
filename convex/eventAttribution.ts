import type { Id } from "./_generated/dataModel";

export function accountActor(accountId: Id<"accounts">) {
  return { byType: "account" as const, byId: accountId };
}

export function machineActor(accountId: Id<"accounts">) {
  return { byType: "machine" as const, byId: accountId };
}

/** Merge optional `metadata` with flat actor keys for `@very-coffee/convex-events` append. */
export function mergeEventMetadata(
  base: Record<string, string | number | boolean | null> | undefined,
  actor: { byType: string; byId: string } | undefined,
): Record<string, string | number | boolean | null> | undefined {
  const out: Record<string, string | number | boolean | null> = {
    ...(base ?? {}),
  };
  if (actor) {
    out.actor_by_type = actor.byType;
    out.actor_by_id = actor.byId;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
