import { useCallback, useState } from "react";
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
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
        <section className="flex flex-col gap-3">
          <p className="text-sm font-medium text-muted-foreground">
            Machine-agent telemetry
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">
            A simple view into identity counts and thread activity
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            This keeps the dashboard intentionally small: top-level counts,
            agent scope, recent threads, and the latest thread-local events and
            history.
          </p>
        </section>

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
      </div>
      <TelemetryDetailSheet
        item={selectedDetailItem}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
      />
    </main>
  );
}

export default App;
