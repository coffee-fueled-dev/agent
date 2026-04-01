import { hashIdentityInput } from "./hash.js";
import type { RegisteredAgentIdentity } from "./types.js";

export type RegisteredAgentEntry = {
  agent: RegisteredAgentIdentity;
  staticHash: string;
};

export type AgentRegistry = {
  /** Computes static hash from `agent.getStaticIdentityInput()`. Last register wins for the same `agentId`. */
  register: (
    agent: RegisteredAgentIdentity,
  ) => Promise<{ staticHash: string }>;
  get: (agentId: string) => RegisteredAgentEntry | undefined;
  has: (agentId: string) => boolean;
  listKeys: () => string[];
  entries: () => IterableIterator<[string, RegisteredAgentEntry]>;
};

/**
 * In-memory agent registration map keyed by `agentId`.
 */
export function createAgentRegistry(): AgentRegistry {
  const byId = new Map<string, RegisteredAgentEntry>();

  async function register(
    agent: RegisteredAgentIdentity,
  ): Promise<{ staticHash: string }> {
    const staticHash = await hashIdentityInput(agent.getStaticIdentityInput());
    byId.set(agent.agentId, { agent, staticHash });
    return { staticHash };
  }

  function get(agentId: string): RegisteredAgentEntry | undefined {
    return byId.get(agentId);
  }

  function has(agentId: string): boolean {
    return byId.has(agentId);
  }

  function listKeys(): string[] {
    return [...byId.keys()];
  }

  function entries(): IterableIterator<[string, RegisteredAgentEntry]> {
    return byId.entries();
  }

  return {
    register,
    get,
    has,
    listKeys,
    entries,
  };
}
