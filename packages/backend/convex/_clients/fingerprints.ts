import { FingerprintClient } from "@very-coffee/convex-agent-fingerprints";
import { components } from "../_generated/api.js";

/** Typed client for the agent-fingerprints Convex component (static + runtime capability hashes). */
export const fingerprintClient = new FingerprintClient(
  components.agentFingerprints,
);
