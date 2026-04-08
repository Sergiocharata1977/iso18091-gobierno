/**
 * Simple in-memory rate limiter
 * For production, consider using Redis or a dedicated rate limiting service
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 10, windowMinutes: number = 1) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMinutes * 60 * 1000;

    // Clean up old entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if request is allowed for given identifier (userId, IP, etc.)
   * Returns true if allowed, false if rate limit exceeded
   */
  check(identifier: string): boolean {
    const now = Date.now();
    const entry = this.requests.get(identifier);

    // No previous requests or window expired
    if (!entry || now > entry.resetAt) {
      this.requests.set(identifier, {
        count: 1,
        resetAt: now + this.windowMs,
      });
      return true;
    }

    // Within window, check count
    if (entry.count < this.maxRequests) {
      entry.count++;
      return true;
    }

    // Rate limit exceeded
    return false;
  }

  /**
   * Get remaining requests for identifier
   */
  getRemaining(identifier: string): number {
    const entry = this.requests.get(identifier);
    if (!entry || Date.now() > entry.resetAt) {
      return this.maxRequests;
    }
    return Math.max(0, this.maxRequests - entry.count);
  }

  /**
   * Get time until reset in seconds
   */
  getResetTime(identifier: string): number {
    const entry = this.requests.get(identifier);
    if (!entry || Date.now() > entry.resetAt) {
      return 0;
    }
    return Math.ceil((entry.resetAt - Date.now()) / 1000);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.requests.entries()) {
      if (now > entry.resetAt) {
        this.requests.delete(key);
      }
    }
  }

  /**
   * Reset rate limit for identifier
   */
  reset(identifier: string): void {
    this.requests.delete(identifier);
  }
}

// Create singleton instances for different rate limits
export const chatRateLimiter = new RateLimiter(10, 1); // 10 requests per minute
export const apiRateLimiter = new RateLimiter(60, 1); // 60 requests per minute

/**
 * Middleware helper to check rate limit
 */
export function checkRateLimit(
  identifier: string,
  limiter: RateLimiter = chatRateLimiter
): {
  allowed: boolean;
  remaining: number;
  resetIn: number;
} {
  const allowed = limiter.check(identifier);
  const remaining = limiter.getRemaining(identifier);
  const resetIn = limiter.getResetTime(identifier);

  return { allowed, remaining, resetIn };
}

/**
 * Create rate limit error response
 */
export function createRateLimitResponse(resetIn: number): Response {
  return Response.json(
    {
      error: 'Rate limit exceeded',
      message: `Too many requests. Please try again in ${resetIn} seconds.`,
      retryAfter: resetIn,
    },
    {
      status: 429,
      headers: {
        'Retry-After': resetIn.toString(),
      },
    }
  );
}
