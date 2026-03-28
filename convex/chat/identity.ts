import { v } from "convex/values";
import { z } from "zod/v4";
import { components, internal } from "../_generated/api";
import {
  type ActionCtx,
  internalMutation,
  type MutationCtx,
} from "../_generated/server";
import { events } from "../events";
import { ensureMachineAccount, grantThreadAccessToAccount } from "../lib/auth";
import { updateIdentityCounters } from "./identityCounters";

type IdentityRunner = Pick<ActionCtx, "runMutation" | "runQuery">;

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export type RegisteredMachineAgent<STATIC_PROPS = unknown> = {
  agentId: string;
  name: string;
  staticProps: STATIC_PROPS;
  getStaticIdentityInput: () => STATIC_PROPS;
  getRuntimeIdentityInput: (runtimeStaticProps?: unknown) => unknown;
};

export function defineRegisteredMachineAgent<STATIC_PROPS>(args: {
  agentId: string;
  name: string;
  staticProps: STATIC_PROPS;
}) {
  return {
    agentId: args.agentId,
    name: args.name,
    staticProps: args.staticProps,
    getStaticIdentityInput: () => args.staticProps,
    getRuntimeIdentityInput: (runtimeStaticProps?: unknown) =>
      runtimeStaticProps ?? args.staticProps,
  } satisfies RegisteredMachineAgent<STATIC_PROPS>;
}

function isZodSchema(value: unknown): value is z.ZodType {
  return typeof value === "object" && value !== null && "_zod" in value;
}

function normalizeValue(value: unknown): JsonValue {
  if (value === null) {
    return null;
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (value === undefined) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }
  if (isZodSchema(value)) {
    return normalizeValue(z.toJSONSchema(value));
  }
  if (typeof value === "function") {
    return `[function:${value.name || "anonymous"}]`;
  }
  if (typeof value === "object") {
    if ("id" in value && "query" in value) {
      return String(value.id);
    }
    const entries = Object.entries(value)
      .filter(
        ([key, entryValue]) => entryValue !== undefined && !key.startsWith("$"),
      )
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entryValue]) => [key, normalizeValue(entryValue)] as const);
    return Object.fromEntries(entries);
  }
  return String(value);
}

export function normalizeStaticProps(value: unknown) {
  return normalizeValue(value);
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (part) =>
    part.toString(16).padStart(2, "0"),
  ).join("");
}

export async function hashIdentityInput(value: unknown) {
  return await sha256Hex(JSON.stringify(normalizeStaticProps(value)));
}

export async function recordRegisteredMachineAgentTurn(
  ctx: IdentityRunner,
  args: {
    definition: RegisteredMachineAgent;
    runtimeStaticProps?: unknown;
    threadId: string;
    messageId: string;
    sessionId?: string;
  },
) {
  const staticSnapshot = normalizeStaticProps(
    args.definition.getStaticIdentityInput(),
  );
  const runtimeSnapshot = normalizeStaticProps(
    args.definition.getRuntimeIdentityInput(args.runtimeStaticProps),
  );
  const staticHash = await hashIdentityInput(staticSnapshot);
  const runtimeHash = await hashIdentityInput(runtimeSnapshot);

  const recorded = await ctx.runMutation(
    internal.chat.identity.recordTurnIdentity,
    {
      codeId: args.definition.agentId,
      name: args.definition.name,
      staticHash,
      staticSnapshot,
      runtimeHash,
      runtimeSnapshot,
      threadId: args.threadId,
      messageId: args.messageId,
      sessionId: args.sessionId,
    },
  );

  return {
    ...recorded,
    staticHash,
    runtimeHash,
    staticSnapshot,
    runtimeSnapshot,
  };
}

async function appendThreadIdentityEvents(
  ctx: MutationCtx,
  args: {
    namespace: string;
    threadId: string;
    messageId: string;
    sessionId?: string;
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
  const baseMeta: Record<string, string | number | boolean | null> = {
    threadId: args.threadId,
    messageId: args.messageId,
  };
  if (args.sessionId) {
    baseMeta.sessionId = args.sessionId;
  }

  let parentEventId: string | undefined;

  const appendOne = async (params: {
    eventId: string;
    eventType: "turn_bound" | "registration_seen" | "static_version_created" | "runtime_version_created";
    payload: Record<string, unknown>;
    extraMetadata?: Record<string, string | number | boolean | null>;
  }) => {
    const entry = await events.append.appendToStream(ctx, {
      streamType: "threadIdentity",
      namespace: args.namespace,
      streamId: args.threadId,
      eventId: params.eventId,
      eventType: params.eventType,
      ...(parentEventId ? { correlationId: parentEventId } : {}),
      causationId: args.threadId,
      payload: params.payload as never,
      metadata: { ...baseMeta, ...params.extraMetadata },
    });
    parentEventId = entry.eventId;
  };

  if (args.created.binding) {
    await appendOne({
      eventId: `${args.messageId}:turn_bound`,
      eventType: "turn_bound",
      payload: {
        messageId: args.messageId,
        codeId: args.codeId,
        registrationId: args.registrationId,
        staticVersionId: args.staticVersionId,
        runtimeVersionId: args.runtimeVersionId,
        staticHash: args.staticHash,
        runtimeHash: args.runtimeHash,
      },
      extraMetadata: {
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
    await appendOne({
      eventId: `${args.messageId}:registration_seen`,
      eventType: "registration_seen",
      payload: {
        messageId: args.messageId,
        codeId: args.codeId,
        registrationId: args.registrationId,
      },
    });
  }

  if (args.created.staticVersion) {
    await appendOne({
      eventId: `${args.messageId}:static_version_created`,
      eventType: "static_version_created",
      payload: {
        messageId: args.messageId,
        codeId: args.codeId,
        staticVersionId: args.staticVersionId,
        staticHash: args.staticHash,
      },
    });
  }

  if (args.created.runtimeVersion) {
    await appendOne({
      eventId: `${args.messageId}:runtime_version_created`,
      eventType: "runtime_version_created",
      payload: {
        messageId: args.messageId,
        codeId: args.codeId,
        runtimeVersionId: args.runtimeVersionId,
        runtimeHash: args.runtimeHash,
      },
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
      .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
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

    await updateIdentityCounters(ctx, {
      codeId: args.codeId,
      threadId: args.threadId,
      messageId: args.messageId,
      registrationId: registration._id,
      staticVersionId: staticVersion._id,
      runtimeVersionId: runtimeVersion._id,
      created,
    });

    const threadMeta = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId,
    });
    if (!threadMeta?.userId) {
      throw new Error(`Thread ${args.threadId} not found or missing owner`);
    }
    const namespace = `account:${threadMeta.userId}`;

    await appendThreadIdentityEvents(ctx, {
      namespace,
      threadId: args.threadId,
      messageId: args.messageId,
      sessionId: args.sessionId,
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

    return {
      registrationId: registration._id,
      staticVersionId: staticVersion._id,
      runtimeVersionId: runtimeVersion._id,
      created,
    };
  },
});
