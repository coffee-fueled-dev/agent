import { MemoryClient } from "../_components/memory/client/index.js";
import { components } from "../_generated/api.js";

const googleApiKey =
  process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GOOGLE_API_KEY;

export const memoryClient = new MemoryClient(components.memory, {
  googleApiKey: googleApiKey ?? undefined,
});
