import { GraphClient } from "../graph/client";
import { components } from "./_generated/api";
import { graphConfig } from "./graph.config";

export const graph = new GraphClient(components.graph, graphConfig);
