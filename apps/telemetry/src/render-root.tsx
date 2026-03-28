import "../styles/globals.css";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { type ReactNode, StrictMode, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { TooltipProvider } from "./components/ui/tooltip";
import { PublicEnvProvider } from "./env/index.js";

function Root({ children }: { children: ReactNode }) {
  const convexUrl = String(process.env.BUN_PUBLIC_CONVEX_URL ?? "");
  const accountToken = String(process.env.BUN_PUBLIC_ACCOUNT_TOKEN ?? "");

  const client = useMemo(() => {
    if (!convexUrl) {
      return null;
    }

    return new ConvexReactClient(convexUrl);
  }, [convexUrl]);

  return (
    <PublicEnvProvider value={{ convexUrl, accountToken }}>
      {!client ? (
        <div className="p-6 text-sm text-muted-foreground">
          Missing variable.
        </div>
      ) : (
        <ConvexProvider client={client}>
          <TooltipProvider>{children}</TooltipProvider>
        </ConvexProvider>
      )}
    </PublicEnvProvider>
  );
}

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
    createRoot(elem).render(app);
  }
}
