import type {
  GenericActionCtx,
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";
import type { ComponentApi } from "../_generated/component";
import type {
  RuntimeCurrentView,
  RuntimeEvolutionView,
  RuntimeRegistrationArgs,
  RuntimeStreamState,
} from "../internal/runtime";
import type { AgentMemoryGoogleConfig } from "../internal/shared";
import type {
  AddStoredBinaryFileArgs,
  AddStoredTextFileArgs,
  AddTextArgs,
} from "../public/add";
import type { AgentMemorySearchResult, SearchArgs } from "../public/search";

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
    _ctx: RunActionCtx,
    args: AddStoredBinaryFileArgs,
  ) => {
    void args;
    throw new Error(
      "Binary file ingestion must be called through an app-level Node action.",
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

  registerRuntime = async (
    ctx: RunMutationCtx,
    args: RuntimeRegistrationArgs,
  ) => {
    return await ctx.runMutation(
      this.component.public.runtime.index.registerRuntime,
      args,
    );
  };

  getRuntimeStreamState = async (
    ctx: RunQueryCtx,
    args: { runtime: string; streamId: string },
  ): Promise<RuntimeStreamState> => {
    return await ctx.runQuery(
      this.component.public.runtime.index.getRuntimeStreamState,
      args,
    );
  };

  markRuntimeCommitQueued = async (
    ctx: RunMutationCtx,
    args: {
      runtime: string;
      streamId: string;
      commitKey: string;
      workId: string;
    },
  ) => {
    return await ctx.runMutation(
      this.component.public.runtime.index.markRuntimeCommitQueued,
      args,
    );
  };

  finalizeRuntimeCommit = async (
    ctx: RunMutationCtx,
    args: { workId: string; state: "failed" | "canceled"; error?: string },
  ) => {
    return await ctx.runMutation(
      this.component.public.runtime.index.finalizeRuntimeCommit,
      args,
    );
  };

  getRuntimeCurrent = async (
    ctx: RunQueryCtx,
    args: { runtime: string; streamId: string },
  ): Promise<RuntimeCurrentView> => {
    return await ctx.runQuery(
      this.component.public.runtime.index.getRuntimeCurrent,
      args,
    );
  };

  listRuntimeEvolution = async (
    ctx: RunQueryCtx,
    args: {
      runtime: string;
      streamId: string;
      paginationOpts: {
        cursor: string | null;
        numItems: number;
      };
    },
  ): Promise<RuntimeEvolutionView> => {
    return await ctx.runQuery(
      this.component.public.runtime.index.listRuntimeEvolution,
      args,
    );
  };
}
