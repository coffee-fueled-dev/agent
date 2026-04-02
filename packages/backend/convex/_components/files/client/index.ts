import type {
  FunctionArgs,
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";
import type { ComponentApi } from "../_generated/component.js";

type RunMutationCtx = Pick<
  GenericMutationCtx<GenericDataModel>,
  "runMutation" | "runQuery"
>;
type RunQueryCtx = Pick<GenericQueryCtx<GenericDataModel>, "runQuery">;

export class FilesClient {
  constructor(public component: ComponentApi) {}

  private get coreAPI() {
    return this.component.public.core;
  }

  createFileProcess = async (
    ctx: RunMutationCtx,
    args: FunctionArgs<typeof this.coreAPI.createFileProcess>,
  ) => {
    return await ctx.runMutation(this.coreAPI.createFileProcess, args);
  };

  markFileProcessDispatched = async (
    ctx: RunMutationCtx,
    args: FunctionArgs<typeof this.coreAPI.markFileProcessDispatched>,
  ) => {
    return await ctx.runMutation(this.coreAPI.markFileProcessDispatched, args);
  };

  markFileProcessCompleted = async (
    ctx: RunMutationCtx,
    args: FunctionArgs<typeof this.coreAPI.markFileProcessCompleted>,
  ) => {
    return await ctx.runMutation(this.coreAPI.markFileProcessCompleted, args);
  };

  markFileProcessFailed = async (
    ctx: RunMutationCtx,
    args: FunctionArgs<typeof this.coreAPI.markFileProcessFailed>,
  ) => {
    return await ctx.runMutation(this.coreAPI.markFileProcessFailed, args);
  };

  getFileProcess = async (
    ctx: RunQueryCtx,
    args: FunctionArgs<typeof this.coreAPI.getFileProcess>,
  ) => {
    return await ctx.runQuery(this.coreAPI.getFileProcess, args);
  };

  listFileProcessesPage = async (
    ctx: RunQueryCtx,
    args: FunctionArgs<typeof this.coreAPI.listFileProcessesPage>,
  ) => {
    return await ctx.runQuery(this.coreAPI.listFileProcessesPage, args);
  };

  getLatestFileForMemory = async (
    ctx: RunQueryCtx,
    args: FunctionArgs<typeof this.coreAPI.getLatestFileForMemory>,
  ) => {
    return await ctx.runQuery(this.coreAPI.getLatestFileForMemory, args);
  };

  getCachedFileResult = async (
    ctx: RunQueryCtx,
    args: FunctionArgs<typeof this.coreAPI.getCachedFileResult>,
  ) => {
    return await ctx.runQuery(this.coreAPI.getCachedFileResult, args);
  };

  upsertCachedFileResult = async (
    ctx: RunMutationCtx,
    args: FunctionArgs<typeof this.coreAPI.upsertCachedFileResult>,
  ) => {
    return await ctx.runMutation(this.coreAPI.upsertCachedFileResult, args);
  };
}
