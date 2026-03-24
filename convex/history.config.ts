import type { HistoryConfig } from "./components/history/types.ts";

export const historyConfig = {
  streams: [
    {
      streamType: "machineAgent",
      kinds: ["registered", "static_version_added", "runtime_version_seen"],
    },
    {
      streamType: "threadIdentity",
      kinds: ["turn_bound", "identity_changed", "runtime_version_seen"],
    },
    {
      streamType: "contextEntry",
      kinds: ["created", "edited"],
    },
  ],
} as const satisfies HistoryConfig;
