import type { ComponentApi } from "../_components/memory/_generated/component.js";
import { MemoryClient } from "../_components/memory/client/index.js";
import { components } from "../_generated/api.js";

export const memoryClient = new MemoryClient(components.memory as ComponentApi);
