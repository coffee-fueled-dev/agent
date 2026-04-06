import type {
  MemorySourceMapsResolveCtx,
  SourceMapRowForMemory,
} from "../_components/memory/client/index.js";
import { MemoryClient } from "../_components/memory/client/index.js";
import { GRAPH_ONTOLOGY_CONTENT_SOURCE_TYPE } from "../_components/memory/graph.js";
import { components } from "../_generated/api.js";
import type { Id } from "../_generated/dataModel.js";
import { mintFileUrlForNamespace } from "../files/storageAccess.js";
import type {
  ResolvedMemorySource,
  ResolvedOtherMemorySource,
  ResolvedStorageMemorySource,
} from "../memories/resolveMemories.js";

/** Element type per `sourceMaps[].name` — narrows {@link MemoryClient.resolveSourceMapsByName}. */
export type MemoryClientSourceMapByName = {
  storage: ResolvedStorageMemorySource;
  /** Ontology graph nodes (`memorySourceMap` rows with `contentSource.type` graphOntology). */
  graphOntology: ResolvedOtherMemorySource;
  other: ResolvedOtherMemorySource;
};

async function resolveStorageSourceMaps(
  ctx: MemorySourceMapsResolveCtx,
  args: { namespace: string; memoryRecordId: string },
  { sourceMaps }: { sourceMaps: SourceMapRowForMemory[] },
): Promise<ResolvedStorageMemorySource[]> {
  const sources: ResolvedStorageMemorySource[] = [];
  const seen = new Set<string>();
  for (const row of sourceMaps) {
    const key = `${row.contentSource.type}:${row.contentSource.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    let url: string | null = null;
    try {
      url = await mintFileUrlForNamespace(ctx, {
        namespace: args.namespace,
        storageId: row.contentSource.id as Id<"_storage">,
      });
    } catch {
      url = null;
    }
    sources.push({
      kind: "storage",
      storageId: row.contentSource.id,
      url,
      fileName: row.fileName,
      mimeType: row.mimeType,
    });
  }
  return sources;
}

async function resolveGraphOntologySourceMaps(
  ctx: MemorySourceMapsResolveCtx,
  args: { namespace: string; memoryRecordId: string },
  ctxMaps: { sourceMaps: SourceMapRowForMemory[] },
): Promise<ResolvedOtherMemorySource[]> {
  return resolveNonStorageSourceMaps(ctx, args, ctxMaps);
}

async function resolveNonStorageSourceMaps(
  _ctx: MemorySourceMapsResolveCtx,
  _args: { namespace: string; memoryRecordId: string },
  { sourceMaps }: { sourceMaps: SourceMapRowForMemory[] },
): Promise<ResolvedOtherMemorySource[]> {
  const sources: ResolvedOtherMemorySource[] = [];
  const seen = new Set<string>();
  for (const row of sourceMaps) {
    const key = `${row.contentSource.type}:${row.contentSource.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push({
      kind: "other",
      contentSource: {
        type: row.contentSource.type,
        id: row.contentSource.id,
      },
      detail: {
        searchBackend: row.searchBackend,
        searchItemId: row.searchItemId,
        fileName: row.fileName,
        mimeType: row.mimeType,
      },
    });
  }
  return sources;
}

export const memoryClient = new MemoryClient<
  string | undefined,
  ResolvedMemorySource,
  MemoryClientSourceMapByName
>(components.memory, {
  sourceMaps: [
    { name: "storage", resolve: resolveStorageSourceMaps },
    {
      name: GRAPH_ONTOLOGY_CONTENT_SOURCE_TYPE,
      resolve: resolveGraphOntologySourceMaps,
    },
    { name: "other", remainder: true, resolve: resolveNonStorageSourceMaps },
  ],
});
