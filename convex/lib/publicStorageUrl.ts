import { getNgrokUrl, isLocalAgentMode } from "../env";

/** Rewrite localhost storage URLs so providers can fetch via ngrok (local agent dev only). */
export function publicStorageUrl(localUrl: string): string {
  if (!isLocalAgentMode()) return localUrl;
  const ngrok = getNgrokUrl();
  if (!ngrok) return localUrl;
  try {
    const parsed = new URL(localUrl);
    if (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "::1"
    ) {
      const target = new URL(ngrok);
      return `${target.protocol}//${target.host}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    return localUrl;
  }
  return localUrl;
}
