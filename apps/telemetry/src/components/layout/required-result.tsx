"use client";

import {
  type PaginatedQueryArgs,
  type UsePaginatedQueryReturnType,
  usePaginatedQuery,
  useQuery,
} from "convex/react";
import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
  PaginationOptions,
  PaginationResult,
} from "convex/server";
import type { BetterOmit } from "convex-helpers";
import type React from "react";
import { Empty } from "../ui/empty";
import { Spinner } from "../ui/spinner";

const defaultFallback = (
  <Empty>
    <Spinner />
  </Empty>
);

type SessionQueryArgs<Query extends FunctionReference<"query">> = BetterOmit<
  FunctionArgs<Query>,
  "sessionId"
>;

export function RequiredResult<Query extends FunctionReference<"query">>({
  query,
  args,
  fallback = defaultFallback,
  children,
}: {
  query: Query;
  args: SessionQueryArgs<Query>;
  fallback?: React.ReactNode;
  children: (result: NonNullable<FunctionReturnType<Query>>) => React.ReactNode;
}) {
  const result = useQuery(query, args as never);

  if (result === null) throw new Error("Not found");
  if (!result) return fallback;

  return <>{children(result)}</>;
}

type PaginatedQuery = FunctionReference<
  "query",
  "public",
  { paginationOpts: PaginationOptions },
  PaginationResult<unknown>
>;

export function RequiredPaginatedResult<QUERY extends PaginatedQuery>({
  query,
  args,
  initialNumItems = 10,
  fallback = defaultFallback,
  children,
}: {
  query: QUERY;
  args: PaginatedQueryArgs<QUERY>;
  initialNumItems?: number;
  fallback?: React.ReactNode;
  children: (result: UsePaginatedQueryReturnType<QUERY>) => React.ReactNode;
}) {
  const result = usePaginatedQuery(query, args, { initialNumItems });

  if (!result) return fallback;

  return <>{children(result)}</>;
}
