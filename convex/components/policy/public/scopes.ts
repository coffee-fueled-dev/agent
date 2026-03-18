import { ConvexError, v } from "convex/values";
import { policyConfig } from "../../../policy.config";
import { mutation, query } from "../_generated/server";
import {
  assertRelationTemplate,
  assertScopeType,
  resolveScopes,
} from "../internal/evaluate";
import {
  buildLastUpdate,
  lastUpdateActorValidator,
  lastUpdateValidator,
  metadataValidator,
  scopeValidator,
} from "../internal/shared";

export const register = mutation({
  args: {
    scope: scopeValidator,
    attrs: metadataValidator,
    update: v.optional(lastUpdateActorValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertScopeType(args.scope.scopeType);
    const existing = await ctx.db
      .query("scope_nodes")
      .withIndex("by_scope", (q) =>
        q
          .eq("scopeType", args.scope.scopeType)
          .eq("scopeId", args.scope.scopeId),
      )
      .first();
    const value = {
      scopeType: args.scope.scopeType,
      scopeId: args.scope.scopeId,
      attrs: args.attrs,
      lastUpdate: buildLastUpdate(args.update),
    };
    if (existing) {
      await ctx.db.patch(existing._id, value);
    } else {
      await ctx.db.insert("scope_nodes", value);
    }
    return null;
  },
});

export const link = mutation({
  args: {
    from: scopeValidator,
    to: scopeValidator,
    relation: v.string(),
    attrs: metadataValidator,
    update: v.optional(lastUpdateActorValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertScopeType(args.from.scopeType);
    assertScopeType(args.to.scopeType);
    assertRelationTemplate(
      policyConfig.relationTemplates,
      args.from.scopeType,
      args.to.scopeType,
      args.relation,
    );
    if (
      args.from.scopeType === args.to.scopeType &&
      args.from.scopeId === args.to.scopeId
    ) {
      throw new ConvexError("Scope links cannot point to themselves");
    }
    const [fromNode, toNode] = await Promise.all([
      ctx.db
        .query("scope_nodes")
        .withIndex("by_scope", (q) =>
          q
            .eq("scopeType", args.from.scopeType)
            .eq("scopeId", args.from.scopeId),
        )
        .first(),
      ctx.db
        .query("scope_nodes")
        .withIndex("by_scope", (q) =>
          q.eq("scopeType", args.to.scopeType).eq("scopeId", args.to.scopeId),
        )
        .first(),
    ]);
    if (!fromNode || !toNode) {
      throw new ConvexError("Both scope nodes must exist before linking");
    }
    const existing = await ctx.db
      .query("scope_edges")
      .withIndex("by_from", (q) =>
        q
          .eq("fromType", args.from.scopeType)
          .eq("fromId", args.from.scopeId)
          .eq("relation", args.relation)
          .eq("toType", args.to.scopeType)
          .eq("toId", args.to.scopeId),
      )
      .first();
    const value = {
      fromType: args.from.scopeType,
      fromId: args.from.scopeId,
      relation: args.relation,
      toType: args.to.scopeType,
      toId: args.to.scopeId,
      attrs: args.attrs,
      lastUpdate: buildLastUpdate(args.update),
    };
    if (existing) {
      await ctx.db.patch(existing._id, value);
    } else {
      await ctx.db.insert("scope_edges", value);
    }
    return null;
  },
});

export const unlink = mutation({
  args: {
    from: scopeValidator,
    to: scopeValidator,
    relation: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("scope_edges")
      .withIndex("by_from", (q) =>
        q
          .eq("fromType", args.from.scopeType)
          .eq("fromId", args.from.scopeId)
          .eq("relation", args.relation)
          .eq("toType", args.to.scopeType)
          .eq("toId", args.to.scopeId),
      )
      .collect();
    for (const row of rows) {
      await ctx.db.delete(row._id);
    }
    return null;
  },
});

export const resolve = query({
  args: {
    subject: scopeValidator,
    relations: v.optional(v.array(v.string())),
  },
  returns: v.object({
    scopes: v.array(scopeValidator),
    edges: v.array(
      v.object({
        fromType: v.string(),
        fromId: v.string(),
        relation: v.string(),
        toType: v.string(),
        toId: v.string(),
        depth: v.number(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const resolved = await resolveScopes(ctx, args.subject, {
      relations: args.relations,
      traversableOnly: true,
    });
    return {
      scopes: resolved.resolvedScopes.map(({ scopeType, scopeId }) => ({
        scopeType,
        scopeId,
      })),
      edges: resolved.edges,
    };
  },
});

export const listNodes = query({
  args: {
    scopeType: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      scopeType: v.string(),
      scopeId: v.string(),
      attrs: metadataValidator,
      lastUpdate: lastUpdateValidator,
    }),
  ),
  handler: async (ctx, args) => {
    if (args.scopeType) {
      const scopeType = args.scopeType;
      const rows = await ctx.db
        .query("scope_nodes")
        .withIndex("by_scope", (q) => q.eq("scopeType", scopeType))
        .collect();
      return rows.map((row) => ({
        scopeType: row.scopeType,
        scopeId: row.scopeId,
        attrs: row.attrs,
        lastUpdate: row.lastUpdate,
      }));
    }

    const rows = await ctx.db.query("scope_nodes").collect();
    return rows.map((row) => ({
      scopeType: row.scopeType,
      scopeId: row.scopeId,
      attrs: row.attrs,
      lastUpdate: row.lastUpdate,
    }));
  },
});

export const listEdges = query({
  args: {
    subject: v.optional(scopeValidator),
    relation: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      fromType: v.string(),
      fromId: v.string(),
      relation: v.string(),
      toType: v.string(),
      toId: v.string(),
      attrs: metadataValidator,
      lastUpdate: lastUpdateValidator,
    }),
  ),
  handler: async (ctx, args) => {
    if (args.subject) {
      const subject = args.subject;
      const rows = await ctx.db
        .query("scope_edges")
        .withIndex("by_from", (q) =>
          q.eq("fromType", subject.scopeType).eq("fromId", subject.scopeId),
        )
        .collect();
      return rows
        .filter((row) => !args.relation || row.relation === args.relation)
        .map((row) => ({
          fromType: row.fromType,
          fromId: row.fromId,
          relation: row.relation,
          toType: row.toType,
          toId: row.toId,
          attrs: row.attrs,
          lastUpdate: row.lastUpdate,
        }));
    }

    const rows = await ctx.db.query("scope_edges").collect();
    return rows
      .filter((row) => !args.relation || row.relation === args.relation)
      .map((row) => ({
        fromType: row.fromType,
        fromId: row.fromId,
        relation: row.relation,
        toType: row.toType,
        toId: row.toId,
        attrs: row.attrs,
        lastUpdate: row.lastUpdate,
      }));
  },
});
