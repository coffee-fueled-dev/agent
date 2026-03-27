import type {
  FunctionArgs,
  GenericActionCtx,
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";
import type { ComponentApi } from "../_generated/component";

type RunMutationCtx = Pick<
  GenericMutationCtx<GenericDataModel>,
  "runMutation" | "runQuery"
>;
type RunActionCtx = Pick<GenericActionCtx<GenericDataModel>, "runAction"> &
  RunMutationCtx;
type RunQueryCtx = Pick<GenericQueryCtx<GenericDataModel>, "runQuery">;

export type ContextClientConfig = {
  googleApiKey?: string;
  similarityK?: number;
  similarityThreshold?: number;
};

export class ContextClient {
  constructor(
    public component: ComponentApi,
    public config: ContextClientConfig = {},
  ) {}

  private get apiKey() {
    return this.config.googleApiKey;
  }

  addContext = async (
    ctx: RunActionCtx,
    args: Omit<
      FunctionArgs<typeof this.component.public.entries.add>,
      "apiKey" | "similarityK" | "similarityThreshold"
    >,
  ) => {
    return await ctx.runAction(this.component.public.entries.add, {
      ...args,
      apiKey: this.apiKey,
      similarityK: this.config.similarityK,
      similarityThreshold: this.config.similarityThreshold,
    });
  };

  getContextDetail = async (
    ctx: RunQueryCtx,
    args: FunctionArgs<typeof this.component.public.entries.get>,
  ) => {
    return await ctx.runQuery(this.component.public.entries.get, args);
  };

  deleteContext = async (
    ctx: RunActionCtx,
    args: Omit<
      FunctionArgs<typeof this.component.public.entries.remove>,
      "apiKey"
    >,
  ) => {
    return await ctx.runAction(this.component.public.entries.remove, {
      ...args,
      apiKey: this.apiKey,
    });
  };

  editContext = async (
    ctx: RunActionCtx,
    args: Omit<
      FunctionArgs<typeof this.component.public.entries.edit>,
      "apiKey" | "similarityK" | "similarityThreshold"
    >,
  ) => {
    return await ctx.runAction(this.component.public.entries.edit, {
      ...args,
      apiKey: this.apiKey,
      similarityK: this.config.similarityK,
      similarityThreshold: this.config.similarityThreshold,
    });
  };

  searchContext = async (
    ctx: RunActionCtx,
    args: Omit<
      FunctionArgs<typeof this.component.public.retrieval.search>,
      "apiKey"
    >,
  ) => {
    return await ctx.runAction(this.component.public.retrieval.search, {
      ...args,
      apiKey: this.apiKey,
    });
  };

  list = async (
    ctx: RunQueryCtx,
    args: FunctionArgs<typeof this.component.public.list.listEntries>,
  ) => {
    return await ctx.runQuery(this.component.public.list.listEntries, args);
  };

  getLatestProjection = async (
    ctx: RunQueryCtx,
    args: FunctionArgs<
      typeof this.component.public.projection.getLatestProjection
    >,
  ) => {
    return await ctx.runQuery(
      this.component.public.projection.getLatestProjection,
      args,
    );
  };

  getProjectionStatus = async (
    ctx: RunQueryCtx,
    args: FunctionArgs<
      typeof this.component.public.projection.getProjectionStatus
    >,
  ) => {
    return await ctx.runQuery(
      this.component.public.projection.getProjectionStatus,
      args,
    );
  };

  getLatestCommunities = async (
    ctx: RunQueryCtx,
    args: FunctionArgs<
      typeof this.component.public.community.getLatestCommunities
    >,
  ) => {
    return await ctx.runQuery(
      this.component.public.community.getLatestCommunities,
      args,
    );
  };

  getCommunityForEntry = async (
    ctx: RunQueryCtx,
    args: FunctionArgs<
      typeof this.component.public.community.getCommunityForEntry
    >,
  ) => {
    return await ctx.runQuery(
      this.component.public.community.getCommunityForEntry,
      args,
    );
  };

  recordView = async (
    ctx: RunMutationCtx,
    args: FunctionArgs<typeof this.component.public.entries.recordView>,
  ) => {
    return await ctx.runMutation(
      this.component.public.entries.recordView,
      args,
    );
  };

  listEntryAccessEvents = async (
    ctx: RunQueryCtx,
    args: FunctionArgs<
      typeof this.component.public.entries.listEntryAccessEvents
    >,
  ) => {
    return await ctx.runQuery(
      this.component.public.entries.listEntryAccessEvents,
      args,
    );
  };

  getEntryAccessWeekByDay = async (
    ctx: RunQueryCtx,
    args: FunctionArgs<
      typeof this.component.public.entries.getEntryAccessWeekByDay
    >,
  ) => {
    return await ctx.runQuery(
      this.component.public.entries.getEntryAccessWeekByDay,
      args,
    );
  };
}
