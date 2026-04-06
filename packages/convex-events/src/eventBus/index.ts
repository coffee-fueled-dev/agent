import { EventBusListener, type EventBusSource } from "./listener.js";
import type { EvictionPolicy } from "./evictionPolicy.js";
import { fifoTables } from "./models/tables.js";

export type { EvictionPolicy, FifoEvictionRule } from "./evictionPolicy.js";

export type { EventBusSource } from "./listener.js";

/**
 * Host-schema event bus (FIFO tables + dimensions). Eviction is **first matching rule**
 * per event; see {@link FifoEvictionRule}.
 */
export function createEventBus<
  const Sources extends readonly EventBusSource<
    string,
    // biome-ignore lint/suspicious/noExplicitAny: Invariant EventsClient — see EventBusSource
    any
  >[],
>(config: { sources: Sources; eviction: EvictionPolicy }) {
  if (
    config.eviction.type !== "fifo" ||
    config.eviction.rules.length === 0
  ) {
    throw new Error("createEventBus: eviction.rules must be a non-empty fifo rules array.");
  }
  return {
    listener: new EventBusListener(config),
    tables: fifoTables,
  };
}

export { EventBusListener } from "./listener.js";
export { fifoTables } from "./models/tables.js";
