import { query } from "./_generated/server.js";

/** Minimal example surface; wire `components.events` in real apps via `EventsClient`. */
export const ping = query({
  args: {},
  handler: async () => "ok",
});
