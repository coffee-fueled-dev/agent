import type { HistoryConfig } from "@very-coffee/convex-history/types";

export const historyConfig = {
  streams: [
    {
      streamType: "contextEntry",
      kinds: ["created", "edited"],
    },
  ],
} as const satisfies HistoryConfig;
