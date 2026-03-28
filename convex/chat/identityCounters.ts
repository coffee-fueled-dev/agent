import { ShardedCounter } from "@convex-dev/sharded-counter";
import { components } from "../_generated/api";
import type { MutationCtx } from "../_generated/server";

export const identityCounters = new ShardedCounter(components.shardedCounter, {
  defaultShards: 4,
});

async function incOnceIfNew(
  ctx: MutationCtx,
  dedupKey: string,
  counterKey: string,
) {
  const existing = await ctx.db
    .query("identityMetricDedup")
    .withIndex("by_key", (q) => q.eq("key", dedupKey))
    .first();
  if (existing) return;
  await ctx.db.insert("identityMetricDedup", { key: dedupKey });
  await identityCounters.inc(ctx, counterKey);
}

/**
 * Mirrors former DirectAggregate `insertIfDoesNotExist` semantics using
 * sharded counters + a dedup table for unique ids per logical namespace.
 */
export async function updateIdentityCounters(
  ctx: MutationCtx,
  args: {
    codeId: string;
    threadId: string;
    messageId: string;
    registrationId: string;
    staticVersionId: string;
    runtimeVersionId: string;
    created: {
      registration: boolean;
      staticVersion: boolean;
      runtimeVersion: boolean;
      binding: boolean;
    };
  },
) {
  if (args.created.registration) {
    await incOnceIfNew(
      ctx,
      `g:reg:${args.registrationId}`,
      "global:registrations",
    );
    await incOnceIfNew(
      ctx,
      `a:${args.codeId}:reg:${args.registrationId}`,
      `agent:${args.codeId}:registrations`,
    );
  }

  if (args.created.staticVersion) {
    await incOnceIfNew(
      ctx,
      `g:sv:${args.staticVersionId}`,
      "global:staticVersions",
    );
    await incOnceIfNew(
      ctx,
      `a:${args.codeId}:sv:${args.staticVersionId}`,
      `agent:${args.codeId}:staticVersions`,
    );
  }

  if (args.created.runtimeVersion) {
    await incOnceIfNew(
      ctx,
      `g:rv:${args.runtimeVersionId}`,
      "global:runtimeVersions",
    );
    await incOnceIfNew(
      ctx,
      `a:${args.codeId}:rv:${args.runtimeVersionId}`,
      `agent:${args.codeId}:runtimeVersions`,
    );
  }

  if (args.created.binding) {
    await incOnceIfNew(ctx, `g:bind:${args.messageId}`, "global:bindings");
    await incOnceIfNew(
      ctx,
      `a:${args.codeId}:bind:${args.messageId}`,
      `agent:${args.codeId}:bindings`,
    );
    await incOnceIfNew(
      ctx,
      `t:${args.threadId}:bind:${args.messageId}`,
      `thread:${args.threadId}:bindings`,
    );
    await incOnceIfNew(ctx, `g:msg:${args.messageId}`, "global:messages");
    await incOnceIfNew(
      ctx,
      `a:${args.codeId}:msg:${args.messageId}`,
      `agent:${args.codeId}:messages`,
    );
    await incOnceIfNew(
      ctx,
      `t:${args.threadId}:msg:${args.messageId}`,
      `thread:${args.threadId}:messages`,
    );
  }

  await incOnceIfNew(ctx, `g:threads:${args.threadId}`, "global:threads");
  await incOnceIfNew(
    ctx,
    `a:${args.codeId}:threads:${args.threadId}`,
    `agent:${args.codeId}:threads`,
  );

  await incOnceIfNew(
    ctx,
    `t:${args.threadId}:reg:${args.registrationId}`,
    `thread:${args.threadId}:registrations`,
  );
  await incOnceIfNew(
    ctx,
    `t:${args.threadId}:sv:${args.staticVersionId}`,
    `thread:${args.threadId}:staticVersions`,
  );
  await incOnceIfNew(
    ctx,
    `t:${args.threadId}:rv:${args.runtimeVersionId}`,
    `thread:${args.threadId}:runtimeVersions`,
  );
}
