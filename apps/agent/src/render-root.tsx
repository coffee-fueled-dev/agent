import "../styles/globals.css";

import { ConvexProvider } from "convex/react";
import {
  ConvexReactSessionClient,
  SessionProvider,
} from "convex-helpers/react/sessions";
import { type ReactNode, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { useLocalStorage } from "usehooks-ts";
import { TooltipProvider } from "./components/ui/tooltip";
import { PublicEnvProvider } from "./env/index.js";

function Root({ children }: { children: ReactNode }) {
  const convexUrl = String(process.env.BUN_PUBLIC_CONVEX_URL ?? "");
  const accountToken = String(process.env.BUN_PUBLIC_ACCOUNT_TOKEN ?? "");

  const client = new ConvexReactSessionClient(convexUrl);

  return (
    <PublicEnvProvider value={{ convexUrl, accountToken }}>
      {!client ? (
        <div className="p-6 text-sm text-muted-foreground">
          Missing variable.
        </div>
      ) : (
        <ConvexProvider client={client}>
          <SessionProvider
            storageKey="cfd-agent-session-id"
            useStorage={useLocalStorage}
          >
            <TooltipProvider>{children}</TooltipProvider>
          </SessionProvider>
        </ConvexProvider>
      )}
    </PublicEnvProvider>
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
