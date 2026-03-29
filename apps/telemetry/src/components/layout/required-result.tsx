"use client";

import type {
  PaginatedQueryArgs,
  UsePaginatedQueryReturnType,
} from "convex/react";
import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
  PaginationOptions,
  PaginationResult,
} from "convex/server";
import type { BetterOmit } from "convex-helpers";
import {
  useSessionPaginatedQuery,
  useSessionQuery,
} from "convex-helpers/react/sessions";
import type { SessionId } from "convex-helpers/server/sessions";
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
  onMissing = () => null,
}: {
  query: Query;
  args: SessionQueryArgs<Query> | "skip";
  fallback?: React.ReactNode;
  children: (result: NonNullable<FunctionReturnType<Query>>) => React.ReactNode;
  onMissing?: () => null | undefined | React.ReactNode;
}) {
  const result = useSessionQuery(
    query,
    (args === "skip" ? "skip" : args) as never,
  );

  if (args === "skip") return fallback;
  if (result === null) onMissing();
  if (!result) return fallback;

  return <>{children(result)}</>;
}

type SessionPaginatedQuery = FunctionReference<
  "query",
  "public",
  { sessionId: SessionId; paginationOpts: PaginationOptions } & Record<
    string,
    unknown
  >,
  PaginationResult<unknown>
>;

export function RequiredPaginatedResult<QUERY extends SessionPaginatedQuery>({
  query,
  args,
  initialNumItems = 10,
  fallback = defaultFallback,
  children,
}: {
  query: QUERY;
  args: BetterOmit<PaginatedQueryArgs<QUERY>, "sessionId"> | "skip";
  initialNumItems?: number;
  fallback?: React.ReactNode;
  children: (result: UsePaginatedQueryReturnType<QUERY>) => React.ReactNode;
}) {
  const result = useSessionPaginatedQuery(query, args as never, {
    initialNumItems,
  });

  if (!result) return fallback;

  return <>{children(result)}</>;
}
