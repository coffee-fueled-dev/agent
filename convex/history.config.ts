import type { HistoryConfig } from "./components/history/types.ts";

export const historyConfig = {
  streams: [
    {
      streamType: "machineAgent",
      kinds: ["registered", "static_version_added", "runtime_version_seen"],
    },
  ],
} as const satisfies HistoryConfig;
