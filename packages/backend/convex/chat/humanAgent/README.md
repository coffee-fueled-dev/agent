# Chat human agent (`chat/humanAgent/`)

**Purpose:** Chat-layer glue for the **human** role: wire-format validators, batch tool execution during a thread turn, JSON Schema helpers for the toolkit UI, and fingerprint registration/recording.

**Convex API note:** `humanToolkitForChat` and `executeHumanTool` live in [`../humanAgent.ts`](../humanAgent.ts) so they stay at `api.chat.humanAgent.*`.

## Contents

| File | Role |
|------|------|
| `humanToolCallWire.ts` | Convex validators + `HumanToolCall` for `sendMessage` / `applyHumanToolCallsForTurn`. |
| `humanToolRun.ts` | Shared evaluated-tool lookup + standard-schema validation (`executeHumanTool` + `executeHumanToolCallsForTurn`). |
| `ensureRegistration.ts` | Mutation: register human actor + tools with fingerprints. |
| `recordHumanTurn.ts` | Internal action: record toolkit evaluation for a user message. |
| `executeHumanToolCallsForTurn.ts` | Async helper: run batched human tool calls for `continueThreadStream`. |
| `toolSpecJsonSchema.ts` | Pure helpers: sanitize JSON Schema for Convex, serialize tool `inputSchema` for UI. |

## Conventions

- **Convex registrations** in this folder and in `../humanAgent.ts` (queries/actions on `api.chat.humanAgent.*`).
- Prefer **pure functions** in `toolSpecJsonSchema.ts` and `humanToolRun.ts` where possible.
