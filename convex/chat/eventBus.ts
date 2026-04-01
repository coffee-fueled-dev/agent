import type { PaginationOptions, PaginationResult } from "convex/server";
import { paginator } from "convex-helpers/server/pagination";
import { zid } from "convex-helpers/server/zod4";
import { z } from "zod/v4";
import type { Doc, Id } from "../_generated/dataModel";
import {
  type SessionQueryCtx,
  sessionPaginatedQuery,
  sessionQuery,
} from "../customFunctions";
import { busListener } from "../events";
import { expectedAccountNamespace } from "../models/auth/contextNamespace";
import schema from "../schema";

const scopeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("namespace") }),
  z.object({ kind: z.literal("thread"), threadId: z.string() }),
  z.object({ kind: z.literal("sourceStream"), sourceStreamId: z.string() }),
]);

async function getStreamTypeDimensionId(
  ctx: SessionQueryCtx,
  namespace: string,
  streamTypeValue: string,
): Promise<Id<"dimensions"> | null> {
  const doc = await ctx.db
    .query("dimensions")
    .withIndex("by_namespace_kind_value", (q) =>
      q
        .eq("namespace", namespace)
        .eq("kind", "streamType")
        .eq("value", streamTypeValue),
    )
    .first();
  return doc?._id ?? null;
}

async function hydrateBusRows(
  ctx: SessionQueryCtx,
  page: Doc<"eventBusEntries">[],
): Promise<
  {
    busEntry: Doc<"eventBusEntries">;
    eventTypeLabel: string;
    streamTypeLabel: string;
  }[]
> {
  const ids = new Set<Id<"dimensions">>();
  for (const r of page) {
    ids.add(r.eventTypeId);
    ids.add(r.streamTypeId);
  }
  const map = new Map<string, string>();
  await Promise.all(
    [...ids].map(async (id) => {
      const d = await ctx.db.get(id);
      if (d) map.set(id, d.value);
    }),
  );
  return page.map((busEntry) => ({
    busEntry,
    eventTypeLabel: map.get(busEntry.eventTypeId) ?? busEntry.eventType,
    streamTypeLabel: map.get(busEntry.streamTypeId) ?? busEntry.streamType,
  }));
}

const emptyPage = <T>(): PaginationResult<T> => ({
  page: [],
  isDone: true,
  continueCursor: "",
});

