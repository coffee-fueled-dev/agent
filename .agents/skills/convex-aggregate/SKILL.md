---
name: convex-dev-aggregate
description: Keep track of sums and counts in a denormalized and scalable way. Use this skill whenever working with Aggregate or related Convex component functionality.
---

# Aggregate

## Instructions

The Aggregate component maintains denormalized counts and sums for efficient data aggregation in O(log n) time instead of O(n) table scans. It provides sorted key-value storage with range queries, supporting arbitrary Convex values as keys for flexible grouping and partitioning. The component handles both table-based aggregation with automatic sync and lower-level manual operations.

### Installation

```bash
npm install @convex-dev/aggregate
```

## Use cases

- **Building leaderboards and rankings** where you need to quickly find percentile scores, user rankings, or counts above/below thresholds without scanning all records
- **Implementing offset-based pagination** for traditional page-by-page navigation through large datasets, complementing Convex's cursor-based pagination
- **Creating random access patterns** like shuffling playlists or selecting random items by using total counts and index-based lookups
- **Tracking analytics and metrics** such as message counts per time period, user activity summaries, or grouped statistics across multiple dimensions
- **Supporting multi-tenant applications** using namespaces to isolate aggregations per tenant while maintaining high throughput

## How it works

You define a `TableAggregate` instance that specifies how to extract sort keys and sum values from your table documents. The component maintains a separate denormalized data structure that stays in sync as you call `insert()`, `replace()`, and `delete()` methods alongside your regular database operations.

The aggregate supports flexible grouping through tuple-based sort keys like `[game, username, score]` and prefix-based queries to aggregate at different levels. For completely separate data partitions, namespaces provide isolated aggregation with higher throughput by avoiding interference between unrelated data.

Core query methods include `count()` for totals within bounds, `sum()` for value aggregation, `at()` for index-based access, `indexOf()` for ranking, and `max()`/`min()` for extremes. All operations work with optional bounds and prefix filters to scope queries to specific data ranges.

## When NOT to use

- When a simpler built-in solution exists for your specific use case
- If you are not using Convex as your backend
- When the functionality provided by Aggregate is not needed

## Resources

- [npm package](https://www.npmjs.com/package/%40convex-dev%2Faggregate)
- [GitHub repository](https://github.com/get-convex/aggregate)
- [Convex Components Directory](https://www.convex.dev/components/aggregate)
- [Convex documentation](https://docs.convex.dev)