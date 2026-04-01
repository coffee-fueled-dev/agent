import { HistoryClient } from "@very-coffee/convex-history";
import { components } from "./_generated/api";

export const history = new HistoryClient(components.history, {
  streams: [
    {
      streamType: "memoryRecord",
      kinds: ["created", "edited"],
    },
  ],
});
