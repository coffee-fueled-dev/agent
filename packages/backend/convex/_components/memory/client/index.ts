import type {
  GenericActionCtx,
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";

type RunMutationCtx = Pick<
  GenericMutationCtx<GenericDataModel>,
  "runMutation" | "runQuery"
>;
type RunActionCtx = Pick<GenericActionCtx<GenericDataModel>, "runAction"> &
  RunMutationCtx;
type RunQueryCtx = Pick<GenericQueryCtx<GenericDataModel>, "runQuery">;

export type MemoryClientConfig = {
  googleApiKey?: string;
  similarityK?: number;
  similarityThreshold?: number;
};

// TODO: Run codegen to generate function types

/** App-facing facade for the memory component. */
export class MemoryClient {
  constructor(
    public component: {
      public: {
        core: Record<string, unknown>;
        retrieval: Record<string, unknown>;
        graph: Record<string, unknown>;
      };
    },
    public config: MemoryClientConfig = {},
  ) {}

  private get apiKey() {
    return this.config.googleApiKey;
  }

  upsertMemory = async (ctx: RunActionCtx, args: Record<string, unknown>) => {
    return await ctx.runAction(
      this.component.public.core.upsertMemory as never,
      {
        ...args,
        apiKey: this.apiKey,
        similarityK: this.config.similarityK,
        similarityThreshold: this.config.similarityThreshold,
      } as never,
    );
  };

  getMemory = async (ctx: RunQueryCtx, args: Record<string, unknown>) => {
    return await ctx.runQuery(
      this.component.public.core.getMemory as never,
      args as never,
    );
  };

  listVersionsPage = async (
    ctx: RunQueryCtx,
    args: Record<string, unknown>,
  ) => {
    return await ctx.runQuery(
      this.component.public.core.listVersionsPage as never,
      args as never,
    );
  };

  recallVersion = async (ctx: RunQueryCtx, args: Record<string, unknown>) => {
    return await ctx.runQuery(
      this.component.public.core.recallVersion as never,
      args as never,
    );
  };

  removeMemory = async (ctx: RunActionCtx, args: Record<string, unknown>) => {
    return await ctx.runAction(
      this.component.public.core.removeMemory as never,
      {
        ...args,
        apiKey: this.apiKey,
      } as never,
    );
  };

  searchMemory = async (ctx: RunActionCtx, args: Record<string, unknown>) => {
    return await ctx.runAction(
      this.component.public.retrieval.searchMemory as never,
      {
        ...args,
        apiKey: this.apiKey,
      } as never,
    );
  };

  getNeighborEdges = async (
    ctx: RunQueryCtx,
    args: Record<string, unknown>,
  ) => {
    return await ctx.runQuery(
      this.component.public.graph.getNeighborEdges as never,
      args as never,
    );
  };

  expandNeighbors = async (ctx: RunQueryCtx, args: Record<string, unknown>) => {
    return await ctx.runQuery(
      this.component.public.graph.expandNeighbors as never,
      args as never,
    );
  };

  createCommunityJob = async (
    ctx: RunMutationCtx,
    args: Record<string, unknown>,
  ) => {
    return await ctx.runMutation(
      this.component.public.graph.createCommunityJob as never,
      args as never,
    );
  };

  scheduleCommunityRebuild = async (
    ctx: RunMutationCtx,
    args: Record<string, unknown>,
  ) => {
    return await ctx.runMutation(
      this.component.public.graph.scheduleCommunityRebuild as never,
      args as never,
    );
  };

  getLatestCommunities = async (
    ctx: RunQueryCtx,
    args: Record<string, unknown>,
  ) => {
    return await ctx.runQuery(
      this.component.public.graph.getLatestCommunities as never,
      args as never,
    );
  };

  getCommunityForMemory = async (
    ctx: RunQueryCtx,
    args: Record<string, unknown>,
  ) => {
    return await ctx.runQuery(
      this.component.public.graph.getCommunityForMemory as never,
      args as never,
    );
  };
}
