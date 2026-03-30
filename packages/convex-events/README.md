# Convex Component Template

This is a Convex component, ready to be published on npm.

To create your own component:

1. Write code in src/component for your component. Component-specific tables,
   queries, mutations, and actions go here.
1. Write code in src/client for the Class that interfaces with the component.
   This is the bridge your users will access to get information into and out of
   your component
1. Write example usage in example/convex/example.ts.
1. Delete the text in this readme until `---` and flesh out the README.
1. Publish to npm with `bun run alpha` or `bun run release`.

To develop your component run a dev process in the example project:

```sh
bun install
bun run dev
```

`bun install` will do the install and an initial build. `bun run dev` will start a
file watcher to re-build the component, as well as the example project frontend
and backend, which does codegen and installs the component.

Modify the schema and index files in src/component/ to define your component.

Write a client for using this component in src/client/index.ts.

If you won't be adding frontend code (e.g. React components) to this component
you can delete "./react" references in package.json and "src/react/" directory.
If you will be adding frontend code, add a peer dependency on React in
package.json.

### Component Directory structure

```
.
├── README.md           documentation of your component
├── package.json        component name, version number, other metadata
├── package-lock.json   Components are like libraries, package-lock.json
│                       is .gitignored and ignored by consumers.
├── src
│   ├── component/
│   │   ├── _generated/ Files here are generated for the component.
│   │   ├── convex.config.ts  Name your component here and use other components
│   │   ├── public/   Queries and mutations exposed via ComponentApi
│   │   └── schema.ts   schema specific to this component
│   ├── client/
│   │   └── index.ts    Code that needs to run in the app that uses the
│   │                   component. Generally the app interacts directly with
│   │                   the component's exposed API (src/component/*).
│   └── react/          Code intended to be used on the frontend goes here.
│       │               Your are free to delete this if this component
│       │               does not provide code.
│       └── index.ts
├── example/            example Convex app that uses this component
│   └── convex/
│       ├── _generated/       Files here are generated for the example app.
│       ├── convex.config.ts  Imports and uses this component
│       ├── myFunctions.ts    Functions that use the component
│       └── schema.ts         Example app schema
└── dist/               Publishing artifacts will be created here.
```

---

# Convex Convex Events

[![npm version](https://badge.fury.io/js/@example%2Fconvex-events.svg)](https://badge.fury.io/js/@example%2Fconvex-events)

<!-- START: Include on https://convex.dev/components -->

- [ ] What is some compelling syntax as a hook?
- [ ] Why should you use this component?
- [ ] Links to docs / other resources?

Found a bug? Feature request?
[File it here](https://github.com/coffee-fueled-dev/agent/issues).

## Installation

Create a `convex.config.ts` file in your app's `convex/` folder and install the
component by calling `use`:

```ts
// convex/convex.config.ts
import { defineApp } from "convex/server";
import events from "@very-coffee/convex-events/convex.config.js";

const app = defineApp();
app.use(events);

export default app;
```

## Usage

Use `EventsClient` from the package root with `components.events` (the component name is `events`):

```ts
import { EventsClient } from "@very-coffee/convex-events";
import { components } from "./_generated/api";

const appEvents = new EventsClient(components.events, {
  streams: [
    { streamType: "myStream", eventTypes: ["created", "updated"] as const },
  ],
});

// In a mutation, after wiring auth as needed:
await appEvents.append.appendToStream(ctx, {
  streamType: "myStream",
  streamId: "id-1",
  eventId: crypto.randomUUID(),
  eventType: "created",
});
```

See [example/convex/example.ts](./example/convex/example.ts) for a minimal app query.

<!-- END: Include on https://convex.dev/components -->

Run the example:

```sh
bun install
bun run dev
```
