/**
 * Static vs runtime identity snapshots + hashes.
 * Run: bun run examples/03-identity-snapshot.ts
 */
import {
  defineAgentIdentity,
  evaluateComposable,
  hashIdentityInput,
  normalizeStaticProps,
  tool,
  toolkit,
} from "../src/index.ts";
import { greetInputSchema } from "./standard-schema-helpers.ts";

const greet = tool({
  name: "greet",
  description: "Greet",
  inputSchema: greetInputSchema(),
  handler: async (_ctx, input) => `Hi ${input.name}`,
});

const graph = toolkit([greet], { name: "id-demo", instructions: ["Root."] });

const agent = defineAgentIdentity({
  agentId: "demo-agent",
  name: "Demo Agent",
  staticProps: graph.staticProps,
});

const staticSnap = normalizeStaticProps(agent.getStaticIdentityInput());
const staticHash = await hashIdentityInput(staticSnap);

const evaluated = await evaluateComposable(graph, { env: {} });
const runtimeSnap = normalizeStaticProps(
  agent.getRuntimeIdentityInput(evaluated.effectiveStaticProps),
);
const runtimeHash = await hashIdentityInput(runtimeSnap);

console.log("staticHash", `${staticHash.slice(0, 16)}…`);
console.log("runtimeHash", `${runtimeHash.slice(0, 16)}…`);
console.log("same graph =>", staticHash === runtimeHash);
