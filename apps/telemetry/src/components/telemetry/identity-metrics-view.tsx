import { MetricCard } from "@/components/blocks/metric-card";

/** Placeholder until identity counters are exposed via queries again. */
export function IdentityMetricsView({
  selectedCodeId: _selectedCodeId,
}: {
  selectedCodeId: string;
}) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Registrations"
        value={undefined}
        hint="Not available in this build"
      />
      <MetricCard
        label="Static versions"
        value={undefined}
        hint="Not available in this build"
      />
      <MetricCard
        label="Runtime versions"
        value={undefined}
        hint="Not available in this build"
      />
      <MetricCard
        label="Bindings"
        value={undefined}
        hint="Not available in this build"
      />
    </section>
  );
}
