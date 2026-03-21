import { v } from "convex/values";
import { api } from "../_generated/api";
import { internalMutation, type MutationCtx } from "../_generated/server";
import {
  agentMetricNamespace,
  globalMetricNamespace,
  machineAgentTelemetry,
  threadMetricNamespace,
} from "../aggregate";
import { events } from "../events";
import { history } from "../history";
import { ensureMachineAccount, grantThreadAccessToAccount } from "../lib/auth";

async function appendMachineAgentHistory(
  ctx: MutationCtx,
  args: {
    agentId: string;
    staticHash: string;
    runtimeHash: string;
    created: {
      registration: boolean;
      staticVersion: boolean;
      runtimeVersion: boolean;
    };
  },
) {
  if (
    !args.created.registration &&
    !args.created.staticVersion &&
    !args.created.runtimeVersion
  ) {
    return;
  }

  let parentEntryIds = (
    await history.heads.listHeads(ctx, {
      streamType: "machineAgent",
      streamId: args.agentId,
    })
  ).map((head) => head.entryId);

  if (args.created.registration) {
    await history.append.append(ctx, {
      streamType: "machineAgent",
      streamId: args.agentId,
      entryId: `registered:${args.agentId}`,
      kind: "registered",
      parentEntryIds,
    });
    parentEntryIds = [`registered:${args.agentId}`];
  }

  if (args.created.staticVersion) {
    const entryId = `static:${args.staticHash}`;
    await history.append.append(ctx, {
      streamType: "machineAgent",
      streamId: args.agentId,
      entryId,
      kind: "static_version_added",
      parentEntryIds,
      payload: { staticHash: args.staticHash },
    });
    parentEntryIds = [entryId];
  }

  if (args.created.runtimeVersion) {
    await history.append.append(ctx, {
      streamType: "machineAgent",
      streamId: args.agentId,
      entryId: `runtime:${args.runtimeHash}`,
      kind: "runtime_version_seen",
      parentEntryIds,
      payload: { runtimeHash: args.runtimeHash },
    });
  }
}

async function appendThreadIdentityHistory(
  ctx: MutationCtx,
  args: {
    threadId: string;
    messageId: string;
    codeId: string;
    staticHash: string;
    runtimeHash: string;
    previousBinding:
      | {
          codeId: string;
          staticVersionId: string;
          runtimeVersionId: string;
        }
      | undefined;
    currentBinding: {
      staticVersionId: string;
      runtimeVersionId: string;
    };
    bindingCreated: boolean;
  },
) {
  if (!args.bindingCreated) {
    return;
  }

  const turnEntryId = `turn:${args.messageId}`;
  const parentEntryIds = (
    await history.heads.listHeads(ctx, {
      streamType: "threadIdentity",
      streamId: args.threadId,
    })
  ).map((head) => head.entryId);

  await history.append.append(ctx, {
    streamType: "threadIdentity",
    streamId: args.threadId,
    entryId: turnEntryId,
    kind: "turn_bound",
    parentEntryIds,
    payload: {
      messageId: args.messageId,
      codeId: args.codeId,
      staticHash: args.staticHash,
      runtimeHash: args.runtimeHash,
    },
  });

  let nextParents = [turnEntryId];
  const identityChanged =
    args.previousBinding == null ||
    args.previousBinding.codeId !== args.codeId ||
    args.previousBinding.staticVersionId !==
      args.currentBinding.staticVersionId ||
    args.previousBinding.runtimeVersionId !==
      args.currentBinding.runtimeVersionId;

  if (identityChanged) {
    const identityEntryId = `identity:${args.messageId}`;
    await history.append.append(ctx, {
      streamType: "threadIdentity",
      streamId: args.threadId,
      entryId: identityEntryId,
      kind: "identity_changed",
      parentEntryIds: nextParents,
      payload: {
        messageId: args.messageId,
        codeId: args.codeId,
        previousCodeId: args.previousBinding?.codeId,
      },
    });
    nextParents = [identityEntryId];
  }

  await history.append.append(ctx, {
    streamType: "threadIdentity",
    streamId: args.threadId,
    entryId: `runtime:${args.messageId}`,
    kind: "runtime_version_seen",
    parentEntryIds: nextParents,
    payload: {
      messageId: args.messageId,
      runtimeHash: args.runtimeHash,
    },
  });
}

