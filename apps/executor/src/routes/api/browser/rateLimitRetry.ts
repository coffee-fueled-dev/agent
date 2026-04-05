/**
 * Outer retries for Browserbase API failures (e.g. session create) after the
 * @browserbasehq/sdk exhausts its own retries. Stagehand does not document
 * separate HTTP limits — concurrency and 429 behavior are Browserbase's; see
 * https://docs.browserbase.com/guides/concurrency-rate-limits
 */

export type BrowserbaseRetryOptions = {
  /** Total attempts including the first try (default 5). */
  maxAttempts?: number;
  /** When Retry-After is absent, exponential backoff base in ms (default 1000). */
  baseBackoffMs?: number;
  /** Cap for computed backoff in ms (default 120_000). */
  maxBackoffMs?: number;
};

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_BASE_BACKOFF_MS = 1000;
const DEFAULT_MAX_BACKOFF_MS = 120_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Normalize SDK error headers (may be a Proxy with lowercase keys). */
function headerGet(headers: unknown, name: string): string | undefined {
  if (!headers || typeof headers !== "object") {
    return undefined;
  }
  const h = headers as Record<string, string | undefined>;
  const lower = name.toLowerCase();
  const v = h[lower] ?? h[name];
  return typeof v === "string" ? v : undefined;
}

/**
 * Parses Retry-After / retry-after-ms from a Browserbase APIError-like object.
 * Mirrors @browserbasehq/sdk core retryRequest logic.
 */
export function retryAfterMsFromError(err: unknown): number | undefined {
  if (!err || typeof err !== "object") {
    return undefined;
  }
  const headers = (err as { headers?: unknown }).headers;
  const retryAfterMs = headerGet(headers, "retry-after-ms");
  if (retryAfterMs) {
    const n = parseFloat(retryAfterMs);
    if (!Number.isNaN(n) && n >= 0) {
      return n;
    }
  }
  const retryAfter = headerGet(headers, "retry-after");
  if (retryAfter) {
    const sec = parseFloat(retryAfter);
    if (!Number.isNaN(sec) && sec >= 0) {
      return sec * 1000;
    }
    const dateMs = Date.parse(retryAfter) - Date.now();
    if (!Number.isNaN(dateMs) && dateMs > 0) {
      return dateMs;
    }
  }
  return undefined;
}

/** True for Browserbase HTTP errors worth retrying (session create, etc.). */
export function isRetryableBrowserbaseApiError(err: unknown): boolean {
  if (!err || typeof err !== "object") {
    return false;
  }
  const e = err as { status?: number; name?: string };
  if (e.name === "RateLimitError") {
    return true;
  }
  if (e.status === 429) {
    return true;
  }
  // Transient server errors when opening a session
  if (e.status === 503 || e.status === 502) {
    return true;
  }
  if (
    e.name === "InternalServerError" &&
    typeof e.status === "number" &&
    e.status >= 500
  ) {
    return true;
  }
  return false;
}

function backoffMsForAttempt(
  attemptIndex: number,
  baseMs: number,
  maxMs: number,
): number {
  const exp = Math.min(maxMs, baseMs * 2 ** attemptIndex);
  const jitter = Math.floor(Math.random() * 400);
  return Math.min(maxMs, exp + jitter);
}

function resolveDelayMs(
  err: unknown,
  attemptIndex: number,
  baseBackoffMs: number,
  maxBackoffMs: number,
): number {
  const fromHeader = retryAfterMsFromError(err);
  if (fromHeader !== undefined && fromHeader > 0) {
    return Math.min(maxBackoffMs, fromHeader);
  }
  return backoffMsForAttempt(attemptIndex, baseBackoffMs, maxBackoffMs);
}

/**
 * Runs `fn` with retries when Browserbase returns rate limits or transient errors.
 * Does not treat Gemini RESOURCE_EXHAUSTED (CUA) as Browserbase — those lack SDK shape.
 */
export async function runWithBrowserbaseRetries<T>(
  options: BrowserbaseRetryOptions,
  fn: () => Promise<T>,
): Promise<T> {
  const maxAttempts =
    options.maxAttempts ??
    (parseInt(process.env.BROWSERBASE_SESSION_OUTER_MAX_ATTEMPTS ?? "", 10) ||
      DEFAULT_MAX_ATTEMPTS);
  const baseBackoffMs =
    options.baseBackoffMs ??
    (parseInt(process.env.BROWSERBASE_SESSION_RETRY_BASE_MS ?? "", 10) ||
      DEFAULT_BASE_BACKOFF_MS);
  const maxBackoffMs =
    options.maxBackoffMs ??
    (parseInt(process.env.BROWSERBASE_SESSION_RETRY_MAX_MS ?? "", 10) ||
      DEFAULT_MAX_BACKOFF_MS);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const retryable = isRetryableBrowserbaseApiError(err);
      if (!retryable || attempt === maxAttempts - 1) {
        throw err;
      }
      const delayMs = resolveDelayMs(err, attempt, baseBackoffMs, maxBackoffMs);
      await sleep(delayMs);
    }
  }
  throw new Error(
    "runWithBrowserbaseRetries: exhausted attempts without throw",
  );
}
