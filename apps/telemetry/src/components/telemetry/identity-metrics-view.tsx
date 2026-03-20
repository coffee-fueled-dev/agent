import { useQuery } from "convex/react";
import { MetricCard } from "@/components/blocks/metric-card";
import { InlineCountSummary } from "@/components/formatters";
import { api } from "../../../../../convex/_generated/api.js";

export function IdentityMetricsView({
  selectedCodeId,
}: {
  selectedCodeId: string;
}) {
  const globalCounts = useQuery(
    api.llms.identityTelemetry.getGlobalIdentityCounts,
    {},
  );
  const scopedCounts = useQuery(
    api.llms.identityTelemetry.getMachineAgentIdentityCounts,
    selectedCodeId === "all" ? "skip" : { codeId: selectedCodeId },
  );

  const visibleCounts = selectedCodeId === "all" ? globalCounts : scopedCounts;

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Registrations"
        value={visibleCounts?.registrations}
        hint="Known machine-agent identities"
      />
      <MetricCard
        label="Static versions"
        value={visibleCounts?.staticVersions}
        hint="Static capability snapshots"
      />
      <MetricCard
        label="Runtime versions"
        value={visibleCounts?.runtimeVersions}
        hint="Effective runtime capability states"
      />
      <MetricCard
        label="Bindings"
        value={visibleCounts?.bindings}
        hint={
          <InlineCountSummary
            items={[
              {
                key: "messages",
                label: "Messages",
                value: visibleCounts?.messages,
              },
              ...(visibleCounts?.threads !== undefined
                ? [
                    {
                      key: "threads",
                      label: "Threads",
                      value: visibleCounts.threads,
                    },
                  ]
                : []),
            ]}
          />
        }
      />
    </section>
  );
}