async function appendThreadIdentityEvents(
  ctx: MutationCtx,
  args: {
    threadId: string;
    messageId: string;
    codeId: string;
    registrationId: string;
    staticVersionId: string;
    runtimeVersionId: string;
    staticHash: string;
    runtimeHash: string;
    created: {
      registration: boolean;
      staticVersion: boolean;
      runtimeVersion: boolean;
      binding: boolean;
    };
    previousBinding:
      | {
          codeId: string;
          staticVersionId: string;
          runtimeVersionId: string;
        }
      | undefined;
  },
) {
  if (args.created.binding) {
    await events.append.appendToStream(ctx, {
      streamType: "threadIdentity",
      streamId: args.threadId,
      eventId: `${args.messageId}:turn_bound`,
      eventType: "turn_bound",
      correlationId: args.messageId,
      causationId: args.messageId,
      payload: {
        messageId: args.messageId,
        codeId: args.codeId,
        registrationId: args.registrationId,
        staticVersionId: args.staticVersionId,
        runtimeVersionId: args.runtimeVersionId,
        staticHash: args.staticHash,
        runtimeHash: args.runtimeHash,
      },
      metadata: {
        identityChanged:
          args.previousBinding == null ||
          args.previousBinding.codeId !== args.codeId ||
          args.previousBinding.staticVersionId !== args.staticVersionId ||
          args.previousBinding.runtimeVersionId !== args.runtimeVersionId,
      },
    });
  }

  if (
    args.created.binding &&
    (args.previousBinding == null ||
      args.previousBinding.codeId !== args.codeId)
  ) {
    await events.append.appendToStream(ctx, {
      streamType: "threadIdentity",
      streamId: args.threadId,
      eventId: `${args.messageId}:registration_seen`,
      eventType: "registration_seen",
      correlationId: args.messageId,
      causationId: args.messageId,
      payload: {
        messageId: args.messageId,
        codeId: args.codeId,
        registrationId: args.registrationId,
      },
    });
  }

  if (args.created.staticVersion) {
    await events.append.appendToStream(ctx, {
      streamType: "threadIdentity",
      streamId: args.threadId,
      eventId: `${args.messageId}:static_version_created`,
      eventType: "static_version_created",
      correlationId: args.messageId,
      causationId: args.messageId,
      payload: {
        messageId: args.messageId,
        codeId: args.codeId,
        staticVersionId: args.staticVersionId,
        staticHash: args.staticHash,
      },
    });
  }

  if (args.created.runtimeVersion) {
    await events.append.appendToStream(ctx, {
      streamType: "threadIdentity",
      streamId: args.threadId,
      eventId: `${args.messageId}:runtime_version_created`,
      eventType: "runtime_version_created",
      correlationId: args.messageId,
      causationId: args.messageId,
      payload: {
        messageId: args.messageId,
        codeId: args.codeId,
        runtimeVersionId: args.runtimeVersionId,
        runtimeHash: args.runtimeHash,
      },
    });
  }
}

