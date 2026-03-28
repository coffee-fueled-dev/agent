import { identityMetricDedup } from "./identityMetricDedup";
import {
  machineAgentRegistrations,
  machineAgentRuntimeVersions,
  machineAgentStaticVersions,
  machineAgentTurnBindings,
} from "./machineAgent";

export * from "./identityMetricDedup";
export * from "./machineAgent";

export default {
  machineAgentRegistrations,
  machineAgentStaticVersions,
  machineAgentRuntimeVersions,
  machineAgentTurnBindings,
  identityMetricDedup,
};
