# Example app

Components need an app that uses them in order to run codegen.

An example app is also useful for testing and documentation.

Run from `packages/convex-events`: `bun run dev` (Convex + Bun fullstack example). Set `BUN_PUBLIC_CONVEX_URL` in `.env.local` to your Convex URL (same host as `npx convex dev`).

## Throughput page (`/throughput`)

This page is an **interactive playground**: it schedules appends from the **browser**, compares a **target** mutation rate to **measured completions** (successful `appendEvent` round-trips), and shows **component metrics** plus **event-bus FIFO bucket** fill levels.

It is **not** a benchmark of how the events stack “scales” in Convex. The load loop runs **one mutation at a time** (`await` each append), so the **delivery rate is dominated by client pacing and per-mutation latency** (network + server work), not by maximum backend throughput. A low “measured delivery” versus a high target usually means the **serial client** cannot start the next mutation until the previous one finishes—not that the component is necessarily saturated.

To **quantify** backend behavior (scaling, cost, limits), use the **Convex dashboard** (function duration, invocations, errors, retries) and **`npx convex insights`** (documents read/written, bytes) while driving load with **overlapping** mutations (multiple workers, scripts, or clients), not this page alone.