export const listEventBusEntriesForSession = sessionPaginatedQuery({
  args: {
    scope: scopeSchema,
    eventTypeId: zid("dimensions").optional(),
    streamTypeId: zid("dimensions").optional(),
    eventTimeMin: z.number().optional(),
    eventTimeMax: z.number().optional(),
  },
  handler: async (
    ctx: SessionQueryCtx,
    args: {
      paginationOpts: PaginationOptions;
      scope: z.infer<typeof scopeSchema>;
      eventTypeId?: Id<"dimensions">;
      streamTypeId?: Id<"dimensions">;
      eventTimeMin?: number;
      eventTimeMax?: number;
    },
  ) => {
    const account = ctx.account;
    if (!account) {
      return emptyPage<Awaited<ReturnType<typeof hydrateBusRows>>[number]>();
    }
    const namespace = expectedAccountNamespace(account._id);
    const minT = args.eventTimeMin;
    const maxT = args.eventTimeMax;
    const optEventTypeId = args.eventTypeId;
    const optStreamTypeId = args.streamTypeId;

    const threadDimId = await getStreamTypeDimensionId(
      ctx,
      namespace,
      "threadIdentity",
    );
    const contextMemoryDimId = await getStreamTypeDimensionId(
      ctx,
      namespace,
      "contextMemory",
    );

    if (args.scope.kind === "thread") {
      if (!threadDimId) {
        return emptyPage<Awaited<ReturnType<typeof hydrateBusRows>>[number]>();
      }
      const threadId = args.scope.threadId;

      if (optEventTypeId) {
        const raw = await paginator(ctx.db, schema)
          .query("eventBusEntries")
          .withIndex("by_namespace_eventType_time", (q) => {
            const prefix = q
              .eq("namespace", namespace)
              .eq("eventTypeId", optEventTypeId);
            if (minT != null && maxT != null)
              return prefix.gte("eventTime", minT).lte("eventTime", maxT);
            if (minT != null) return prefix.gte("eventTime", minT);
            if (maxT != null) return prefix.lte("eventTime", maxT);
            return prefix;
          })
          .order("desc")
          .filterWith(
            async (doc) =>
              doc.streamId === threadId && doc.streamTypeId === threadDimId,
          )
          .paginate(args.paginationOpts);
        return {
          ...raw,
          page: await hydrateBusRows(ctx, raw.page),
        };
      }

      const raw = await paginator(ctx.db, schema)
        .query("eventBusEntries")
        .withIndex("by_namespace_streamType_time", (q) => {
          const prefix = q
            .eq("namespace", namespace)
            .eq("streamTypeId", threadDimId);
          if (minT != null && maxT != null)
            return prefix.gte("eventTime", minT).lte("eventTime", maxT);
          if (minT != null) return prefix.gte("eventTime", minT);
          if (maxT != null) return prefix.lte("eventTime", maxT);
          return prefix;
        })
        .order("desc")
        .filterWith(async (doc) => doc.streamId === threadId)
        .paginate(args.paginationOpts);
      return {
        ...raw,
        page: await hydrateBusRows(ctx, raw.page),
      };
    }

    if (args.scope.kind === "sourceStream") {
      if (!contextMemoryDimId) {
        return emptyPage<Awaited<ReturnType<typeof hydrateBusRows>>[number]>();
      }
      const sourceStreamId = args.scope.sourceStreamId;

      if (optEventTypeId) {
        const raw = await paginator(ctx.db, schema)
          .query("eventBusEntries")
          .withIndex("by_namespace_eventType_time", (q) => {
            const prefix = q
              .eq("namespace", namespace)
              .eq("eventTypeId", optEventTypeId);
            if (minT != null && maxT != null)
              return prefix.gte("eventTime", minT).lte("eventTime", maxT);
            if (minT != null) return prefix.gte("eventTime", minT);
            if (maxT != null) return prefix.lte("eventTime", maxT);
            return prefix;
          })
          .order("desc")
          .filterWith(
            async (doc) =>
              doc.streamId === sourceStreamId &&
              doc.streamTypeId === contextMemoryDimId,
          )
          .paginate(args.paginationOpts);
        return {
          ...raw,
          page: await hydrateBusRows(ctx, raw.page),
        };
      }

      const raw = await paginator(ctx.db, schema)
        .query("eventBusEntries")
        .withIndex("by_namespace_streamType_time", (q) => {
          const prefix = q
            .eq("namespace", namespace)
            .eq("streamTypeId", contextMemoryDimId);
          if (minT != null && maxT != null)
            return prefix.gte("eventTime", minT).lte("eventTime", maxT);
          if (minT != null) return prefix.gte("eventTime", minT);
          if (maxT != null) return prefix.lte("eventTime", maxT);
          return prefix;
        })
        .order("desc")
        .filterWith(async (doc) => doc.streamId === sourceStreamId)
        .paginate(args.paginationOpts);
      return {
        ...raw,
        page: await hydrateBusRows(ctx, raw.page),
      };
    }

    // namespace-wide
    if (optEventTypeId) {
      const base = paginator(ctx.db, schema)
        .query("eventBusEntries")
        .withIndex("by_namespace_eventType_time", (q) => {
          const prefix = q
            .eq("namespace", namespace)
            .eq("eventTypeId", optEventTypeId);
          if (minT != null && maxT != null)
            return prefix.gte("eventTime", minT).lte("eventTime", maxT);
          if (minT != null) return prefix.gte("eventTime", minT);
          if (maxT != null) return prefix.lte("eventTime", maxT);
          return prefix;
        })
        .order("desc");
      const raw = await (optStreamTypeId
        ? base.filterWith(async (doc) => doc.streamTypeId === optStreamTypeId)
        : base
      ).paginate(args.paginationOpts);
      return {
        ...raw,
        page: await hydrateBusRows(ctx, raw.page),
      };
    }

    if (optStreamTypeId) {
      const raw = await paginator(ctx.db, schema)
        .query("eventBusEntries")
        .withIndex("by_namespace_streamType_time", (q) => {
          const prefix = q
            .eq("namespace", namespace)
            .eq("streamTypeId", optStreamTypeId);
          if (minT != null && maxT != null)
            return prefix.gte("eventTime", minT).lte("eventTime", maxT);
          if (minT != null) return prefix.gte("eventTime", minT);
          if (maxT != null) return prefix.lte("eventTime", maxT);
          return prefix;
        })
        .order("desc")
        .paginate(args.paginationOpts);
      return {
        ...raw,
        page: await hydrateBusRows(ctx, raw.page),
      };
    }

    const raw = await paginator(ctx.db, schema)
      .query("eventBusEntries")
      .withIndex("by_namespace_time", (q) => {
        const prefix = q.eq("namespace", namespace);
        if (minT != null && maxT != null)
          return prefix.gte("eventTime", minT).lte("eventTime", maxT);
        if (minT != null) return prefix.gte("eventTime", minT);
        if (maxT != null) return prefix.lte("eventTime", maxT);
        return prefix;
      })
      .order("desc")
      .paginate(args.paginationOpts);
    return {
      ...raw,
      page: await hydrateBusRows(ctx, raw.page),
    };
  },
});

export const getEventBusEntryForSession = sessionQuery({
  args: {
    busEntryId: zid("eventBusEntries"),
  },
  handler: async (ctx, { busEntryId }) => {
    const account = ctx.account;
    if (!account) return null;
    const ns = expectedAccountNamespace(account._id);
    const busEntry = await ctx.db.get(busEntryId);
    if (!busEntry || busEntry.namespace !== ns) return null;
    const originalEvent = await busListener.getOriginalEvent(
      ctx,
      busEntry as never,
    );
    return { busEntry, originalEvent };
  },
});
