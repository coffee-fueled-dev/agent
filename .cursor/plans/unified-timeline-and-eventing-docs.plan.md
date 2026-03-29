---
name: Unified timeline + eventing docs
overview: Fix unified timeline ingestion for all namespace-scoped contextMemory events, and add a docs/eventing directory documenting the app eventing architecture (diagrams + prose).
todos:
  - id: partition-key-fallback
    content: Implement contextMemory fallback partitionKey in convex/chat/unifiedTimeline.ts (namespace::streamId when no metadata.threadId)
    status: pending
  - id: verify-thread-chat
    content: Sanity-check listUnifiedTimeline(threadId) vs global stream behavior
    status: pending
  - id: docs-dir
    content: Create docs/eventing/ with README (or architecture.md) — diagrams + descriptions
    status: pending
isProject: true
---

# Unified timeline fix + eventing documentation

## Part A: Projector / partition key (implementation)

**Problem:** [`partitionKeyForEvent`](convex/chat/unifiedTimeline.ts) returns `null` for `contextMemory` without `metadata.threadId`, so those events are never inserted into `unifiedTimeline` while [`listUnifiedTimelineByNamespace`](convex/chat/unifiedTimeline.ts) is already namespace-scoped.

**Change:**

- **`threadIdentity`:** `partitionKey = streamId` (unchanged).
- **`contextMemory`:** If `metadata.threadId` is set, `partitionKey = threadId` (chat thread stream). Else `partitionKey = \`${namespace}::${streamId}\`` (per-entry cap, no null skip).

Remove the insert skip for missing pk on `contextMemory`. Add a short comment distinguishing **partitionKey** (trim + thread query) vs **sourceNamespace** (global listing).

**Backfill:** Out of scope unless requested (checkpoint already advanced past old events).

---

## Part B: Documentation directory

**Location:** [`docs/eventing/`](docs/eventing/) at repo root (or [`agent/docs/eventing/`](docs/eventing/) — use workspace root `docs/eventing/`).

**Deliverable:** One primary doc, e.g. [`docs/eventing/README.md`](docs/eventing/README.md) or `architecture.md`, containing:

1. **Purpose** — Why events exist (audit, telemetry, unified stream vs per-stream reads).

2. **High-level diagram** (mermaid) — External writers (context component, chat/tooling) → Events component (`appendToStream`) → durable streams → optional projectors → `unifiedTimeline` + consumers.

3. **Stream types** — From [`convex/events.config.ts`](convex/events.config.ts):
   - `threadIdentity` — Tool/policy lifecycle; `streamId` = thread id.
   - `contextMemory` — Namespace-scoped; `streamId` = context entry id; event types `viewed`, `searched`, `added`, etc.

4. **Read paths** (second diagram or subsection):
   - **Per-entry activity:** Context component [`listStreamEvents`](convex/components/context/public/entries.ts) on `contextMemory` for one entry (full history).
   - **Unified timeline — by thread:** [`listUnifiedTimeline`](convex/chat/unifiedTimeline.ts) — `partitionKey` = thread id for thread-attributed rows.
   - **Unified timeline — global (account):** [`listUnifiedTimelineByNamespace`](convex/chat/unifiedTimeline.ts) — index `by_namespace_eventTime` on `sourceNamespace`; consumers filter in UI if needed.

5. **Projector** — [`runProjectorTick`](convex/chat/unifiedTimeline.ts) + cron in [`convex/crons.ts`](convex/crons.ts); `PROJECTOR_ID`, dedup via `by_source_event`, trim via [`MAX_UNIFIED_TIMELINE_PER_PARTITION`](convex/chat/unifiedTimeline.ts).

6. **Schema pointer** — [`convex/models/events/unifiedTimeline.ts`](convex/models/events/unifiedTimeline.ts) table + indexes.

7. **Telemetry** — Brief pointer to apps that consume `listUnifiedTimelineByNamespace` / event detail routes (no need to duplicate every file).

**Style:** Concise prose, 2–4 mermaid diagrams (flowchart + optional sequence), no emoji per user prefs.

---

## Files summary

| Action | Path |
|--------|------|
| Edit | [`convex/chat/unifiedTimeline.ts`](convex/chat/unifiedTimeline.ts) |
| Add | [`docs/eventing/README.md`](docs/eventing/README.md) (or `architecture.md`) |

---

## Execution order

1. Implement partition key + comment in `unifiedTimeline.ts`.
2. Add `docs/eventing/` documentation.
3. Quick verify build / Convex push as usual for code changes.