async function updateIdentityAggregates(
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
    await machineAgentTelemetry.insertIfDoesNotExist(ctx, {
      namespace: globalMetricNamespace("registrations"),
      key: null,
      id: args.registrationId,
    });
    await machineAgentTelemetry.insertIfDoesNotExist(ctx, {
      namespace: agentMetricNamespace(args.codeId, "registrations"),
      key: null,
      id: args.registrationId,
    });
  }

  if (args.created.staticVersion) {
    await machineAgentTelemetry.insertIfDoesNotExist(ctx, {
      namespace: globalMetricNamespace("staticVersions"),
      key: null,
      id: args.staticVersionId,
    });
    await machineAgentTelemetry.insertIfDoesNotExist(ctx, {
      namespace: agentMetricNamespace(args.codeId, "staticVersions"),
      key: null,
      id: args.staticVersionId,
    });
  }

  if (args.created.runtimeVersion) {
    await machineAgentTelemetry.insertIfDoesNotExist(ctx, {
      namespace: globalMetricNamespace("runtimeVersions"),
      key: null,
      id: args.runtimeVersionId,
    });
    await machineAgentTelemetry.insertIfDoesNotExist(ctx, {
      namespace: agentMetricNamespace(args.codeId, "runtimeVersions"),
      key: null,
      id: args.runtimeVersionId,
    });
  }

  if (args.created.binding) {
    for (const namespace of [
      globalMetricNamespace("bindings"),
      agentMetricNamespace(args.codeId, "bindings"),
      threadMetricNamespace(args.threadId, "bindings"),
      globalMetricNamespace("messages"),
      agentMetricNamespace(args.codeId, "messages"),
      threadMetricNamespace(args.threadId, "messages"),
    ] as const) {
      await machineAgentTelemetry.insertIfDoesNotExist(ctx, {
        namespace,
        key: null,
        id: args.messageId,
      });
    }
  }

  for (const namespace of [
    globalMetricNamespace("threads"),
    agentMetricNamespace(args.codeId, "threads"),
  ] as const) {
    await machineAgentTelemetry.insertIfDoesNotExist(ctx, {
      namespace,
      key: null,
      id: args.threadId,
    });
  }

  for (const [metric, id] of [
    ["registrations", args.registrationId],
    ["staticVersions", args.staticVersionId],
    ["runtimeVersions", args.runtimeVersionId],
  ] as const) {
    await machineAgentTelemetry.insertIfDoesNotExist(ctx, {
      namespace: threadMetricNamespace(args.threadId, metric),
      key: null,
      id,
    });
  }
}

