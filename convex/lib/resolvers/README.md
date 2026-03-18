# Resolver API Guide

## Overview

Resolvers provide a type-safe way to access domain entities in Convex. They wrap database documents with convenient methods for navigating relationships and querying related data.

## App Models

| Resolver | Table | Relationships |
|----------|-------|---------------|
| Archer | archers | none |
| Game | games | none |
| Target | targets | none |
| Location | locations | none |
| Match | matches | Game |
| Participant | participants | Match, Archer |
| Set | sets | Match, Target |
| End | ends | Participant, Set |
| Arrow | arrows | End |

Resolvers live in `convex/resolvers/` and are registered via `convex/resolvers/index.ts`, which is imported by `convex/schema.ts`.

## Key Concepts

### Resolver Base Class

All resolvers extend a base class created by `createResolverBase()`, which provides:

- Static methods: `tryNormalizeId`, `requireNormalizedId`, `tryGet`, `query`, `require`, `formatDisplay`
- Instance properties: `id`, `doc`, `table`, `display`
- Type-safe access to the underlying document

### Registry Pattern

Resolvers register themselves in a central registry at module load time. This allows resolvers to reference each other through the registry without direct imports, enabling type-safe lookups while avoiding circular dependencies.

## Creating a New Resolver

### Step 1: Create the Resolver File

Create a new file in `convex/resolvers/`:

```typescript
// convex/resolvers/myEntity.ts
import type { QueryCtx } from "../_generated/server";
import {
  createResolverBase,
  getResolver,
  registerResolver,
  requireFactory,
} from "./lib";

declare module "./lib" {
  interface ResolverRegistry {
    MyEntity: typeof MyEntity;
  }
}

const MyEntityBase = createResolverBase("myEntities", [
  "_id",
  "_creationTime",
  "name",
  "description",
]);

export class MyEntity extends MyEntityBase {
  static require = requireFactory(MyEntity);

  // Add custom methods here
}

registerResolver(MyEntity);
```

### Step 2: Define Display Fields

The second parameter to `createResolverBase()` specifies which fields are included in the `display` property. Choose fields that are commonly needed for UI rendering:

```typescript
const MyEntityBase = createResolverBase("myEntities", [
  "_id", // Always include
  "_creationTime", // Always include
  "name", // Commonly displayed
  "status", // Commonly displayed
]);
```

### Step 3: Add Relationship Methods

Add methods to navigate relationships to other entities:

```typescript
export class MyEntity extends MyEntityBase {
  static require = requireFactory(MyEntity);

  // Single relationship (nullable)
  async parent(ctx: QueryCtx) {
    if (!this.doc.parent) return null;
    const Parent = getResolver("Parent");
    return Parent.require(ctx, this.doc.parent);
  }

  // Single relationship (required)
  async owner(ctx: QueryCtx) {
    const Owner = getResolver("Owner");
    return Owner.require(ctx, this.doc.owner);
  }

  // Collection relationship (query)
  children(ctx: QueryCtx) {
    return ctx.db
      .query("myEntities")
      .withIndex("by_parent", (q) => q.eq("parent", this.id));
  }
}
```

### Step 4: Register the Resolver

Add your resolver to `convex/resolvers/index.ts`:

```typescript
import "./archer";
import "./game";
import "./geo";
import "./match";
import "./myEntity";  // Add new resolver
```

## Using Resolvers

### In Application Code

Import resolvers directly from their module files:

```typescript
import { Match } from "../convex/resolvers/match";
import { Archer } from "../convex/resolvers/archer";

// Use static methods
const matchId = Match.requireNormalizedId(ctx, "some-id");
const match = await Match.require(ctx, matchId);

// Use instance methods
const game = await match.game(ctx);
```

### Within Other Resolvers

Use `getResolver()` to look up other resolvers from the registry:

```typescript
async game(ctx: QueryCtx) {
  const Game = getResolver("Game");
  return Game.require(ctx, this.doc.game);
}
```

**Important**: Always use `getResolver()` within resolver methods, never import other resolvers directly.

**Why?** Direct imports between resolvers create circular dependencies (e.g., `Match` imports `Game`, `Participant` imports `Match`). The registry pattern breaks these cycles by allowing resolvers to look up each other at runtime without compile-time imports. Since Convex doesn't support dynamic imports, the registry pattern provides the same functionality with full type safety.

## Type Safety

### Module Augmentation

Each resolver augments the `ResolverRegistry` interface to provide type-safe lookups:

```typescript
declare module "./lib" {
  interface ResolverRegistry {
    MyEntity: typeof MyEntity;
  }
}
```

This enables:

- Autocomplete when calling `getResolver()`
- Full type inference for returned resolver classes
- Compile-time checking that resolvers are registered

### Type Inference Example

```typescript
// TypeScript knows this is typeof Match
const Match = getResolver("Match");

// TypeScript knows this returns Match instance
const match = await Match.require(ctx, matchId);

// Full autocomplete and type checking
const gameId = match.doc.game; // ✅
const invalid = match.doc.invalidField; // ❌ Type error
```

