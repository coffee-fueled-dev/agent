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
      queries: {
        getAgentRegistration: FunctionReference<
          "query",
          "internal",
          { agentId: string },
          null | {
            _id: string;
            agentId: string;
            latestRuntimeHash?: string;
            latestStaticHash: string;
            metadata?: Record<string, any>;
            name: string;
            updatedAt: number;
          },
          Name
        >;
        getAgentVersionHistory: FunctionReference<
          "query",
          "internal",
          { agentId: string; limit?: number },
          {
            staticVersions: Array<{
              _id: string;
              createdAt: number;
              registrationId: string;
              staticHash: string;
              staticSnapshot?: any;
            }>;
          },
          Name
        >;
        getRuntimeVersionsForStaticVersion: FunctionReference<
          "query",
          "internal",
          { limit?: number; staticVersionId: string },
          {
            runtimeVersions: Array<{
              _id: string;
              createdAt: number;
              runtimeHash: string;
              runtimeSnapshot?: any;
              staticVersionId: string;
            }>;
          },
          Name
        >;
        getToolRegistration: FunctionReference<
          "query",
          "internal",
          { toolKey: string },
          null | {
            _id: string;
            latestToolHash: string;
            metadata?: Record<string, any>;
            staticSnapshot: any;
            toolKey: string;
            updatedAt: number;
          },
          Name
        >;
        getToolVersionHistory: FunctionReference<
          "query",
          "internal",
          { limit?: number; toolKey: string },
          {
            toolVersions: Array<{
              _id: string;
              createdAt: number;
              registrationId: string;
              staticSnapshot: any;
              toolHash: string;
            }>;
          },
          Name
        >;
        getTurnBinding: FunctionReference<
          "query",
          "internal",
          { messageId: string },
          null | {
            _id: string;
            agentId: string;
            agentName: string;
            createdAt: number;
            messageId: string;
            registrationId: string;
            runtimeHash: string;
            runtimeSnapshot?: any;
            runtimeVersionId: string;
            sessionId?: string;
            staticHash: string;
            staticSnapshot?: any;
            staticVersionId: string;
            threadId: string;
            toolRefs?: Array<{
              toolHash: string;
              toolKey: string;
              toolVersionId: string;
            }>;
          },
          Name
        >;
        listTurnBindingsForThread: FunctionReference<
          "query",
          "internal",
          { limit?: number; threadId: string },
          {
            bindings: Array<{
              _id: string;
              agentId: string;
              agentName: string;
              createdAt: number;
              messageId: string;
              registrationId: string;
              runtimeHash: string;
              runtimeSnapshot?: any;
              runtimeVersionId: string;
              sessionId?: string;
              staticHash: string;
              staticSnapshot?: any;
              staticVersionId: string;
              threadId: string;
              toolRefs?: Array<{
                toolHash: string;
                toolKey: string;
                toolVersionId: string;
              }>;
            }>;
          },
          Name
        >;
      };
      record: {
        recordTurnIdentity: FunctionReference<
          "mutation",
          "internal",
          {
            agentId: string;
            agentName: string;
            messageId: string;
            runtimeHash: string;
            runtimeSnapshot?: any;
            sessionId?: string;
            staticHash: string;
            staticSnapshot?: any;
            threadId: string;
            tools?: Array<{
              staticSnapshot?: any;
              toolHash: string;
              toolKey: string;
            }>;
          },
          {
            bindingId: string;
            created: {
              binding: boolean;
              registration: boolean;
              runtimeVersion: boolean;
              staticVersion: boolean;
            };
            registrationId: string;
            runtimeVersionId: string;
            staticVersionId: string;
            toolResults: Array<{
              created: { toolRegistration: boolean; toolVersion: boolean };
              registrationId: string;
              toolHash: string;
              toolKey: string;
              toolVersionId: string;
            }>;
          },
          Name
        >;
      };
      register: {
        registerAgent: FunctionReference<
          "mutation",
          "internal",
          {
            agentId: string;
            metadata?: Record<string, any>;
            name: string;
            staticHash: string;
            staticSnapshot?: any;
          },
          {
            created: { registration: boolean; staticVersion: boolean };
            registrationId: string;
            staticVersionId: string;
          },
          Name
        >;
        registerTool: FunctionReference<
          "mutation",
          "internal",
          {
            metadata?: Record<string, any>;
            staticSnapshot: any;
            toolHash: string;
            toolKey: string;
          },
          {
            created: { toolRegistration: boolean; toolVersion: boolean };
            registrationId: string;
            toolVersionId: string;
          },
          Name
        >;
      };
    };
  };
