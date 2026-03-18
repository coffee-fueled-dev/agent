import { ConvexError, v } from "convex/values";
import { policyConfig } from "../../../policy.config";
import { mutation, type QueryCtx, query } from "../_generated/server";
import {
  assertFeatureTemplate,
  isPolicyActive,
  resolveFeatureDecision,
  resolveScopes,
  toFeatureMatch,
} from "../internal/evaluate";
import {
  buildLastUpdate,
  lastUpdateActorValidator,
  lastUpdateValidator,
  metadataValidator,
  scopeValidator,
} from "../internal/shared";

const entitlementPolicyValidator = v.object({
  namespace: v.string(),
  action: v.string(),
  effect: v.union(v.literal("allow"), v.literal("deny")),
  activeTime: v.optional(v.union(v.number(), v.null())),
  expiredTime: v.optional(v.union(v.number(), v.null())),
  attrs: metadataValidator,
});

const entitlementDecisionValidator = v.object({
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
      inherited: v.boolean(),
      depth: v.number(),
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

async function evaluateEntitlement(
  ctx: QueryCtx,
  args: {
    subject: { scopeType: string; scopeId: string };
    namespace: string;
    action: string;
    at?: number;
  },
) {
  assertFeatureTemplate(
    policyConfig.featureTemplates,
    args.namespace,
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
        .query("entitlement_policies")
        .withIndex("by_subject_namespace_action", (q) =>
          q
            .eq("subjectType", scope.scopeType)
            .eq("subjectId", scope.scopeId)
            .eq("namespace", args.namespace)
            .eq("action", args.action),
        )
        .collect(),
    })),
  );
  const matchedPolicies = policyRows.flatMap(({ scope, rows }) =>
    rows.flatMap((row) => {
      if (!isPolicyActive(row, at)) return [];
      return [
        toFeatureMatch({
          id: row._id,
          subjectType: row.subjectType,
          subjectId: row.subjectId,
          effect: row.effect,
          scope,
        }),
      ];
    }),
  );
  const decision = resolveFeatureDecision(matchedPolicies);

  return {
    decision: decision.decision,
    reason: decision.reason,
    matchedPolicies: decision.matchedPolicies,
    resolvedScopes: resolved.resolvedScopes,
  };
}

export const entitle = mutation({
  args: {
    subject: scopeValidator,
    namespace: v.string(),
    action: v.string(),
    effect: v.union(v.literal("allow"), v.literal("deny")),
    activeTime: v.optional(v.union(v.number(), v.null())),
    expiredTime: v.optional(v.union(v.number(), v.null())),
    attrs: metadataValidator,
    update: v.optional(lastUpdateActorValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertFeatureTemplate(
      policyConfig.featureTemplates,
      args.namespace,
      args.action,
    );
    const existing = await ctx.db
      .query("entitlement_policies")
      .withIndex("by_subject_namespace_action", (q) =>
        q
          .eq("subjectType", args.subject.scopeType)
          .eq("subjectId", args.subject.scopeId)
          .eq("namespace", args.namespace)
          .eq("action", args.action),
      )
      .collect()
      .then((rows) => rows.find((row) => row.effect === args.effect) ?? null);
    const value = {
      subjectType: args.subject.scopeType,
      subjectId: args.subject.scopeId,
      namespace: args.namespace,
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
      await ctx.db.insert("entitlement_policies", value);
    }
    return null;
  },
});

export const revoke = mutation({
  args: {
    subject: scopeValidator,
    namespace: v.string(),
    action: v.string(),
    effect: v.optional(v.union(v.literal("allow"), v.literal("deny"))),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("entitlement_policies")
      .withIndex("by_subject_namespace_action", (q) =>
        q
          .eq("subjectType", args.subject.scopeType)
          .eq("subjectId", args.subject.scopeId)
          .eq("namespace", args.namespace)
          .eq("action", args.action),
      )
      .collect();
    for (const row of rows) {
      if (args.effect && row.effect !== args.effect) continue;
      await ctx.db.delete(row._id);
    }
    return null;
  },
});

export const replaceSubjectEntitlements = mutation({
  args: {
    subject: scopeValidator,
    policies: v.array(entitlementPolicyValidator),
    update: v.optional(lastUpdateActorValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("entitlement_policies")
      .withIndex("by_subject_namespace_action", (q) =>
        q
          .eq("subjectType", args.subject.scopeType)
          .eq("subjectId", args.subject.scopeId),
      )
      .collect();
    for (const row of existing) {
      await ctx.db.delete(row._id);
    }
    for (const policy of args.policies) {
      assertFeatureTemplate(
        policyConfig.featureTemplates,
        policy.namespace,
        policy.action,
      );
      await ctx.db.insert("entitlement_policies", {
        subjectType: args.subject.scopeType,
        subjectId: args.subject.scopeId,
        namespace: policy.namespace,
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
    namespace: v.string(),
    action: v.string(),
    at: v.optional(v.number()),
  },
  returns: entitlementDecisionValidator,
  handler: async (ctx, args) => await evaluateEntitlement(ctx, args),
});

export const explain = query({
  args: {
    subject: scopeValidator,
    namespace: v.string(),
    action: v.string(),
    at: v.optional(v.number()),
  },
  returns: entitlementDecisionValidator,
  handler: async (ctx, args) => await evaluateEntitlement(ctx, args),
});

export const requireEntitlement = query({
  args: {
    subject: scopeValidator,
    namespace: v.string(),
    action: v.string(),
    at: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const result = await evaluateEntitlement(ctx, args);
    if (result.decision !== "allow") {
      throw new ConvexError("Forbidden");
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
      namespace: v.string(),
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
      .query("entitlement_policies")
      .withIndex("by_subject_namespace_action", (q) =>
        q
          .eq("subjectType", args.subject.scopeType)
          .eq("subjectId", args.subject.scopeId),
      )
      .collect();
    return rows.map((row) => ({
      subjectType: row.subjectType,
      subjectId: row.subjectId,
      namespace: row.namespace,
      action: row.action,
      effect: row.effect,
      activeTime: row.activeTime,
      expiredTime: row.expiredTime,
      attrs: row.attrs,
      lastUpdate: row.lastUpdate,
    }));
  },
});

export const listByNamespace = query({
  args: {
    namespace: v.string(),
  },
  returns: v.array(
    v.object({
      subjectType: v.string(),
      subjectId: v.string(),
      namespace: v.string(),
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
      .query("entitlement_policies")
      .withIndex("by_namespace", (q) => q.eq("namespace", args.namespace))
      .collect();
    return rows.map((row) => ({
      subjectType: row.subjectType,
      subjectId: row.subjectId,
      namespace: row.namespace,
      action: row.action,
      effect: row.effect,
      activeTime: row.activeTime,
      expiredTime: row.expiredTime,
      attrs: row.attrs,
      lastUpdate: row.lastUpdate,
    }));
  },
});
