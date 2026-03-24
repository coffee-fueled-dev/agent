import type {
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
  PaginationOptions,
  PaginationResult,
} from "convex/server";
import type { ComponentApi } from "../_generated/component";
import type {
  AppendArgs,
  HistoryConfig,
  HistoryEntry,
  HistoryHeadRef,
  HistoryStreamTemplate,
  StreamTypeFor,
} from "../types";

type RunQueryCtx = Pick<GenericQueryCtx<GenericDataModel>, "runQuery">;
type RunMutationCtx = Pick<
  GenericMutationCtx<GenericDataModel>,
  "runMutation" | "runQuery"
>;

type EntryRefArgs<Streams extends readonly HistoryStreamTemplate[]> = {
  streamType: StreamTypeFor<Streams>;
  streamId: string;
  entryId: string;
};

export class HistoryClient<
  const Streams extends readonly HistoryStreamTemplate[],
> {
  constructor(
    public component: ComponentApi,
    public config: HistoryConfig<Streams>,
  ) {}

  async append(
    ctx: RunMutationCtx,
    args: AppendArgs<Streams>,
  ): Promise<HistoryEntry<Streams>> {
    return await ctx.runMutation(this.component.public.append.append, args);
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
