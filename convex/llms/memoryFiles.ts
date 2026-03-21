import type { Id } from "../_generated/dataModel";
import { httpAction } from "../_generated/server";

export const publicMemoryFilePath = "/memory-file";

const publicBaseEnvKeys = [
  "MEMORY_PUBLIC_BASE_URL",
  "PUBLIC_FILE_BASE_URL",
  "CONVEX_SITE_URL",
  "CONVEX_URL",
] as const;

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function getConfiguredPublicBaseUrl() {
  for (const key of publicBaseEnvKeys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim()) {
      return normalizeBaseUrl(value);
    }
  }
  return null;
}

export function isProviderAccessibleUrl(url: string | null | undefined) {
  if (!url) {
    return false;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    return !(
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host.endsWith(".local")
    );
  } catch {
    return false;
  }
}

export function buildPublicMemoryFileUrl(args: {
  storageId: Id<"_storage"> | string;
  fileName?: string | null;
}) {
  const baseUrl = getConfiguredPublicBaseUrl();
  if (!baseUrl || !isProviderAccessibleUrl(baseUrl)) {
    return null;
  }
  const url = new URL(publicMemoryFilePath, `${baseUrl}/`);
  url.searchParams.set("storageId", String(args.storageId));
  if (args.fileName) {
    url.searchParams.set("fileName", args.fileName);
  }
  return url.toString();
}

function contentDisposition(fileName: string | null) {
  if (!fileName) {
    return "inline";
  }
  const safeName = fileName.replace(/[\r\n"]/g, "_");
  return `inline; filename="${safeName}"`;
}

export const servePublicMemoryFile = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const storageId = url.searchParams.get("storageId");
  if (!storageId) {
    return new Response("Missing storageId", { status: 400 });
  }

  const file = await ctx.storage.get(storageId as Id<"_storage">);
  if (!file) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(await file.arrayBuffer(), {
    status: 200,
    headers: {
      "cache-control": "public, max-age=3600",
      "content-disposition": contentDisposition(
        url.searchParams.get("fileName"),
      ),
      "content-type": file.type || "application/octet-stream",
    },
  });
});
