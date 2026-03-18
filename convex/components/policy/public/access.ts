import { ConvexError, v } from "convex/values";
import { policyConfig } from "../../../policy.config";
import { mutation, type QueryCtx, query } from "../_generated/server";
import {
  assertAccessTemplate,
  isPolicyActive,
  resolveAccessDecision,
  resolveScopes,
  toAccessMatch,
} from "../internal/evaluate";
import {
  buildLastUpdate,
  lastUpdateActorValidator,
  lastUpdateValidator,
  metadataValidator,
  scopeValidator,
} from "../internal/shared";

const accessPolicyValidator = v.object({
  resourceType: v.string(),
  resourceId: v.union(v.string(), v.null()),
  action: v.string(),
  effect: v.union(v.literal("allow"), v.literal("deny")),
  activeTime: v.optional(v.union(v.number(), v.null())),
  expiredTime: v.optional(v.union(v.number(), v.null())),
  attrs: metadataValidator,
});

const accessDecisionValidator = v.object({
  decision: v.union(v.literal("allow"), v.literal("deny")),
  reason: v.union(
    v.literal("matched_allow"),
    v.literal("matched_deny"),
    v.literal("no_match"),
  ),
  matchedPolicies: v.array(
    v.object({
      policyId: v.string(),
      subjectType: v.string(),
      subjectId: v.string(),
      effect: v.union(v.literal("allow"), v.literal("deny")),
      resourceId: v.union(v.string(), v.null()),
      inherited: v.boolean(),
      depth: v.number(),
      specificity: v.union(v.literal("exact"), v.literal("wildcard")),
      precedence: v.number(),
    }),
  ),
  resolvedScopes: v.array(
    v.object({
      scopeType: v.string(),
      scopeId: v.string(),
      depth: v.number(),
      inherited: v.boolean(),
      relationPath: v.array(v.string()),
    }),
  ),
});

async function evaluateAccess(
  ctx: QueryCtx,
  args: {
    subject: { scopeType: string; scopeId: string };
    resourceType: string;
    resourceId: string | null;
    action: string;
    at?: number;
  },
) {
  assertAccessTemplate(
    policyConfig.accessTemplates,
    args.resourceType,
    args.action,
  );
  const at = args.at ?? Date.now();
  const resolved = await resolveScopes(ctx, args.subject, {
    traversableOnly: true,
  });
  const policyRows = await Promise.all(
    resolved.resolvedScopes.map(async (scope) => ({
      scope,
      rows: await ctx.db
        .query("access_policies")
        .withIndex("by_subject_resource_action", (q) =>
          q
            .eq("subjectType", scope.scopeType)
            .eq("subjectId", scope.scopeId)
            .eq("resourceType", args.resourceType)
            .eq("action", args.action),
        )
        .collect(),
    })),
  );
  const matchedPolicies = policyRows.flatMap(({ scope, rows }) =>
    rows.flatMap((row) => {
      if (!isPolicyActive(row, at)) return [];
      if (row.resourceId != null && row.resourceId !== args.resourceId) {
        return [];
      }
      return [
        toAccessMatch({
          id: row._id,
          subjectType: row.subjectType,
          subjectId: row.subjectId,
          effect: row.effect,
          resourceId: row.resourceId,
          scope,
        }),
      ];
    }),
  );
  const decision = resolveAccessDecision(matchedPolicies);

  return {
    decision: decision.decision,
    reason: decision.reason,
    matchedPolicies: decision.matchedPolicies,
    resolvedScopes: resolved.resolvedScopes,
  };
}

