# Events

`events` is a small Convex-native event sourcing component for app-owned domain
events.

It stores immutable events in linear streams, keeps per-stream versions for
optimistic concurrency, and exposes projector checkpoints so app code can build
local projections or push events out to other systems.

## Good Fit

Use it when you need:

- append-only domain events
- per-stream expected-version checks
- replay by stream for aggregate reconstruction
- replay by category for projectors
- durable checkpoints for push-out workers or other Convex components

Examples:

- order, booking, or match lifecycle events
- event-fed read models inside the app
- app-owned events mirrored to another Convex component
- app-owned events pushed to Kafka, NATS, or webhooks by a worker

## Non-Goals

This v1 does not try to own:

- domain command handling
- workflow execution
- app-specific projections
- branching or merge-aware causal history
- external broker delivery guarantees
- cross-system global truth

It is also not a Kafka or NATS replacement. It is an app-local event store with
ergonomic reads and projector checkpoints.

## App Config

Register stream types in app code. Optionally add `payloads` to get typed
payloads on `appendToStream` args and `EventEntry` results (uses Convex
`PropertyValidators` + `ObjectType` for compile-time inference):

```ts
import { v } from "convex/values";
import type { EventsConfig } from "./components/events/types";

export const eventsConfig = {
  streams: [
    {
      streamType: "match",
      eventTypes: ["created", "started", "completed"],
      payloads: {
        created: { matchName: v.string() },
        started: { startedBy: v.string() },
        completed: { winnerId: v.string(), score: v.number() },
      },
    },
  ],
} as const satisfies EventsConfig;
```

## Client

```ts
import { components } from "../_generated/api";
import { EventsClient } from "./components/events/client";
import { eventsConfig } from "./events.config";

export const events = new EventsClient(components.events, eventsConfig);
```

Write:

```ts
await events.append.appendToStream(ctx, {
  streamType: "match",
  streamId: matchId,
  eventId: eventId,
  eventType: "started",
  expectedVersion: 1,
  payload: { startedBy: archerId },
});
```

Read:

```ts
const stream = await events.streams.getVersion(ctx, {
  streamType: "match",
  streamId: matchId,
});

const page = await events.read.listStreamEvents(ctx, {
  streamType: "match",
  streamId: matchId,
  paginationOpts,
});
```

Project:

```ts
const { checkpoint } = await events.projectors.claimOrReadCheckpoint(ctx, {
  projector: "facts:matches",
  streamType: "match",
  leaseOwner: "worker-1",
  leaseDurationMs: 30_000,
});

const pending = await events.projectors.listUnprocessed(ctx, {
  projector: "facts:matches",
  streamType: "match",
  limit: 100,
});
```

## Component Boundary

Keep these responsibilities inside the component:

- generic event storage
- versioned stream append
- category replay
- projector checkpoint persistence

Keep these responsibilities outside the component:

- business rules
- aggregate commands
- app-specific read models
- transport adapters for external brokers

## Internal Model

The storage model is:

- `event_streams`
- `event_entries`
- `event_projector_checkpoints`

Important fields:

- `streamType`, `streamId`: stream identity
- `streamVersion`: stream-local order
- `globalSequence`: app-wide replay order for projectors
- `expectedVersion`: optimistic concurrency input on append
- `lastSequence`: durable projector progress

## Push-Out Model

The component does not embed Kafka, NATS, or webhook adapters.

Instead:

1. app code appends events
2. a projector or worker reads category events in `globalSequence` order
3. the worker updates its checkpoint after successful processing
4. the worker may write a local projection, call another Convex component, or
   publish to external infrastructure

This keeps the component small while still making push-out practical.
