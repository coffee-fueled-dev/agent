---
name: convex-dev-sharded-counter
description: Scalable counter that can increment and decrement with high throughput. Use this skill whenever working with Sharded Counter or related Convex component functionality.
---

# Sharded Counter

## Instructions

A scalable counter component that distributes count operations across multiple document shards to achieve high throughput. It provides atomic increment/decrement operations that can run in parallel without contention, while maintaining consistency and reactivity through Convex's built-in systems. The component includes methods for precise counting, estimated counting to reduce read contention, and rebalancing for optimal shard distribution.

### Installation

```bash
npm install @convex-dev/sharded-counter
```

## Use cases

- **Real-time voting or rating systems** where thousands of users might vote simultaneously on content, requiring high-throughput counter updates without blocking
- **Live engagement tracking** like counting active users, page views, or social media interactions that need to update frequently with minimal latency
- **Game leaderboards and scoring** where player actions generate rapid score updates that must remain consistent across concurrent gameplay sessions
- **Resource usage monitoring** such as tracking API calls, file downloads, or system events where accurate counts are needed despite high-frequency updates
- **Social media metrics** like counting likes, shares, or comments on viral content that experiences sudden traffic spikes

## How it works

The component distributes counter values across multiple document shards to avoid write contention when multiple mutations modify the same counter simultaneously. You configure the number of shards per counter key, with more shards providing higher write throughput at the cost of slower read operations.

The main API provides methods like `counter.inc()`, `counter.add()`, and `counter.count()` for basic operations, plus `counter.estimateCount()` for faster reads that sample fewer shards. For counter-specific operations, you can create focused instances with `counter.for("keyName")` that operate on a single key.

To integrate with existing tables, the component supports three patterns: manual counter updates in mutations, encapsulated write functions that always update counters, or automatic triggers that respond to table changes. For backfilling existing data, it provides strategies for both append-only and mutable datasets using cursor-based batch processing.

## When NOT to use

- When a simpler built-in solution exists for your specific use case
- If you are not using Convex as your backend
- When the functionality provided by Sharded Counter is not needed

## Resources

- [npm package](https://www.npmjs.com/package/%40convex-dev%2Fsharded-counter)
- [GitHub repository](https://github.com/get-convex/sharded-counter)
- [Convex Components Directory](https://www.convex.dev/components/sharded-counter)
- [Convex documentation](https://docs.convex.dev)