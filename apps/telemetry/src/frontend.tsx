import { ConvexProvider, ConvexReactClient } from "convex/react";
import { StrictMode, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "../styles/globals.css";

function Root() {
  const convexUrl = process.env.BUN_PUBLIC_CONVEX_URL;

  const client = useMemo(() => {
    if (!convexUrl) {
      return null;
    }

    return new ConvexReactClient(convexUrl);
  }, [convexUrl]);

  if (!client) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        `BUN_PUBLIC_CONVEX_URL` is not configured for this app.
      </div>
    );
  }

  return (
    <ConvexProvider client={client}>
      <App />
    </ConvexProvider>
  );
}

const elem = document.getElementById("root");

if (!elem) {
  throw new Error("Root element not found");
}

const app = (
  <StrictMode>
    <Root />
  </StrictMode>
);

if (import.meta.hot) {
  // With hot module reloading, `import.meta.hot.data` is persisted.
  const existingRoot = import.meta.hot.data.root as
    | ReturnType<typeof createRoot>
    | undefined;
  const root = existingRoot ?? createRoot(elem);

  if (!existingRoot) {
    import.meta.hot.data.root = root;
  }

  root.render(app);
} else {
  // The hot module reloading API is not available in production.
  createRoot(elem).render(app);
}
