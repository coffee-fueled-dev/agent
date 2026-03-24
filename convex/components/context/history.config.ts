import type { HistoryConfig } from "../history/types.ts";

export const historyConfig = {
  streams: [
    {
      streamType: "contextEntry",
      kinds: ["created", "edited"],
    },
  ],
} as const satisfies HistoryConfig;
