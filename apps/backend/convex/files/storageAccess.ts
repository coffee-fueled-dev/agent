import type { GenericDatabaseReader } from "convex/server";
import { internal } from "../_generated/api.js";
import type { DataModel, Id } from "../_generated/dataModel.js";
import type { ActionCtx } from "../_generated/server.js";
import { getStoragePublicTunnelOrigin } from "../env/storagePublic.js";

/** Minimal storage API used by mint (works with mutation and action writers). */
type MintStorage = {
  getUrl: (storageId: Id<"_storage">) => Promise<string | null>;
};

type MintWithDb = {
  db: GenericDatabaseReader<DataModel>;
  storage: MintStorage;
};

type MintWithRunQuery = {
  runQuery: ActionCtx["runQuery"];
  storage: MintStorage;
};

/** Rewrite Convex file URL origin to the public tunnel; keeps path, query, hash. */
export function applyPublicTunnelOrigin(rawUrl: string): string {
  const tunnel = getStoragePublicTunnelOrigin();
  if (!tunnel) return rawUrl;
  const base = new URL(tunnel.endsWith("/") ? tunnel : `${tunnel}/`);
  const u = new URL(rawUrl);
  return `${base.origin}${u.pathname}${u.search}${u.hash}`;
}

export async function canAccessStorageInNamespace(
  db: GenericDatabaseReader<DataModel>,
  namespace: string,
  storageId: Id<"_storage">,
): Promise<boolean> {
  const row = await db
    .query("fileProcesses")
    .withIndex("by_namespace_storage", (q) =>
      q.eq("namespace", namespace).eq("storageId", storageId),
    )
    .first();
  return row !== null;
}

/**
 * Single pipeline: namespace grant → `storage.getUrl` → optional tunnel origin rewrite.
 * Use for UI, embedding dispatch, memory links, and model attach.
 */
export async function mintFileUrlForNamespace(
  ctx: MintWithDb | MintWithRunQuery,
  args: { namespace: string; storageId: Id<"_storage"> | string },
): Promise<string> {
  const storageId = args.storageId as Id<"_storage">;
  let allowed: boolean;
  if ("db" in ctx) {
    allowed = await canAccessStorageInNamespace(
      ctx.db,
      args.namespace,
      storageId,
    );
  } else {
    allowed = await ctx.runQuery(
      internal.files.namespaceAccess.namespaceStorageAccess,
      {
        namespace: args.namespace,
        storageId,
      },
    );
  }
  if (!allowed) {
    throw new Error("Access denied for this file in this namespace.");
  }
  const raw = await ctx.storage.getUrl(storageId);
  if (!raw) {
    throw new Error("Storage URL unavailable");
  }
  return applyPublicTunnelOrigin(raw);
}
