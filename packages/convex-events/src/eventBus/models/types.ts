import type {
  DataModelFromSchemaDefinition,
  SchemaDefinition,
  TableNamesInDataModel,
} from "convex/server";
import type { GenericId, Infer } from "convex/values";
import type {
  eventBusCount,
  eventBusDimensions,
  eventBusEntries,
  eventBusEvictionBuffer,
} from "./tables";
import type {
  vEventBusDimension,
  vEventBusEntry,
} from "./validators";

export type EventBusDimensionDoc = Infer<typeof vEventBusDimension>;
export type EventBusEntryDoc = Infer<typeof vEventBusEntry>;

type ExpectedSchema = {
  eventBusDimensions: typeof eventBusDimensions;
  eventBusEntries: typeof eventBusEntries;
  eventBusEvictionBuffer: typeof eventBusEvictionBuffer;
  eventBusCount: typeof eventBusCount;
};
export type ExpectedDataModel = DataModelFromSchemaDefinition<
  SchemaDefinition<ExpectedSchema, true>
>;
type ExpectedTableNames = TableNamesInDataModel<ExpectedDataModel>;
export type ExpectedId<TableName extends ExpectedTableNames> =
  GenericId<TableName>;
