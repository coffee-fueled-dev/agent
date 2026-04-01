import type { HistoryStreamTemplate } from "./types.js";

/** Validates streamType/kind against the app's HistoryClient config before calling append. */
export function assertRegisteredStream(
  streams: readonly HistoryStreamTemplate[],
  streamType: string,
  kind: string,
): void {
  if (streams.length === 0) {
    return;
  }

  const stream = streams.find(
    (candidate) => candidate.streamType === streamType,
  );

  if (!stream) {
    throw new Error(
      `Unknown history streamType "${streamType}". Register it in your HistoryClient config.`,
    );
  }

  if (
    stream.kinds.length > 0 &&
    !(stream.kinds as readonly string[]).includes(kind)
  ) {
    throw new Error(
      `Unknown history kind "${kind}" for streamType "${streamType}". Register it in your HistoryClient config.`,
    );
  }
}
