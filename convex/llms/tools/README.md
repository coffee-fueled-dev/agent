# Tools

## Directory structure

```
tools/
  _libs/             # Toolkit primitives and custom functions
  _policies/         # Shared policy definitions
  <toolName>/
    tool.ts          # dynamicTool() or dynamicToolkit() definition
    handler.ts       # Convex internal mutation (optional, for static tools)
    discover.ts      # toolDependencyQuery (optional, for dynamic toolkits)
```

## Patterns

### Static tool (`dynamicTool`)

Defines Zod args, policies, and a handler that delegates to an internal mutation:

```typescript
export const myTool = dynamicTool({
  name: "myTool" as const,
  policies: [someSharedPolicy],
  description: "...",
  args: z.object({ ... }),
  handler: async (toolCtx, args): Promise<any> => { ... },
});
```

### Dynamic toolkit (`dynamicToolkit`)

Discovers tools at runtime. Policies are evaluated before `create()` runs. Uses `toolDependencyQuery` for data resolution:

```typescript
export function myDynamicToolkit() {
  return dynamicToolkit({
    name: "myDynamicToolkit",
    instructions: ["..."],
    create: async (ctx) => {
      const data = await ctx.runDependencyQuery(internal...discover.query);
      return data.map((item) => dynamicTool({ ... }));
    },
  });
}
```

### `handler.ts`

Internal mutation invoked by the tool handler. Receives validated args, performs DB work, returns a structured result.

### `discover.ts`

A `toolDependencyQuery` that resolves data needed to construct dynamic tools. Semantically distinct from policy queries.

### `_libs/`

- `toolkit.ts` — `dynamicTool()`, `dynamicToolkit()`, `toolkit()`, `sharedPolicy()`, `withFormattedResults()`
- `customFunctions.ts` — `toolPolicyQuery`, `toolDependencyQuery`, `createToolkitContext()`, context types
