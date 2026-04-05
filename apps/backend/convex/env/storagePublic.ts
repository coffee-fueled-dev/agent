import { z } from "zod/v4";

/** Optional; same key as in `convexDashboardEnvSchema` (`@agent/config`). */
const schema = z.object({
  STORAGE_PUBLIC_TUNNEL_ORIGIN: z.string().optional(),
});

const env = schema.parse(process.env);

function trim(s: string | undefined): string | undefined {
  const t = s?.trim();
  return t === "" ? undefined : t;
}

/**
 * When set (e.g. `https://abc.ngrok-free.app`), {@link applyPublicTunnelOrigin} rewrites
 * Convex `storage.getUrl()` origins to this origin; path/query/hash stay the same.
 */
export function getStoragePublicTunnelOrigin(): string | undefined {
  return trim(env.STORAGE_PUBLIC_TUNNEL_ORIGIN);
}