export const grant = mutation({
  args: {
    subject: scopeValidator,
    resourceType: v.string(),
    resourceId: v.union(v.string(), v.null()),
    action: v.string(),
    effect: v.union(v.literal("allow"), v.literal("deny")),
    activeTime: v.optional(v.union(v.number(), v.null())),
    expiredTime: v.optional(v.union(v.number(), v.null())),
    attrs: metadataValidator,
    update: v.optional(lastUpdateActorValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertAccessTemplate(
      policyConfig.accessTemplates,
      args.resourceType,
      args.action,
    );
    const existing = await ctx.db
      .query("access_policies")
      .withIndex("by_subject_resource_action", (q) =>
        q
          .eq("subjectType", args.subject.scopeType)
          .eq("subjectId", args.subject.scopeId)
          .eq("resourceType", args.resourceType)
          .eq("action", args.action)
          .eq("resourceId", args.resourceId),
      )
      .collect()
      .then((rows) => rows.find((row) => row.effect === args.effect) ?? null);
    const value = {
      subjectType: args.subject.scopeType,
      subjectId: args.subject.scopeId,
      resourceType: args.resourceType,
      resourceId: args.resourceId,
      action: args.action,
      effect: args.effect,
      activeTime: args.activeTime ?? null,
      expiredTime: args.expiredTime ?? null,
      attrs: args.attrs,
      lastUpdate: buildLastUpdate(args.update),
    };
    if (existing) {
      await ctx.db.patch(existing._id, value);
    } else {
      await ctx.db.insert("access_policies", value);
    }
    return null;
  },
});

export const revoke = mutation({
  args: {
    subject: scopeValidator,
    resourceType: v.string(),
    resourceId: v.union(v.string(), v.null()),
    action: v.string(),
    effect: v.optional(v.union(v.literal("allow"), v.literal("deny"))),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("access_policies")
      .withIndex("by_subject_resource_action", (q) =>
        q
          .eq("subjectType", args.subject.scopeType)
          .eq("subjectId", args.subject.scopeId)
          .eq("resourceType", args.resourceType)
          .eq("action", args.action)
          .eq("resourceId", args.resourceId),
      )
      .collect();
    for (const row of rows) {
      if (args.effect && row.effect !== args.effect) continue;
      await ctx.db.delete(row._id);
    }
    return null;
  },
});

export const replaceSubjectPolicies = mutation({
  args: {
    subject: scopeValidator,
    policies: v.array(accessPolicyValidator),
    update: v.optional(lastUpdateActorValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("access_policies")
      .withIndex("by_subject_resource_action", (q) =>
        q
          .eq("subjectType", args.subject.scopeType)
          .eq("subjectId", args.subject.scopeId),
      )
      .collect();
    for (const row of existing) {
      await ctx.db.delete(row._id);
    }
    for (const policy of args.policies) {
      assertAccessTemplate(
        policyConfig.accessTemplates,
        policy.resourceType,
        policy.action,
      );
      await ctx.db.insert("access_policies", {
        subjectType: args.subject.scopeType,
        subjectId: args.subject.scopeId,
        resourceType: policy.resourceType,
        resourceId: policy.resourceId,
        action: policy.action,
        effect: policy.effect,
        activeTime: policy.activeTime ?? null,
        expiredTime: policy.expiredTime ?? null,
        attrs: policy.attrs,
        lastUpdate: buildLastUpdate(args.update),
      });
    }
    return null;
  },
});

export const check = query({
  args: {
    subject: scopeValidator,
    resourceType: v.string(),
    resourceId: v.union(v.string(), v.null()),
    action: v.string(),
    at: v.optional(v.number()),
  },
  returns: accessDecisionValidator,
  handler: async (ctx, args) => await evaluateAccess(ctx, args),
});

export const explain = query({
  args: {
    subject: scopeValidator,
    resourceType: v.string(),
    resourceId: v.union(v.string(), v.null()),
    action: v.string(),
    at: v.optional(v.number()),
  },
  returns: accessDecisionValidator,
  handler: async (ctx, args) => await evaluateAccess(ctx, args),
});

export const requireAccess = query({
  args: {
    subject: scopeValidator,
    resourceType: v.string(),
    resourceId: v.union(v.string(), v.null()),
    action: v.string(),
    at: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const result = await evaluateAccess(ctx, args);
    if (result.decision !== "allow") {
      throw new ConvexError("Unauthorized");
    }
    return null;
  },
});

export const listBySubject = query({
  args: {
    subject: scopeValidator,
  },
  returns: v.array(
    v.object({
      subjectType: v.string(),
      subjectId: v.string(),
      resourceType: v.string(),
      resourceId: v.union(v.string(), v.null()),
      action: v.string(),
      effect: v.union(v.literal("allow"), v.literal("deny")),
      activeTime: v.union(v.number(), v.null()),
      expiredTime: v.union(v.number(), v.null()),
      attrs: metadataValidator,
      lastUpdate: lastUpdateValidator,
    }),
  ),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("access_policies")
      .withIndex("by_subject_resource_action", (q) =>
        q
          .eq("subjectType", args.subject.scopeType)
          .eq("subjectId", args.subject.scopeId),
      )
      .collect();
    return rows.map((row) => ({
      subjectType: row.subjectType,
      subjectId: row.subjectId,
      resourceType: row.resourceType,
      resourceId: row.resourceId,
      action: row.action,
      effect: row.effect,
      activeTime: row.activeTime,
      expiredTime: row.expiredTime,
      attrs: row.attrs,
      lastUpdate: row.lastUpdate,
    }));
  },
});

export const listByResource = query({
  args: {
    resourceType: v.string(),
    resourceId: v.union(v.string(), v.null()),
  },
  returns: v.array(
    v.object({
      subjectType: v.string(),
      subjectId: v.string(),
      resourceType: v.string(),
      resourceId: v.union(v.string(), v.null()),
      action: v.string(),
      effect: v.union(v.literal("allow"), v.literal("deny")),
      activeTime: v.union(v.number(), v.null()),
      expiredTime: v.union(v.number(), v.null()),
      attrs: metadataValidator,
      lastUpdate: lastUpdateValidator,
    }),
  ),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("access_policies")
      .withIndex("by_resource", (q) =>
        q
          .eq("resourceType", args.resourceType)
          .eq("resourceId", args.resourceId),
      )
      .collect();
    return rows.map((row) => ({
      subjectType: row.subjectType,
      subjectId: row.subjectId,
      resourceType: row.resourceType,
      resourceId: row.resourceId,
      action: row.action,
      effect: row.effect,
      activeTime: row.activeTime,
      expiredTime: row.expiredTime,
      attrs: row.attrs,
      lastUpdate: row.lastUpdate,
    }));
  },
});
