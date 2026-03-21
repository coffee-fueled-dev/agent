import { useCallback, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { IdentityMetricsView } from "@/components/telemetry/identity-metrics-view";
import { ScopeThreadSidebar } from "@/components/telemetry/scope-thread-sidebar";
import { TelemetryDetailSheet } from "@/components/telemetry/telemetry-detail-sheet";
import { ThreadInspectorView } from "@/components/telemetry/thread-inspector-view";
import type { TelemetryDetailItem } from "@/components/telemetry/types";

export function App() {
  const [selectedCodeId, setSelectedCodeId] = useState("all");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedDetailItem, setSelectedDetailItem] =
    useState<TelemetryDetailItem | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  const handleSelectedThreadChange = useCallback((threadId: string | null) => {
    setDetailSheetOpen(false);
    setSelectedDetailItem(null);
    setSelectedThreadId(threadId);
  }, []);

  const handleSelectDetail = useCallback((item: TelemetryDetailItem) => {
    setSelectedDetailItem(item);
    setDetailSheetOpen(true);
  }, []);

  return (
    <>
      <AppShell
        current="telemetry"
        eyebrow="Machine-agent telemetry"
        title="A simple view into identity counts and thread activity"
        description="This keeps the dashboard intentionally small: top-level counts, agent scope, recent threads, and the latest thread-local events and history."
      >
        <IdentityMetricsView selectedCodeId={selectedCodeId} />

        <section className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <ScopeThreadSidebar
            selectedCodeId={selectedCodeId}
            setSelectedCodeId={setSelectedCodeId}
            selectedThreadId={selectedThreadId}
            onSelectedThreadChange={handleSelectedThreadChange}
          />
          <ThreadInspectorView
            selectedThreadId={selectedThreadId}
            onSelectDetail={handleSelectDetail}
          />
        </section>
      </AppShell>
      <TelemetryDetailSheet
        item={selectedDetailItem}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
      />
    </>
  );
}

export default App;
