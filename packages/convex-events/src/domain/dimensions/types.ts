import type {
  DataModelFromSchemaDefinition,
  SchemaDefinition,
  TableNamesInDataModel,
} from "convex/server";
import type { GenericId, Infer } from "convex/values";
import type { dimensions } from "./tables";
import type { vDimension } from "./validators";

export type DimensionDoc = Infer<typeof vDimension>;
type ExpectedSchema = {
  dimensions: typeof dimensions;
};
export type ExpectedDataModel = DataModelFromSchemaDefinition<
  SchemaDefinition<ExpectedSchema, true>
>;
type ExpectedTableNames = TableNamesInDataModel<ExpectedDataModel>;
export type ExpectedId<TableName extends ExpectedTableNames> =
  GenericId<TableName>;
