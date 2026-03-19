# Agents

Each agent lives in its own folder:

```
<agentName>/
  agent.ts           # Composes toolkit, creates Agent instance
  _instructions/     # Static prompt fragments for this agent
    index.ts         # Joins fragments into a single instruction string
  _toolkits/         # Toolkit compositions scoped to this agent
    _instructions/   # Instructions scoped to a toolkit
```

## `agent.ts`

Defines a module-level `toolkit()` from static entries in `_toolkits/` with static instructions. Inside the agent closure, composes the static toolkit with any dynamic toolkits, then calls `evaluate()`:

```typescript
export const myAgentToolkit = toolkit([staticToolkit], {
  name: "myAgent",
  instructions: [staticInstructions],
});

export const myAgent = async (ctx: ToolBuilderContext) => {
  const composed = toolkit(
    [myAgentToolkit, someDynamicToolkit()],
    { name: "myAgent" }
  );
  const { tools, instructions } = await composed.evaluate(
    createToolkitContext(ctx)
  );
  return new Agent(components.agent, { tools, instructions, ... });
};
```

## `_instructions/`

Each file default-exports a prompt string. `index.ts` joins them. Shared instructions that apply across agents live in `agents/_instructions/`.

## `_toolkits/`

Each file exports a `toolkit()` result that bundles related tools with group-level instructions. These are composed into the agent's top-level toolkit in `agent.ts`.
