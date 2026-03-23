import { ConvexProvider, ConvexReactClient } from "convex/react";
import { type ReactNode, StrictMode, useMemo } from "react";
import { createRoot } from "react-dom/client";
import "../styles/globals.css";
import { TooltipProvider } from "./components/ui/tooltip";

function Root({ children }: { children: ReactNode }) {
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
      <TooltipProvider>{children}</TooltipProvider>
    </ConvexProvider>
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
