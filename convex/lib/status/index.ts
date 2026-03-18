import { ConvexError } from "convex/values";

export type WithStatus<
  T extends { data: { status: string } },
  S extends T["data"]["status"],
> = T & { data: Extract<T["data"], { status: S }> };

export function hasStatus<
  T extends { data: { status: string } },
  S extends T["data"]["status"],
>(doc: T, ...statuses: S[]): doc is WithStatus<T, S> {
  return (statuses as string[]).includes(doc.data.status);
}

export function requireStatus<
  T extends { data: { status: string } },
  S extends T["data"]["status"],
>(doc: T, ...statuses: S[]): WithStatus<T, S> {
  if (!(statuses as string[]).includes(doc.data.status)) {
    throw new ConvexError(
      `Expected status ${statuses.join("|")}, got ${doc.data.status}`,
    );
  }
  return doc as WithStatus<T, S>;
}
