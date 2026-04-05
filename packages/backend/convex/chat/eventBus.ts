/**
 * Event bus reads for chat UIs (`api.chat.eventBus.*`).
 * Namespace is the caller’s `userId` (account token); thread-scoped rows use `streamId === threadId`.
 */
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { SessionIdArg } from "convex-helpers/server/sessions";
import type { Doc, Id } from "../_generated/dataModel.js";
import { query } from "../_generated/server.js";

const scopeValidator = v.union(
  v.object({ kind: v.literal("namespace") }),
  v.object({ kind: v.literal("thread"), threadId: v.string() }),
  v.object({ kind: v.literal("sourceStream"), sourceStreamId: v.string() }),
);

function streamIdFromScope(
  scope:
    | { kind: "namespace" }
    | { kind: "thread"; threadId: string }
    | { kind: "sourceStream"; sourceStreamId: string },
): string | null {
  if (scope.kind === "thread") return scope.threadId;
  if (scope.kind === "sourceStream") return scope.sourceStreamId;
  return null;
}

async function enrichBusPage(
  ctx: { db: { get: (id: Id<"dimensions">) => Promise<unknown> } },
  page: Doc<"eventBusEntries">[],
): Promise<
  Array<{
    busEntry: Doc<"eventBusEntries">;
    eventTypeLabel: string;
    streamTypeLabel: string;
  }>
> {
  const ids = new Set<Id<"dimensions">>();
  for (const e of page) {
    ids.add(e.eventTypeId);
    ids.add(e.streamTypeId);
  }
  const loaded = await Promise.all(
    [...ids].map((id) => ctx.db.get(id) as Promise<Doc<"dimensions"> | null>),
  );
  const map = new Map<Id<"dimensions">, Doc<"dimensions">>();
  for (const d of loaded) {
    if (d) map.set(d._id, d);
  }
  return page.map((e) => ({
    busEntry: e,
    eventTypeLabel: map.get(e.eventTypeId)?.value ?? e.eventType,
    streamTypeLabel: map.get(e.streamTypeId)?.value ?? e.streamType,
  }));
}

export const getEventBusEntryForSession = query({
  args: {
    userId: v.string(),
    busEntryId: v.id("eventBusEntries"),
    ...SessionIdArg,
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.busEntryId);
    if (!doc || doc.namespace !== args.userId) return null;
    const [et, st] = await Promise.all([
      ctx.db.get(doc.eventTypeId),
      ctx.db.get(doc.streamTypeId),
    ]);
    return {
      busEntry: doc,
      eventTypeLabel: et?.value ?? doc.eventType,
      streamTypeLabel: st?.value ?? doc.streamType,
    };
  },
});

export const listEventBusDimensions = query({
  args: {
    userId: v.string(),
    kind: v.union(v.literal("eventType"), v.literal("streamType")),
    ...SessionIdArg,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("dimensions")
      .withIndex("by_namespace_kind_value", (q) =>
        q.eq("namespace", args.userId).eq("kind", args.kind),
      )
      .collect();
  },
});

