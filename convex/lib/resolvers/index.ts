import type { NamedTableInfo, QueryInitializer } from "convex/server";
import { ConvexError } from "convex/values";
import type {
  DataModel,
  Doc,
  Id,
  TableNames,
} from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";

export type TryNormalizeIdFn<T extends TableNames> = (
  ctx: QueryCtx,
  value: string,
) => Id<T> | null;
export function tryNormalizeIdFactory<T extends TableNames>(
  tableName: T,
): TryNormalizeIdFn<T> {
  return (ctx, value) => {
    return ctx.db.normalizeId(tableName, value);
  };
}

export type RequireNormalizedIdFn<T extends TableNames> = (
  ctx: QueryCtx,
  value: string,
) => Id<T>;
export function requireNormalizedIdFactory<T extends TableNames>(
  tableName: T,
): RequireNormalizedIdFn<T> {
  return (ctx, value) => {
    const maybeNormalized = ctx.db.normalizeId(tableName, value);
    if (maybeNormalized) return maybeNormalized;
    throw new ConvexError(`Invalid id for table, ${tableName}: ${value}`);
  };
}

export type TryGetFn<T extends TableNames> = (
  ctx: QueryCtx,
  id: Id<T>,
) => Promise<Doc<T> | null>;
export function tryGetFactory<T extends TableNames>(): TryGetFn<T> {
  return async (ctx, id) => {
    return await ctx.db.get(id);
  };
}

export type QueryFn<T extends TableNames> = (
  ctx: QueryCtx,
) => QueryInitializer<NamedTableInfo<DataModel, T>>;
export function queryFactory<T extends TableNames>(tableName: T): QueryFn<T> {
  return (ctx) => {
    return ctx.db.query(tableName);
  };
}

export type RequireFn<TInstance extends Resolver<TableNames>> = (
  ctx: QueryCtx,
  id: Id<TInstance extends Resolver<infer T> ? T : never>,
) => Promise<TInstance>;

type ResolvableClass<TInstance extends Resolver<TableNames>> = {
  new (doc: Doc<TInstance extends Resolver<infer T> ? T : never>): TInstance;
  tryGet: TryGetFn<TInstance extends Resolver<infer T> ? T : never>;
};

export function requireFactory<TInstance extends Resolver<TableNames>>(
  ResolverClass: ResolvableClass<TInstance>,
): RequireFn<TInstance> {
  return async (ctx, id) => {
    const doc = await ResolverClass.tryGet(ctx, id);
    if (doc) {
      return new ResolverClass(doc);
    }
    throw new ConvexError(
      `Missing document: ${(ResolverClass as { name: string }).name}:${id}`,
    );
  };
}

export abstract class Resolver<T extends TableNames> {
  readonly #tableName: T;
  readonly #id: Id<T>;
  #entity: Doc<T>;

  constructor(tableName: T, doc: Doc<T>) {
    this.#tableName = tableName;
    this.#id = doc._id;
    this.#entity = doc;
  }

  get id() {
    return this.#id;
  }

  get doc() {
    return this.#entity;
  }

  setDoc(doc: Doc<T>): void {
    this.#entity = doc;
  }

  get table() {
    return this.#tableName;
  }
}

export interface ImplementedResolver<
  T extends TableNames,
  TInstance extends Resolver<T> = Resolver<T>,
> {
  new (doc: Doc<T>): TInstance;
  tryNormalizeId: TryNormalizeIdFn<T>;
  requireNormalizedId: RequireNormalizedIdFn<T>;
  tryGet: TryGetFn<T>;
  query: QueryFn<T>;
  require: RequireFn<TInstance>;
}

export function createResolverBase<T extends TableNames>(tableName: T) {
  abstract class ResolverBase extends Resolver<T> {
    static tryNormalizeId = tryNormalizeIdFactory(tableName);
    static requireNormalizedId = requireNormalizedIdFactory(tableName);
    static tryGet = tryGetFactory<T>();
    static query = queryFactory(tableName);

    constructor(doc: Doc<T>) {
      super(tableName, doc);
    }
  }
  return ResolverBase;
}

// Registry for resolver classes to break circular import dependencies
const resolverRegistry = new Map<string, ImplementedResolver<any, any>>();

// Empty interface; resolvers/index.ts augments it with the full registry
// biome-ignore lint/suspicious/noEmptyInterface: required for module augmentation
export interface ResolverRegistry {}

// Overload: register with just the resolver class (uses class name)
export function registerResolver<T extends ImplementedResolver<any, any>>(
  resolver: T & { name: string },
): T;
// Overload: register with explicit name (for backwards compatibility)
export function registerResolver<K extends keyof ResolverRegistry>(
  name: K,
  resolver: ResolverRegistry[K],
): ResolverRegistry[K];
// Implementation
export function registerResolver<K extends keyof ResolverRegistry>(
  nameOrResolver: K | (ImplementedResolver<any, any> & { name: string }),
  resolver?: ResolverRegistry[K],
): ResolverRegistry[K] | ImplementedResolver<any, any> {
  if (resolver === undefined) {
    const resolverClass = nameOrResolver as ImplementedResolver<any, any> & {
      name: string;
    };
    const name = resolverClass.name as K;
    resolverRegistry.set(name, resolverClass);
    return resolverClass;
  } else {
    resolverRegistry.set(
      nameOrResolver as K,
      resolver as ImplementedResolver<any, any>,
    );
    return resolver;
  }
}

// Overload for registered resolvers (type-safe)
export function getResolver<K extends keyof ResolverRegistry>(
  name: K,
): ResolverRegistry[K];
// Overload for unregistered resolvers during migration (requires explicit type)
export function getResolver<T extends ImplementedResolver<any, any>>(
  name: string,
): T;
export function getResolver(name: string): ImplementedResolver<any, any> {
  const resolver = resolverRegistry.get(name);
  if (!resolver) {
    throw new ConvexError(`Resolver not registered: ${name}`);
  }
  return resolver;
}
