import { DirectAggregate } from "@convex-dev/aggregate";
import { components } from "./_generated/api";

export type MachineAgentMetric =
  | "registrations"
  | "staticVersions"
  | "runtimeVersions"
  | "bindings"
  | "messages"
  | "threads";

export type MachineAgentMetricNamespace =
  | ["global", MachineAgentMetric]
  | ["agent", string, MachineAgentMetric]
  | ["thread", string, Exclude<MachineAgentMetric, "threads">];

const aggregateComponent = (
  components as unknown as {
    aggregate: ConstructorParameters<
      typeof DirectAggregate<{
        Key: null;
        Id: string;
        Namespace: MachineAgentMetricNamespace;
      }>
    >[0];
  }
).aggregate;

export const machineAgentTelemetry = new DirectAggregate<{
  Key: null;
  Id: string;
  Namespace: MachineAgentMetricNamespace;
}>(aggregateComponent);

export function globalMetricNamespace(
  metric: MachineAgentMetric,
): ["global", MachineAgentMetric] {
  return ["global", metric];
}

export function agentMetricNamespace(
  codeId: string,
  metric: MachineAgentMetric,
): ["agent", string, MachineAgentMetric] {
  return ["agent", codeId, metric];
}

export function threadMetricNamespace(
  threadId: string,
  metric: Exclude<MachineAgentMetric, "threads">,
): ["thread", string, Exclude<MachineAgentMetric, "threads">] {
  return ["thread", threadId, metric];
}
