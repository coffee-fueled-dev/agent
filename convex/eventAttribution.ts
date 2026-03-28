import type { Id } from "./_generated/dataModel";

export function accountActor(accountId: Id<"accounts">) {
  return { byType: "account" as const, byId: accountId };
}

export function machineActor(accountId: Id<"accounts">) {
  return { byType: "machine" as const, byId: accountId };
}
