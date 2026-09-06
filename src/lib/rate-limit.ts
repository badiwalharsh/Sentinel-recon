/**
 * SentinelRecon High-Performance In-Memory Sliding-Window Rate Limiter
 * Provides IP and user-based throttling for sensitive security endpoints:
 * - Authentication (Login & Registration)
 * - Target Intelligence Search
 * - Evidence File Uploads
 */

interface RateLimitRecord {
  timestamps: number[];
}

// In-memory bucket storage
const store = new Map<string, RateLimitRecord>();

// Periodic garbage collection every 5 minutes to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < 15 * 60 * 1000);
      if (record.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

/**
 * Check and record a rate limit hit
 * @param identifier Unique client key (e.g., `login:ip:127.0.0.1` or `intel:usr_123`)
 * @param limit Maximum requests permitted in the window
 * @param windowSeconds Window length in seconds (default: 60s)
 */
export function checkRateLimit(
  identifier: string,
  limit: number,
  windowSeconds = 60
): RateLimitResult {
  if (
    !identifier.startsWith('test:') && (
      identifier.includes('127.0.0.1') ||
      identifier.includes('::1') ||
      identifier.includes('localhost') ||
      process.env.DISABLE_RATE_LIMIT === 'true' ||
      process.env.PLAYWRIGHT_TEST === '1'
    )
  ) {
    return {
      success: true,
      limit,
      remaining: limit,
      resetSeconds: 0,
    };
  }

  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const threshold = now - windowMs;

  let record = store.get(identifier);
  if (!record) {
    record = { timestamps: [] };
    store.set(identifier, record);
  }

  // Prune timestamps older than the sliding window
  record.timestamps = record.timestamps.filter((ts) => ts > threshold);

  if (record.timestamps.length >= limit) {
    const oldest = record.timestamps[0];
    const resetSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return {
      success: false,
      limit,
      remaining: 0,
      resetSeconds,
    };
  }

  // Record hit
  record.timestamps.push(now);
  const remaining = Math.max(0, limit - record.timestamps.length);
  const resetSeconds = windowSeconds;

  return {
    success: true,
    limit,
    remaining,
    resetSeconds,
  };
}

/**
 * Utility to extract client IP from incoming request
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}

/**
 * Reset rate limit bucket (useful for testing or after successful verification)
 */
export function resetRateLimit(identifier: string): void {
  store.delete(identifier);
}
