import type { GenericDataModel, GenericMutationCtx } from "convex/server";
import type { ObjectType, PropertyValidators } from "convex/values";
import type {
  EventEntryDoc,
  EventProjectorCheckpointDoc,
  EventStreamDoc,
} from "./models/types";

export type {
  EventDimensionDoc,
  EventStreamDoc,
  EventEntryDoc,
  EventStreamMetricDoc,
  EventProjectorCheckpointDoc,
} from "./models/types";

export type RunMutationCtx = Pick<
  GenericMutationCtx<GenericDataModel>,
  "runQuery" | "runMutation"
>;

export type EventMetadataValue = string | number | boolean | null;

export type EventMetadata = Record<string, EventMetadataValue>;

export type EventActor = {
  byType: string;
  byId: string;
};

export type EventStreamTemplate = {
  streamType: string;
  eventTypes: readonly string[];
  payloads?: Record<string, PropertyValidators>;
  /** When true, callers should pass a non-empty stream `namespace` for isolation. */
  namespaceScoped?: boolean;
};

export type MetricMatchFields<
  Streams extends
    readonly EventStreamTemplate[] = readonly EventStreamTemplate[],
> = {
  namespace?: string;
  streamType?: StreamTypeFor<Streams>;
  eventType?: EventTypeFor<Streams, StreamTypeFor<Streams>>;
};

export type MetricGroupByField =
  | "namespace"
  | "streamType"
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
  ctx: RunMutationCtx,
  entry: EventEntry,
) => void | Promise<void>;

export interface EventSubscribable {
  subscribe(id: string, callback: EventSubscriber): void;
}

export type EventsConfig<
  Streams extends
    readonly EventStreamTemplate[] = readonly EventStreamTemplate[],
> = {
  streams: Streams;
  metrics?: MetricRule<Streams>[];
};

type RegisteredStream<Streams extends readonly EventStreamTemplate[]> =
  Streams[number];

export type StreamTypeFor<Streams extends readonly EventStreamTemplate[]> = [
  RegisteredStream<Streams>,
] extends [never]
  ? string
  : RegisteredStream<Streams>["streamType"];

export type EventTypeFor<
  Streams extends readonly EventStreamTemplate[],
  StreamType extends StreamTypeFor<Streams>,
> = [Extract<RegisteredStream<Streams>, { streamType: StreamType }>] extends [
  never,
]
  ? string
  : Extract<
      RegisteredStream<Streams>,
      { streamType: StreamType }
    >["eventTypes"][number];

export type PayloadFor<
  Streams extends readonly EventStreamTemplate[],
  StreamType extends StreamTypeFor<Streams>,
  EvType extends string,
> =
  Extract<Streams[number], { streamType: StreamType }> extends infer S
    ? S extends { payloads: Record<string, PropertyValidators> }
      ? EvType extends keyof S["payloads"]
        ? ObjectType<S["payloads"][EvType]>
        : unknown
      : unknown
    : unknown;

export type EventRef<StreamType extends string = string> = {
  streamType: StreamType;
  /** Omitted or empty string = default / unscoped stream. */
  namespace?: string;
  streamId: string;
  eventId: string;
};

export type EventStreamRef<StreamType extends string = string> = {
  streamType: StreamType;
  namespace?: string;
  streamId: string;
};

export type EventStreamState<
  Streams extends
    readonly EventStreamTemplate[] = readonly EventStreamTemplate[],
  StreamType extends StreamTypeFor<Streams> = StreamTypeFor<Streams>,
> = Omit<EventStreamDoc, "_id" | "_creationTime" | "streamType"> & {
  streamType: StreamType;
};

export type EventEntry<
  Streams extends
    readonly EventStreamTemplate[] = readonly EventStreamTemplate[],
  StreamType extends StreamTypeFor<Streams> = StreamTypeFor<Streams>,
> = {
  [EvType in EventTypeFor<Streams, StreamType>]: Omit<
    EventEntryDoc,
    | "_id"
    | "_creationTime"
    | "streamType"
    | "eventType"
    | "payload"
    | "eventTypeId"
    | "streamTypeId"
  > & {
    streamType: StreamType;
    eventType: EvType;
    payload?: PayloadFor<Streams, StreamType, EvType & string>;
  };
}[EventTypeFor<Streams, StreamType>];

export type ProjectorCheckpoint<StreamType extends string = string> = Omit<
  EventProjectorCheckpointDoc,
  "_id" | "_creationTime" | "streamType"
> & {
  streamType: StreamType;
};

/** Discriminated union correlating streamType ↔ eventType ↔ payload. */
export type AppendArgs<Streams extends readonly EventStreamTemplate[]> = {
  [Stream in StreamTypeFor<Streams>]: {
    [EvType in EventTypeFor<Streams, Stream>]: {
      streamType: Stream;
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
}[StreamTypeFor<Streams>];

