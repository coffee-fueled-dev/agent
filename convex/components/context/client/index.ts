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
};

export class ContextClient {
  constructor(
    public component: ComponentApi,
    public config: ContextClientConfig = {},
  ) {}

  addContext = async (
    ctx: RunActionCtx,
    args: FunctionArgs<typeof this.component.public.context.add>,
  ) => {
    return await ctx.runAction(this.component.public.context.add, args);
  };

  getContextDetail = async (
    ctx: RunQueryCtx,
    args: FunctionArgs<typeof this.component.public.context.get>,
  ) => {
    return await ctx.runQuery(this.component.public.context.get, args);
  };

  deleteContext = async (
    ctx: RunActionCtx,
    args: FunctionArgs<typeof this.component.public.context.remove>,
  ) => {
    return await ctx.runAction(this.component.public.context.remove, args);
  };

  editContext = async (
    ctx: RunActionCtx,
    args: FunctionArgs<typeof this.component.public.context.edit>,
  ) => {
    return await ctx.runAction(this.component.public.context.edit, args);
  };

  searchContext = async (
    ctx: RunActionCtx,
    args: FunctionArgs<typeof this.component.public.context.search>,
  ) => {
    return await ctx.runAction(this.component.public.context.search, args);
  };

  list = async (
    ctx: RunQueryCtx,
    args: FunctionArgs<typeof this.component.public.list.listEntries>,
  ) => {
    return await ctx.runQuery(this.component.public.list.listEntries, args);
  };

  getLatestProjection = async (
    ctx: RunQueryCtx,
    args: FunctionArgs<typeof this.component.public.projection.getLatestProjection>,
  ) => {
    return await ctx.runQuery(
      this.component.public.projection.getLatestProjection,
      args,
    );
  };

  getProjectionStatus = async (
    ctx: RunQueryCtx,
    args: FunctionArgs<typeof this.component.public.projection.getProjectionStatus>,
  ) => {
    return await ctx.runQuery(
      this.component.public.projection.getProjectionStatus,
      args,
    );
  };
}
