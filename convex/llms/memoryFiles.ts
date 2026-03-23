import { components } from "../_generated/api";
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
  // TODO: Enable if serving over internet
  // try {
  //   const parsed = new URL(url);
  //   if (parsed.protocol !== "https:") {
  //     return false;
  //   }
  //   const host = parsed.hostname.toLowerCase();
  //   return !(
  //     host === "localhost" ||
  //     host === "127.0.0.1" ||
  //     host === "0.0.0.0" ||
  //     host.endsWith(".local")
  //   );
  // } catch {
  //   return false;
  // }

  return true;
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

export const servePublicMemoryFile = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const storageId = url.searchParams.get("storageId");
  if (!storageId) {
    return new Response("Missing storageId", { status: 400 });
  }

  const componentUrl = await ctx.runQuery(
    components.agentMemory.public.runtimeApi.getStorageUrl,
    { storageId },
  );
  if (!componentUrl) {
    return new Response("Not found", { status: 404 });
  }

  return Response.redirect(componentUrl, 302);
});
