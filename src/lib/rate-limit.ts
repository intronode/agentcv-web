import { getDb } from './db';

/**
 * DB-backed fixed-window rate limiter. Serverless-correct: the window counter
 * lives in the shared DB, so it holds across cold starts and across instances
 * (an in-memory limiter would reset per instance). No extra cloud dependency.
 */

export interface RateLimitResult {
  ok: boolean;
  /** Requests left in the current window (0 when over). */
  remaining: number;
  /** Seconds until the window resets (only meaningful when !ok). */
  retryAfter: number;
}

/**
 * Increment the counter for `bucket` in the current fixed window and report
 * whether the caller is within `limit` requests per `windowSec`.
 *
 * @param bucket    unique key, e.g. `register:user:42` or `contact:ip:1.2.3.4`
 * @param limit     max requests allowed per window
 * @param windowSec window length in seconds
 */
export async function rateLimit(
  bucket: string,
  limit: number,
  windowSec: number
): Promise<RateLimitResult> {
  const db = getDb();
  const nowSec = Math.floor(Date.now() / 1000);
  const windowStart = nowSec - (nowSec % windowSec);

  // Atomic upsert-increment; RETURNING gives the post-increment count.
  const row = (await db
    .prepare(
      `INSERT INTO rate_limits (bucket, window_start, count) VALUES (?, ?, 1)
       ON CONFLICT(bucket, window_start) DO UPDATE SET count = count + 1
       RETURNING count`
    )
    .get(bucket, windowStart)) as { count: number } | undefined;
  const count = row?.count ?? 1;

  // Prune this bucket's expired windows (cheap, bounded by window count).
  await db
    .prepare(`DELETE FROM rate_limits WHERE bucket = ? AND window_start < ?`)
    .run(bucket, windowStart);

  const ok = count <= limit;
  return {
    ok,
    remaining: Math.max(0, limit - count),
    retryAfter: ok ? 0 : windowStart + windowSec - nowSec,
  };
}
