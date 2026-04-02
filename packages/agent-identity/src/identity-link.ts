import { hashIdentityInput, normalizeStaticProps } from "./hash.js";
import type { RegisteredAgentIdentity, ToolkitResult } from "./types.js";

/**
 * Pure attribution record: links an agent’s **static** capacity (full graph)
 * to the **runtime** effective identity after `evaluateComposable`, without persistence.
 */
export type IdentityLink = {
  agentId: string;
  agentName: string;
  staticHash: string;
  runtimeHash: string;
  /** Normalized JSON snapshots; only set when `includeSnapshots: true`. */
  staticSnapshot?: unknown;
  runtimeSnapshot?: unknown;
};

export type CreateIdentityLinkOptions = {
  /**
   * Include `normalizeStaticProps` snapshots for self-contained payloads.
   * @default false
   */
  includeSnapshots?: boolean;
};

/**
 * Build an {@link IdentityLink} from a registered agent and a toolkit evaluation result.
 * Consumers may persist this object as-is (e.g. Convex metadata) or store hashes only.
 */
export async function createIdentityLink(
  agent: RegisteredAgentIdentity,
  evaluated: ToolkitResult,
  options?: CreateIdentityLinkOptions,
): Promise<IdentityLink> {
  const staticInput = agent.getStaticIdentityInput();
  const runtimeInput = agent.getRuntimeIdentityInput(
    evaluated.effectiveStaticProps,
  );

  const [staticHash, runtimeHash] = await Promise.all([
    hashIdentityInput(staticInput),
    hashIdentityInput(runtimeInput),
  ]);

  const base: IdentityLink = {
    agentId: agent.agentId,
    agentName: agent.name,
    staticHash,
    runtimeHash,
  };

  if (options?.includeSnapshots) {
    return {
      ...base,
      staticSnapshot: normalizeStaticProps(staticInput),
      runtimeSnapshot: normalizeStaticProps(runtimeInput),
    };
  }

  return base;
}
