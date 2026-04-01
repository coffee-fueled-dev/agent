export type MetadataValue = string | number | boolean | null;

export type HistoryMetadata = Record<string, MetadataValue>;

export type HistoryStreamTemplate = {
  streamType: string;
  kinds: readonly string[];
};

export type HistoryConfig<
  Streams extends
    readonly HistoryStreamTemplate[] = readonly HistoryStreamTemplate[],
> = {
  streams: Streams;
};

type RegisteredStream<Streams extends readonly HistoryStreamTemplate[]> =
  Streams[number];

export type StreamTypeFor<Streams extends readonly HistoryStreamTemplate[]> = [
  RegisteredStream<Streams>,
] extends [never]
  ? string
  : RegisteredStream<Streams>["streamType"];

export type EntryKindFor<
  Streams extends readonly HistoryStreamTemplate[],
  StreamType extends StreamTypeFor<Streams>,
> = [Extract<RegisteredStream<Streams>, { streamType: StreamType }>] extends [
  never,
]
  ? string
  : Extract<
      RegisteredStream<Streams>,
      { streamType: StreamType }
    >["kinds"][number];

export type HistoryEntryRef<StreamType extends string = string> = {
  streamType: StreamType;
  streamId: string;
  entryId: string;
};

export type HistoryHeadRef<StreamType extends string = string> =
  HistoryEntryRef<StreamType> & {
    headKind?: string;
  };

export type HistoryEntry<
  Streams extends
    readonly HistoryStreamTemplate[] = readonly HistoryStreamTemplate[],
  StreamType extends StreamTypeFor<Streams> = StreamTypeFor<Streams>,
> = {
  streamType: StreamType;
  streamId: string;
  entryId: string;
  kind: EntryKindFor<Streams, StreamType>;
  payload?: unknown;
  parentEntryIds: string[];
  entryTime: number;
  attrs?: HistoryMetadata;
};

export type AppendArgs<Streams extends readonly HistoryStreamTemplate[]> = {
  [Stream in StreamTypeFor<Streams>]: {
    streamType: Stream;
    streamId: string;
    entryId: string;
    kind: EntryKindFor<Streams, Stream>;
    payload?: unknown;
    parentEntryIds?: string[];
    entryTime?: number;
    attrs?: HistoryMetadata;
  };
}[StreamTypeFor<Streams>];
