# Status

Generic utilities for narrowing discriminated unions on `data.status`. Works with any document or object whose shape is `{ data: { status: string; ... } }`.

## API

### `WithStatus<T, S>`

Type-level narrowing. Intersects `T` with the union variant(s) matching status `S`.

```ts
type ActiveMatch = WithStatus<Doc<"matches">, "active">;
// match.data.game is Id<"games"> (not optional)
```

### `hasStatus(doc, ...statuses)`

Type guard. Returns `true` if the document's status is one of the provided values, narrowing the type in conditional branches.

```ts
if (hasStatus(phase, "active", "confirmed")) {
  phase.data.target; // Id<"targets">
}

const active = phases.filter(p => hasStatus(p, "active"));
```

### `requireStatus(doc, ...statuses)`

Assertion. Returns the narrowed document or throws a `ConvexError`.

```ts
const p = requireStatus(phase, "active", "confirmed");
p.data.target; // Id<"targets">
```
