import { v } from "convex/values";
import { withSystemFields } from "convex-helpers/validators";
import { dimensionFields } from "./fields";

export const vDimension = v.object(
  withSystemFields("dimensions", dimensionFields),
);