## Static Methods

All resolvers have these static methods available:

### `tryNormalizeId(ctx, value)`

Converts a string to a properly typed ID or null if the id was malformed for the table:

```typescript
const id = Match.tryNormalizeId(ctx, "some-string-id");
// Returns: Id<"matches"> | null
```

### `requireNormalizedId(ctx, value)`

Converts a string to a properly typed ID or throws an error if it was malformed for the table:

```typescript
const id = Match.requireNormalizedId(ctx, "some-string-id");
// Returns: Id<"matches">
```

### `tryGet(ctx, id)`

Attempts to fetch a document, returns `null` if not found:

```typescript
const match = await Match.tryGet(ctx, matchId);
// Returns: Doc<"matches"> | null
```

### `require(ctx, id)`

Fetches a document, throws an error if not found:

```typescript
const match = await Match.require(ctx, matchId);
// Returns: Match instance
// Throws: ConvexError if not found
```

### `query(ctx)`

Returns a query builder for the resolver's table:

```typescript
const matches = Match.query(ctx)
  .withIndex("by_game", (q) => q.eq("game", gameId))
  .collect();
```

### `formatDisplay(doc)`

Formats a document using the display fields:

```typescript
const display = Match.formatDisplay(matchDoc);
// Returns: Pick<Doc<"matches">, "_id" | "_creationTime" | "game">
```

## Instance Properties

All resolver instances have these properties:

### `id`

The document's ID:

```typescript
const matchId = match.id; // Id<"matches">
```

### `doc`

The underlying document:

```typescript
const doc = match.doc; // Doc<"matches">
```

### `table`

The table name:

```typescript
const table = match.table; // "matches"
```

### `display`

A subset of the document with only display fields:

```typescript
const display = match.display;
// Returns: Pick<Doc<"matches">, "_id" | "_creationTime" | "game">
```

## Best Practices

### 1. Always Register Resolvers

Every resolver must:

- Declare its type in `ResolverRegistry` via module augmentation
- Call `registerResolver()` at the bottom of the file
- Be imported in `convex/resolvers/index.ts`

### 2. Use `getResolver()` for Cross-Resolver References

```typescript
// ✅ Good - uses registry
async game(ctx: QueryCtx) {
  const Game = getResolver("Game");
  return Game.require(ctx, this.doc.game);
}

// ❌ Bad - direct import may cause circular dependency
import { Game } from "./game";
async game(ctx: QueryCtx) {
  return Game.require(ctx, this.doc.game);
}
```

### 3. Handle Nullable Relationships

Always check for null when relationships are optional:

```typescript
async parent(ctx: QueryCtx) {
  if (!this.doc.parent) return null;
  const Parent = getResolver("Parent");
  return Parent.require(ctx, this.doc.parent);
}
```

### 4. Use Appropriate Return Types

- **Single entity**: `async method() => Promise<ResolverInstance | null>`
- **Collection**: `method() => QueryInitializer` (returns a query builder)
- **Array of IDs**: `async *method() => AsyncGenerator<ResolverInstance>`

### 5. Keep Display Fields Minimal

Only include fields that are commonly needed for UI rendering:

```typescript
// ✅ Good - minimal, commonly used fields
createResolverBase("matches", ["_id", "_creationTime", "game"]);

// ❌ Bad - too many fields
createResolverBase("matches", [
  "_id",
  "_creationTime",
  "game",
  "internalNotes",
  "metadata",
  // ... many more
]);
```

## Complete Example

Here's the Match resolver from this app:

```typescript
import type { QueryCtx } from "../_generated/server";
import {
  createResolverBase,
  getResolver,
  registerResolver,
  requireFactory,
} from "./lib";

declare module "./lib" {
  interface ResolverRegistry {
    Match: typeof Match;
  }
}

const MatchBase = createResolverBase("matches", [
  "_id",
  "_creationTime",
  "game",
]);

export class Match extends MatchBase {
  static require = requireFactory(Match);

  async game(ctx: QueryCtx) {
    const Game = getResolver("Game");
    return Game.require(ctx, this.doc.game);
  }
}

registerResolver(Match);
```

## Troubleshooting

### Resolver Not Registered Error

If you see `Resolver not registered: SomeResolver`, ensure:

1. The resolver calls `registerResolver()` at the bottom
2. The resolver is imported in `convex/resolvers/index.ts`
3. `convex/schema.ts` imports `./resolvers`

### Circular Dependency Issues

If you encounter circular dependency errors:

- Ensure you're using `getResolver()` instead of direct imports
- Check that all resolvers are registered before use
- Verify `convex/resolvers/index.ts` imports all resolvers

### Type Errors with `getResolver()`

If TypeScript complains about `getResolver()`:

- Ensure the resolver augments `ResolverRegistry` interface
- Check that the resolver name matches exactly (case-sensitive)
- Verify the resolver is imported in `convex/resolvers/index.ts`