export const listEventBusEntriesForSession = query({
  args: {
    userId: v.string(),
    paginationOpts: paginationOptsValidator,
    scope: scopeValidator,
    eventTypeId: v.optional(v.id("dimensions")),
    streamTypeId: v.optional(v.id("dimensions")),
    eventTimeMin: v.optional(v.number()),
    eventTimeMax: v.optional(v.number()),
    ...SessionIdArg,
  },
  handler: async (ctx, args) => {
    const ns = args.userId;
    const minT = args.eventTimeMin;
    const maxT = args.eventTimeMax;
    const et = args.eventTypeId;
    const st = args.streamTypeId;
    const streamId = streamIdFromScope(args.scope);

    const base = ctx.db.query("eventBusEntries");

    if (streamId !== null) {
      // Thread- or source-stream–scoped
      if (et && st) {
        const raw = await base
          .withIndex("by_namespace_eventType_time", (q) => {
            const p = q.eq("namespace", ns).eq("eventTypeId", et);
            if (minT != null && maxT != null)
              return p.gte("eventTime", minT).lte("eventTime", maxT);
            if (minT != null) return p.gte("eventTime", minT);
            if (maxT != null) return p.lte("eventTime", maxT);
            return p;
          })
          .order("desc")
          .filter((q) =>
            q.and(
              q.eq(q.field("streamId"), streamId),
              q.eq(q.field("streamTypeId"), st),
            ),
          )
          .paginate(args.paginationOpts);
        return { ...raw, page: await enrichBusPage(ctx, raw.page) };
      }
      if (et && !st) {
        const raw = await base
          .withIndex("by_namespace_eventType_time", (q) => {
            const p = q.eq("namespace", ns).eq("eventTypeId", et);
            if (minT != null && maxT != null)
              return p.gte("eventTime", minT).lte("eventTime", maxT);
            if (minT != null) return p.gte("eventTime", minT);
            if (maxT != null) return p.lte("eventTime", maxT);
            return p;
          })
          .order("desc")
          .filter((q) => q.eq(q.field("streamId"), streamId))
          .paginate(args.paginationOpts);
        return { ...raw, page: await enrichBusPage(ctx, raw.page) };
      }
      if (!et && st) {
        const raw = await base
          .withIndex("by_namespace_streamType_time", (q) => {
            const p = q.eq("namespace", ns).eq("streamTypeId", st);
            if (minT != null && maxT != null)
              return p.gte("eventTime", minT).lte("eventTime", maxT);
            if (minT != null) return p.gte("eventTime", minT);
            if (maxT != null) return p.lte("eventTime", maxT);
            return p;
          })
          .order("desc")
          .filter((q) => q.eq(q.field("streamId"), streamId))
          .paginate(args.paginationOpts);
        return { ...raw, page: await enrichBusPage(ctx, raw.page) };
      }
      const raw = await base
        .withIndex("by_namespace_streamId_time", (q) => {
          const p = q.eq("namespace", ns).eq("streamId", streamId);
          if (minT != null && maxT != null)
            return p.gte("eventTime", minT).lte("eventTime", maxT);
          if (minT != null) return p.gte("eventTime", minT);
          if (maxT != null) return p.lte("eventTime", maxT);
          return p;
        })
        .order("desc")
        .paginate(args.paginationOpts);
      return { ...raw, page: await enrichBusPage(ctx, raw.page) };
    }

    // Full namespace
    if (et && st) {
      const raw = await base
        .withIndex("by_namespace_eventType_time", (q) => {
          const p = q.eq("namespace", ns).eq("eventTypeId", et);
          if (minT != null && maxT != null)
            return p.gte("eventTime", minT).lte("eventTime", maxT);
          if (minT != null) return p.gte("eventTime", minT);
          if (maxT != null) return p.lte("eventTime", maxT);
          return p;
        })
        .order("desc")
        .filter((q) => q.eq(q.field("streamTypeId"), st))
        .paginate(args.paginationOpts);
      return { ...raw, page: await enrichBusPage(ctx, raw.page) };
    }
    if (et && !st) {
      const raw = await base
        .withIndex("by_namespace_eventType_time", (q) => {
          const p = q.eq("namespace", ns).eq("eventTypeId", et);
          if (minT != null && maxT != null)
            return p.gte("eventTime", minT).lte("eventTime", maxT);
          if (minT != null) return p.gte("eventTime", minT);
          if (maxT != null) return p.lte("eventTime", maxT);
          return p;
        })
        .order("desc")
        .paginate(args.paginationOpts);
      return { ...raw, page: await enrichBusPage(ctx, raw.page) };
    }
    if (!et && st) {
      const raw = await base
        .withIndex("by_namespace_streamType_time", (q) => {
          const p = q.eq("namespace", ns).eq("streamTypeId", st);
          if (minT != null && maxT != null)
            return p.gte("eventTime", minT).lte("eventTime", maxT);
          if (minT != null) return p.gte("eventTime", minT);
          if (maxT != null) return p.lte("eventTime", maxT);
          return p;
        })
        .order("desc")
        .paginate(args.paginationOpts);
      return { ...raw, page: await enrichBusPage(ctx, raw.page) };
    }
    const raw = await base
      .withIndex("by_namespace_time", (q) => {
        const p = q.eq("namespace", ns);
        if (minT != null && maxT != null)
          return p.gte("eventTime", minT).lte("eventTime", maxT);
        if (minT != null) return p.gte("eventTime", minT);
        if (maxT != null) return p.lte("eventTime", maxT);
        return p;
      })
      .order("desc")
      .paginate(args.paginationOpts);
    return { ...raw, page: await enrichBusPage(ctx, raw.page) };
  },
});
