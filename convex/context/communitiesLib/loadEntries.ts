import type { ActionCtx } from "../../_generated/server";
import { EMBEDDING_PAGE_SIZE } from "./constants";
import { projApi } from "./deps";
import type { PaginatedVersions } from "./types";

export async function loadCurrentEntryIdsPaginated(
  ctx: ActionCtx,
  namespace: string,
): Promise<string[]> {
  const ids: string[] = [];
  let cursor: string | null = null;
  let isDone = false;
  while (!isDone) {
    const result: PaginatedVersions = await ctx.runQuery(
      projApi.loadCurrentEntryIdPage,
      { namespace, paginationOpts: { cursor, numItems: EMBEDDING_PAGE_SIZE } },
    );
    for (const row of result.page) {
      if (row.data.status === "current") ids.push(row.entryId);
    }
    cursor = result.continueCursor;
    isDone = result.isDone;
  }
  return ids;
}
