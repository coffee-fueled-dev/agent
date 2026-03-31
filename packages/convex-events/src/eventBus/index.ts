import { EventBusListener, type EventBusSource } from "./listener.js";
import { fifoTables } from "./models/tables.js";

export type FifoPolicy = { type: "fifo"; options: { size: number } };
export type EvictionPolicy = FifoPolicy;

export type { EventBusSource } from "./listener.js";

export function createEventBus<
  const Sources extends readonly EventBusSource[],
>(config: { sources: Sources; eviction: EvictionPolicy }) {
  const listener = new EventBusListener(config);
  return Object.assign(listener, { tables: fifoTables });
}

export { EventBusListener } from "./listener.js";
export { fifoTables } from "./models/tables.js";
