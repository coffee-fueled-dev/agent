import type {
  GenericDataModel,
  GenericQueryCtx,
  PaginationOptions,
  PaginationResult,
} from "convex/server";
import { assertRegisteredStream } from "../assertStream.js";
import type { ComponentApi } from "../component/_generated/component.js";
import type {
  AppendArgs,
  HistoryConfig,
  HistoryEntry,
  HistoryHeadRef,
  HistoryStreamTemplate,
  StreamTypeFor,
} from "../types.js";
import {
  type HistoryCallCtx,
  type HistorySubscribable,
  type HistorySubscriber,
  notifyHistorySubscribers,
} from "./events.js";

export type * from "./events.js";

type RunQueryCtx = Pick<GenericQueryCtx<GenericDataModel>, "runQuery">;

type EntryRefArgs<Streams extends readonly HistoryStreamTemplate[]> = {
  streamType: StreamTypeFor<Streams>;
  streamId: string;
  entryId: string;
};

export class HistoryClient<
  const Streams extends readonly HistoryStreamTemplate[],
> implements HistorySubscribable<Streams>
{
  private _subscribers = new Map<string, HistorySubscriber<Streams>>();

  constructor(
    public component: ComponentApi,
    public config: HistoryConfig<Streams>,
  ) {}

  subscribe(id: string, callback: HistorySubscriber<Streams>): void {
    this._subscribers.set(id, callback);
  }

  async append(
    ctx: HistoryCallCtx,
    args: AppendArgs<Streams>,
  ): Promise<HistoryEntry<Streams>> {
    assertRegisteredStream(this.config.streams, args.streamType, args.kind);
    const result = await ctx.runMutation(
      this.component.public.append.append,
      args,
    );
    await notifyHistorySubscribers(this._subscribers, ctx, {
      event: "append",
      args,
      result,
    });
    return result;
  }

  async getEntry(
    ctx: RunQueryCtx,
    args: EntryRefArgs<Streams>,
  ): Promise<HistoryEntry<Streams> | null> {
    return await ctx.runQuery(this.component.public.read.getEntry, args);
  }

  async listEntries(
    ctx: RunQueryCtx,
    args: {
      streamType: StreamTypeFor<Streams>;
      streamId: string;
      paginationOpts: PaginationOptions;
    },
  ): Promise<PaginationResult<HistoryEntry<Streams>>> {
    return await ctx.runQuery(this.component.public.read.listEntries, args);
  }

  async getParents(
    ctx: RunQueryCtx,
    args: EntryRefArgs<Streams>,
  ): Promise<HistoryEntry<Streams>[]> {
    return await ctx.runQuery(this.component.public.read.getParents, args);
  }

  async getChildren(
    ctx: RunQueryCtx,
    args: EntryRefArgs<Streams>,
  ): Promise<HistoryEntry<Streams>[]> {
    return await ctx.runQuery(this.component.public.read.getChildren, args);
  }

  async getPathToRoot(
    ctx: RunQueryCtx,
    args: EntryRefArgs<Streams>,
  ): Promise<HistoryEntry<Streams>[]> {
    return await ctx.runQuery(this.component.public.read.getPathToRoot, args);
  }

  async isAncestor(
    ctx: RunQueryCtx,
    args: {
      streamType: StreamTypeFor<Streams>;
      streamId: string;
      ancestorEntryId: string;
      descendantEntryId: string;
    },
  ) {
    return await ctx.runQuery(this.component.public.read.isAncestor, args);
  }

  async latestCommonAncestor(
    ctx: RunQueryCtx,
    args: {
      streamType: StreamTypeFor<Streams>;
      streamId: string;
      leftEntryId: string;
      rightEntryId: string;
    },
  ): Promise<HistoryEntry<Streams> | null> {
    return await ctx.runQuery(
      this.component.public.read.getLatestCommonAncestor,
      args,
    );
  }

  async listHeads(
    ctx: RunQueryCtx,
    args: {
      streamType: StreamTypeFor<Streams>;
      streamId: string;
    },
  ): Promise<HistoryHeadRef<StreamTypeFor<Streams>>[]> {
    return await ctx.runQuery(this.component.public.heads.listHeads, args);
  }
}
