/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    public: {
      append: {
        appendToStream: FunctionReference<
          "mutation",
          "internal",
          {
            actor?: { byId: string; byType: string };
            causationId?: string;
            correlationId?: string;
            eventId: string;
            eventTime?: number;
            eventType: string;
            expectedVersion?: number;
            metadata?: Record<string, string | number | boolean | null>;
            payload?: any;
            streamId: string;
            streamType: string;
          },
          {
            actor?: { byId: string; byType: string };
            causationId?: string;
            correlationId?: string;
            eventId: string;
            eventTime: number;
            eventType: string;
            globalSequence: number;
            metadata?: Record<string, string | number | boolean | null>;
            payload?: any;
            streamId: string;
            streamType: string;
            streamVersion: number;
          },
          Name
        >;
      };
      projectors: {
        advanceCheckpoint: FunctionReference<
          "mutation",
          "internal",
          {
            lastSequence: number;
            leaseOwner?: string;
            projector: string;
            releaseClaim?: boolean;
            streamType: string;
          },
          {
            lastSequence: number;
            leaseExpiresAt?: number;
            leaseOwner?: string;
            projector: string;
            streamType: string;
            updatedTime: number;
          },
          Name
        >;
        claimOrReadCheckpoint: FunctionReference<
          "mutation",
          "internal",
          {
            leaseDurationMs?: number;
            leaseOwner?: string;
            projector: string;
            streamType: string;
          },
          {
            checkpoint: {
              lastSequence: number;
              leaseExpiresAt?: number;
              leaseOwner?: string;
              projector: string;
              streamType: string;
              updatedTime: number;
            };
            claimed: boolean;
          },
          Name
        >;
        listUnprocessedEvents: FunctionReference<
          "query",
          "internal",
          { limit?: number; projector: string; streamType: string },
          Array<{
            actor?: { byId: string; byType: string };
            causationId?: string;
            correlationId?: string;
            eventId: string;
            eventTime: number;
            eventType: string;
            globalSequence: number;
            metadata?: Record<string, string | number | boolean | null>;
            payload?: any;
            streamId: string;
            streamType: string;
            streamVersion: number;
          }>,
          Name
        >;
        readCheckpoint: FunctionReference<
          "query",
          "internal",
          { projector: string; streamType: string },
          {
            lastSequence: number;
            leaseExpiresAt?: number;
            leaseOwner?: string;
            projector: string;
            streamType: string;
            updatedTime: number;
          } | null,
          Name
        >;
      };
      read: {
        getEvent: FunctionReference<
          "query",
          "internal",
          { eventId: string; streamId: string; streamType: string },
          {
            actor?: { byId: string; byType: string };
            causationId?: string;
            correlationId?: string;
            eventId: string;
            eventTime: number;
            eventType: string;
            globalSequence: number;
            metadata?: Record<string, string | number | boolean | null>;
            payload?: any;
            streamId: string;
            streamType: string;
            streamVersion: number;
          } | null,
          Name
        >;
        listCategoryEvents: FunctionReference<
          "query",
          "internal",
          {
            paginationOpts: {
              cursor: string | null;
              endCursor?: string | null;
              id?: number;
              maximumBytesRead?: number;
              maximumRowsRead?: number;
              numItems: number;
            };
            streamType: string;
          },
          any,
          Name
        >;
        listStreamEvents: FunctionReference<
          "query",
          "internal",
          {
            paginationOpts: {
              cursor: string | null;
              endCursor?: string | null;
              id?: number;
              maximumBytesRead?: number;
              maximumRowsRead?: number;
              numItems: number;
            };
            streamId: string;
            streamType: string;
          },
          any,
          Name
        >;
      };
      streams: {
        getStream: FunctionReference<
          "query",
          "internal",
          { streamId: string; streamType: string },
          {
            createdTime: number;
            lastEventSequence: number | null;
            streamId: string;
            streamType: string;
            updatedTime: number;
            version: number;
          } | null,
          Name
        >;
        getStreamVersion: FunctionReference<
          "query",
          "internal",
          { streamId: string; streamType: string },
          number,
          Name
        >;
      };
    };
  };
