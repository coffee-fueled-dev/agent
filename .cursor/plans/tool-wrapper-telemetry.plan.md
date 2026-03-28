---
name: Tool wrapper telemetry
overview: Add opt-in, toolkit-level instrumentation (similar to `withFormattedResults`) that emits structured events for policy evaluation and tool execution (start/success/fail), with async delivery via `ctx.scheduler.runAfter` into the existing events pipeline so the unified timeline can show activity without per-tool hooks.
todos:
  - id: events-schema
    content: Extend app events.config (threadIdentity or new stream) with policy_* and tool_* event types + payloads
    status: completed
  - id: append-internal
    content: Add internalMutation appendToolTelemetry (or reuse EventsClient) callable from scheduled jobs
    status: completed
  - id: toolkit-wrapper
    content: Implement withToolTelemetry / wrap dynamicTool + toolkit evaluate to emit policy + handler lifecycle
    status: completed
  - id: scheduler-bridge
    content: Wire ctx.scheduler.runAfter(0, ...) from ToolExecutionContext; add optional helper in customFunctions if needed
    status: completed
  - id: opt-in-rollout
    content: Enable telemetry on context chat tools via wrapper flag; keep contextMemory domain events unchanged
    status: completed
  - id: verify-unified
    content: Confirm partitionKey (threadIdentity uses streamId=threadId) shows rows in listUnifiedTimeline
    status: completed
isProject: false
---

# Tool-wrapper telemetry (revised plan)

## Direction change

**Drop** individualized `recordView` / per-tool list actions as the primary fix. **Add** centralized tracking in `[convex/llms/tools/_libs/toolkit.ts](convex/llms/tools/_libs/toolkit.ts)`:

- **Opt-in** higher-order API (same spirit as `[withFormattedResults](convex/llms/tools/_libs/toolkit.ts)`) so tools opt into telemetry without each handler repeating logic.
- **Distinct events** (at minimum):
  - **Policy**: invocation / result (`ok: boolean`, policy id).
  - **Tool execution**: start / success / fail (tool name, correlation ids, optional error string; **no** full raw args if PII risk—truncate or hash in payload schema).
- **Async emission**: use `**ctx.scheduler.runAfter(0, internal…)`** so the tool path stays fast; the scheduled `**internalMutation**` appends to the events component (see `[customFunctions.ts](convex/customFunctions.ts)` — tool runs use action context; `**ActionCtx` includes `scheduler**` in Convex).

Reference: user request to mirror policy resolution sites in `dynamicTool` / `toolkit` `evaluate()` (policy loops) and the `**createTool` handler** path.

## Unified timeline compatibility

`[partitionKeyForEvent](convex/chat/unifiedTimeline.ts)`:

- `threadIdentity`: `partitionKey = ev.streamId` (typically the **thread id**).
- `contextMemory`: requires `metadata.threadId`.

**Recommendation:** emit tool/policy telemetry on the `**threadIdentity`** stream with `**streamId: ctx.threadId**`, `**namespace**` from chat agent namespace (same pattern as `[chat/identity.ts](convex/chat/identity.ts)`), and **metadata** carrying `messageId`, `sessionId`, tool name, policy id, phase (`policy` | `tool`), outcome. That matches existing projector behavior for `threadIdentity` and surfaces rows in `[listUnifiedTimeline](convex/chat/unifiedTimeline.ts)` without relying on `contextMemory` payloads.

If you prefer isolation, add a dedicated `**streamType`** (e.g. `agentToolRuntime`) in `[convex/events.config.ts](convex/events.config.ts)` and extend `**partitionKeyForEvent**` + `**STREAM_TYPES**` in `[convex/chat/unifiedTimeline.ts](convex/chat/unifiedTimeline.ts)` so the projector ingests it (same `metadata.threadId` or streamId rule as you choose).

## Implementation sketch

1. **Schema** (`[convex/events.config.ts](convex/events.config.ts)`): add payload validators for new event types under `threadIdentity` (or new stream). Include fields: `policyId`, `toolName`, `phase`, `ok`, `errorMessage?`, `correlationId?` (string linking policy pass → tool run).
2. **Append path**: internal mutation `internal.chat.toolTelemetry.append` (name TBD) that calls `components.events` `appendToStream` with the configured stream/type. **Idempotency**: generate stable `eventId` per phase (e.g. `${messageId}:${toolName}:${phase}:${policyId?}`) to avoid duplicates on retries.
3. `**toolkit.ts`**:
  - `**withToolTelemetry(opts, fn)**` — wraps an async tool body (for use *inside* handlers alongside `withFormattedResults` if desired), or
  - `**dynamicTool({ ..., telemetry: true })*`* — wraps the `createTool` handler and injects policy/tool phases.
  - `**toolkit.evaluate` / `dynamicTool.evaluate**`: wrap each `runPolicyQuery` with schedule-before / schedule-after (or single “policy_batch” event—user asked for separate success/fail per policy; implement **per policy** in the existing loop over `policies`).
4. **Scheduler payload**: only **JSON-serializable** args to `runAfter`. Pass: `threadId`, `messageId`, `sessionId`, `toolName`, `policyId?`, `phase`, `ok`, `error?`, `agentName?`, `namespace`.
5. **Account / agent info**: resolve **account id** inside the **scheduled mutation** (query session → account) if needed for `actor` on the event; pass minimal ids from the tool ctx to avoid large payloads.
6. **Optional helper in `[customFunctions.ts](convex/customFunctions.ts)`**: e.g. `scheduleToolTelemetry(ctx: Pick<ActionCtx, "scheduler">, args: …)` for one-liner use from tool code—only if tool handlers need to call it manually; default path is **fully inside toolkit wrapper**.

## What stays unchanged

- **Domain** `contextMemory` events (`searched`, `viewed`, `added`, …) remain the source of truth for **RAG / entry** semantics; wrapper telemetry is **orthogonal** runtime observability.
- **Per-tool** `recordView` for browse can remain a **later** enhancement if you still want semantic “viewed” counts; not required for “something shows up in unified thread” once **threadIdentity** tool events flow.

## Risks / follow-ups

- **Volume**: one tool call ⇒ multiple scheduled jobs (N policies × 2 + tool × 3). Acceptable at `runAfter(0)` batching or coalesce policy results into one event if needed.
- **Privacy**: never log full tool args in events; log hashes or truncated previews only.

