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

  private get apiKey() {
    return this.config.googleApiKey;
  }

  addContext = async (
    ctx: RunActionCtx,
    args: Omit<FunctionArgs<typeof this.component.public.context.add>, "apiKey">,
  ) => {
    return await ctx.runAction(this.component.public.context.add, {
      ...args,
      apiKey: this.apiKey,
    });
  };

  getContextDetail = async (
    ctx: RunQueryCtx,
    args: FunctionArgs<typeof this.component.public.context.get>,
  ) => {
    return await ctx.runQuery(this.component.public.context.get, args);
  };

  deleteContext = async (
    ctx: RunActionCtx,
    args: Omit<FunctionArgs<typeof this.component.public.context.remove>, "apiKey">,
  ) => {
    return await ctx.runAction(this.component.public.context.remove, {
      ...args,
      apiKey: this.apiKey,
    });
  };

  editContext = async (
    ctx: RunActionCtx,
    args: Omit<FunctionArgs<typeof this.component.public.context.edit>, "apiKey">,
  ) => {
    return await ctx.runAction(this.component.public.context.edit, {
      ...args,
      apiKey: this.apiKey,
    });
  };

  searchContext = async (
    ctx: RunActionCtx,
    args: Omit<FunctionArgs<typeof this.component.public.context.search>, "apiKey">,
  ) => {
    return await ctx.runAction(this.component.public.context.search, {
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