export const recordTurnIdentity = internalMutation({
  args: {
    codeId: v.string(),
    name: v.string(),
    staticHash: v.string(),
    staticSnapshot: v.any(),
    runtimeHash: v.string(),
    runtimeSnapshot: v.any(),
    threadId: v.string(),
    messageId: v.string(),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const machineAccount = await ensureMachineAccount(ctx, {
      codeId: args.codeId,
      name: args.name,
    });
    const previousBinding = await ctx.db
      .query("machineAgentTurnBindings")
      .withIndex("by_threadId_recordedAt", (q) =>
        q.eq("threadId", args.threadId),
      )
      .order("desc")
      .first();

    let registration = await ctx.db
      .query("machineAgentRegistrations")
      .withIndex("by_codeId", (q) => q.eq("codeId", args.codeId))
      .unique();
    let registrationCreated = false;
    if (!registration) {
      const registrationId = await ctx.db.insert("machineAgentRegistrations", {
        account: machineAccount._id,
        codeId: args.codeId,
        name: args.name,
        createdAt: now,
        lastSeenAt: now,
        latestStaticHash: args.staticHash,
        latestRuntimeHash: args.runtimeHash,
      });
      registration = await ctx.db.get(registrationId);
      registrationCreated = true;
    }
    if (!registration) {
      throw new Error("Failed to create machine agent registration");
    }
    if (!registrationCreated) {
      await ctx.db.patch(registration._id, {
        account: machineAccount._id,
        name: args.name,
        lastSeenAt: now,
        latestStaticHash: args.staticHash,
        latestRuntimeHash: args.runtimeHash,
      });
    }

    let staticVersion = await ctx.db
      .query("machineAgentStaticVersions")
      .withIndex("by_registrationId_staticHash", (q) =>
        q
          .eq("registrationId", registration._id)
          .eq("staticHash", args.staticHash),
      )
      .unique();
    let staticVersionCreated = false;
    if (!staticVersion) {
      const staticVersionId = await ctx.db.insert(
        "machineAgentStaticVersions",
        {
          registrationId: registration._id,
          codeId: args.codeId,
          staticHash: args.staticHash,
          snapshot: args.staticSnapshot,
          createdAt: now,
          lastSeenAt: now,
        },
      );
      staticVersion = await ctx.db.get(staticVersionId);
      staticVersionCreated = true;
    }
    if (!staticVersion) {
      throw new Error("Failed to create machine agent static version");
    }
    if (!staticVersionCreated) {
      await ctx.db.patch(staticVersion._id, {
        lastSeenAt: now,
      });
    }

    let runtimeVersion = await ctx.db
      .query("machineAgentRuntimeVersions")
      .withIndex("by_staticVersionId_runtimeHash", (q) =>
        q
          .eq("staticVersionId", staticVersion._id)
          .eq("runtimeHash", args.runtimeHash),
      )
      .unique();
    let runtimeVersionCreated = false;
    if (!runtimeVersion) {
      const runtimeVersionId = await ctx.db.insert(
        "machineAgentRuntimeVersions",
        {
          registrationId: registration._id,
          staticVersionId: staticVersion._id,
          codeId: args.codeId,
          runtimeHash: args.runtimeHash,
          snapshot: args.runtimeSnapshot,
          createdAt: now,
          lastSeenAt: now,
        },
      );
      runtimeVersion = await ctx.db.get(runtimeVersionId);
      runtimeVersionCreated = true;
    }
    if (!runtimeVersion) {
      throw new Error("Failed to create machine agent runtime version");
    }
    if (!runtimeVersionCreated) {
      await ctx.db.patch(runtimeVersion._id, {
        lastSeenAt: now,
      });
    }

    const binding = await ctx.db
      .query("machineAgentTurnBindings")
      .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
      .unique();

    let bindingCreated = false;
    if (!binding) {
      await ctx.db.insert("machineAgentTurnBindings", {
        account: machineAccount._id,
        codeId: args.codeId,
        registrationId: registration._id,
        staticVersionId: staticVersion._id,
        runtimeVersionId: runtimeVersion._id,
        threadId: args.threadId,
        messageId: args.messageId,
        sessionId: args.sessionId,
        recordedAt: now,
      });
      bindingCreated = true;
    } else {
      await ctx.db.patch(binding._id, {
        account: machineAccount._id,
        codeId: args.codeId,
        registrationId: registration._id,
        staticVersionId: staticVersion._id,
        runtimeVersionId: runtimeVersion._id,
        threadId: args.threadId,
        sessionId: args.sessionId,
        recordedAt: now,
      });
    }

    await grantThreadAccessToAccount(ctx, {
      account: machineAccount._id,
      threadId: args.threadId,
      actions: ["read", "write"],
    });

    const created = {
      registration: registrationCreated,
      staticVersion: staticVersionCreated,
      runtimeVersion: runtimeVersionCreated,
      binding: bindingCreated,
    };

    await updateIdentityAggregates(ctx, {
      codeId: args.codeId,
      threadId: args.threadId,
      messageId: args.messageId,
      registrationId: registration._id,
      staticVersionId: staticVersion._id,
      runtimeVersionId: runtimeVersion._id,
      created,
    });

    await appendMachineAgentHistory(ctx, {
      agentId: args.codeId,
      staticHash: args.staticHash,
      runtimeHash: args.runtimeHash,
      created,
    });

    await appendThreadIdentityHistory(ctx, {
      threadId: args.threadId,
      messageId: args.messageId,
      codeId: args.codeId,
      staticHash: args.staticHash,
      runtimeHash: args.runtimeHash,
      previousBinding: previousBinding
        ? {
            codeId: previousBinding.codeId,
            staticVersionId: previousBinding.staticVersionId,
            runtimeVersionId: previousBinding.runtimeVersionId,
          }
        : undefined,
      currentBinding: {
        staticVersionId: staticVersion._id,
        runtimeVersionId: runtimeVersion._id,
      },
      bindingCreated,
    });

    await appendThreadIdentityEvents(ctx, {
      threadId: args.threadId,
      messageId: args.messageId,
      codeId: args.codeId,
      registrationId: registration._id,
      staticVersionId: staticVersion._id,
      runtimeVersionId: runtimeVersion._id,
      staticHash: args.staticHash,
      runtimeHash: args.runtimeHash,
      created,
      previousBinding: previousBinding
        ? {
            codeId: previousBinding.codeId,
            staticVersionId: previousBinding.staticVersionId,
            runtimeVersionId: previousBinding.runtimeVersionId,
          }
        : undefined,
    });

    if (bindingCreated) {
      await ctx.scheduler.runAfter(0, api.agentMemory.recordThreadIdentityEpisode, {
        threadId: args.threadId,
        messageId: args.messageId,
        codeId: args.codeId,
        staticHash: args.staticHash,
        runtimeHash: args.runtimeHash,
        previousCodeId: previousBinding?.codeId,
        entryTime: now,
      });
    }

    return {
      registrationId: registration._id,
      staticVersionId: staticVersion._id,
      runtimeVersionId: runtimeVersion._id,
      created,
    };
  },
});
