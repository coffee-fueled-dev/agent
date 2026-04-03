import type {
  FunctionArgs,
  GenericActionCtx,
  GenericDataModel,
  GenericMutationCtx,
} from "convex/server";
import type { ComponentApi } from "../_generated/component.js";

type RunMutationCtx = Pick<
  GenericMutationCtx<GenericDataModel>,
  "runMutation" | "runQuery"
>;

type RunActionCtx = Pick<
  GenericActionCtx<GenericDataModel>,
  "runAction" | "runMutation" | "runQuery"
>;

type Name = string | undefined;

type MergeMemory<NAME extends Name = Name> =
  ComponentApi<NAME>["public"]["store"]["mergeMemory"];

type SearchMemory<NAME extends Name = Name> =
  ComponentApi<NAME>["public"]["search"]["searchMemory"];

export type MemoryClientConfig = {
  googleApiKey?: string;
  similarityK?: number;
  similarityThreshold?: number;
};

export class MemoryClient<NAME extends Name = Name> {
  constructor(
    public component: ComponentApi<NAME>,
    public config: MemoryClientConfig = {},
  ) {}

  mergeMemory = (ctx: RunMutationCtx, args: FunctionArgs<MergeMemory<NAME>>) =>
    ctx.runMutation(this.component.public.store.mergeMemory, args);

  searchMemory = (ctx: RunActionCtx, args: FunctionArgs<SearchMemory<NAME>>) =>
    ctx.runAction(this.component.public.search.searchMemory, args);
}
