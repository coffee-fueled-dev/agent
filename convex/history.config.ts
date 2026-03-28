import type { HistoryConfig } from "./components/history/types.ts";

export const historyConfig = {
  streams: [
    {
      streamType: "contextEntry",
      kinds: ["created", "edited"],
    },
  ],
} as const satisfies HistoryConfig;
