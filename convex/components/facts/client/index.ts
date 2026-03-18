import type {
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";
import type { ComponentApi } from "../_generated/component";
import type { OrderedSelectionDerived } from "../internal/derive";

export type { OrderedSelectionDerived };

// ---------------------------------------------------------------------------
// Context types (split read / write)
// ---------------------------------------------------------------------------

type FactsQueryCtx = Pick<GenericQueryCtx<GenericDataModel>, "runQuery">;
type FactsMutationCtx = Pick<
  GenericMutationCtx<GenericDataModel>,
  "runMutation" | "runQuery"
>;

// ---------------------------------------------------------------------------
// Config types
// ---------------------------------------------------------------------------

export type EntityTemplate = {
  entityType: string;
  states: readonly string[];
  attrs: Record<string, "string" | "number" | "boolean">;
};

export type FactsConfig<
  Entities extends readonly EntityTemplate[],
  EdgeKinds extends readonly string[],
  Partitions extends readonly string[],
> = {
  entities: Entities;
  edgeKinds: EdgeKinds;
  partitions: Partitions;
};

// ---------------------------------------------------------------------------
// Derived utility types
// ---------------------------------------------------------------------------

type EntityType<E extends readonly EntityTemplate[]> = E[number]["entityType"];

type StatesFor<
  E extends readonly EntityTemplate[],
  T extends EntityType<E>,
> = Extract<E[number], { entityType: T }>["states"][number];

type AttrValueMap = { string: string; number: number; boolean: boolean };

type AttrsFor<E extends readonly EntityTemplate[], T extends EntityType<E>> = {
  [K in keyof Extract<
    E[number],
    { entityType: T }
  >["attrs"]]: AttrValueMap[Extract<E[number], { entityType: T }>["attrs"][K]];
};

type EdgeKind<K extends readonly string[]> = K[number];

type PartitionName<P extends readonly string[]> = P[number];

// ---------------------------------------------------------------------------
// Typed fact item (return type from eval queries)
// ---------------------------------------------------------------------------

export type TypedFactItem<
  E extends readonly EntityTemplate[],
  T extends EntityType<E> = EntityType<E>,
> = {
  entity: string;
  entityType: T;
  scope?: string;
  state?: StatesFor<E, T>;
  order: number[];
  labels: string[];
  attrs?: AttrsFor<E, T>;
};

// ---------------------------------------------------------------------------
// Batch builder
// ---------------------------------------------------------------------------

export class FactsBatch<
  const E extends readonly EntityTemplate[],
  const K extends readonly string[],
  const P extends readonly string[],
> {
  private _items: {
    entity: string;
    entityType: string;
    scope?: string;
    state?: string;
    order: number[];
    labels: string[];
    attrs?: unknown;
  }[] = [];
  private _edges: {
    kind: string;
    from: string;
    to: string;
    scope?: string;
  }[] = [];
  private _partitions: {
    partition: string;
    scope?: string;
    head?: string;
    tail?: string;
    count: number;
    membersVersion?: number;
  }[] = [];

  constructor(
    private client: FactsClient<E, K, P>,
    private namespace: string,
  ) {}

  item<T extends EntityType<E>>(
    entityType: T,
    entity: string,
    opts: {
      scope?: string;
      state?: StatesFor<E, T>;
      order: number[];
      labels?: string[];
      attrs?: AttrsFor<E, T>;
    },
  ): this {
    this._items.push({
      entity,
      entityType,
      scope: opts.scope,
      state: opts.state,
      order: opts.order,
      labels: opts.labels ?? [],
      attrs: opts.attrs,
    });
    return this;
  }

  edge(
    kind: EdgeKind<K>,
    from: string,
    to: string,
    opts?: { scope?: string },
  ): this {
    this._edges.push({ kind, from, to, scope: opts?.scope });
    return this;
  }

  partition(
    partition: PartitionName<P>,
    opts: {
      scope?: string;
      head?: string;
      tail?: string;
      count: number;
      membersVersion?: number;
    },
  ): this {
    this._partitions.push({ partition, ...opts });
    return this;
  }

  async commit(
    ctx: FactsMutationCtx,
    opts?: {
      version?: number;
      projector?: string;
      mode?: "direct" | "event";
    },
  ): Promise<void> {
    await ctx.runMutation(this.client.component.public.sync.upsertFacts, {
      namespace: this.namespace,
      items: this._items,
      edges: this._edges,
      partitions: this._partitions.length > 0 ? this._partitions : undefined,
      ...opts,
    });
  }
}

// ---------------------------------------------------------------------------
// FactsClient
// ---------------------------------------------------------------------------

export class FactsClient<
  const E extends readonly EntityTemplate[],
  const K extends readonly string[],
  const P extends readonly string[],
> {
  constructor(
    public component: ComponentApi,
    public config: FactsConfig<E, K, P>,
  ) {}

  sync = {
    upsert: async (
      ctx: FactsMutationCtx,
      args: {
        namespace: string;
        items: {
          entity: string;
          entityType: EntityType<E>;
          scope?: string;
          state?: string;
          order: number[];
          labels: string[];
          attrs?: unknown;
        }[];
        edges: {
          kind: EdgeKind<K>;
          from: string;
          to: string;
          scope?: string;
          attrs?: unknown;
        }[];
        partitions?: {
          partition: PartitionName<P>;
          scope?: string;
          head?: string;
          tail?: string;
          count: number;
          membersVersion?: number;
          attrs?: unknown;
        }[];
        version?: number;
        projector?: string;
        mode?: "direct" | "event";
      },
    ) => {
      return await ctx.runMutation(
        this.component.public.sync.upsertFacts,
        args,
      );
    },

    remove: async (
      ctx: FactsMutationCtx,
      args: { namespace: string; entities: string[] },
    ) => {
      return await ctx.runMutation(
        this.component.public.sync.removeFacts,
        args,
      );
    },
  };

  eval = {
    orderedFacts: async <T extends EntityType<E>>(
      ctx: FactsQueryCtx,
      args: { namespace: string; scope?: string; entityType?: T },
    ): Promise<TypedFactItem<E, T>[]> => {
      const raw = await ctx.runQuery(
        this.component.public.evaluate.getOrderedFacts,
        args,
      );
      return raw as TypedFactItem<E, T>[];
    },

    deriveSelection: async (
      ctx: FactsQueryCtx,
      args: {
        namespace: string;
        scope?: string;
        entityType: EntityType<E>;
        selected: string;
        partitions: PartitionName<P>[];
      },
    ): Promise<OrderedSelectionDerived> => {
      return await ctx.runQuery(
        this.component.public.evaluate.deriveSelection,
        args,
      );
    },

    partitionTail: async (
      ctx: FactsQueryCtx,
      args: {
        namespace: string;
        scope?: string;
        partition: PartitionName<P>;
      },
    ) => {
      return await ctx.runQuery(
        this.component.public.evaluate.getPartitionTail,
        args,
      );
    },

    reachable: async (
      ctx: FactsQueryCtx,
      args: {
        namespace: string;
        from: string;
        edgeKinds: EdgeKind<K>[];
      },
    ): Promise<string[]> => {
      return await ctx.runQuery(
        this.component.public.evaluate.getReachableFacts,
        args,
      );
    },
  };

  batch(namespace: string): FactsBatch<E, K, P> {
    return new FactsBatch(this, namespace);
  }
}
