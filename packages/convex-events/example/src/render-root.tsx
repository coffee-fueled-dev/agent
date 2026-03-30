import "./index.css";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { type ReactNode, StrictMode } from "react";
import { createRoot } from "react-dom/client";

function bunPublicConvexUrl(): string {
  // HMR rewrites `import.meta.env` → `hmr.importMeta.env`; use `?.` so missing `importMeta` does not throw.
  return String(import.meta.env?.BUN_PUBLIC_CONVEX_URL ?? "");
}

function Root({ children }: { children: ReactNode }) {
  const convexUrl = bunPublicConvexUrl();
  const client = convexUrl ? new ConvexReactClient(convexUrl) : null;

  return (
    <>
      {!client ? (
        <div
          style={{
            padding: "1.5rem",
            fontSize: "0.875rem",
            color: "#888",
          }}
        >
          Missing <code>BUN_PUBLIC_CONVEX_URL</code>. Set it in{" "}
          <code>.env.local</code> at the package root.
        </div>
      ) : (
        <ConvexProvider client={client}>{children}</ConvexProvider>
      )}
    </>
  );
}

let rootSingleton: ReturnType<typeof createRoot> | undefined;

export function renderApp(children: ReactNode) {
  const elem = document.getElementById("root");

  if (!elem) {
    throw new Error("Root element not found");
  }

  const app = (
    <StrictMode>
      <Root>{children}</Root>
    </StrictMode>
  );

  if (import.meta.hot) {
    const existingRoot = import.meta.hot.data.root as
      | ReturnType<typeof createRoot>
      | undefined;
    const root = existingRoot ?? createRoot(elem);

    if (!existingRoot) {
      import.meta.hot.data.root = root;
    }

    root.render(app);
  } else {
    rootSingleton ??= createRoot(elem);
    rootSingleton.render(app);
  }
}
