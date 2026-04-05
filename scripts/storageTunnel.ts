import ngrok from "@ngrok/ngrok";

/** Upstream for ngrok when file URLs use a different host than `CONVEX_URL` (advanced). */
export function resolveStorageTunnelUpstream(env: NodeJS.ProcessEnv): string {
  const e = env as Record<string, string | undefined>;
  const override = e.STORAGE_TUNNEL_UPSTREAM?.trim();
  if (override) {
    try {
      const u = new URL(
        override.includes("://") ? override : `https://${override}`,
      );
      return u.origin;
    } catch {
      throw new Error(`Invalid STORAGE_TUNNEL_UPSTREAM: ${override}`);
    }
  }
  const convex = e.CONVEX_URL?.trim() ?? e.BUN_PUBLIC_CONVEX_URL?.trim() ?? "";
  if (!convex) {
    throw new Error(
      "CONVEX_URL is required to start STORAGE_PUBLIC_TUNNEL_ORIGIN=auto (after Convex dev is ready).",
    );
  }
  return new URL(convex).origin;
}

export type StorageTunnelHandle = {
  publicOrigin: string;
  close: () => Promise<void>;
};

/**
 * Starts an ngrok HTTP edge forwarding to the Convex deployment origin (HTTPS).
 * Requires `NGROK_AUTHTOKEN`; optional `NGROK_DOMAIN` for a reserved hostname.
 */
export async function startNgrokStorageTunnel(
  env: NodeJS.ProcessEnv,
): Promise<StorageTunnelHandle> {
  const e = env as Record<string, string | undefined>;
  const token = e.NGROK_AUTHTOKEN?.trim();
  if (!token) {
    throw new Error(
      "STORAGE_PUBLIC_TUNNEL_ORIGIN=auto requires NGROK_AUTHTOKEN in the environment.",
    );
  }
  const upstream = resolveStorageTunnelUpstream(env);
  const domain = e.NGROK_DOMAIN?.trim();

  const listener = await ngrok.forward({
    addr: upstream,
    authtoken: token,
    ...(domain ? { domain } : {}),
  });

  const url = listener.url();
  if (!url) {
    await listener.close();
    throw new Error("ngrok listener returned no public URL.");
  }

  const publicOrigin = new URL(url).origin;
  console.log(
    JSON.stringify({
      type: "storage-tunnel",
      upstream,
      publicOrigin,
    }),
  );

  return {
    publicOrigin,
    close: () => listener.close(),
  };
}
