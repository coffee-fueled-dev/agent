import { DirectAggregate } from "@convex-dev/aggregate";
import { components } from "../_generated/api";

export type GraphAggregateNamespace = ["degree"] | ["degree", string];

export const graphAggregate = new DirectAggregate<{
  Key: number | null;
  Id: string;
  Namespace: GraphAggregateNamespace;
}>(components.aggregate);
