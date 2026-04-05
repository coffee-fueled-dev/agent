import type {
  FunctionArgs,
  FunctionReference,
  GenericActionCtx,
  GenericDataModel,
  GenericMutationCtx,
} from "convex/server";
import { getGoogleApiKey } from "../../../env/models.js";
import type { ComponentApi } from "../_generated/component.js";
import {
  type MemorySubscribable,
  type MemorySubscriber,
  notifyMemorySubscribers,
} from "./events.js";

export type * from "./events.js";

type RunMutationCtx = Pick<
  GenericMutationCtx<GenericDataModel>,
  "runMutation" | "runQuery"
>;

type RunActionCtx = Pick<
  GenericActionCtx<GenericDataModel>,
  "runAction" | "runMutation" | "runQuery"
>;

type RunQueryCtx = Pick<
  GenericMutationCtx<GenericDataModel> | GenericActionCtx<GenericDataModel>,
  "runQuery"
>;

type Name = string | undefined;

type MergeMemory<NAME extends Name = Name> =
  ComponentApi<NAME>["public"]["store"]["mergeMemory"];

type SearchMemory<NAME extends Name = Name> =
  ComponentApi<NAME>["public"]["search"]["searchMemory"];

type RegisterStorageSourceMetadata<NAME extends Name = Name> =
  ComponentApi<NAME>["public"]["sourceMaps"]["registerStorageSourceMetadata"];

type ListSourceMapsForMemory<NAME extends Name = Name> =
  ComponentApi<NAME>["public"]["sourceMaps"]["listSourceMapsForMemory"];

type GetMemoryRecord<NAME extends Name = Name> =
  ComponentApi<NAME>["public"]["records"]["getMemoryRecord"];

type ExtractQueryReturn<F> =
  F extends FunctionReference<"query", infer _V, infer _A, infer R, infer _N>
    ? R
    : never;

/** One row from list source map queries (component). */
export type SourceMapRowForMemory<NAME extends Name = Name> =
  ExtractQueryReturn<ListSourceMapsForMemory<NAME>> extends (infer E)[]
    ? E
    : never;

export type MemoryRecordRow<NAME extends Name = Name> = ExtractQueryReturn<
  GetMemoryRecord<NAME>
>;

/** Context needed to resolve source maps (e.g. storage URLs). */
export type MemorySourceMapsResolveCtx = Pick<
  GenericMutationCtx<GenericDataModel> | GenericActionCtx<GenericDataModel>,
  "runQuery" | "storage"
>;

type ListArgs<NAME extends Name = Name> = FunctionArgs<
  ListSourceMapsForMemory<NAME>
>;

export type SourceMapSourceConfig<
  NAME extends Name = Name,
  TSourceItem = unknown,
> = {
  /** Matches `contentSource.type` for indexed reads, or a logical key when `remainder` is set. */
  name: string;
  /**
   * When true, resolver receives rows from the full list for this memory **excluding** any row
   * whose `contentSource.type` matches another registration with `remainder: false`.
   */
  remainder?: boolean;
  resolve?: (
    ctx: MemorySourceMapsResolveCtx,
    args: ListArgs<NAME>,
    context: {
      memoryRecord: MemoryRecordRow<NAME>;
      sourceMaps: SourceMapRowForMemory<NAME>[];
    },
  ) => TSourceItem[] | Promise<TSourceItem[]>;
};

export type MemoryClientConfig<
  NAME extends Name = Name,
  TSourceItem = unknown,
> = {
  googleApiKey?: string;
  similarityK?: number;
  similarityThreshold?: number;
  sourceMaps?: SourceMapSourceConfig<NAME, TSourceItem>[];
};

/**
 * Maps each `sourceMaps[].name` to the **element** type returned by that resolver’s array
 * (e.g. `storage` → `ResolvedStorageMemorySource`).
 */
export type MemoryClientSourceMapElementTypes = Record<string, unknown>;

export class MemoryClient<
  NAME extends Name = Name,
  TSourceItem = unknown,
  TSourceMap extends MemoryClientSourceMapElementTypes = Record<
    string,
    TSourceItem
  >,
