import type {
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";
import type { ObjectType, PropertyValidators } from "convex/values";
import type {
  EventEntryDoc,
  EventProjectorCheckpointDoc,
  EventStreamDoc,
} from "./models/types";

export type {
  EventDimensionDoc,
  EventEntryDoc,
  EventProjectorCheckpointDoc,
  EventStreamDoc,
  EventStreamMetricDoc,
} from "./models/types";

/** Read-only Convex ctx: `runQuery` into component (or other) functions. */
export type EventsRunQueryCtx = Pick<
  GenericQueryCtx<GenericDataModel>,
  "runQuery"
>;

/** Cross-component calls without direct `db` (e.g. `runMutation` into the events component). */
export type EventsRunMutationCtx = Pick<
  GenericMutationCtx<GenericDataModel>,
  "runQuery" | "runMutation"
>;

/**
 * Any Convex **mutation** context (has `db`). Use for `appendToStream` and
 * `EventSubscriber` — excludes actions (no `db`) while allowing host **or**
 * component callers. Bus mirroring still requires a host mutation at runtime
 * when the FIFO tables live on the app schema.
 */
export type EventsMutationCtx = GenericMutationCtx<GenericDataModel>;

export type EventMetadataValue = string | number | boolean | null;

export type EventMetadata = Record<string, EventMetadataValue>;

export type EventActor = {
  byType: string;
  byId: string;
};

export type EventStreamTemplate = {
  name: string;
  /** Event type names are the keys; values are per-field payload validators (same shape as `v.object({ ... })`). */
  events: Record<string, PropertyValidators>;
  /** When true, callers should pass a non-empty stream `namespace` for isolation. */
  namespaceScoped?: boolean;
};

export type MetricMatchFields<
  Streams extends
    readonly EventStreamTemplate[] = readonly EventStreamTemplate[],
> = {
  namespace?: string;
  name?: StreamNameFor<Streams>;
  eventType?: EventTypeFor<Streams, StreamNameFor<Streams>>;
};

export type MetricGroupByField =
  | "namespace"
  | "name"
  | "streamId"
  | "eventType";

export type MetricRule<
  Streams extends
    readonly EventStreamTemplate[] = readonly EventStreamTemplate[],
> = {
  name: string;
  match: MetricMatchFields<Streams>;
  groupBy: MetricGroupByField[];
};

export type EventSubscriber = (
  ctx: EventsMutationCtx,
  entry: EventEntry<readonly EventStreamTemplate[]>,
) => void | Promise<void>;

export interface EventSubscribable {
  subscribe(id: string, callback: EventSubscriber): void;
}

export type EventsConfig<
  Streams extends
    readonly EventStreamTemplate[] = readonly EventStreamTemplate[],
> = {
  streams: Streams;
  counters?: MetricRule<Streams>[];
};

type RegisteredStream<Streams extends readonly EventStreamTemplate[]> =
  Streams[number];

export type StreamNameFor<Streams extends readonly EventStreamTemplate[]> = [
  RegisteredStream<Streams>,
] extends [never]
  ? string
  : RegisteredStream<Streams>["name"];

export type StreamTypeFor<Streams extends readonly EventStreamTemplate[]> =
  StreamNameFor<Streams>;

export type EventTypeFor<
  Streams extends readonly EventStreamTemplate[],
  StreamName extends StreamNameFor<Streams>,
> = [Extract<RegisteredStream<Streams>, { name: StreamName }>] extends [
  never,
]
  ? string
  : Extract<RegisteredStream<Streams>, { name: StreamName }> extends {
        events: infer E;
      }
    ? E extends Record<string, PropertyValidators>
      ? [keyof E] extends [never]
        ? string
        : keyof E & string
      : string
    : string;

export type PayloadFor<
  Streams extends readonly EventStreamTemplate[],
  StreamName extends StreamNameFor<Streams>,
  EvType extends string,
> =
  Extract<Streams[number], { name: StreamName }> extends infer S
    ? S extends { events: infer E }
      ? E extends Record<string, PropertyValidators>
        ? EvType extends keyof E
          ? ObjectType<E[EvType & keyof E]>
          : unknown
        : unknown
      : unknown
    : unknown;

export type EventRef<StreamName extends string = string> = {
  name: StreamName;
  /** Omitted or empty string = default / unscoped stream. */
  namespace?: string;
  streamId: string;
  eventId: string;
};

export type EventStreamRef<StreamName extends string = string> = {
  name: StreamName;
  namespace?: string;
  streamId: string;
};

export type EventStreamState<
  Streams extends
    readonly EventStreamTemplate[] = readonly EventStreamTemplate[],
  StreamName extends StreamNameFor<Streams> = StreamNameFor<Streams>,
> = Omit<EventStreamDoc, "_id" | "_creationTime" | "streamType"> & {
  name: StreamName;
};

export type EventEntry<
  Streams extends
    readonly EventStreamTemplate[] = readonly EventStreamTemplate[],
  StreamName extends StreamNameFor<Streams> = StreamNameFor<Streams>,
> = {
  [EvType in EventTypeFor<Streams, StreamName>]: Omit<
    EventEntryDoc,
    | "_id"
    | "_creationTime"
    | "streamType"
    | "eventType"
    | "payload"
    | "eventTypeId"
    | "streamTypeId"
  > & {
    name: StreamName;
    eventType: EvType;
    payload?: PayloadFor<Streams, StreamName, EvType & string>;
  };
}[EventTypeFor<Streams, StreamName>];

export type ProjectorCheckpoint<StreamName extends string = string> = Omit<
  EventProjectorCheckpointDoc,
  "_id" | "_creationTime" | "streamType"
> & {
  name: StreamName;
};

/** Discriminated union correlating stream name ↔ eventType ↔ payload. */
export type AppendArgs<Streams extends readonly EventStreamTemplate[]> = {
  [Stream in StreamNameFor<Streams>]: {
    [EvType in EventTypeFor<Streams, Stream>]: {
      name: Stream;
      streamId: string;
      namespace?: string;
      eventId: string;
      eventType: EvType;
      payload?: PayloadFor<Streams, Stream, EvType & string>;
      expectedVersion?: number;
      metadata?: EventMetadata;
      causationId?: string;
      correlationId?: string;
      actor?: EventActor;
      session?: string;
      eventTime?: number;
    };
  }[EventTypeFor<Streams, Stream>];
}[StreamNameFor<Streams>];
