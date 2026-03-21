import type {
  GenericActionCtx,
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";
import type { ComponentApi } from "../_generated/component";
import type {
  AddStoredBinaryFileArgs,
  AddStoredTextFileArgs,
  AddTextArgs,
} from "../public/add";
import type { AgentMemorySearchResult, SearchArgs } from "../public/search";
import type {
  ThreadIdentityAsOfSearchArgs,
  ThreadIdentityCurrentView,
  ThreadIdentityEpisodeArgs,
  ThreadIdentityEvolutionView,
  ThreadIdentitySearchArgs,
} from "../public/temporal";
import type { AgentMemoryGoogleConfig } from "../internal/shared";

type RunActionCtx = Pick<GenericActionCtx<GenericDataModel>, "runAction">;
type RunMutationCtx = Pick<GenericMutationCtx<GenericDataModel>, "runMutation">;
type RunQueryCtx = Pick<GenericQueryCtx<GenericDataModel>, "runQuery">;

export type AgentMemoryClientConfig = AgentMemoryGoogleConfig;

export class AgentMemoryClient {
  constructor(
    public component: ComponentApi,
    public config: AgentMemoryClientConfig = {},
  ) {}

  private withConfig<T extends AgentMemoryGoogleConfig>(args: T): T {
    return {
      ...this.config,
      ...args,
    };
  }

  generateUploadUrl = async (ctx: RunMutationCtx) => {
    return await ctx.runMutation(
      this.component.public.add.generateUploadUrl,
      {},
    );
  };

  addText = async (ctx: RunActionCtx, args: AddTextArgs) => {
    return await ctx.runAction(
      this.component.public.add.addText,
      this.withConfig(args),
    );
  };

  addStoredTextFile = async (
    ctx: RunActionCtx,
    args: AddStoredTextFileArgs,
  ) => {
    return await ctx.runAction(
      this.component.public.add.addStoredTextFile,
      this.withConfig(args),
    );
  };

  addStoredBinaryFile = async (
    ctx: RunActionCtx,
    args: AddStoredBinaryFileArgs,
  ) => {
    return await ctx.runAction(
      this.component.public.add.addStoredBinaryFile,
      this.withConfig(args),
    );
  };

  search = async (
    ctx: RunActionCtx,
    args: SearchArgs,
  ): Promise<AgentMemorySearchResult[]> => {
    return await ctx.runAction(
      this.component.public.search.search,
      this.withConfig(args),
    );
  };

  recordThreadIdentityEpisode = async (
    ctx: RunActionCtx,
    args: ThreadIdentityEpisodeArgs,
  ): Promise<{
    entryId: string;
    identityChanged: boolean;
    totalTurns: number;
  }> => {
    return await ctx.runAction(
      this.component.public.temporal.recordThreadIdentityEpisode,
      this.withConfig(args),
    );
  };

  searchThreadIdentityCurrent = async (
    ctx: RunActionCtx,
    args: ThreadIdentitySearchArgs,
  ): Promise<AgentMemorySearchResult[]> => {
    return await ctx.runAction(
      this.component.public.temporal.searchThreadIdentityCurrent,
      this.withConfig(args),
    );
  };

  searchThreadIdentityAsOf = async (
    ctx: RunActionCtx,
    args: ThreadIdentityAsOfSearchArgs,
  ): Promise<AgentMemorySearchResult[]> => {
    return await ctx.runAction(
      this.component.public.temporal.searchThreadIdentityAsOf,
      this.withConfig(args),
    );
  };

  getThreadIdentityCurrent = async (
    ctx: RunQueryCtx,
    args: { threadId: string },
  ): Promise<ThreadIdentityCurrentView> => {
    return await ctx.runQuery(
      this.component.public.temporal.getThreadIdentityCurrent,
      args,
    );
  };

  listThreadIdentityEvolution = async (
    ctx: RunQueryCtx,
    args: { threadId: string; limit?: number },
  ): Promise<ThreadIdentityEvolutionView> => {
    return await ctx.runQuery(
      this.component.public.temporal.listThreadIdentityEvolution,
      args,
    );
  };
}
