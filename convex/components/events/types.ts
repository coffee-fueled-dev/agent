import type {
  GenericActionCtx,
  GenericDataModel,
  GenericMutationCtx,
} from "convex/server";
import type { ObjectType, PropertyValidators } from "convex/values";

/**
 * Minimal ctx passed to append/checkpoint hooks: whatever called `EventsClient` must
 * supply `runMutation` (and usually `runQuery`) so hooks can `runMutation` into the
 * **app** (e.g. `internal.*`) from component code paths (mutations or actions).
 */
export type EventsAppendHookCtx =
  | Pick<GenericMutationCtx<GenericDataModel>, "runMutation" | "runQuery">
  | Pick<GenericActionCtx<GenericDataModel>, "runMutation" | "runQuery">;

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

export type EventsConfig<
  Streams extends
    readonly EventStreamTemplate[] = readonly EventStreamTemplate[],
> = {
  streams: Streams;
  onAppend?: (
    ctx: EventsAppendHookCtx,
    entry: EventEntry<Streams>,
  ) => void | Promise<void>;
  onAdvanceCheckpoint?: (
    ctx: EventsAppendHookCtx,
    checkpoint: ProjectorCheckpoint<StreamTypeFor<Streams>>,
  ) => void | Promise<void>;
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
> = {
  streamType: StreamType;
  namespace: string;
  streamId: string;
  version: number;
  lastEventSequence: number | null;
  createdTime: number;
  updatedTime: number;
};

export type EventEntry<
  Streams extends
    readonly EventStreamTemplate[] = readonly EventStreamTemplate[],
  StreamType extends StreamTypeFor<Streams> = StreamTypeFor<Streams>,
> = {
  [EvType in EventTypeFor<Streams, StreamType>]: {
    globalSequence: number;
    streamType: StreamType;
    namespace: string;
    streamId: string;
    streamVersion: number;
    eventId: string;
    eventType: EvType;
    payload?: PayloadFor<Streams, StreamType, EvType & string>;
    metadata?: EventMetadata;
    causationId?: string;
    correlationId?: string;
    actor?: EventActor;
    session?: string;
    eventTime: number;
  };
}[EventTypeFor<Streams, StreamType>];

export type ProjectorCheckpoint<StreamType extends string = string> = {
  projector: string;
  streamType: StreamType;
  lastSequence: number;
  updatedTime: number;
  leaseOwner?: string;
  leaseExpiresAt?: number;
};

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
