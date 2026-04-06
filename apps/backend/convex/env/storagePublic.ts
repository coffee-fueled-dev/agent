/**
 * When set (e.g. `https://abc.ngrok-free.app`), {@link applyPublicTunnelOrigin} rewrites
 * Convex `storage.getUrl()` origins to this origin; path/query/hash stay the same.
 *
 * Read at call time (not module load) so that `convex env set` after startup is picked up.
 */
export function getStoragePublicTunnelOrigin(): string | undefined {
  const v = process.env.STORAGE_PUBLIC_TUNNEL_ORIGIN?.trim();
  return v === "" ? undefined : v;
}
