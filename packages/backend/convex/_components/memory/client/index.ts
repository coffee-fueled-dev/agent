import type {
  FunctionArgs,
  GenericActionCtx,
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";
import type { ComponentApi } from "../_generated/component.js";

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

export class MemoryClient {
  constructor(
    public component: ComponentApi,
    public config: MemoryClientConfig = {},
  ) {}

  private get apiKey() {
    return this.config.googleApiKey;
  }

  private get graphAPI() {
    return this.component.public.graph;
  }
  private get coreAPI() {
    return this.component.public.core;
  }
  private get retrievalAPI() {
    return this.component.public.retrieval;
  }

  upsertMemory = async (
    ctx: RunActionCtx,
    args: FunctionArgs<typeof this.coreAPI.upsertMemory>,
  ) => {
    return await ctx.runAction(this.coreAPI.upsertMemory, {
      ...args,
      apiKey: this.apiKey,
      similarityK: this.config.similarityK,
      similarityThreshold: this.config.similarityThreshold,
    });
  };

  getMemory = async (
    ctx: RunQueryCtx,
    args: FunctionArgs<typeof this.coreAPI.getMemory>,
  ) => {
    return await ctx.runQuery(this.coreAPI.getMemory, args);
  };

  listMemoryPage = async (
    ctx: RunQueryCtx,
    args: FunctionArgs<typeof this.coreAPI.listMemoryPage>,
  ) => {
    return await ctx.runQuery(this.coreAPI.listMemoryPage, args);
  };

  listVersionsPage = async (
    ctx: RunQueryCtx,
    args: FunctionArgs<typeof this.coreAPI.listVersionsPage>,
  ) => {
    return await ctx.runQuery(this.coreAPI.listVersionsPage, args);
  };

  recallVersion = async (
    ctx: RunQueryCtx,
    args: FunctionArgs<typeof this.coreAPI.recallVersion>,
  ) => {
    return await ctx.runQuery(this.coreAPI.recallVersion, args);
  };

  removeMemory = async (
    ctx: RunActionCtx,
    args: FunctionArgs<typeof this.coreAPI.removeMemory>,
  ) => {
    return await ctx.runAction(this.coreAPI.removeMemory, {
      ...args,
      apiKey: this.apiKey,
    });
  };

  searchMemory = async (
    ctx: RunActionCtx,
    args: FunctionArgs<typeof this.retrievalAPI.searchMemory>,
  ) => {
    return await ctx.runAction(this.retrievalAPI.searchMemory, {
      ...args,
      apiKey: this.apiKey,
    });
  };

  getNeighborEdges = async (
    ctx: RunQueryCtx,
    args: FunctionArgs<typeof this.graphAPI.getNeighborEdges>,
  ) => {
    return await ctx.runQuery(this.graphAPI.getNeighborEdges, args);
  };

  expandNeighbors = async (
    ctx: RunQueryCtx,
    args: FunctionArgs<typeof this.graphAPI.expandNeighbors>,
  ) => {
    return await ctx.runQuery(this.graphAPI.expandNeighbors, args);
  };

  createCommunityJob = async (
    ctx: RunMutationCtx,
    args: FunctionArgs<typeof this.graphAPI.createCommunityJob>,
  ) => {
    return await ctx.runMutation(this.graphAPI.createCommunityJob, args);
  };

  scheduleCommunityRebuild = async (
    ctx: RunMutationCtx,
    args: FunctionArgs<typeof this.graphAPI.scheduleCommunityRebuild>,
  ) => {
    return await ctx.runMutation(this.graphAPI.scheduleCommunityRebuild, args);
  };

  getLatestCommunities = async (
    ctx: RunQueryCtx,
    args: FunctionArgs<typeof this.graphAPI.getLatestCommunities>,
  ) => {
    return await ctx.runQuery(this.graphAPI.getLatestCommunities, args);
  };

  getCommunityForMemory = async (
    ctx: RunQueryCtx,
    args: FunctionArgs<typeof this.graphAPI.getCommunityForMemory>,
  ) => {
    return await ctx.runQuery(this.graphAPI.getCommunityForMemory, args);
  };
}
