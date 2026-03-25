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
