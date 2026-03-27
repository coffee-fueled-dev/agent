import type { PaginationResult } from "convex/server";

export type PaginatedVersions = PaginationResult<{
  entryId: string;
  data: { status: string };
}>;

export type StagingEdgePage = PaginationResult<{
  from: string;
  to: string;
  weight: number;
}>;

export type StagingAssignmentPage = PaginationResult<{
  nodeId: string;
  communityId: number;
}>;
