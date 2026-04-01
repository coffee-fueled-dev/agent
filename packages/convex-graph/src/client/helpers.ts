import type {
  DataModelFromSchemaDefinition,
  SchemaDefinition,
  TableNamesInDataModel,
} from "convex/server";
import type { Validator } from "convex/values";
import type { EdgeDef, NodeDef } from "./types";

export function nodeSchema<
  S extends SchemaDefinition<any, boolean>,
  L extends string,
  T extends TableNamesInDataModel<DataModelFromSchemaDefinition<S>> & string,
>(_schema: S, label: L, tableName: T): NodeDef<L, T> {
  void _schema;
  return { label, tableName };
}

export function edgeSchema<L extends string>(
  label: L,
): EdgeDef<L, undefined, true>;
export function edgeSchema<
  L extends string,
  V extends Validator<any, "required", any>,
>(label: L, properties: V): EdgeDef<L, V, true>;
export function edgeSchema<L extends string>(
  label: L,
  properties: undefined,
  options: { directed: false },
): EdgeDef<L, undefined, false>;
export function edgeSchema<
  L extends string,
  V extends Validator<any, "required", any>,
>(label: L, properties: V, options: { directed: false }): EdgeDef<L, V, false>;
export function edgeSchema(
  label: string,
  properties?: Validator<any, "required", any>,
  options?: { directed: boolean },
): EdgeDef {
  return { label, properties, directed: options?.directed !== false };
}
