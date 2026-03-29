/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as chat_identity from "../chat/identity.js";
import type * as chat_identityCounters from "../chat/identityCounters.js";
import type * as chat_resolveNamespace from "../chat/resolveNamespace.js";
import type * as chat_threads from "../chat/threads.js";
import type * as chat_toolTelemetry from "../chat/toolTelemetry.js";
import type * as chat_unifiedTimeline from "../chat/unifiedTimeline.js";
import type * as context_communities from "../context/communities.js";
import type * as context_communitiesLib_applyPipeline from "../context/communitiesLib/applyPipeline.js";
import type * as context_communitiesLib_constants from "../context/communitiesLib/constants.js";
import type * as context_communitiesLib_deps from "../context/communitiesLib/deps.js";
import type * as context_communitiesLib_entryGraphContext from "../context/communitiesLib/entryGraphContext.js";
import type * as context_communitiesLib_finalize from "../context/communitiesLib/finalize.js";
import type * as context_communitiesLib_graphStage from "../context/communitiesLib/graphStage.js";
import type * as context_communitiesLib_leidenStage from "../context/communitiesLib/leidenStage.js";
import type * as context_communitiesLib_loadEntries from "../context/communitiesLib/loadEntries.js";
import type * as context_communitiesLib_onCompleteHandlers from "../context/communitiesLib/onCompleteHandlers.js";
import type * as context_communitiesLib_startWorkflow from "../context/communitiesLib/startWorkflow.js";
import type * as context_communitiesLib_types from "../context/communitiesLib/types.js";
import type * as context_contextClient from "../context/contextClient.js";
import type * as context_embeddingCacheHttp from "../context/embeddingCacheHttp.js";
import type * as context_embeddingCacheStore from "../context/embeddingCacheStore.js";
import type * as context_entryAccess from "../context/entryAccess.js";
import type * as context_entryQueries from "../context/entryQueries.js";
import type * as context_fileHttp from "../context/fileHttp.js";
import type * as context_fileHttpActions from "../context/fileHttpActions.js";
import type * as context_fileStore from "../context/fileStore.js";
import type * as context_files from "../context/files.js";
import type * as context_list from "../context/list.js";
import type * as context_mutations from "../context/mutations.js";
import type * as context_projections from "../context/projections.js";
import type * as context_search from "../context/search.js";
import type * as context_sessionNamespace from "../context/sessionNamespace.js";
import type * as crons from "../crons.js";
import type * as customFunctions from "../customFunctions.js";
import type * as env from "../env.js";
import type * as eventAttribution from "../eventAttribution.js";
import type * as events from "../events.js";
import type * as history from "../history.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_resolvers_index from "../lib/resolvers/index.js";
import type * as lib_status_index from "../lib/status/index.js";
import type * as llms_agents__instructions_goal from "../llms/agents/_instructions/goal.js";
import type * as llms_agents_assistant_agent from "../llms/agents/assistant/agent.js";
import type * as llms_agents_exampleAgent__instructions_goal from "../llms/agents/exampleAgent/_instructions/goal.js";
import type * as llms_agents_exampleAgent__instructions_index from "../llms/agents/exampleAgent/_instructions/index.js";
import type * as llms_agents_exampleAgent__toolkits__instructions_example from "../llms/agents/exampleAgent/_toolkits/_instructions/example.js";
import type * as llms_agents_exampleAgent__toolkits__instructions_index from "../llms/agents/exampleAgent/_toolkits/_instructions/index.js";
import type * as llms_agents_exampleAgent__toolkits_example from "../llms/agents/exampleAgent/_toolkits/example.js";
import type * as llms_agents_exampleAgent_agent from "../llms/agents/exampleAgent/agent.js";
import type * as llms_agents_index from "../llms/agents/index.js";
import type * as llms_models from "../llms/models.js";
import type * as llms_tools__libs_customFunctions from "../llms/tools/_libs/customFunctions.js";
import type * as llms_tools__libs_toolkit from "../llms/tools/_libs/toolkit.js";
import type * as llms_tools__policies_examplePolicy from "../llms/tools/_policies/examplePolicy.js";
import type * as llms_tools__policies_localModePolicy from "../llms/tools/_policies/localModePolicy.js";
import type * as llms_tools_context__instructions_usage from "../llms/tools/context/_instructions/usage.js";
import type * as llms_tools_context_authoring_toolkit from "../llms/tools/context/authoring/toolkit.js";
import type * as llms_tools_context_browseContext_tool from "../llms/tools/context/browseContext/tool.js";
import type * as llms_tools_context_searchContext_tool from "../llms/tools/context/searchContext/tool.js";
import type * as llms_tools_context_toolkit from "../llms/tools/context/toolkit.js";
import type * as llms_tools_example_tool from "../llms/tools/example/tool.js";
import type * as llms_tools_filesystem__instructions_usage from "../llms/tools/filesystem/_instructions/usage.js";
import type * as llms_tools_filesystem_runShell_shellHttp from "../llms/tools/filesystem/runShell/shellHttp.js";
import type * as llms_tools_filesystem_runShell_shellValidateNode from "../llms/tools/filesystem/runShell/shellValidateNode.js";
import type * as llms_tools_filesystem_runShell_shellWhitelist from "../llms/tools/filesystem/runShell/shellWhitelist.js";
import type * as llms_tools_filesystem_runShell_tool from "../llms/tools/filesystem/runShell/tool.js";
import type * as llms_tools_filesystem_toolkit from "../llms/tools/filesystem/toolkit.js";
import type * as llms_tools_index from "../llms/tools/index.js";
import type * as llms_tools_registeredToolAugments from "../llms/tools/registeredToolAugments.js";
import type * as llms_tools_registeredToolMap from "../llms/tools/registeredToolMap.js";
import type * as llms_tools_toolRegistryInstances from "../llms/tools/toolRegistryInstances.js";
import type * as llms_uiMessage from "../llms/uiMessage.js";
import type * as models_auth_account from "../models/auth/account.js";
import type * as models_auth_contextNamespace from "../models/auth/contextNamespace.js";
import type * as models_auth_index from "../models/auth/index.js";
import type * as models_auth_session from "../models/auth/session.js";
import type * as models_context_contextFile from "../models/context/contextFile.js";
import type * as models_context_contextFileProcess from "../models/context/contextFileProcess.js";
import type * as models_context_embeddingCache from "../models/context/embeddingCache.js";
import type * as models_context_index from "../models/context/index.js";
import type * as models_events_index from "../models/events/index.js";
import type * as models_events_unifiedTimeline from "../models/events/unifiedTimeline.js";
import type * as models_events_unifiedTimelineDimensions from "../models/events/unifiedTimelineDimensions.js";
import type * as models_geo_index from "../models/geo/index.js";
import type * as models_geo_libs_upsert_index from "../models/geo/libs/upsert/index.js";
import type * as models_geo_location from "../models/geo/location.js";
import type * as models_index from "../models/index.js";
import type * as models_llms_identityMetricDedup from "../models/llms/identityMetricDedup.js";
import type * as models_llms_index from "../models/llms/index.js";
import type * as models_llms_machineAgent from "../models/llms/machineAgent.js";
import type * as policy from "../policy.js";
import type * as resolvers_auth from "../resolvers/auth.js";
import type * as resolvers_geo from "../resolvers/geo.js";
import type * as resolvers_index from "../resolvers/index.js";
import type * as seeds from "../seeds.js";
import type * as sessionResolve from "../sessionResolve.js";
import type * as workpool from "../workpool.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "chat/identity": typeof chat_identity;
  "chat/identityCounters": typeof chat_identityCounters;
  "chat/resolveNamespace": typeof chat_resolveNamespace;
  "chat/threads": typeof chat_threads;
  "chat/toolTelemetry": typeof chat_toolTelemetry;
  "chat/unifiedTimeline": typeof chat_unifiedTimeline;
  "context/communities": typeof context_communities;
  "context/communitiesLib/applyPipeline": typeof context_communitiesLib_applyPipeline;
  "context/communitiesLib/constants": typeof context_communitiesLib_constants;
  "context/communitiesLib/deps": typeof context_communitiesLib_deps;
  "context/communitiesLib/entryGraphContext": typeof context_communitiesLib_entryGraphContext;
  "context/communitiesLib/finalize": typeof context_communitiesLib_finalize;
  "context/communitiesLib/graphStage": typeof context_communitiesLib_graphStage;
  "context/communitiesLib/leidenStage": typeof context_communitiesLib_leidenStage;
  "context/communitiesLib/loadEntries": typeof context_communitiesLib_loadEntries;
  "context/communitiesLib/onCompleteHandlers": typeof context_communitiesLib_onCompleteHandlers;
  "context/communitiesLib/startWorkflow": typeof context_communitiesLib_startWorkflow;
  "context/communitiesLib/types": typeof context_communitiesLib_types;
  "context/contextClient": typeof context_contextClient;
  "context/embeddingCacheHttp": typeof context_embeddingCacheHttp;
  "context/embeddingCacheStore": typeof context_embeddingCacheStore;
  "context/entryAccess": typeof context_entryAccess;
  "context/entryQueries": typeof context_entryQueries;
  "context/fileHttp": typeof context_fileHttp;
  "context/fileHttpActions": typeof context_fileHttpActions;
  "context/fileStore": typeof context_fileStore;
  "context/files": typeof context_files;
  "context/list": typeof context_list;
  "context/mutations": typeof context_mutations;
  "context/projections": typeof context_projections;
  "context/search": typeof context_search;
  "context/sessionNamespace": typeof context_sessionNamespace;
  crons: typeof crons;
  customFunctions: typeof customFunctions;
  env: typeof env;
  eventAttribution: typeof eventAttribution;
  events: typeof events;
  history: typeof history;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/resolvers/index": typeof lib_resolvers_index;
  "lib/status/index": typeof lib_status_index;
  "llms/agents/_instructions/goal": typeof llms_agents__instructions_goal;
  "llms/agents/assistant/agent": typeof llms_agents_assistant_agent;
  "llms/agents/exampleAgent/_instructions/goal": typeof llms_agents_exampleAgent__instructions_goal;
  "llms/agents/exampleAgent/_instructions/index": typeof llms_agents_exampleAgent__instructions_index;
  "llms/agents/exampleAgent/_toolkits/_instructions/example": typeof llms_agents_exampleAgent__toolkits__instructions_example;
  "llms/agents/exampleAgent/_toolkits/_instructions/index": typeof llms_agents_exampleAgent__toolkits__instructions_index;
  "llms/agents/exampleAgent/_toolkits/example": typeof llms_agents_exampleAgent__toolkits_example;
  "llms/agents/exampleAgent/agent": typeof llms_agents_exampleAgent_agent;
  "llms/agents/index": typeof llms_agents_index;
  "llms/models": typeof llms_models;
  "llms/tools/_libs/customFunctions": typeof llms_tools__libs_customFunctions;
  "llms/tools/_libs/toolkit": typeof llms_tools__libs_toolkit;
  "llms/tools/_policies/examplePolicy": typeof llms_tools__policies_examplePolicy;
  "llms/tools/_policies/localModePolicy": typeof llms_tools__policies_localModePolicy;
  "llms/tools/context/_instructions/usage": typeof llms_tools_context__instructions_usage;
  "llms/tools/context/authoring/toolkit": typeof llms_tools_context_authoring_toolkit;
  "llms/tools/context/browseContext/tool": typeof llms_tools_context_browseContext_tool;
  "llms/tools/context/searchContext/tool": typeof llms_tools_context_searchContext_tool;
  "llms/tools/context/toolkit": typeof llms_tools_context_toolkit;
  "llms/tools/example/tool": typeof llms_tools_example_tool;
  "llms/tools/filesystem/_instructions/usage": typeof llms_tools_filesystem__instructions_usage;
  "llms/tools/filesystem/runShell/shellHttp": typeof llms_tools_filesystem_runShell_shellHttp;
  "llms/tools/filesystem/runShell/shellValidateNode": typeof llms_tools_filesystem_runShell_shellValidateNode;
  "llms/tools/filesystem/runShell/shellWhitelist": typeof llms_tools_filesystem_runShell_shellWhitelist;
  "llms/tools/filesystem/runShell/tool": typeof llms_tools_filesystem_runShell_tool;
  "llms/tools/filesystem/toolkit": typeof llms_tools_filesystem_toolkit;
  "llms/tools/index": typeof llms_tools_index;
  "llms/tools/registeredToolAugments": typeof llms_tools_registeredToolAugments;
  "llms/tools/registeredToolMap": typeof llms_tools_registeredToolMap;
  "llms/tools/toolRegistryInstances": typeof llms_tools_toolRegistryInstances;
  "llms/uiMessage": typeof llms_uiMessage;
  "models/auth/account": typeof models_auth_account;
  "models/auth/contextNamespace": typeof models_auth_contextNamespace;
  "models/auth/index": typeof models_auth_index;
  "models/auth/session": typeof models_auth_session;
  "models/context/contextFile": typeof models_context_contextFile;
  "models/context/contextFileProcess": typeof models_context_contextFileProcess;
  "models/context/embeddingCache": typeof models_context_embeddingCache;
  "models/context/index": typeof models_context_index;
  "models/events/index": typeof models_events_index;
  "models/events/unifiedTimeline": typeof models_events_unifiedTimeline;
  "models/events/unifiedTimelineDimensions": typeof models_events_unifiedTimelineDimensions;
  "models/geo/index": typeof models_geo_index;
  "models/geo/libs/upsert/index": typeof models_geo_libs_upsert_index;
  "models/geo/location": typeof models_geo_location;
  "models/index": typeof models_index;
  "models/llms/identityMetricDedup": typeof models_llms_identityMetricDedup;
  "models/llms/index": typeof models_llms_index;
  "models/llms/machineAgent": typeof models_llms_machineAgent;
  policy: typeof policy;
  "resolvers/auth": typeof resolvers_auth;
  "resolvers/geo": typeof resolvers_geo;
  "resolvers/index": typeof resolvers_index;
  seeds: typeof seeds;
  sessionResolve: typeof sessionResolve;
  workpool: typeof workpool;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  facts: {
    public: {
      evaluate: {
        deriveSelection: FunctionReference<
          "query",
          "internal",
          {
            entityType: string;
            namespace: string;
            partitions: Array<string>;
            scope?: string;
            selected: string;
          },
          {
            lastIndex: number | null;
            partitionTails: Array<{
              index: number | null;
              partition: string;
              tail: string | null;
            }>;
            selectedIndex: number | null;
          }
        >;
        getOrderedFacts: FunctionReference<
          "query",
          "internal",
          { entityType?: string; namespace: string; scope?: string },
          Array<{
            attrs?: any;
            entity: string;
            entityType: string;
            labels: Array<string>;
            order: Array<number>;
            scope?: string;
            state?: string;
          }>
        >;
        getPartitionTail: FunctionReference<
          "query",
          "internal",
          { namespace: string; partition: string; scope?: string },
          { partition: string; tail: string | null } | null
        >;
        getReachableFacts: FunctionReference<
          "query",
          "internal",
          { edgeKinds: Array<string>; from: string; namespace: string },
          Array<string>
        >;
      };
      sync: {
        removeFacts: FunctionReference<
          "mutation",
          "internal",
          { entities: Array<string>; namespace: string },
          null
        >;
        upsertFacts: FunctionReference<
          "mutation",
          "internal",
          {
            edges: Array<{
              attrs?: any;
              from: string;
              kind: string;
              scope?: string;
              to: string;
            }>;
            items: Array<{
              attrs?: any;
              entity: string;
              entityType: string;
              labels: Array<string>;
              order: Array<number>;
              scope?: string;
              state?: string;
            }>;
            mode?: "direct" | "event";
            namespace: string;
            partitions?: Array<{
              attrs?: any;
              count: number;
              head?: string;
              membersVersion?: number;
              partition: string;
              scope?: string;
              tail?: string;
            }>;
            projector?: string;
            version?: number;
          },
          null
        >;
      };
    };
  };
  events: {
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
            namespace?: string;
            payload?: any;
            session?: string;
            streamId: string;
            streamType: string;
          },
          {
            _creationTime: number;
            _id: string;
            actor?: { byId: string; byType: string };
            causationId?: string;
            correlationId?: string;
            eventId: string;
            eventTime: number;
            eventType: string;
            globalSequence: number;
            metadata?: Record<string, string | number | boolean | null>;
            namespace: string;
            payload?: any;
            session?: string;
            streamId: string;
            streamType: string;
            streamVersion: number;
          }
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
            _creationTime: number;
            _id: string;
            lastSequence: number;
            leaseExpiresAt?: number;
            leaseOwner?: string;
            projector: string;
            streamType: string;
            updatedTime: number;
          }
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
              _creationTime: number;
              _id: string;
              lastSequence: number;
              leaseExpiresAt?: number;
              leaseOwner?: string;
              projector: string;
              streamType: string;
              updatedTime: number;
            };
            claimed: boolean;
          }
        >;
        listUnprocessedEvents: FunctionReference<
          "query",
          "internal",
          { limit?: number; projector: string; streamType: string },
          Array<{
            _creationTime: number;
            _id: string;
            actor?: { byId: string; byType: string };
            causationId?: string;
            correlationId?: string;
            eventId: string;
            eventTime: number;
            eventType: string;
            globalSequence: number;
            metadata?: Record<string, string | number | boolean | null>;
            namespace: string;
            payload?: any;
            session?: string;
            streamId: string;
            streamType: string;
            streamVersion: number;
          }>
        >;
        readCheckpoint: FunctionReference<
          "query",
          "internal",
          { projector: string; streamType: string },
          {
            _creationTime: number;
            _id: string;
            lastSequence: number;
            leaseExpiresAt?: number;
            leaseOwner?: string;
            projector: string;
            streamType: string;
            updatedTime: number;
          } | null
        >;
      };
      read: {
        getEvent: FunctionReference<
          "query",
          "internal",
          {
            eventId: string;
            namespace?: string;
            streamId: string;
            streamType: string;
          },
          {
            _creationTime: number;
            _id: string;
            actor?: { byId: string; byType: string };
            causationId?: string;
            correlationId?: string;
            eventId: string;
            eventTime: number;
            eventType: string;
            globalSequence: number;
            metadata?: Record<string, string | number | boolean | null>;
            namespace: string;
            payload?: any;
            session?: string;
            streamId: string;
            streamType: string;
            streamVersion: number;
          } | null
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
          any
        >;
        listStreamEvents: FunctionReference<
          "query",
          "internal",
          {
            eventTypes?: Array<string>;
            namespace?: string;
            order?: "asc" | "desc";
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
          any
        >;
        listStreamEventsSince: FunctionReference<
          "query",
          "internal",
          {
            eventTypes?: Array<string>;
            minEventTime: number;
            namespace?: string;
            streamId: string;
            streamType: string;
          },
          Array<{
            _creationTime: number;
            _id: string;
            actor?: { byId: string; byType: string };
            causationId?: string;
            correlationId?: string;
            eventId: string;
            eventTime: number;
            eventType: string;
            globalSequence: number;
            metadata?: Record<string, string | number | boolean | null>;
            namespace: string;
            payload?: any;
            session?: string;
            streamId: string;
            streamType: string;
            streamVersion: number;
          }>
        >;
      };
      streams: {
        getStream: FunctionReference<
          "query",
          "internal",
          { namespace?: string; streamId: string; streamType: string },
          {
            _creationTime: number;
            _id: string;
            createdTime: number;
            lastEventSequence: number | null;
            namespace: string;
            streamId: string;
            streamType: string;
            updatedTime: number;
            version: number;
          } | null
        >;
        getStreamVersion: FunctionReference<
          "query",
          "internal",
          { namespace?: string; streamId: string; streamType: string },
          number
        >;
      };
    };
  };
  history: {
    public: {
      append: {
        append: FunctionReference<
          "mutation",
          "internal",
          {
            attrs?: Record<string, string | number | boolean | null>;
            author?: { byId: string; byType: string };
            entryId: string;
            entryTime?: number;
            kind: string;
            parentEntryIds?: Array<string>;
            payload?: any;
            streamId: string;
            streamType: string;
          },
          {
            attrs?: Record<string, string | number | boolean | null>;
            author?: { byId: string; byType: string };
            entryId: string;
            entryTime: number;
            kind: string;
            parentEntryIds: Array<string>;
            payload?: any;
            streamId: string;
            streamType: string;
          }
        >;
      };
      heads: {
        listHeads: FunctionReference<
          "query",
          "internal",
          { streamId: string; streamType: string },
          Array<{
            entryId: string;
            headKind?: string;
            streamId: string;
            streamType: string;
          }>
        >;
      };
      read: {
        getChildren: FunctionReference<
          "query",
          "internal",
          { entryId: string; streamId: string; streamType: string },
          Array<{
            attrs?: Record<string, string | number | boolean | null>;
            author?: { byId: string; byType: string };
            entryId: string;
            entryTime: number;
            kind: string;
            parentEntryIds: Array<string>;
            payload?: any;
            streamId: string;
            streamType: string;
          }>
        >;
        getEntry: FunctionReference<
          "query",
          "internal",
          { entryId: string; streamId: string; streamType: string },
          {
            attrs?: Record<string, string | number | boolean | null>;
            author?: { byId: string; byType: string };
            entryId: string;
            entryTime: number;
            kind: string;
            parentEntryIds: Array<string>;
            payload?: any;
            streamId: string;
            streamType: string;
          } | null
        >;
        getLatestCommonAncestor: FunctionReference<
          "query",
          "internal",
          {
            leftEntryId: string;
            rightEntryId: string;
            streamId: string;
            streamType: string;
          },
          {
            attrs?: Record<string, string | number | boolean | null>;
            author?: { byId: string; byType: string };
            entryId: string;
            entryTime: number;
            kind: string;
            parentEntryIds: Array<string>;
            payload?: any;
            streamId: string;
            streamType: string;
          } | null
        >;
        getParents: FunctionReference<
          "query",
          "internal",
          { entryId: string; streamId: string; streamType: string },
          Array<{
            attrs?: Record<string, string | number | boolean | null>;
            author?: { byId: string; byType: string };
            entryId: string;
            entryTime: number;
            kind: string;
            parentEntryIds: Array<string>;
            payload?: any;
            streamId: string;
            streamType: string;
          }>
        >;
        getPathToRoot: FunctionReference<
          "query",
          "internal",
          { entryId: string; streamId: string; streamType: string },
          Array<{
            attrs?: Record<string, string | number | boolean | null>;
            author?: { byId: string; byType: string };
            entryId: string;
            entryTime: number;
            kind: string;
            parentEntryIds: Array<string>;
            payload?: any;
            streamId: string;
            streamType: string;
          }>
        >;
        isAncestor: FunctionReference<
          "query",
          "internal",
          {
            ancestorEntryId: string;
            descendantEntryId: string;
            streamId: string;
            streamType: string;
          },
          boolean
        >;
        listEntries: FunctionReference<
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
          any
        >;
      };
    };
  };
  context: {
    public: {
      community: {
        batchKnnSearch: FunctionReference<
          "action",
          "internal",
          { entryIds: Array<string>; k: number; namespace: string },
          Array<{
            entryId: string;
            neighbors: Array<{ entryId: string; score: number }>;
          }>
        >;
        clearAssignments: FunctionReference<
          "mutation",
          "internal",
          { jobId: string },
          { hasMore: boolean }
        >;
        clearStaging: FunctionReference<
          "mutation",
          "internal",
          { jobId: string },
          { hasMore: boolean }
        >;
        createJob: FunctionReference<
          "mutation",
          "internal",
          { namespace: string; params: { k: number; resolution: number } },
          string
        >;
        createSimilarityEdgeBatch: FunctionReference<
          "mutation",
          "internal",
          { edges: Array<{ from: string; score: number; to: string }> },
          number
        >;
        deleteSimilarityEdgesForEntries: FunctionReference<
          "mutation",
          "internal",
          { entryIds: Array<string> },
          number
        >;
        deleteSimilarityEdgesForNode: FunctionReference<
          "mutation",
          "internal",
          { nodeKey: string },
          { deleted: number; hasMore: boolean }
        >;
        getCommunityForEntry: FunctionReference<
          "query",
          "internal",
          { entryId: string; namespace: string },
          null | { communityId: number }
        >;
        getCommunityMembers: FunctionReference<
          "query",
          "internal",
          { communityId: number; namespace: string },
          Array<string>
        >;
        getEntryMetas: FunctionReference<
          "query",
          "internal",
          { entryIds: Array<string>; namespace: string },
          Array<{
            entryId: string;
            observationTime?: number;
            textPreview: string;
            title?: string;
          }>
        >;
        getJob: FunctionReference<"query", "internal", { jobId: string }, any>;
        getLatestCommunities: FunctionReference<
          "query",
          "internal",
          { namespace: string },
          | null
          | {
              communities: Array<{
                id: number;
                memberCount: number;
                sampleEntryIds: Array<string>;
              }>;
              completionTime: number;
              edgeCount: number;
              entryCount: number;
              jobId: string;
              stale: boolean;
              status: "completed";
            }
          | {
              jobId: string;
              loadedCount: number;
              phase: "loading" | "building" | "detecting" | "writing";
              stale: boolean;
              status: "running";
            }
          | { error: string; jobId: string; stale: boolean; status: "failed" }
          | { jobId: string; stale: boolean; status: "pending" }
        >;
        getNeighborEdges: FunctionReference<
          "query",
          "internal",
          { entryId: string },
          Array<{ neighbor: string; score: number }>
        >;
        getNeighborEdgesBatch: FunctionReference<
          "query",
          "internal",
          { entryIds: Array<string> },
          Array<{
            entryId: string;
            neighbors: Array<{ neighbor: string; score: number }>;
          }>
        >;
        markCompleted: FunctionReference<
          "mutation",
          "internal",
          {
            communities: Array<{
              id: number;
              memberCount: number;
              sampleEntryIds: Array<string>;
            }>;
            edgeCount: number;
            entryCount: number;
            jobId: string;
          },
          null
        >;
        markFailed: FunctionReference<
          "mutation",
          "internal",
          { error: string; jobId: string },
          null
        >;
        markRunning: FunctionReference<
          "mutation",
          "internal",
          { jobId: string; workflowId: string },
          null
        >;
        readStagingAssignmentPage: FunctionReference<
          "query",
          "internal",
          {
            jobId: string;
            paginationOpts: {
              cursor: string | null;
              endCursor?: string | null;
              id?: number;
              maximumBytesRead?: number;
              maximumRowsRead?: number;
              numItems: number;
            };
          },
          any
        >;
        readStagingEdgePage: FunctionReference<
          "query",
          "internal",
          {
            jobId: string;
            paginationOpts: {
              cursor: string | null;
              endCursor?: string | null;
              id?: number;
              maximumBytesRead?: number;
              maximumRowsRead?: number;
              numItems: number;
            };
          },
          any
        >;
        updatePhase: FunctionReference<
          "mutation",
          "internal",
          {
            jobId: string;
            loadedCount?: number;
            phase: "loading" | "building" | "detecting" | "writing";
          },
          null
        >;
        writeAssignments: FunctionReference<
          "mutation",
          "internal",
          {
            assignments: Array<{ communityId: number; entryId: string }>;
            jobId: string;
            namespace: string;
          },
          null
        >;
        writeStagingAssignments: FunctionReference<
          "mutation",
          "internal",
          {
            assignments: Array<{ communityId: number; nodeId: string }>;
            jobId: string;
          },
          null
        >;
        writeStagingEdges: FunctionReference<
          "mutation",
          "internal",
          {
            edges: Array<{ from: string; to: string; weight: number }>;
            jobId: string;
          },
          null
        >;
      };
      entries: {
        add: FunctionReference<
          "action",
          "internal",
          {
            actor?: { byId: string; byType: string };
            apiKey?: string;
            chunks?: Array<{ embedding: Array<number>; text: string }>;
            key: string;
            namespace: string;
            observationTime?: number;
            searchText?: string;
            session?: string;
            similarityK?: number;
            similarityThreshold?: number;
            source?:
              | {
                  document: string;
                  documentId: string;
                  entryId: string;
                  key: string;
                  kind: "document";
                  sourceType: "text" | "binary";
                }
              | {
                  contentId: string;
                  kind: "content";
                  sourceType: "text" | "binary";
                };
            sourceType?: "text" | "binary";
            text: string;
            threadId?: string;
            title?: string;
          },
          { entryId: string }
        >;
        edit: FunctionReference<
          "action",
          "internal",
          {
            actor?: { byId: string; byType: string };
            apiKey?: string;
            entryId: string;
            namespace: string;
            observationTime?: number;
            session?: string;
            similarityK?: number;
            similarityThreshold?: number;
            text: string;
            threadId?: string;
            title?: string;
          },
          { entryId: string }
        >;
        get: FunctionReference<
          "query",
          "internal",
          { entryId: string; namespace: string },
          null | {
            entryId: string;
            fullText: string;
            key: string;
            legacyEntryId?: string;
            namespace: string;
            observationTime?: number;
            source:
              | {
                  document: string;
                  documentId: string;
                  entryId: string;
                  key: string;
                  kind: "document";
                  sourceType: "text" | "binary";
                }
              | {
                  contentId: string;
                  kind: "content";
                  sourceType: "text" | "binary";
                };
            textPreview: string;
            title?: string;
            version: null | {
              data:
                | { status: "current" }
                | {
                    replacedByEntryId: string;
                    replacementTime: number;
                    status: "historical";
                  };
              key: string;
            };
            versionChain: Array<{
              entryId: string;
              entryTime: number;
              kind: string;
              payload?: any;
            }>;
          }
        >;
        getAccessStatsBatch: FunctionReference<
          "query",
          "internal",
          { entryIds: Array<string> },
          any
        >;
        getEntryAccessEvent: FunctionReference<
          "query",
          "internal",
          { entryId: string; eventId: string; namespace: string },
          any | null
        >;
        getEntryAccessWeekByDay: FunctionReference<
          "query",
          "internal",
          { entryId: string; namespace: string },
          Array<{ day: string; searches: number; views: number }>
        >;
        listEntryAccessEvents: FunctionReference<
          "query",
          "internal",
          {
            entryId: string;
            namespace: string;
            paginationOpts: {
              cursor: string | null;
              endCursor?: string | null;
              id?: number;
              maximumBytesRead?: number;
              maximumRowsRead?: number;
              numItems: number;
            };
          },
          {
            continueCursor: string;
            isDone: boolean;
            page: Array<any>;
            pageStatus?: "SplitRecommended" | "SplitRequired" | null;
            splitCursor?: string | null;
          }
        >;
        recordView: FunctionReference<
          "mutation",
          "internal",
          {
            actor?: { byId: string; byType: string };
            entryId: string;
            idempotencyKey?: string;
            namespace: string;
            session?: string;
          },
          null
        >;
        remove: FunctionReference<
          "action",
          "internal",
          {
            actor?: { byId: string; byType: string };
            apiKey?: string;
            entryId: string;
            namespace: string;
            session?: string;
            threadId?: string;
          },
          null
        >;
      };
      list: {
        listEntries: FunctionReference<
          "query",
          "internal",
          {
            namespace: string;
            paginationOpts: {
              cursor: string | null;
              endCursor?: string | null;
              id?: number;
              maximumBytesRead?: number;
              maximumRowsRead?: number;
              numItems: number;
            };
          },
          {
            continueCursor: string;
            isDone: boolean;
            page: Array<{
              _creationTime: number;
              _id: string;
              entryId: string;
              key: string;
              legacyEntryId?: string;
              namespace: string;
              observationTime?: number;
              source:
                | {
                    document: string;
                    documentId: string;
                    entryId: string;
                    key: string;
                    kind: "document";
                    sourceType: "text" | "binary";
                  }
                | {
                    contentId: string;
                    kind: "content";
                    sourceType: "text" | "binary";
                  };
              textPreview: string;
              title?: string;
            }>;
            pageStatus?: "SplitRecommended" | "SplitRequired" | null;
            splitCursor?: string | null;
          }
        >;
      };
      projection: {
        clearPointsForJob: FunctionReference<
          "mutation",
          "internal",
          { jobId: string },
          { hasMore: boolean }
        >;
        createJob: FunctionReference<
          "mutation",
          "internal",
          { limit: number; namespace: string },
          string
        >;
        getJob: FunctionReference<"query", "internal", { jobId: string }, any>;
        getLatestProjection: FunctionReference<
          "query",
          "internal",
          { namespace: string },
          | null
          | {
              completionTime: number;
              jobId: string;
              points: Array<{
                decayedScore?: number;
                entryId: string;
                key: string;
                lastAccessTime?: number;
                mimeType?: string;
                textPreview: string;
                title?: string;
                totalAccesses?: number;
                x: number;
                y: number;
                z: number;
              }>;
              stale: boolean;
              status: "completed";
            }
          | {
              jobId: string;
              loadedCount: number;
              phase: "loading" | "projecting";
              stale: boolean;
              status: "running";
            }
          | { error: string; jobId: string; stale: boolean; status: "failed" }
          | { jobId: string; stale: boolean; status: "pending" }
        >;
        getProjectionStatus: FunctionReference<
          "query",
          "internal",
          { jobId: string },
          | null
          | {
              completionTime: number;
              namespace: string;
              points: Array<{
                decayedScore?: number;
                entryId: string;
                key: string;
                lastAccessTime?: number;
                mimeType?: string;
                textPreview: string;
                title?: string;
                totalAccesses?: number;
                x: number;
                y: number;
                z: number;
              }>;
              stale: boolean;
              status: "completed";
            }
          | {
              error: string;
              failureTime: number;
              namespace: string;
              stale: boolean;
              status: "failed";
            }
          | {
              loadedCount: number;
              namespace: string;
              phase: "loading" | "projecting";
              stale: boolean;
              status: "running";
            }
          | { namespace: string; stale: boolean; status: "pending" }
        >;
        loadCurrentEntryIdPage: FunctionReference<
          "query",
          "internal",
          {
            namespace: string;
            paginationOpts: {
              cursor: string | null;
              endCursor?: string | null;
              id?: number;
              maximumBytesRead?: number;
              maximumRowsRead?: number;
              numItems: number;
            };
          },
          any
        >;
        loadCurrentEntryIds: FunctionReference<
          "query",
          "internal",
          { namespace: string },
          Array<string>
        >;
        loadEmbeddingPage: FunctionReference<
          "query",
          "internal",
          {
            namespace: string;
            paginationOpts: {
              cursor: string | null;
              endCursor?: string | null;
              id?: number;
              maximumBytesRead?: number;
              maximumRowsRead?: number;
              numItems: number;
            };
          },
          {
            continueCursor: string;
            isDone: boolean;
            page: Array<{
              _creationTime: number;
              _id: string;
              embedding: Array<number>;
              entryId: string;
              namespace: string;
            }>;
            pageStatus?: "SplitRecommended" | "SplitRequired" | null;
            splitCursor?: string | null;
          }
        >;
        loadEntryPage: FunctionReference<
          "query",
          "internal",
          {
            namespace: string;
            paginationOpts: {
              cursor: string | null;
              endCursor?: string | null;
              id?: number;
              maximumBytesRead?: number;
              maximumRowsRead?: number;
              numItems: number;
            };
          },
          {
            continueCursor: string;
            isDone: boolean;
            page: Array<{
              _creationTime: number;
              _id: string;
              entryId: string;
              key: string;
              legacyEntryId?: string;
              namespace: string;
              observationTime?: number;
              source:
                | {
                    document: string;
                    documentId: string;
                    entryId: string;
                    key: string;
                    kind: "document";
                    sourceType: "text" | "binary";
                  }
                | {
                    contentId: string;
                    kind: "content";
                    sourceType: "text" | "binary";
                  };
              textPreview: string;
              title?: string;
            }>;
            pageStatus?: "SplitRecommended" | "SplitRequired" | null;
            splitCursor?: string | null;
          }
        >;
        markCompleted: FunctionReference<
          "mutation",
          "internal",
          { jobId: string; pointCount: number },
          null
        >;
        markFailed: FunctionReference<
          "mutation",
          "internal",
          { error: string; jobId: string },
          null
        >;
        markRunning: FunctionReference<
          "mutation",
          "internal",
          { jobId: string; workflowId: string },
          null
        >;
        updatePhase: FunctionReference<
          "mutation",
          "internal",
          {
            jobId: string;
            loadedCount?: number;
            phase: "loading" | "projecting";
          },
          null
        >;
        writePointsBatch: FunctionReference<
          "mutation",
          "internal",
          {
            jobId: string;
            points: Array<{
              decayedScore?: number;
              entryId: string;
              key: string;
              lastAccessTime?: number;
              mimeType?: string;
              textPreview: string;
              title?: string;
              totalAccesses?: number;
              x: number;
              y: number;
              z: number;
            }>;
          },
          null
        >;
      };
      retrieval: {
        search: FunctionReference<
          "action",
          "internal",
          {
            accessWeight?: number;
            actor?: { byId: string; byType: string };
            apiKey?: string;
            clientSessionId?: string;
            fileEmbedding?: Array<number>;
            graphWeight?: number;
            includeHistorical?: boolean;
            lexicalWeight?: number;
            limit?: number;
            namespace: string;
            query: string | Array<number>;
            retrievalMode?: "vector" | "lexical" | "hybrid";
            rrfK?: number;
            session?: string;
            threadId?: string;
            vectorWeight?: number;
          },
          Array<{
            entryId: string;
            importance: number;
            key: string;
            metadata?: any;
            observationTime?: number;
            score: number;
            text: string;
            title?: string;
          }>
        >;
      };
      unifiedTimelineProjectorBridge: {
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
          any
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
          any
        >;
        listUnprocessedEvents: FunctionReference<
          "query",
          "internal",
          { limit?: number; projector: string; streamType: string },
          any
        >;
      };
    };
  };
  policy: {
    public: {
      access: {
        check: FunctionReference<
          "query",
          "internal",
          {
            action: string;
            at?: number;
            resourceId: string | null;
            resourceType: string;
            subject: { scopeId: string; scopeType: string };
          },
          {
            decision: "allow" | "deny";
            matchedPolicies: Array<{
              depth: number;
              effect: "allow" | "deny";
              inherited: boolean;
              policyId: string;
              precedence: number;
              resourceId: string | null;
              specificity: "exact" | "wildcard";
              subjectId: string;
              subjectType: string;
            }>;
            reason: "matched_allow" | "matched_deny" | "no_match";
            resolvedScopes: Array<{
              depth: number;
              inherited: boolean;
              relationPath: Array<string>;
              scopeId: string;
              scopeType: string;
            }>;
          }
        >;
        explain: FunctionReference<
          "query",
          "internal",
          {
            action: string;
            at?: number;
            resourceId: string | null;
            resourceType: string;
            subject: { scopeId: string; scopeType: string };
          },
          {
            decision: "allow" | "deny";
            matchedPolicies: Array<{
              depth: number;
              effect: "allow" | "deny";
              inherited: boolean;
              policyId: string;
              precedence: number;
              resourceId: string | null;
              specificity: "exact" | "wildcard";
              subjectId: string;
              subjectType: string;
            }>;
            reason: "matched_allow" | "matched_deny" | "no_match";
            resolvedScopes: Array<{
              depth: number;
              inherited: boolean;
              relationPath: Array<string>;
              scopeId: string;
              scopeType: string;
            }>;
          }
        >;
        grant: FunctionReference<
          "mutation",
          "internal",
          {
            action: string;
            activeTime?: number | null;
            attrs?: Record<string, string | number | boolean | null>;
            effect: "allow" | "deny";
            expiredTime?: number | null;
            resourceId: string | null;
            resourceType: string;
            subject: { scopeId: string; scopeType: string };
            update?: {
              byId: string;
              byType: string;
              reason?: string;
              source?: string;
            };
          },
          null
        >;
        listByResource: FunctionReference<
          "query",
          "internal",
          { resourceId: string | null; resourceType: string },
          Array<{
            action: string;
            activeTime: number | null;
            attrs?: Record<string, string | number | boolean | null>;
            effect: "allow" | "deny";
            expiredTime: number | null;
            lastUpdate: {
              byId: string;
              byType: string;
              reason?: string;
              source?: string;
              time: number;
            };
            resourceId: string | null;
            resourceType: string;
            subjectId: string;
            subjectType: string;
          }>
        >;
        listBySubject: FunctionReference<
          "query",
          "internal",
          { subject: { scopeId: string; scopeType: string } },
          Array<{
            action: string;
            activeTime: number | null;
            attrs?: Record<string, string | number | boolean | null>;
            effect: "allow" | "deny";
            expiredTime: number | null;
            lastUpdate: {
              byId: string;
              byType: string;
              reason?: string;
              source?: string;
              time: number;
            };
            resourceId: string | null;
            resourceType: string;
            subjectId: string;
            subjectType: string;
          }>
        >;
        replaceSubjectPolicies: FunctionReference<
          "mutation",
          "internal",
          {
            policies: Array<{
              action: string;
              activeTime?: number | null;
              attrs?: Record<string, string | number | boolean | null>;
              effect: "allow" | "deny";
              expiredTime?: number | null;
              resourceId: string | null;
              resourceType: string;
            }>;
            subject: { scopeId: string; scopeType: string };
            update?: {
              byId: string;
              byType: string;
              reason?: string;
              source?: string;
            };
          },
          null
        >;
        requireAccess: FunctionReference<
          "query",
          "internal",
          {
            action: string;
            at?: number;
            resourceId: string | null;
            resourceType: string;
            subject: { scopeId: string; scopeType: string };
          },
          null
        >;
        revoke: FunctionReference<
          "mutation",
          "internal",
          {
            action: string;
            effect?: "allow" | "deny";
            resourceId: string | null;
            resourceType: string;
            subject: { scopeId: string; scopeType: string };
          },
          null
        >;
      };
      features: {
        check: FunctionReference<
          "query",
          "internal",
          {
            action: string;
            at?: number;
            namespace: string;
            subject: { scopeId: string; scopeType: string };
          },
          {
            decision: "allow" | "deny";
            matchedPolicies: Array<{
              depth: number;
              effect: "allow" | "deny";
              inherited: boolean;
              policyId: string;
              precedence: number;
              subjectId: string;
              subjectType: string;
            }>;
            reason: "matched_allow" | "matched_deny" | "no_match";
            resolvedScopes: Array<{
              depth: number;
              inherited: boolean;
              relationPath: Array<string>;
              scopeId: string;
              scopeType: string;
            }>;
          }
        >;
        entitle: FunctionReference<
          "mutation",
          "internal",
          {
            action: string;
            activeTime?: number | null;
            attrs?: Record<string, string | number | boolean | null>;
            effect: "allow" | "deny";
            expiredTime?: number | null;
            namespace: string;
            subject: { scopeId: string; scopeType: string };
            update?: {
              byId: string;
              byType: string;
              reason?: string;
              source?: string;
            };
          },
          null
        >;
        explain: FunctionReference<
          "query",
          "internal",
          {
            action: string;
            at?: number;
            namespace: string;
            subject: { scopeId: string; scopeType: string };
          },
          {
            decision: "allow" | "deny";
            matchedPolicies: Array<{
              depth: number;
              effect: "allow" | "deny";
              inherited: boolean;
              policyId: string;
              precedence: number;
              subjectId: string;
              subjectType: string;
            }>;
            reason: "matched_allow" | "matched_deny" | "no_match";
            resolvedScopes: Array<{
              depth: number;
              inherited: boolean;
              relationPath: Array<string>;
              scopeId: string;
              scopeType: string;
            }>;
          }
        >;
        listByNamespace: FunctionReference<
          "query",
          "internal",
          { namespace: string },
          Array<{
            action: string;
            activeTime: number | null;
            attrs?: Record<string, string | number | boolean | null>;
            effect: "allow" | "deny";
            expiredTime: number | null;
            lastUpdate: {
              byId: string;
              byType: string;
              reason?: string;
              source?: string;
              time: number;
            };
            namespace: string;
            subjectId: string;
            subjectType: string;
          }>
        >;
        listBySubject: FunctionReference<
          "query",
          "internal",
          { subject: { scopeId: string; scopeType: string } },
          Array<{
            action: string;
            activeTime: number | null;
            attrs?: Record<string, string | number | boolean | null>;
            effect: "allow" | "deny";
            expiredTime: number | null;
            lastUpdate: {
              byId: string;
              byType: string;
              reason?: string;
              source?: string;
              time: number;
            };
            namespace: string;
            subjectId: string;
            subjectType: string;
          }>
        >;
        replaceSubjectEntitlements: FunctionReference<
          "mutation",
          "internal",
          {
            policies: Array<{
              action: string;
              activeTime?: number | null;
              attrs?: Record<string, string | number | boolean | null>;
              effect: "allow" | "deny";
              expiredTime?: number | null;
              namespace: string;
            }>;
            subject: { scopeId: string; scopeType: string };
            update?: {
              byId: string;
              byType: string;
              reason?: string;
              source?: string;
            };
          },
          null
        >;
        requireEntitlement: FunctionReference<
          "query",
          "internal",
          {
            action: string;
            at?: number;
            namespace: string;
            subject: { scopeId: string; scopeType: string };
          },
          null
        >;
        revoke: FunctionReference<
          "mutation",
          "internal",
          {
            action: string;
            effect?: "allow" | "deny";
            namespace: string;
            subject: { scopeId: string; scopeType: string };
          },
          null
        >;
      };
      scopes: {
        link: FunctionReference<
          "mutation",
          "internal",
          {
            attrs?: Record<string, string | number | boolean | null>;
            from: { scopeId: string; scopeType: string };
            relation: string;
            to: { scopeId: string; scopeType: string };
            update?: {
              byId: string;
              byType: string;
              reason?: string;
              source?: string;
            };
          },
          null
        >;
        listEdges: FunctionReference<
          "query",
          "internal",
          {
            relation?: string;
            subject?: { scopeId: string; scopeType: string };
          },
          Array<{
            attrs?: Record<string, string | number | boolean | null>;
            fromId: string;
            fromType: string;
            lastUpdate: {
              byId: string;
              byType: string;
              reason?: string;
              source?: string;
              time: number;
            };
            relation: string;
            toId: string;
            toType: string;
          }>
        >;
        listNodes: FunctionReference<
          "query",
          "internal",
          { scopeType?: string },
          Array<{
            attrs?: Record<string, string | number | boolean | null>;
            lastUpdate: {
              byId: string;
              byType: string;
              reason?: string;
              source?: string;
              time: number;
            };
            scopeId: string;
            scopeType: string;
          }>
        >;
        register: FunctionReference<
          "mutation",
          "internal",
          {
            attrs?: Record<string, string | number | boolean | null>;
            scope: { scopeId: string; scopeType: string };
            update?: {
              byId: string;
              byType: string;
              reason?: string;
              source?: string;
            };
          },
          null
        >;
        resolve: FunctionReference<
          "query",
          "internal",
          {
            relations?: Array<string>;
            subject: { scopeId: string; scopeType: string };
          },
          {
            edges: Array<{
              depth: number;
              fromId: string;
              fromType: string;
              relation: string;
              toId: string;
              toType: string;
            }>;
            scopes: Array<{ scopeId: string; scopeType: string }>;
          }
        >;
        unlink: FunctionReference<
          "mutation",
          "internal",
          {
            from: { scopeId: string; scopeType: string };
            relation: string;
            to: { scopeId: string; scopeType: string };
          },
          null
        >;
      };
    };
  };
  agent: {
    apiKeys: {
      destroy: FunctionReference<
        "mutation",
        "internal",
        { apiKey?: string; name?: string },
        | "missing"
        | "deleted"
        | "name mismatch"
        | "must provide either apiKey or name"
      >;
      issue: FunctionReference<
        "mutation",
        "internal",
        { name?: string },
        string
      >;
      validate: FunctionReference<
        "query",
        "internal",
        { apiKey: string },
        boolean
      >;
    };
    files: {
      addFile: FunctionReference<
        "mutation",
        "internal",
        {
          filename?: string;
          hash: string;
          mimeType: string;
          storageId: string;
        },
        { fileId: string; storageId: string }
      >;
      copyFile: FunctionReference<
        "mutation",
        "internal",
        { fileId: string },
        null
      >;
      deleteFiles: FunctionReference<
        "mutation",
        "internal",
        { fileIds: Array<string>; force?: boolean },
        Array<string>
      >;
      get: FunctionReference<
        "query",
        "internal",
        { fileId: string },
        null | {
          _creationTime: number;
          _id: string;
          filename?: string;
          hash: string;
          lastTouchedAt: number;
          mimeType: string;
          refcount: number;
          storageId: string;
        }
      >;
      getFilesToDelete: FunctionReference<
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
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            _creationTime: number;
            _id: string;
            filename?: string;
            hash: string;
            lastTouchedAt: number;
            mimeType: string;
            refcount: number;
            storageId: string;
          }>;
        }
      >;
      useExistingFile: FunctionReference<
        "mutation",
        "internal",
        { filename?: string; hash: string },
        null | { fileId: string; storageId: string }
      >;
    };
    messages: {
      addMessages: FunctionReference<
        "mutation",
        "internal",
        {
          agentName?: string;
          embeddings?: {
            dimension:
              | 128
              | 256
              | 512
              | 768
              | 1024
              | 1408
              | 1536
              | 2048
              | 3072
              | 4096;
            model: string;
            vectors: Array<Array<number> | null>;
          };
          failPendingSteps?: boolean;
          hideFromUserIdSearch?: boolean;
          messages: Array<{
            error?: string;
            fileIds?: Array<string>;
            finishReason?:
              | "stop"
              | "length"
              | "content-filter"
              | "tool-calls"
              | "error"
              | "other"
              | "unknown";
            message:
              | {
                  content:
                    | string
                    | Array<
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            text: string;
                            type: "text";
                          }
                        | {
                            image: string | ArrayBuffer;
                            mimeType?: string;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "image";
                          }
                        | {
                            data: string | ArrayBuffer;
                            filename?: string;
                            mimeType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "file";
                          }
                      >;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "user";
                }
              | {
                  content:
                    | string
                    | Array<
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            text: string;
                            type: "text";
                          }
                        | {
                            data: string | ArrayBuffer;
                            filename?: string;
                            mimeType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "file";
                          }
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            signature?: string;
                            text: string;
                            type: "reasoning";
                          }
                        | {
                            data: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "redacted-reasoning";
                          }
                        | {
                            args: any;
                            providerExecuted?: boolean;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            toolCallId: string;
                            toolName: string;
                            type: "tool-call";
                          }
                        | {
                            args?: any;
                            experimental_content?: Array<
                              | { text: string; type: "text" }
                              | {
                                  data: string;
                                  mimeType?: string;
                                  type: "image";
                                }
                            >;
                            isError?: boolean;
                            output?:
                              | { type: "text"; value: string }
                              | { type: "json"; value: any }
                              | { type: "error-text"; value: string }
                              | { type: "error-json"; value: any }
                              | {
                                  type: "content";
                                  value: Array<
                                    | { text: string; type: "text" }
                                    | {
                                        data: string;
                                        mediaType: string;
                                        type: "media";
                                      }
                                  >;
                                };
                            providerExecuted?: boolean;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            result?: any;
                            toolCallId: string;
                            toolName: string;
                            type: "tool-result";
                          }
                        | {
                            id: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            sourceType: "url";
                            title?: string;
                            type: "source";
                            url: string;
                          }
                        | {
                            filename?: string;
                            id: string;
                            mediaType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            sourceType: "document";
                            title: string;
                            type: "source";
                          }
                      >;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "assistant";
                }
              | {
                  content: Array<{
                    args?: any;
                    experimental_content?: Array<
                      | { text: string; type: "text" }
                      | { data: string; mimeType?: string; type: "image" }
                    >;
                    isError?: boolean;
                    output?:
                      | { type: "text"; value: string }
                      | { type: "json"; value: any }
                      | { type: "error-text"; value: string }
                      | { type: "error-json"; value: any }
                      | {
                          type: "content";
                          value: Array<
                            | { text: string; type: "text" }
                            | { data: string; mediaType: string; type: "media" }
                          >;
                        };
                    providerExecuted?: boolean;
                    providerMetadata?: Record<string, Record<string, any>>;
                    providerOptions?: Record<string, Record<string, any>>;
                    result?: any;
                    toolCallId: string;
                    toolName: string;
                    type: "tool-result";
                  }>;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "tool";
                }
              | {
                  content: string;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "system";
                };
            model?: string;
            provider?: string;
            providerMetadata?: Record<string, Record<string, any>>;
            reasoning?: string;
            reasoningDetails?: Array<
              | {
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  signature?: string;
                  text: string;
                  type: "reasoning";
                }
              | { signature?: string; text: string; type: "text" }
              | { data: string; type: "redacted" }
            >;
            sources?: Array<
              | {
                  id: string;
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  sourceType: "url";
                  title?: string;
                  type?: "source";
                  url: string;
                }
              | {
                  filename?: string;
                  id: string;
                  mediaType: string;
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  sourceType: "document";
                  title: string;
                  type: "source";
                }
            >;
            status?: "pending" | "success" | "failed";
            text?: string;
            usage?: {
              cachedInputTokens?: number;
              completionTokens: number;
              promptTokens: number;
              reasoningTokens?: number;
              totalTokens: number;
            };
            warnings?: Array<
              | {
                  details?: string;
                  setting: string;
                  type: "unsupported-setting";
                }
              | { details?: string; tool: any; type: "unsupported-tool" }
              | { message: string; type: "other" }
            >;
          }>;
          pendingMessageId?: string;
          promptMessageId?: string;
          threadId: string;
          userId?: string;
        },
        {
          messages: Array<{
            _creationTime: number;
            _id: string;
            agentName?: string;
            embeddingId?: string;
            error?: string;
            fileIds?: Array<string>;
            finishReason?:
              | "stop"
              | "length"
              | "content-filter"
              | "tool-calls"
              | "error"
              | "other"
              | "unknown";
            id?: string;
            message?:
              | {
                  content:
                    | string
                    | Array<
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            text: string;
                            type: "text";
                          }
                        | {
                            image: string | ArrayBuffer;
                            mimeType?: string;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "image";
                          }
                        | {
                            data: string | ArrayBuffer;
                            filename?: string;
                            mimeType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "file";
                          }
                      >;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "user";
                }
              | {
                  content:
                    | string
                    | Array<
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            text: string;
                            type: "text";
                          }
                        | {
                            data: string | ArrayBuffer;
                            filename?: string;
                            mimeType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "file";
                          }
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            signature?: string;
                            text: string;
                            type: "reasoning";
                          }
                        | {
                            data: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "redacted-reasoning";
                          }
                        | {
                            args: any;
                            providerExecuted?: boolean;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            toolCallId: string;
                            toolName: string;
                            type: "tool-call";
                          }
                        | {
                            args?: any;
                            experimental_content?: Array<
                              | { text: string; type: "text" }
                              | {
                                  data: string;
                                  mimeType?: string;
                                  type: "image";
                                }
                            >;
                            isError?: boolean;
                            output?:
                              | { type: "text"; value: string }
                              | { type: "json"; value: any }
                              | { type: "error-text"; value: string }
                              | { type: "error-json"; value: any }
                              | {
                                  type: "content";
                                  value: Array<
                                    | { text: string; type: "text" }
                                    | {
                                        data: string;
                                        mediaType: string;
                                        type: "media";
                                      }
                                  >;
                                };
                            providerExecuted?: boolean;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            result?: any;
                            toolCallId: string;
                            toolName: string;
                            type: "tool-result";
                          }
                        | {
                            id: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            sourceType: "url";
                            title?: string;
                            type: "source";
                            url: string;
                          }
                        | {
                            filename?: string;
                            id: string;
                            mediaType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            sourceType: "document";
                            title: string;
                            type: "source";
                          }
                      >;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "assistant";
                }
              | {
                  content: Array<{
                    args?: any;
                    experimental_content?: Array<
                      | { text: string; type: "text" }
                      | { data: string; mimeType?: string; type: "image" }
                    >;
                    isError?: boolean;
                    output?:
                      | { type: "text"; value: string }
                      | { type: "json"; value: any }
                      | { type: "error-text"; value: string }
                      | { type: "error-json"; value: any }
                      | {
                          type: "content";
                          value: Array<
                            | { text: string; type: "text" }
                            | { data: string; mediaType: string; type: "media" }
                          >;
                        };
                    providerExecuted?: boolean;
                    providerMetadata?: Record<string, Record<string, any>>;
                    providerOptions?: Record<string, Record<string, any>>;
                    result?: any;
                    toolCallId: string;
                    toolName: string;
                    type: "tool-result";
                  }>;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "tool";
                }
              | {
                  content: string;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "system";
                };
            model?: string;
            order: number;
            provider?: string;
            providerMetadata?: Record<string, Record<string, any>>;
            providerOptions?: Record<string, Record<string, any>>;
            reasoning?: string;
            reasoningDetails?: Array<
              | {
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  signature?: string;
                  text: string;
                  type: "reasoning";
                }
              | { signature?: string; text: string; type: "text" }
              | { data: string; type: "redacted" }
            >;
            sources?: Array<
              | {
                  id: string;
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  sourceType: "url";
                  title?: string;
                  type?: "source";
                  url: string;
                }
              | {
                  filename?: string;
                  id: string;
                  mediaType: string;
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  sourceType: "document";
                  title: string;
                  type: "source";
                }
            >;
            status: "pending" | "success" | "failed";
            stepOrder: number;
            text?: string;
            threadId: string;
            tool: boolean;
            usage?: {
              cachedInputTokens?: number;
              completionTokens: number;
              promptTokens: number;
              reasoningTokens?: number;
              totalTokens: number;
            };
            userId?: string;
            warnings?: Array<
              | {
                  details?: string;
                  setting: string;
                  type: "unsupported-setting";
                }
              | { details?: string; tool: any; type: "unsupported-tool" }
              | { message: string; type: "other" }
            >;
          }>;
        }
      >;
      cloneThread: FunctionReference<
        "action",
        "internal",
        {
          batchSize?: number;
          copyUserIdForVectorSearch?: boolean;
          excludeToolMessages?: boolean;
          insertAtOrder?: number;
          limit?: number;
          sourceThreadId: string;
          statuses?: Array<"pending" | "success" | "failed">;
          targetThreadId: string;
          upToAndIncludingMessageId?: string;
        },
        number
      >;
      deleteByIds: FunctionReference<
        "mutation",
        "internal",
        { messageIds: Array<string> },
        Array<string>
      >;
      deleteByOrder: FunctionReference<
        "mutation",
        "internal",
        {
          endOrder: number;
          endStepOrder?: number;
          startOrder: number;
          startStepOrder?: number;
          threadId: string;
        },
        { isDone: boolean; lastOrder?: number; lastStepOrder?: number }
      >;
      finalizeMessage: FunctionReference<
        "mutation",
        "internal",
        {
          messageId: string;
          result: { status: "success" } | { error: string; status: "failed" };
        },
        null
      >;
      getMessagesByIds: FunctionReference<
        "query",
        "internal",
        { messageIds: Array<string> },
        Array<null | {
          _creationTime: number;
          _id: string;
          agentName?: string;
          embeddingId?: string;
          error?: string;
          fileIds?: Array<string>;
          finishReason?:
            | "stop"
            | "length"
            | "content-filter"
            | "tool-calls"
            | "error"
            | "other"
            | "unknown";
          id?: string;
          message?:
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          image: string | ArrayBuffer;
                          mimeType?: string;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "image";
                        }
                      | {
                          data: string | ArrayBuffer;
                          filename?: string;
                          mimeType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "user";
              }
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          data: string | ArrayBuffer;
                          filename?: string;
                          mimeType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          signature?: string;
                          text: string;
                          type: "reasoning";
                        }
                      | {
                          data: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "redacted-reasoning";
                        }
                      | {
                          args: any;
                          providerExecuted?: boolean;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-call";
                        }
                      | {
                          args?: any;
                          experimental_content?: Array<
                            | { text: string; type: "text" }
                            | { data: string; mimeType?: string; type: "image" }
                          >;
                          isError?: boolean;
                          output?:
                            | { type: "text"; value: string }
                            | { type: "json"; value: any }
                            | { type: "error-text"; value: string }
                            | { type: "error-json"; value: any }
                            | {
                                type: "content";
                                value: Array<
                                  | { text: string; type: "text" }
                                  | {
                                      data: string;
                                      mediaType: string;
                                      type: "media";
                                    }
                                >;
                              };
                          providerExecuted?: boolean;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          result?: any;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-result";
                        }
                      | {
                          id: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          sourceType: "url";
                          title?: string;
                          type: "source";
                          url: string;
                        }
                      | {
                          filename?: string;
                          id: string;
                          mediaType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          sourceType: "document";
                          title: string;
                          type: "source";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "assistant";
              }
            | {
                content: Array<{
                  args?: any;
                  experimental_content?: Array<
                    | { text: string; type: "text" }
                    | { data: string; mimeType?: string; type: "image" }
                  >;
                  isError?: boolean;
                  output?:
                    | { type: "text"; value: string }
                    | { type: "json"; value: any }
                    | { type: "error-text"; value: string }
                    | { type: "error-json"; value: any }
                    | {
                        type: "content";
                        value: Array<
                          | { text: string; type: "text" }
                          | { data: string; mediaType: string; type: "media" }
                        >;
                      };
                  providerExecuted?: boolean;
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  result?: any;
                  toolCallId: string;
                  toolName: string;
                  type: "tool-result";
                }>;
                providerOptions?: Record<string, Record<string, any>>;
                role: "tool";
              }
            | {
                content: string;
                providerOptions?: Record<string, Record<string, any>>;
                role: "system";
              };
          model?: string;
          order: number;
          provider?: string;
          providerMetadata?: Record<string, Record<string, any>>;
          providerOptions?: Record<string, Record<string, any>>;
          reasoning?: string;
          reasoningDetails?: Array<
            | {
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                signature?: string;
                text: string;
                type: "reasoning";
              }
            | { signature?: string; text: string; type: "text" }
            | { data: string; type: "redacted" }
          >;
          sources?: Array<
            | {
                id: string;
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                sourceType: "url";
                title?: string;
                type?: "source";
                url: string;
              }
            | {
                filename?: string;
                id: string;
                mediaType: string;
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                sourceType: "document";
                title: string;
                type: "source";
              }
          >;
          status: "pending" | "success" | "failed";
          stepOrder: number;
          text?: string;
          threadId: string;
          tool: boolean;
          usage?: {
            cachedInputTokens?: number;
            completionTokens: number;
            promptTokens: number;
            reasoningTokens?: number;
            totalTokens: number;
          };
          userId?: string;
          warnings?: Array<
            | { details?: string; setting: string; type: "unsupported-setting" }
            | { details?: string; tool: any; type: "unsupported-tool" }
            | { message: string; type: "other" }
          >;
        }>
      >;
      getMessageSearchFields: FunctionReference<
        "query",
        "internal",
        { messageId: string },
        { embedding?: Array<number>; embeddingModel?: string; text?: string }
      >;
      listMessagesByThreadId: FunctionReference<
        "query",
        "internal",
        {
          excludeToolMessages?: boolean;
          order: "asc" | "desc";
          paginationOpts?: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          statuses?: Array<"pending" | "success" | "failed">;
          threadId: string;
          upToAndIncludingMessageId?: string;
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            _creationTime: number;
            _id: string;
            agentName?: string;
            embeddingId?: string;
            error?: string;
            fileIds?: Array<string>;
            finishReason?:
              | "stop"
              | "length"
              | "content-filter"
              | "tool-calls"
              | "error"
              | "other"
              | "unknown";
            id?: string;
            message?:
              | {
                  content:
                    | string
                    | Array<
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            text: string;
                            type: "text";
                          }
                        | {
                            image: string | ArrayBuffer;
                            mimeType?: string;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "image";
                          }
                        | {
                            data: string | ArrayBuffer;
                            filename?: string;
                            mimeType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "file";
                          }
                      >;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "user";
                }
              | {
                  content:
                    | string
                    | Array<
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            text: string;
                            type: "text";
                          }
                        | {
                            data: string | ArrayBuffer;
                            filename?: string;
                            mimeType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "file";
                          }
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            signature?: string;
                            text: string;
                            type: "reasoning";
                          }
                        | {
                            data: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "redacted-reasoning";
                          }
                        | {
                            args: any;
                            providerExecuted?: boolean;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            toolCallId: string;
                            toolName: string;
                            type: "tool-call";
                          }
                        | {
                            args?: any;
                            experimental_content?: Array<
                              | { text: string; type: "text" }
                              | {
                                  data: string;
                                  mimeType?: string;
                                  type: "image";
                                }
                            >;
                            isError?: boolean;
                            output?:
                              | { type: "text"; value: string }
                              | { type: "json"; value: any }
                              | { type: "error-text"; value: string }
                              | { type: "error-json"; value: any }
                              | {
                                  type: "content";
                                  value: Array<
                                    | { text: string; type: "text" }
                                    | {
                                        data: string;
                                        mediaType: string;
                                        type: "media";
                                      }
                                  >;
                                };
                            providerExecuted?: boolean;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            result?: any;
                            toolCallId: string;
                            toolName: string;
                            type: "tool-result";
                          }
                        | {
                            id: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            sourceType: "url";
                            title?: string;
                            type: "source";
                            url: string;
                          }
                        | {
                            filename?: string;
                            id: string;
                            mediaType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            sourceType: "document";
                            title: string;
                            type: "source";
                          }
                      >;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "assistant";
                }
              | {
                  content: Array<{
                    args?: any;
                    experimental_content?: Array<
                      | { text: string; type: "text" }
                      | { data: string; mimeType?: string; type: "image" }
                    >;
                    isError?: boolean;
                    output?:
                      | { type: "text"; value: string }
                      | { type: "json"; value: any }
                      | { type: "error-text"; value: string }
                      | { type: "error-json"; value: any }
                      | {
                          type: "content";
                          value: Array<
                            | { text: string; type: "text" }
                            | { data: string; mediaType: string; type: "media" }
                          >;
                        };
                    providerExecuted?: boolean;
                    providerMetadata?: Record<string, Record<string, any>>;
                    providerOptions?: Record<string, Record<string, any>>;
                    result?: any;
                    toolCallId: string;
                    toolName: string;
                    type: "tool-result";
                  }>;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "tool";
                }
              | {
                  content: string;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "system";
                };
            model?: string;
            order: number;
            provider?: string;
            providerMetadata?: Record<string, Record<string, any>>;
            providerOptions?: Record<string, Record<string, any>>;
            reasoning?: string;
            reasoningDetails?: Array<
              | {
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  signature?: string;
                  text: string;
                  type: "reasoning";
                }
              | { signature?: string; text: string; type: "text" }
              | { data: string; type: "redacted" }
            >;
            sources?: Array<
              | {
                  id: string;
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  sourceType: "url";
                  title?: string;
                  type?: "source";
                  url: string;
                }
              | {
                  filename?: string;
                  id: string;
                  mediaType: string;
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  sourceType: "document";
                  title: string;
                  type: "source";
                }
            >;
            status: "pending" | "success" | "failed";
            stepOrder: number;
            text?: string;
            threadId: string;
            tool: boolean;
            usage?: {
              cachedInputTokens?: number;
              completionTokens: number;
              promptTokens: number;
              reasoningTokens?: number;
              totalTokens: number;
            };
            userId?: string;
            warnings?: Array<
              | {
                  details?: string;
                  setting: string;
                  type: "unsupported-setting";
                }
              | { details?: string; tool: any; type: "unsupported-tool" }
              | { message: string; type: "other" }
            >;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
      searchMessages: FunctionReference<
        "action",
        "internal",
        {
          embedding?: Array<number>;
          embeddingModel?: string;
          limit: number;
          messageRange?: { after: number; before: number };
          searchAllMessagesForUserId?: string;
          targetMessageId?: string;
          text?: string;
          textSearch?: boolean;
          threadId?: string;
          vectorScoreThreshold?: number;
          vectorSearch?: boolean;
        },
        Array<{
          _creationTime: number;
          _id: string;
          agentName?: string;
          embeddingId?: string;
          error?: string;
          fileIds?: Array<string>;
          finishReason?:
            | "stop"
            | "length"
            | "content-filter"
            | "tool-calls"
            | "error"
            | "other"
            | "unknown";
          id?: string;
          message?:
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          image: string | ArrayBuffer;
                          mimeType?: string;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "image";
                        }
                      | {
                          data: string | ArrayBuffer;
                          filename?: string;
                          mimeType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "user";
              }
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          data: string | ArrayBuffer;
                          filename?: string;
                          mimeType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          signature?: string;
                          text: string;
                          type: "reasoning";
                        }
                      | {
                          data: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "redacted-reasoning";
                        }
                      | {
                          args: any;
                          providerExecuted?: boolean;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-call";
                        }
                      | {
                          args?: any;
                          experimental_content?: Array<
                            | { text: string; type: "text" }
                            | { data: string; mimeType?: string; type: "image" }
                          >;
                          isError?: boolean;
                          output?:
                            | { type: "text"; value: string }
                            | { type: "json"; value: any }
                            | { type: "error-text"; value: string }
                            | { type: "error-json"; value: any }
                            | {
                                type: "content";
                                value: Array<
                                  | { text: string; type: "text" }
                                  | {
                                      data: string;
                                      mediaType: string;
                                      type: "media";
                                    }
                                >;
                              };
                          providerExecuted?: boolean;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          result?: any;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-result";
                        }
                      | {
                          id: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          sourceType: "url";
                          title?: string;
                          type: "source";
                          url: string;
                        }
                      | {
                          filename?: string;
                          id: string;
                          mediaType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          sourceType: "document";
                          title: string;
                          type: "source";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "assistant";
              }
            | {
                content: Array<{
                  args?: any;
                  experimental_content?: Array<
                    | { text: string; type: "text" }
                    | { data: string; mimeType?: string; type: "image" }
                  >;
                  isError?: boolean;
                  output?:
                    | { type: "text"; value: string }
                    | { type: "json"; value: any }
                    | { type: "error-text"; value: string }
                    | { type: "error-json"; value: any }
                    | {
                        type: "content";
                        value: Array<
                          | { text: string; type: "text" }
                          | { data: string; mediaType: string; type: "media" }
                        >;
                      };
                  providerExecuted?: boolean;
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  result?: any;
                  toolCallId: string;
                  toolName: string;
                  type: "tool-result";
                }>;
                providerOptions?: Record<string, Record<string, any>>;
                role: "tool";
              }
            | {
                content: string;
                providerOptions?: Record<string, Record<string, any>>;
                role: "system";
              };
          model?: string;
          order: number;
          provider?: string;
          providerMetadata?: Record<string, Record<string, any>>;
          providerOptions?: Record<string, Record<string, any>>;
          reasoning?: string;
          reasoningDetails?: Array<
            | {
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                signature?: string;
                text: string;
                type: "reasoning";
              }
            | { signature?: string; text: string; type: "text" }
            | { data: string; type: "redacted" }
          >;
          sources?: Array<
            | {
                id: string;
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                sourceType: "url";
                title?: string;
                type?: "source";
                url: string;
              }
            | {
                filename?: string;
                id: string;
                mediaType: string;
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                sourceType: "document";
                title: string;
                type: "source";
              }
          >;
          status: "pending" | "success" | "failed";
          stepOrder: number;
          text?: string;
          threadId: string;
          tool: boolean;
          usage?: {
            cachedInputTokens?: number;
            completionTokens: number;
            promptTokens: number;
            reasoningTokens?: number;
            totalTokens: number;
          };
          userId?: string;
          warnings?: Array<
            | { details?: string; setting: string; type: "unsupported-setting" }
            | { details?: string; tool: any; type: "unsupported-tool" }
            | { message: string; type: "other" }
          >;
        }>
      >;
      textSearch: FunctionReference<
        "query",
        "internal",
        {
          limit: number;
          searchAllMessagesForUserId?: string;
          targetMessageId?: string;
          text?: string;
          threadId?: string;
        },
        Array<{
          _creationTime: number;
          _id: string;
          agentName?: string;
          embeddingId?: string;
          error?: string;
          fileIds?: Array<string>;
          finishReason?:
            | "stop"
            | "length"
            | "content-filter"
            | "tool-calls"
            | "error"
            | "other"
            | "unknown";
          id?: string;
          message?:
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          image: string | ArrayBuffer;
                          mimeType?: string;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "image";
                        }
                      | {
                          data: string | ArrayBuffer;
                          filename?: string;
                          mimeType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "user";
              }
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          data: string | ArrayBuffer;
                          filename?: string;
                          mimeType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          signature?: string;
                          text: string;
                          type: "reasoning";
                        }
                      | {
                          data: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "redacted-reasoning";
                        }
                      | {
                          args: any;
                          providerExecuted?: boolean;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-call";
                        }
                      | {
                          args?: any;
                          experimental_content?: Array<
                            | { text: string; type: "text" }
                            | { data: string; mimeType?: string; type: "image" }
                          >;
                          isError?: boolean;
                          output?:
                            | { type: "text"; value: string }
                            | { type: "json"; value: any }
                            | { type: "error-text"; value: string }
                            | { type: "error-json"; value: any }
                            | {
                                type: "content";
                                value: Array<
                                  | { text: string; type: "text" }
                                  | {
                                      data: string;
                                      mediaType: string;
                                      type: "media";
                                    }
                                >;
                              };
                          providerExecuted?: boolean;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          result?: any;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-result";
                        }
                      | {
                          id: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          sourceType: "url";
                          title?: string;
                          type: "source";
                          url: string;
                        }
                      | {
                          filename?: string;
                          id: string;
                          mediaType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          sourceType: "document";
                          title: string;
                          type: "source";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "assistant";
              }
            | {
                content: Array<{
                  args?: any;
                  experimental_content?: Array<
                    | { text: string; type: "text" }
                    | { data: string; mimeType?: string; type: "image" }
                  >;
                  isError?: boolean;
                  output?:
                    | { type: "text"; value: string }
                    | { type: "json"; value: any }
                    | { type: "error-text"; value: string }
                    | { type: "error-json"; value: any }
                    | {
                        type: "content";
                        value: Array<
                          | { text: string; type: "text" }
                          | { data: string; mediaType: string; type: "media" }
                        >;
                      };
                  providerExecuted?: boolean;
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  result?: any;
                  toolCallId: string;
                  toolName: string;
                  type: "tool-result";
                }>;
                providerOptions?: Record<string, Record<string, any>>;
                role: "tool";
              }
            | {
                content: string;
                providerOptions?: Record<string, Record<string, any>>;
                role: "system";
              };
          model?: string;
          order: number;
          provider?: string;
          providerMetadata?: Record<string, Record<string, any>>;
          providerOptions?: Record<string, Record<string, any>>;
          reasoning?: string;
          reasoningDetails?: Array<
            | {
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                signature?: string;
                text: string;
                type: "reasoning";
              }
            | { signature?: string; text: string; type: "text" }
            | { data: string; type: "redacted" }
          >;
          sources?: Array<
            | {
                id: string;
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                sourceType: "url";
                title?: string;
                type?: "source";
                url: string;
              }
            | {
                filename?: string;
                id: string;
                mediaType: string;
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                sourceType: "document";
                title: string;
                type: "source";
              }
          >;
          status: "pending" | "success" | "failed";
          stepOrder: number;
          text?: string;
          threadId: string;
          tool: boolean;
          usage?: {
            cachedInputTokens?: number;
            completionTokens: number;
            promptTokens: number;
            reasoningTokens?: number;
            totalTokens: number;
          };
          userId?: string;
          warnings?: Array<
            | { details?: string; setting: string; type: "unsupported-setting" }
            | { details?: string; tool: any; type: "unsupported-tool" }
            | { message: string; type: "other" }
          >;
        }>
      >;
      updateMessage: FunctionReference<
        "mutation",
        "internal",
        {
          messageId: string;
          patch: {
            error?: string;
            fileIds?: Array<string>;
            finishReason?:
              | "stop"
              | "length"
              | "content-filter"
              | "tool-calls"
              | "error"
              | "other"
              | "unknown";
            message?:
              | {
                  content:
                    | string
                    | Array<
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            text: string;
                            type: "text";
                          }
                        | {
                            image: string | ArrayBuffer;
                            mimeType?: string;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "image";
                          }
                        | {
                            data: string | ArrayBuffer;
                            filename?: string;
                            mimeType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "file";
                          }
                      >;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "user";
                }
              | {
                  content:
                    | string
                    | Array<
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            text: string;
                            type: "text";
                          }
                        | {
                            data: string | ArrayBuffer;
                            filename?: string;
                            mimeType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "file";
                          }
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            signature?: string;
                            text: string;
                            type: "reasoning";
                          }
                        | {
                            data: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "redacted-reasoning";
                          }
                        | {
                            args: any;
                            providerExecuted?: boolean;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            toolCallId: string;
                            toolName: string;
                            type: "tool-call";
                          }
                        | {
                            args?: any;
                            experimental_content?: Array<
                              | { text: string; type: "text" }
                              | {
                                  data: string;
                                  mimeType?: string;
                                  type: "image";
                                }
                            >;
                            isError?: boolean;
                            output?:
                              | { type: "text"; value: string }
                              | { type: "json"; value: any }
                              | { type: "error-text"; value: string }
                              | { type: "error-json"; value: any }
                              | {
                                  type: "content";
                                  value: Array<
                                    | { text: string; type: "text" }
                                    | {
                                        data: string;
                                        mediaType: string;
                                        type: "media";
                                      }
                                  >;
                                };
                            providerExecuted?: boolean;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            result?: any;
                            toolCallId: string;
                            toolName: string;
                            type: "tool-result";
                          }
                        | {
                            id: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            sourceType: "url";
                            title?: string;
                            type: "source";
                            url: string;
                          }
                        | {
                            filename?: string;
                            id: string;
                            mediaType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            sourceType: "document";
                            title: string;
                            type: "source";
                          }
                      >;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "assistant";
                }
              | {
                  content: Array<{
                    args?: any;
                    experimental_content?: Array<
                      | { text: string; type: "text" }
                      | { data: string; mimeType?: string; type: "image" }
                    >;
                    isError?: boolean;
                    output?:
                      | { type: "text"; value: string }
                      | { type: "json"; value: any }
                      | { type: "error-text"; value: string }
                      | { type: "error-json"; value: any }
                      | {
                          type: "content";
                          value: Array<
                            | { text: string; type: "text" }
                            | { data: string; mediaType: string; type: "media" }
                          >;
                        };
                    providerExecuted?: boolean;
                    providerMetadata?: Record<string, Record<string, any>>;
                    providerOptions?: Record<string, Record<string, any>>;
                    result?: any;
                    toolCallId: string;
                    toolName: string;
                    type: "tool-result";
                  }>;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "tool";
                }
              | {
                  content: string;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "system";
                };
            model?: string;
            provider?: string;
            providerOptions?: Record<string, Record<string, any>>;
            status?: "pending" | "success" | "failed";
          };
        },
        {
          _creationTime: number;
          _id: string;
          agentName?: string;
          embeddingId?: string;
          error?: string;
          fileIds?: Array<string>;
          finishReason?:
            | "stop"
            | "length"
            | "content-filter"
            | "tool-calls"
            | "error"
            | "other"
            | "unknown";
          id?: string;
          message?:
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          image: string | ArrayBuffer;
                          mimeType?: string;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "image";
                        }
                      | {
                          data: string | ArrayBuffer;
                          filename?: string;
                          mimeType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "user";
              }
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          data: string | ArrayBuffer;
                          filename?: string;
                          mimeType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          signature?: string;
                          text: string;
                          type: "reasoning";
                        }
                      | {
                          data: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "redacted-reasoning";
                        }
                      | {
                          args: any;
                          providerExecuted?: boolean;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-call";
                        }
                      | {
                          args?: any;
                          experimental_content?: Array<
                            | { text: string; type: "text" }
                            | { data: string; mimeType?: string; type: "image" }
                          >;
                          isError?: boolean;
                          output?:
                            | { type: "text"; value: string }
                            | { type: "json"; value: any }
                            | { type: "error-text"; value: string }
                            | { type: "error-json"; value: any }
                            | {
                                type: "content";
                                value: Array<
                                  | { text: string; type: "text" }
                                  | {
                                      data: string;
                                      mediaType: string;
                                      type: "media";
                                    }
                                >;
                              };
                          providerExecuted?: boolean;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          result?: any;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-result";
                        }
                      | {
                          id: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          sourceType: "url";
                          title?: string;
                          type: "source";
                          url: string;
                        }
                      | {
                          filename?: string;
                          id: string;
                          mediaType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          sourceType: "document";
                          title: string;
                          type: "source";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "assistant";
              }
            | {
                content: Array<{
                  args?: any;
                  experimental_content?: Array<
                    | { text: string; type: "text" }
                    | { data: string; mimeType?: string; type: "image" }
                  >;
                  isError?: boolean;
                  output?:
                    | { type: "text"; value: string }
                    | { type: "json"; value: any }
                    | { type: "error-text"; value: string }
                    | { type: "error-json"; value: any }
                    | {
                        type: "content";
                        value: Array<
                          | { text: string; type: "text" }
                          | { data: string; mediaType: string; type: "media" }
                        >;
                      };
                  providerExecuted?: boolean;
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  result?: any;
                  toolCallId: string;
                  toolName: string;
                  type: "tool-result";
                }>;
                providerOptions?: Record<string, Record<string, any>>;
                role: "tool";
              }
            | {
                content: string;
                providerOptions?: Record<string, Record<string, any>>;
                role: "system";
              };
          model?: string;
          order: number;
          provider?: string;
          providerMetadata?: Record<string, Record<string, any>>;
          providerOptions?: Record<string, Record<string, any>>;
          reasoning?: string;
          reasoningDetails?: Array<
            | {
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                signature?: string;
                text: string;
                type: "reasoning";
              }
            | { signature?: string; text: string; type: "text" }
            | { data: string; type: "redacted" }
          >;
          sources?: Array<
            | {
                id: string;
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                sourceType: "url";
                title?: string;
                type?: "source";
                url: string;
              }
            | {
                filename?: string;
                id: string;
                mediaType: string;
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                sourceType: "document";
                title: string;
                type: "source";
              }
          >;
          status: "pending" | "success" | "failed";
          stepOrder: number;
          text?: string;
          threadId: string;
          tool: boolean;
          usage?: {
            cachedInputTokens?: number;
            completionTokens: number;
            promptTokens: number;
            reasoningTokens?: number;
            totalTokens: number;
          };
          userId?: string;
          warnings?: Array<
            | { details?: string; setting: string; type: "unsupported-setting" }
            | { details?: string; tool: any; type: "unsupported-tool" }
            | { message: string; type: "other" }
          >;
        }
      >;
    };
    streams: {
      abort: FunctionReference<
        "mutation",
        "internal",
        {
          finalDelta?: {
            end: number;
            parts: Array<any>;
            start: number;
            streamId: string;
          };
          reason: string;
          streamId: string;
        },
        boolean
      >;
      abortByOrder: FunctionReference<
        "mutation",
        "internal",
        { order: number; reason: string; threadId: string },
        boolean
      >;
      addDelta: FunctionReference<
        "mutation",
        "internal",
        { end: number; parts: Array<any>; start: number; streamId: string },
        boolean
      >;
      create: FunctionReference<
        "mutation",
        "internal",
        {
          agentName?: string;
          format?: "UIMessageChunk" | "TextStreamPart";
          model?: string;
          order: number;
          provider?: string;
          providerOptions?: Record<string, Record<string, any>>;
          stepOrder: number;
          threadId: string;
          userId?: string;
        },
        string
      >;
      deleteAllStreamsForThreadIdAsync: FunctionReference<
        "mutation",
        "internal",
        { deltaCursor?: string; streamOrder?: number; threadId: string },
        { deltaCursor?: string; isDone: boolean; streamOrder?: number }
      >;
      deleteAllStreamsForThreadIdSync: FunctionReference<
        "action",
        "internal",
        { threadId: string },
        null
      >;
      deleteStreamAsync: FunctionReference<
        "mutation",
        "internal",
        { cursor?: string; streamId: string },
        null
      >;
      deleteStreamSync: FunctionReference<
        "mutation",
        "internal",
        { streamId: string },
        null
      >;
      finish: FunctionReference<
        "mutation",
        "internal",
        {
          finalDelta?: {
            end: number;
            parts: Array<any>;
            start: number;
            streamId: string;
          };
          streamId: string;
        },
        null
      >;
      heartbeat: FunctionReference<
        "mutation",
        "internal",
        { streamId: string },
        null
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          startOrder?: number;
          statuses?: Array<"streaming" | "finished" | "aborted">;
          threadId: string;
        },
        Array<{
          agentName?: string;
          format?: "UIMessageChunk" | "TextStreamPart";
          model?: string;
          order: number;
          provider?: string;
          providerOptions?: Record<string, Record<string, any>>;
          status: "streaming" | "finished" | "aborted";
          stepOrder: number;
          streamId: string;
          userId?: string;
        }>
      >;
      listDeltas: FunctionReference<
        "query",
        "internal",
        {
          cursors: Array<{ cursor: number; streamId: string }>;
          threadId: string;
        },
        Array<{
          end: number;
          parts: Array<any>;
          start: number;
          streamId: string;
        }>
      >;
    };
    threads: {
      createThread: FunctionReference<
        "mutation",
        "internal",
        {
          defaultSystemPrompt?: string;
          parentThreadIds?: Array<string>;
          summary?: string;
          title?: string;
          userId?: string;
        },
        {
          _creationTime: number;
          _id: string;
          status: "active" | "archived";
          summary?: string;
          title?: string;
          userId?: string;
        }
      >;
      deleteAllForThreadIdAsync: FunctionReference<
        "mutation",
        "internal",
        {
          cursor?: string;
          deltaCursor?: string;
          limit?: number;
          messagesDone?: boolean;
          streamOrder?: number;
          streamsDone?: boolean;
          threadId: string;
        },
        { isDone: boolean }
      >;
      deleteAllForThreadIdSync: FunctionReference<
        "action",
        "internal",
        { limit?: number; threadId: string },
        null
      >;
      getThread: FunctionReference<
        "query",
        "internal",
        { threadId: string },
        {
          _creationTime: number;
          _id: string;
          status: "active" | "archived";
          summary?: string;
          title?: string;
          userId?: string;
        } | null
      >;
      listThreadsByUserId: FunctionReference<
        "query",
        "internal",
        {
          order?: "asc" | "desc";
          paginationOpts?: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          userId?: string;
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            _creationTime: number;
            _id: string;
            status: "active" | "archived";
            summary?: string;
            title?: string;
            userId?: string;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
      searchThreadTitles: FunctionReference<
        "query",
        "internal",
        { limit: number; query: string; userId?: string | null },
        Array<{
          _creationTime: number;
          _id: string;
          status: "active" | "archived";
          summary?: string;
          title?: string;
          userId?: string;
        }>
      >;
      updateThread: FunctionReference<
        "mutation",
        "internal",
        {
          patch: {
            status?: "active" | "archived";
            summary?: string;
            title?: string;
            userId?: string;
          };
          threadId: string;
        },
        {
          _creationTime: number;
          _id: string;
          status: "active" | "archived";
          summary?: string;
          title?: string;
          userId?: string;
        }
      >;
    };
    users: {
      deleteAllForUserId: FunctionReference<
        "action",
        "internal",
        { userId: string },
        null
      >;
      deleteAllForUserIdAsync: FunctionReference<
        "mutation",
        "internal",
        { userId: string },
        boolean
      >;
      listUsersWithThreads: FunctionReference<
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
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<string>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
    };
    vector: {
      index: {
        deleteBatch: FunctionReference<
          "mutation",
          "internal",
          {
            ids: Array<
              | string
              | string
              | string
              | string
              | string
              | string
              | string
              | string
              | string
              | string
            >;
          },
          null
        >;
        deleteBatchForThread: FunctionReference<
          "mutation",
          "internal",
          {
            cursor?: string;
            limit: number;
            model: string;
            threadId: string;
            vectorDimension:
              | 128
              | 256
              | 512
              | 768
              | 1024
              | 1408
              | 1536
              | 2048
              | 3072
              | 4096;
          },
          { continueCursor: string; isDone: boolean }
        >;
        insertBatch: FunctionReference<
          "mutation",
          "internal",
          {
            vectorDimension:
              | 128
              | 256
              | 512
              | 768
              | 1024
              | 1408
              | 1536
              | 2048
              | 3072
              | 4096;
            vectors: Array<{
              messageId?: string;
              model: string;
              table: string;
              threadId?: string;
              userId?: string;
              vector: Array<number>;
            }>;
          },
          Array<
            | string
            | string
            | string
            | string
            | string
            | string
            | string
            | string
            | string
            | string
          >
        >;
        paginate: FunctionReference<
          "query",
          "internal",
          {
            cursor?: string;
            limit: number;
            table?: string;
            targetModel: string;
            vectorDimension:
              | 128
              | 256
              | 512
              | 768
              | 1024
              | 1408
              | 1536
              | 2048
              | 3072
              | 4096;
          },
          {
            continueCursor: string;
            ids: Array<
              | string
              | string
              | string
              | string
              | string
              | string
              | string
              | string
              | string
              | string
            >;
            isDone: boolean;
          }
        >;
        updateBatch: FunctionReference<
          "mutation",
          "internal",
          {
            vectors: Array<{
              id:
                | string
                | string
                | string
                | string
                | string
                | string
                | string
                | string
                | string
                | string;
              model: string;
              vector: Array<number>;
            }>;
          },
          null
        >;
      };
    };
  };
  shardedCounter: {
    public: {
      add: FunctionReference<
        "mutation",
        "internal",
        { count: number; name: string; shard?: number; shards?: number },
        number
      >;
      count: FunctionReference<"query", "internal", { name: string }, number>;
      estimateCount: FunctionReference<
        "query",
        "internal",
        { name: string; readFromShards?: number; shards?: number },
        any
      >;
      rebalance: FunctionReference<
        "mutation",
        "internal",
        { name: string; shards?: number },
        any
      >;
      reset: FunctionReference<"mutation", "internal", { name: string }, any>;
    };
  };
  workpool: {
    config: {
      update: FunctionReference<
        "mutation",
        "internal",
        {
          logLevel?: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
          maxParallelism?: number;
        },
        any
      >;
    };
    lib: {
      cancel: FunctionReference<
        "mutation",
        "internal",
        {
          id: string;
          logLevel?: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
        },
        any
      >;
      cancelAll: FunctionReference<
        "mutation",
        "internal",
        {
          before?: number;
          limit?: number;
          logLevel?: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
        },
        any
      >;
      enqueue: FunctionReference<
        "mutation",
        "internal",
        {
          config: {
            logLevel?: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
            maxParallelism?: number;
          };
          fnArgs: any;
          fnHandle: string;
          fnName: string;
          fnType: "action" | "mutation" | "query";
          onComplete?: { context?: any; fnHandle: string };
          retryBehavior?: {
            base: number;
            initialBackoffMs: number;
            maxAttempts: number;
          };
          runAt: number;
        },
        string
      >;
      enqueueBatch: FunctionReference<
        "mutation",
        "internal",
        {
          config: {
            logLevel?: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
            maxParallelism?: number;
          };
          items: Array<{
            fnArgs: any;
            fnHandle: string;
            fnName: string;
            fnType: "action" | "mutation" | "query";
            onComplete?: { context?: any; fnHandle: string };
            retryBehavior?: {
              base: number;
              initialBackoffMs: number;
              maxAttempts: number;
            };
            runAt: number;
          }>;
        },
        Array<string>
      >;
      status: FunctionReference<
        "query",
        "internal",
        { id: string },
        | { previousAttempts: number; state: "pending" }
        | { previousAttempts: number; state: "running" }
        | { state: "finished" }
      >;
      statusBatch: FunctionReference<
        "query",
        "internal",
        { ids: Array<string> },
        Array<
          | { previousAttempts: number; state: "pending" }
          | { previousAttempts: number; state: "running" }
          | { state: "finished" }
        >
      >;
    };
  };
};
