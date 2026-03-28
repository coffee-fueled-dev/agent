import { AppShell } from "@/components/layout/app-shell";
import { renderApp } from "../../render-root";

renderApp(
  <AppShell
    current="telemetry"
    eyebrow="Machine-agent telemetry"
    title="A simple view into identity counts and thread activity"
    description="This keeps the dashboard intentionally small: top-level counts, agent scope, recent threads, and the latest thread-local events and history."
  >
    <>Coming soon</>
  </AppShell>,
);
