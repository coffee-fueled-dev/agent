# Shared Policies

Policy queries that gate tool availability at runtime. Each file co-locates a `toolPolicyQuery` implementation with its `sharedPolicy()` wrapper.

## Pattern

```typescript
// 1. Define the query (returns boolean)
export const evaluate = toolPolicyQuery({
  args: {},
  handler: async (ctx): Promise<boolean> => { ... },
});

// 2. Wrap as a shared policy (identity-stable, deduplicated at runtime)
export const myPolicy = sharedPolicy(
  internal.llms.tools._policies.thisFile.evaluate
);
```

Tools reference the shared policy export:

```typescript
import { myPolicy } from "../_policies/myPolicyFile";

export const myTool = dynamicTool({
  policies: [myPolicy],
  ...
});
```

Multiple tools can reference the same policy. The toolkit evaluates each unique policy once per `evaluate()` call.
