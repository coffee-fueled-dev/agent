export type EventMetadataValue = string | number | boolean | null;

export type EventMetadata = Record<string, EventMetadataValue>;

export type EventActor = {
  byType: string;
  byId: string;
};

export type EventStreamTemplate = {
  streamType: string;
  eventTypes: readonly string[];
};

export type EventsConfig<
  Streams extends
    readonly EventStreamTemplate[] = readonly EventStreamTemplate[],
> = {
  streams: Streams;
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

export type EventRef<StreamType extends string = string> = {
  streamType: StreamType;
  streamId: string;
  eventId: string;
};

export type EventStreamRef<StreamType extends string = string> = {
  streamType: StreamType;
  streamId: string;
};

export type EventStreamState<
  Streams extends
    readonly EventStreamTemplate[] = readonly EventStreamTemplate[],
  StreamType extends StreamTypeFor<Streams> = StreamTypeFor<Streams>,
> = {
  streamType: StreamType;
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
  globalSequence: number;
  streamType: StreamType;
  streamId: string;
  streamVersion: number;
  eventId: string;
  eventType: EventTypeFor<Streams, StreamType>;
  payload?: unknown;
  metadata?: EventMetadata;
  causationId?: string;
  correlationId?: string;
  actor?: EventActor;
  eventTime: number;
};

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
    streamType: Stream;
    streamId: string;
    eventId: string;
    eventType: EventTypeFor<Streams, Stream>;
    payload?: unknown;
    expectedVersion?: number;
    metadata?: EventMetadata;
    causationId?: string;
    correlationId?: string;
    actor?: EventActor;
    eventTime?: number;
  };
}[StreamTypeFor<Streams>];
