export type EventEntry = {
  eventId: string;
  eventType: string;
  eventTime: number;
  payload?: unknown;
  causationId?: string;
  correlationId?: string;
};

export type HistoryEntry = {
  entryId: string;
  kind: string;
  entryTime: number;
  parentEntryIds: string[];
  payload?: unknown;
};

export type TelemetryDetailItem =
  | {
      type: "event";
      entry: EventEntry;
    }
  | {
      type: "history";
      entry: HistoryEntry;
    };
