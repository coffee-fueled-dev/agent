import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export type CreatedFlags = {
  registration: boolean;
  staticVersion: boolean;
  runtimeVersion: boolean;
  toolRegistration: boolean;
  toolVersion: boolean;
  binding: boolean;
};

export async function ensureAgentRegistration(
  ctx: MutationCtx,
  args: {
    agentId: string;
    name: string;
    staticHash: string;
    staticSnapshot: unknown | undefined;
    now: number;
    metadata: Record<string, unknown> | undefined;
  },
): Promise<{
  registrationId: Id<"agentRegistrations">;
  staticVersionId: Id<"agentStaticVersions">;
  created: Pick<CreatedFlags, "registration" | "staticVersion">;
}> {
  const existingReg = await ctx.db
    .query("agentRegistrations")
    .withIndex("by_agentId", (q) => q.eq("agentId", args.agentId))
    .first();

  let registrationId: Id<"agentRegistrations">;
  let createdRegistration = false;

  if (existingReg) {
    registrationId = existingReg._id;
    await ctx.db.patch(registrationId, {
      name: args.name,
      latestStaticHash: args.staticHash,
      updatedAt: args.now,
      ...(args.metadata !== undefined ? { metadata: args.metadata } : {}),
    });
  } else {
    registrationId = await ctx.db.insert("agentRegistrations", {
      agentId: args.agentId,
      name: args.name,
      latestStaticHash: args.staticHash,
      updatedAt: args.now,
      ...(args.metadata !== undefined ? { metadata: args.metadata } : {}),
    });
    createdRegistration = true;
  }

  const existingStatic = await ctx.db
    .query("agentStaticVersions")
    .withIndex("by_registration_and_staticHash", (q) =>
      q.eq("registrationId", registrationId).eq("staticHash", args.staticHash),
    )
    .first();

  if (existingStatic) {
    return {
      registrationId,
      staticVersionId: existingStatic._id,
      created: {
        registration: createdRegistration,
        staticVersion: false,
      },
    };
  }

  const staticVersionId = await ctx.db.insert("agentStaticVersions", {
    registrationId,
    staticHash: args.staticHash,
    staticSnapshot: args.staticSnapshot,
    createdAt: args.now,
  });

  return {
    registrationId,
    staticVersionId,
    created: {
      registration: createdRegistration,
      staticVersion: true,
    },
  };
}

export async function ensureRuntimeVersion(
  ctx: MutationCtx,
  args: {
    staticVersionId: Id<"agentStaticVersions">;
    runtimeHash: string;
    runtimeSnapshot: unknown | undefined;
    now: number;
  },
): Promise<{
  runtimeVersionId: Id<"agentRuntimeVersions">;
  created: boolean;
}> {
  const existing = await ctx.db
    .query("agentRuntimeVersions")
    .withIndex("by_static_and_runtime", (q) =>
      q.eq("staticVersionId", args.staticVersionId).eq("runtimeHash", args.runtimeHash),
    )
    .first();

  if (existing) {
    return { runtimeVersionId: existing._id, created: false };
  }

  const runtimeVersionId = await ctx.db.insert("agentRuntimeVersions", {
    staticVersionId: args.staticVersionId,
    runtimeHash: args.runtimeHash,
    runtimeSnapshot: args.runtimeSnapshot,
    createdAt: args.now,
  });

  return { runtimeVersionId, created: true };
}

export async function ensureToolRegistration(
  ctx: MutationCtx,
  args: {
    toolKey: string;
    toolHash: string;
    staticSnapshot: unknown;
    now: number;
    metadata: Record<string, unknown> | undefined;
  },
): Promise<{
  registrationId: Id<"toolRegistrations">;
  toolVersionId: Id<"toolVersions">;
  created: Pick<CreatedFlags, "toolRegistration" | "toolVersion">;
}> {
  const existingReg = await ctx.db
    .query("toolRegistrations")
    .withIndex("by_toolKey", (q) => q.eq("toolKey", args.toolKey))
    .first();

  let registrationId: Id<"toolRegistrations">;
  let createdReg = false;

  if (existingReg) {
    registrationId = existingReg._id;
    await ctx.db.patch(registrationId, {
      latestToolHash: args.toolHash,
      staticSnapshot: args.staticSnapshot,
      updatedAt: args.now,
      ...(args.metadata !== undefined ? { metadata: args.metadata } : {}),
    });
  } else {
    registrationId = await ctx.db.insert("toolRegistrations", {
      toolKey: args.toolKey,
      latestToolHash: args.toolHash,
      staticSnapshot: args.staticSnapshot,
      updatedAt: args.now,
      ...(args.metadata !== undefined ? { metadata: args.metadata } : {}),
    });
    createdReg = true;
  }

  const existingVer = await ctx.db
    .query("toolVersions")
    .withIndex("by_registration_and_toolHash", (q) =>
      q.eq("registrationId", registrationId).eq("toolHash", args.toolHash),
    )
    .first();

  if (existingVer) {
    return {
      registrationId,
      toolVersionId: existingVer._id,
      created: { toolRegistration: createdReg, toolVersion: false },
    };
  }

  const toolVersionId = await ctx.db.insert("toolVersions", {
    registrationId,
    toolHash: args.toolHash,
    staticSnapshot: args.staticSnapshot,
    createdAt: args.now,
  });

  return {
    registrationId,
    toolVersionId,
    created: { toolRegistration: createdReg, toolVersion: true },
  };
}
