import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { query } from "../_generated/server";
import {
  agentMetricNamespace,
  globalMetricNamespace,
  machineAgentTelemetry,
  threadMetricNamespace,
} from "../aggregate";
import { events } from "../events";
import { history } from "../history";

export const getGlobalIdentityCounts = query({
  args: {},
  handler: async (ctx) => {
    return {
      registrations: await machineAgentTelemetry.count(ctx, {
        namespace: globalMetricNamespace("registrations"),
      }),
      staticVersions: await machineAgentTelemetry.count(ctx, {
        namespace: globalMetricNamespace("staticVersions"),
      }),
      runtimeVersions: await machineAgentTelemetry.count(ctx, {
        namespace: globalMetricNamespace("runtimeVersions"),
      }),
      bindings: await machineAgentTelemetry.count(ctx, {
        namespace: globalMetricNamespace("bindings"),
      }),
      messages: await machineAgentTelemetry.count(ctx, {
        namespace: globalMetricNamespace("messages"),
      }),
      threads: await machineAgentTelemetry.count(ctx, {
        namespace: globalMetricNamespace("threads"),
      }),
    };
  },
});

export const getMachineAgentIdentityCounts = query({
  args: {
    codeId: v.string(),
  },
  handler: async (ctx, args) => {
    return {
      registrations: await machineAgentTelemetry.count(ctx, {
        namespace: agentMetricNamespace(args.codeId, "registrations"),
      }),
      staticVersions: await machineAgentTelemetry.count(ctx, {
        namespace: agentMetricNamespace(args.codeId, "staticVersions"),
      }),
      runtimeVersions: await machineAgentTelemetry.count(ctx, {
        namespace: agentMetricNamespace(args.codeId, "runtimeVersions"),
      }),
      bindings: await machineAgentTelemetry.count(ctx, {
        namespace: agentMetricNamespace(args.codeId, "bindings"),
      }),
      messages: await machineAgentTelemetry.count(ctx, {
        namespace: agentMetricNamespace(args.codeId, "messages"),
      }),
      threads: await machineAgentTelemetry.count(ctx, {
        namespace: agentMetricNamespace(args.codeId, "threads"),
      }),
    };
  },
});

export const getThreadIdentityCounts = query({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    return {
      registrations: await machineAgentTelemetry.count(ctx, {
        namespace: threadMetricNamespace(args.threadId, "registrations"),
      }),
      staticVersions: await machineAgentTelemetry.count(ctx, {
        namespace: threadMetricNamespace(args.threadId, "staticVersions"),
      }),
      runtimeVersions: await machineAgentTelemetry.count(ctx, {
        namespace: threadMetricNamespace(args.threadId, "runtimeVersions"),
      }),
      bindings: await machineAgentTelemetry.count(ctx, {
        namespace: threadMetricNamespace(args.threadId, "bindings"),
      }),
      messages: await machineAgentTelemetry.count(ctx, {
        namespace: threadMetricNamespace(args.threadId, "messages"),
      }),
    };
  },
});

export const listMachineAgentRegistrations = query({
  args: {},
  handler: async (ctx) => {
    const registrations = await ctx.db
      .query("machineAgentRegistrations")
      .collect();

    return registrations
      .sort((a, b) => b.lastSeenAt - a.lastSeenAt)
      .map((registration) => ({
        codeId: registration.codeId,
        name: registration.name,
        createdAt: registration.createdAt,
        lastSeenAt: registration.lastSeenAt,
        latestStaticHash: registration.latestStaticHash,
        latestRuntimeHash: registration.latestRuntimeHash,
      }));
  },
});

export const listRecentThreadIdentityActivity = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const bindings = await ctx.db.query("machineAgentTurnBindings").collect();
    const summaries = new Map<
      string,
      {
        threadId: string;
        lastRecordedAt: number;
        latestMessageId: string;
        bindingCount: number;
        messageIds: Set<string>;
        codeIds: Set<string>;
      }
    >();

    for (const binding of bindings) {
      const summary = summaries.get(binding.threadId);
      if (!summary) {
        summaries.set(binding.threadId, {
          threadId: binding.threadId,
          lastRecordedAt: binding.recordedAt,
          latestMessageId: binding.messageId,
          bindingCount: 1,
          messageIds: new Set([binding.messageId]),
          codeIds: new Set([binding.codeId]),
        });
        continue;
      }

      summary.bindingCount += 1;
      summary.messageIds.add(binding.messageId);
      summary.codeIds.add(binding.codeId);

      if (binding.recordedAt >= summary.lastRecordedAt) {
        summary.lastRecordedAt = binding.recordedAt;
        summary.latestMessageId = binding.messageId;
      }
    }

    return [...summaries.values()]
      .sort((a, b) => b.lastRecordedAt - a.lastRecordedAt)
      .slice(0, args.limit ?? 50)
      .map((summary) => ({
        threadId: summary.threadId,
        lastRecordedAt: summary.lastRecordedAt,
        latestMessageId: summary.latestMessageId,
        bindingCount: summary.bindingCount,
        messageCount: summary.messageIds.size,
        codeIds: [...summary.codeIds].sort(),
      }));
  },
});

export const listThreadIdentityEvents = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await events.read.listStreamEvents(ctx, {
      streamType: "threadIdentity",
      streamId: args.threadId,
      paginationOpts: args.paginationOpts,
    });
  },
});

export const listThreadIdentityHistory = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await history.read.listEntries(ctx, {
      streamType: "threadIdentity",
      streamId: args.threadId,
      paginationOpts: args.paginationOpts,
    });
  },
});

export const getThreadIdentityPathToRoot = query({
  args: {
    threadId: v.string(),
    entryId: v.string(),
  },
  handler: async (ctx, args) => {
    return await history.read.getPathToRoot(ctx, {
      streamType: "threadIdentity",
      streamId: args.threadId,
      entryId: args.entryId,
    });
  },
});