> implements MemorySubscribable<NAME>
{
  private _subscribers = new Map<string, MemorySubscriber<NAME>>();

  readonly resolvers: Record<
    string,
    (
      ctx: MemorySourceMapsResolveCtx,
      args: ListArgs<NAME>,
    ) => Promise<TSourceItem[] | SourceMapRowForMemory<NAME>[]>
  >;

  constructor(
    public component: ComponentApi<NAME>,
    public config: MemoryClientConfig<NAME, TSourceItem> = {},
  ) {
    const defs = config.sourceMaps ?? [];
    const names = defs.map((d) => d.name);
    if (new Set(names).size !== names.length) {
      throw new Error("memoryClient: duplicate sourceMaps name");
    }
    if (defs.filter((d) => d.remainder).length > 1) {
      throw new Error("memoryClient: at most one remainder sourceMaps entry");
    }

    const indexedNames = new Set(
      defs.filter((d) => !d.remainder).map((d) => d.name),
    );

    this.resolvers = {};
    for (const def of defs) {
      const key = def.name;
      this.resolvers[key] = async (ctx, args) => {
        const memoryRecord = await this.getMemoryRecord(ctx, args);
        let sourceMaps: SourceMapRowForMemory<NAME>[];
        if (def.remainder) {
          const full = await this.listSourceMapsForMemory(ctx, args);
          sourceMaps = full.filter(
            (r) => !indexedNames.has(r.contentSource.type),
          );
        } else {
          sourceMaps = await this.listSourceMapsForMemory(ctx, {
            ...args,
            type: def.name,
          });
        }
        if (def.resolve) {
          return (await def.resolve(ctx, args, {
            memoryRecord,
            sourceMaps,
          })) as TSourceItem[];
        }
        return sourceMaps as unknown as TSourceItem[];
      };
    }
  }

  subscribe(id: string, callback: MemorySubscriber<NAME>): void {
    this._subscribers.set(id, callback);
  }

  mergeMemory = async (
    ctx: RunMutationCtx,
    args: FunctionArgs<MergeMemory<NAME>>,
  ) => {
    const result = await ctx.runMutation(
      this.component.public.store.mergeMemory,
      {
        ...args,
        googleApiKey:
          args.googleApiKey ?? this.config.googleApiKey ?? getGoogleApiKey(),
      },
    );
    await notifyMemorySubscribers(this._subscribers, ctx, {
      event: "mergeMemory",
      args,
      result,
    });
    return result;
  };

  searchMemory = async (
    ctx: RunActionCtx,
    args: FunctionArgs<SearchMemory<NAME>>,
  ) => {
    const result = await ctx.runAction(
      this.component.public.search.searchMemory,
      {
        ...args,
        googleApiKey:
          args.googleApiKey ?? this.config.googleApiKey ?? getGoogleApiKey(),
      },
    );
    await notifyMemorySubscribers(this._subscribers, ctx, {
      event: "searchMemory",
      args,
      result,
    });
    return result;
  };

  registerStorageSourceMetadata = async (
    ctx: RunMutationCtx,
    args: FunctionArgs<RegisterStorageSourceMetadata<NAME>>,
  ) => {
    await ctx.runMutation(
      this.component.public.sourceMaps.registerStorageSourceMetadata,
      args,
    );
    await notifyMemorySubscribers(this._subscribers, ctx, {
      event: "registerStorageSourceMetadata",
      args,
      result: null,
    });
    return null;
  };

  listSourceMapsForMemory = (
    ctx: RunQueryCtx,
    args: FunctionArgs<ListSourceMapsForMemory<NAME>>,
  ) =>
    ctx.runQuery(
      this.component.public.sourceMaps.listSourceMapsForMemory,
      args,
    );

  getMemoryRecord = (
    ctx: RunQueryCtx,
    args: FunctionArgs<GetMemoryRecord<NAME>>,
  ) => ctx.runQuery(this.component.public.records.getMemoryRecord, args);

  /**
   * Run the resolver registered for `name` only; return type narrows by `TSourceMap[K]`
   * (element type per configured source name).
   */
  resolveSourceMapsByName = async <K extends keyof TSourceMap & string>(
    name: K,
    ctx: MemorySourceMapsResolveCtx,
    args: ListArgs<NAME>,
  ): Promise<Array<TSourceMap[K]>> => {
    const resolver = this.resolvers[name];
    if (!resolver) {
      throw new Error(`memoryClient: unknown source map name ${String(name)}`);
    }
    return (await resolver(ctx, args)) as Array<TSourceMap[K]>;
  };

  /**
   * One `getMemoryRecord`, indexed queries per non-remainder registration, optional one full list
   * for remainder; runs resolvers and concatenates outputs in registration order.
   */
  resolveMemoryRecordSources = async (
    ctx: MemorySourceMapsResolveCtx,
    args: ListArgs<NAME>,
  ): Promise<{
    memoryRecord: MemoryRecordRow<NAME>;
    sources: TSourceItem[];
  }> => {
    const defs = this.config.sourceMaps ?? [];
    const memoryRecord = await this.getMemoryRecord(ctx, args);
    if (defs.length === 0) {
      return { memoryRecord, sources: [] };
    }

    const indexedNames = new Set(
      defs.filter((d) => !d.remainder).map((d) => d.name),
    );
    const needFull = defs.some((d) => d.remainder);
    const fullList = needFull
      ? await this.listSourceMapsForMemory(ctx, args)
      : undefined;

    const slices = await Promise.all(
      defs.map(async (def) => {
        let sourceMaps: SourceMapRowForMemory<NAME>[];
        if (def.remainder) {
          if (fullList === undefined) {
            throw new Error("memoryClient: remainder without fullList");
          }
          sourceMaps = fullList.filter(
            (r) => !indexedNames.has(r.contentSource.type),
          );
        } else {
          sourceMaps = await this.listSourceMapsForMemory(ctx, {
            ...args,
            type: def.name,
          });
        }
        if (def.resolve) {
          return (await def.resolve(ctx, args, {
            memoryRecord,
            sourceMaps,
          })) as TSourceItem[];
        }
        return sourceMaps as unknown as TSourceItem[];
      }),
    );

    return {
      memoryRecord,
      sources: slices.flat(),
    };
  };
}
