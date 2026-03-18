# Facts Component

Use the `facts` component when your app keeps asking the same structural questions and the source-of-truth tables are awkward to query directly.

Typical examples:

- what is the latest unfinished item for this user?
- where does this entity sit in an ordered sequence?
- what is the current tail of some partition?
- which entities are connected by a simple graph relationship?
- what small piece of derived metadata should be available everywhere in realtime?

The component is for storing normalized, query-friendly projections of domain state. It is not where app rules live. App code still decides what the facts mean.

## Start Here

Reach for facts when all of the following are true:

- your source-of-truth model is correct, but hard to read from repeatedly
- you need fast, repeatable answers to structural questions
- the same derived view will be useful in more than one place
- the projection can be kept in sync from mutations or events

Do not reach for facts when:

- you are storing the canonical source of truth
- you are encoding business-policy decisions directly in the component
- a normal query over the domain tables is already simple enough
- the projection is so specific that only one call site will ever care

## How To Think About It

Model the problem in four pieces:

1. `namespace`
   Use this for the top-level projection boundary. For example: one project, one workflow instance, one document.
2. `items`
   Store the entities you want to ask questions about.
3. `edges`
   Store relationships between items when reachability or graph traversal matters.
4. `partitions`
   Store summarized slices of ordered items, like `tail`, `head`, or `count`.

If you are unsure whether something should be an item attr, an edge, or a partition:

- use an item attr for metadata you want to read along with that item
- use an edge for relationships between two entities
- use a partition when you repeatedly care about the head/tail/count of some subset

## Common Problem Patterns

### 1. Ordered Progression

Problem: "I need to know where an item sits in a sequence, and whether it is the latest unfinished one."

Model:

- one item per ordered entity
- `order` tuple for stable sort order
- partitions like `confirmed`, `unfinished`, `active`

Then query with:

- `facts.eval.orderedFacts()` when you need the full ordered list
- `facts.eval.deriveSelection()` when you need to compare a selected entity against partition tails

Example: tasks in a checklist, lessons in a course, or steps in an onboarding flow.

### 2. Visibility Windows

Problem: "A viewer should only see data up to some derived boundary."

Model:

- store the viewer-relevant boundary as an item attr
- keep it in sync during projection writes

Example: a project fact can carry `latestPublishedVersion`, then app queries can hide draft-only content without recomputing that boundary each time.

### 3. Latest Active or Latest Unfinished

Problem: "Give me the current active item" or "only the latest unfinished item can be resumed."

Model:

- ordered items
- partitions such as `active_item` or `unfinished_item`

Then query with:

- `facts.eval.partitionTail()` if you only need the tail entity
- `facts.eval.deriveSelection()` if you need to know whether a selected entity matches the tail

### 4. Graph Reachability

Problem: "What entities are directly connected from this one through some relationship?"

Model:

- items for the entities
- edges for the relationship kinds you care about

Then query with:

- `facts.eval.reachable()`

Keep this for simple graph-style questions. If the logic starts turning into domain policy, move that interpretation back into app code.

### 5. Shared Derived Metadata

Problem: "Multiple screens need the same small derived value."

Model:

- attach that value to `attrs` on the relevant fact item

Examples:

- latest published version number
- current active task id
- summary status flags

This keeps the projection useful without turning it into a copy of the entire domain model.

## Designing A Good Projection

A good facts projection is:

- stable: item identities do not churn unnecessarily
- minimal: only store what helps answer repeated questions
- generic: focus on structure, not app-specific decisions
- cheap to sync: easy to update when the source tables change

A bad facts projection usually looks like:

- copying every field from the source tables
- encoding rules like "user may do X" inside the projection itself
- creating too many narrowly named entity types or partitions for one-off queries
- storing data that is easier to read directly from the domain tables

## Recommended Workflow

When adding a new use of facts:

1. Write down the exact question you want to answer.
2. Decide whether the answer is about order, partition boundaries, reachability, or item metadata.
3. Define the smallest set of items, edges, attrs, and partitions needed.
4. Add those shapes to the typed config in `convex/clients/facts.ts`.
5. Sync them from the mutation or projector that already owns the source-of-truth update.
6. Read them through the typed client from app code.

If you cannot describe the question without domain policy language like "allowed", "visible", or "can edit", that is a sign the facts should probably expose structure, and the app should interpret the rule afterward.

## Using The Typed Client

App code should use the `FactsClient` wrapper rather than calling component internals directly.

The client gives you:

- typed entity types
- typed partition names
- typed edge kinds
- typed attrs per entity type
- query vs mutation context separation

Create a domain-specific singleton in `convex/clients/facts.ts`:

```typescript
import { components } from "../_generated/api";
import { FactsClient } from "../components/facts/client";

const factsConfig = {
  entities: [
    {
      entityType: "task",
      states: ["todo", "in_progress", "done"],
      attrs: { assigneeId: "string", projectId: "string" },
    },
  ],
  edgeKinds: ["contains", "depends_on", "ordered_next"],
  partitions: ["done_task", "unfinished_task", "active_task"],
} as const;

export const facts = new FactsClient(components.facts, factsConfig);
```

Then use:

- `facts.batch(namespace)` to write a projection
- `facts.eval.orderedFacts()` to read ordered items
- `facts.eval.deriveSelection()` to compare a selected item with partition boundaries
- `facts.eval.partitionTail()` to fetch just a tail
- `facts.eval.reachable()` to traverse simple edges

## Component Boundary

Keep these responsibilities outside the component:

- source-of-truth domain tables
- discriminated union lifecycle models
- domain-specific rule semantics
- session/auth concerns

Keep these responsibilities inside the component:

- generic fact storage
- denormalized partition summaries
- graph edges between fact entities
- generic read/write APIs for invariant-oriented lookups
- sync cursor metadata for future event consumption

## Internal Model

If you need to debug or extend the component, the storage model is:

- `fact_items`
- `fact_edges`
- `fact_partitions`
- `fact_cursors`

Important fields:

- `namespace`: top-level projection scope
- `scope`: optional sub-scope
- `entityType`: fact category
- `state`: lifecycle/status label
- `order`: numeric tuple used for stable ordering
- `sourceVersion`: monotonic version for event-ready sync

Most users of the component should not need to care about these tables directly. Focus on the problem you are trying to answer, then map it onto items, edges, attrs, and partitions.

## Sync Model

The component currently uses direct synchronous sync from app mutations.

Planned evolution:

1. app mutation writes source-of-truth tables
2. app mutation upserts normalized facts into this component
3. future event component emits domain events
4. this component consumes the event stream and updates the same projection tables

`fact_cursors` and `sourceVersion` exist to support that migration path without redesigning the schema.

## Design Principles

- facts are generic infrastructure, not copied domain models
- the component answers structural questions, not business-policy questions
- app code can change rule semantics without changing the facts schema
- the schema is designed to support both direct sync now and event-driven projection later
- the client provides compile-time safety over the generic component API via registration config
