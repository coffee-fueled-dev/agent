import type { Id } from "../../_generated/dataModel";

/** Canonical context namespace for a user account (matches chat `resolveThreadContext`). */
export function expectedAccountNamespace(accountId: Id<"accounts">): string {
  return `account:${accountId}`;
}

/**
 * When a session has a linked account, the client-supplied `namespace` must match
 * `account:${accountId}`. If there is no account, no-op (legacy / anonymous flows).
 */
export function assertAccountNamespace(
  accountId: Id<"accounts"> | null | undefined,
  namespace: string,
): void {
  if (accountId == null) return;
  const expected = expectedAccountNamespace(accountId);
  if (namespace !== expected) {
    throw new Error("Namespace does not match signed-in account");
  }
}
