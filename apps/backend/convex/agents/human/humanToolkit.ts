import { defineAgentIdentity } from "@very-coffee/agent-identity";
import { humanMemoryToolkit } from "../_tools/memory/humanMemoryToolkit.js";
import { toolkit } from "../lib/toolkit.js";

export const humanTools = toolkit([humanMemoryToolkit()], {
  name: "human-tools",
});

let cachedStaticHash: string | undefined;

export async function getHumanToolkitStaticHash(): Promise<string> {
  if (!cachedStaticHash) {
    cachedStaticHash = await humanTools.computeStaticHash();
  }
  return cachedStaticHash;
}

export function humanAgentIdentity(namespace: string, staticHash: string) {
  return defineAgentIdentity({
    agentId: namespace,
    name: "User",
    staticHash,
  });
}
