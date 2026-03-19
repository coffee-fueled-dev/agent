# LLM

Convex LLM agents and tools, built on `@convex-dev/agent` and `@ai-sdk/openai`.

## Structure

| Directory   | Purpose                                                           |
| ----------- | ----------------------------------------------------------------- |
| `agents/`   | Agent definitions. Each agent composes toolkits and instructions. |
| `tools/`    | Tool definitions, shared policies, and the toolkit primitives.    |
| `models.ts` | Language model config (chat, text embedding).                     |

## Architecture

The system separates **static capabilities** (what tools exist and their metadata) from **dynamic availability** (which tools are allowed at runtime based on policy evaluation).

- `dynamicTool()` defines a single tool with `{ staticProps, evaluate }`.
- `dynamicToolkit()` defines a toolkit whose members are discovered at runtime (e.g. from a query). Its policies are evaluated before construction to avoid wasted work.
- `sharedPolicy()` wraps a policy query into a reusable, identity-stable reference. Tools declare policy dependencies; duplicate queries are evaluated once.
- `toolkit()` composes tools, sub-toolkits, and dynamic toolkits into a hierarchy with `{ staticProps, evaluate }`.
- `createToolkitContext()` builds a `ToolkitContext` with `runPolicyQuery` and `runDependencyQuery` executors. The agent passes this to `toolkit.evaluate()`.

Static parts of a toolkit are defined at module level for introspection (hashing, diffing). Dynamic parts are composed at runtime inside the agent closure.
