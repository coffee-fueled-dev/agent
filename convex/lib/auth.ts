import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { accountAliasKinds, accountKinds } from "../models/auth/account";
import { policy } from "../policy";

type AccountKind = (typeof accountKinds)[number];
type AccountAliasKind = (typeof accountAliasKinds)[number];
type AccountId = Id<"accounts">;

const localUpdate = {
  byType: "system",
  byId: "auth",
  source: "local-auth",
};

export function normalizeAccountAliasValue(value: string) {
  return value.trim().toLowerCase();
}

export function accountScope(account: AccountId) {
  return { scopeType: "account", scopeId: account } as const;
}

export async function resolveAccount(
  ctx: QueryCtx | MutationCtx,
  account: AccountId,
) {
  return await ctx.db.get(account);
}

export async function resolveAccountByAlias(
  ctx: QueryCtx | MutationCtx,
  args: { kind: AccountAliasKind; value: string },
) {
  const alias = await ctx.db
    .query("accountAliases")
    .withIndex("by_kind_normalizedValue", (q) =>
      q
        .eq("kind", args.kind)
        .eq("normalizedValue", normalizeAccountAliasValue(args.value)),
    )
    .unique();
  if (!alias) {
    return null;
  }
  return await resolveAccount(ctx, alias.account as AccountId);
}

export async function ensureAccountScope(
  ctx: MutationCtx,
  account: Pick<Doc<"accounts">, "_id" | "kind" | "displayName">,
) {
  await policy.scopes.register(ctx, {
    scope: accountScope(account._id),
    attrs: {
      kind: account.kind,
      displayName: account.displayName ?? null,
    },
    update: localUpdate,
  });
}

export async function ensureAccountForAlias(
  ctx: MutationCtx,
  args: {
    accountKind: AccountKind;
    aliasKind: AccountAliasKind;
    aliasValue: string;
    displayName?: string;
  },
) {
  const now = Date.now();
  const normalizedValue = normalizeAccountAliasValue(args.aliasValue);
  const existingAlias = await ctx.db
    .query("accountAliases")
    .withIndex("by_kind_normalizedValue", (q) =>
      q.eq("kind", args.aliasKind).eq("normalizedValue", normalizedValue),
    )
    .unique();

  if (existingAlias) {
    const existingAccount = await resolveAccount(
      ctx,
      existingAlias.account as AccountId,
    );
    if (!existingAccount) {
      throw new Error("Account alias points to a missing account");
    }
    await ctx.db.patch(existingAlias._id, {
      value: args.aliasValue,
      normalizedValue,
      lastSeenAt: now,
    });
    await ctx.db.patch(existingAccount._id, {
      displayName: args.displayName ?? existingAccount.displayName,
      lastSeenAt: now,
    });
    const account = {
      ...existingAccount,
      displayName: args.displayName ?? existingAccount.displayName,
      lastSeenAt: now,
    };
    await ensureAccountScope(ctx, account);
    return account;
  }

  const id = await ctx.db.insert("accounts", {
    kind: args.accountKind,
    displayName: args.displayName,
    createdAt: now,
    lastSeenAt: now,
    data: { status: "active" },
  });
  await ctx.db.insert("accountAliases", {
    account: id,
    kind: args.aliasKind,
    value: args.aliasValue,
    normalizedValue,
    createdAt: now,
    lastSeenAt: now,
  });
  const account = await ctx.db.get(id);
  if (!account) {
    throw new Error("Failed to create account");
  }
  await ensureAccountScope(ctx, account);
  return account;
}

export async function ensureSessionAccount(
  ctx: MutationCtx,
  convexSessionId: string,
) {
  return await ensureAccountForAlias(ctx, {
    accountKind: "human",
    aliasKind: "session",
    aliasValue: convexSessionId,
    displayName: "Local Human",
  });
}

export async function ensureLocalHumanAccount(ctx: MutationCtx) {
  return await ensureAccountForAlias(ctx, {
    accountKind: "human",
    aliasKind: "local",
    aliasValue: "local-human",
    displayName: "Local Human",
  });
}

export async function ensureMachineAccount(
  ctx: MutationCtx,
  args: { codeId: string; name: string },
) {
  return await ensureAccountForAlias(ctx, {
    accountKind: "machine",
    aliasKind: "machineAgent",
    aliasValue: args.codeId,
    displayName: args.name,
  });
}

export async function grantThreadAccessToAccount(
  ctx: MutationCtx,
  args: {
    account: AccountId;
    threadId: string;
    actions: ("read" | "write" | "own")[];
  },
) {
  const subject = accountScope(args.account);
  for (const action of args.actions) {
    await policy.access.grant(ctx, {
      subject,
      resourceType: "thread",
      resourceId: args.threadId,
      action,
      effect: "allow",
      update: localUpdate,
    });
  }
}
