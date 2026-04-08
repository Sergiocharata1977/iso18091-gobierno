/**
 * Rate Limiting Middleware
 *
 * Middleware for rate limiting API requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { RateLimitError } from '../base/BaseError';
import { AuthenticatedHandler, AuthenticatedRequest } from './auth';

/**
 * Rate limit store (in-memory)
 * In production, use Redis or similar distributed cache
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: NextRequest) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

/**
 * Default rate limit configurations
 */
export const rateLimitConfigs = {
  /**
   * Standard rate limit: 100 requests per minute
   */
  standard: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
  },

  /**
   * Strict rate limit for auth endpoints: 10 requests per minute
   */
  auth: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
  },

  /**
   * Lenient rate limit for read operations: 200 requests per minute
   */
  read: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 200,
  },

  /**
   * Strict rate limit for write operations: 50 requests per minute
   */
  write: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 50,
  },
};

/**
 * Get client identifier from request
 * Uses user ID if authenticated, otherwise IP address
 * @param req - Request object
 * @returns Client identifier
 */
function getClientId(req: NextRequest): string {
  // Try to get user ID from authenticated request
  const authReq = req as AuthenticatedRequest;
  if (authReq.user?.uid) {
    return `user:${authReq.user.uid}`;
  }

  // Fall back to IP address
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded
    ? forwarded.split(',')[0]
    : req.headers.get('x-real-ip') || 'unknown';
  return `ip:${ip}`;
}

/**
 * Check rate limit for a client
 * @param key - Rate limit key
 * @param config - Rate limit configuration
 * @returns Object with allowed status and retry info
 */
function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; retryAfter?: number; remaining?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // No entry or window expired - allow and create new entry
  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
    };
  }

  // Within window - check if limit exceeded
  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return {
      allowed: false,
      retryAfter,
      remaining: 0,
    };
  }

  // Increment count
  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
  };
}

/**
 * Rate limiting middleware
 * @param config - Rate limit configuration
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * export const POST = withAuth(
 *   withRateLimit(rateLimitConfigs.write)(async (req) => {
 *     // Rate limited to 50 requests per minute
 *     return NextResponse.json({ success: true });
 *   })
 * );
 * ```
 */
export function withRateLimit(
  config: RateLimitConfig = rateLimitConfigs.standard
) {
  return (handler: AuthenticatedHandler): AuthenticatedHandler => {
    return async (req: AuthenticatedRequest): Promise<NextResponse> => {
      // Generate rate limit key
      const clientId = config.keyGenerator
        ? config.keyGenerator(req)
        : getClientId(req);
      const key = `ratelimit:${clientId}`;

      // Check rate limit
      const { allowed, retryAfter, remaining } = checkRateLimit(key, config);

      if (!allowed) {
        // Log rate limit violation
        console.warn(`⚠️  Rate limit exceeded for ${clientId}`);

        throw new RateLimitError(
          `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
          retryAfter
        );
      }

      // Add rate limit headers to response
      const response = await handler(req);

      response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
      response.headers.set(
        'X-RateLimit-Remaining',
        remaining?.toString() || '0'
      );
      response.headers.set(
        'X-RateLimit-Reset',
        new Date(Date.now() + config.windowMs).toISOString()
      );

      return response;
    };
  };
}

/**
 * Rate limit by user ID
 * @param config - Rate limit configuration
 * @returns Middleware function
 */
export function withUserRateLimit(
  config: RateLimitConfig = rateLimitConfigs.standard
) {
  return withRateLimit({
    ...config,
    keyGenerator: req => {
      const authReq = req as AuthenticatedRequest;
      return authReq.user?.uid || 'anonymous';
    },
  });
}

/**
 * Rate limit by IP address
 * @param config - Rate limit configuration
 * @returns Middleware function
 */
export function withIpRateLimit(
  config: RateLimitConfig = rateLimitConfigs.standard
) {
  return withRateLimit({
    ...config,
    keyGenerator: req => {
      const forwarded = req.headers.get('x-forwarded-for');
      const ip = forwarded
        ? forwarded.split(',')[0]
        : req.headers.get('x-real-ip') || 'unknown';
      return ip;
    },
  });
}

/**
 * Rate limit by organization
 * @param config - Rate limit configuration
 * @returns Middleware function
 */
export function withOrgRateLimit(
  config: RateLimitConfig = rateLimitConfigs.standard
) {
  return withRateLimit({
    ...config,
    keyGenerator: req => {
      const authReq = req as AuthenticatedRequest;
      return authReq.user?.uid || 'unknown';
    },
  });
}

/**
 * Clean up expired rate limit entries
 * Should be called periodically (e.g., every 5 minutes)
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`🧹 Cleaned up ${cleaned} expired rate limit entries`);
  }
}

/**
 * Get rate limit stats
 * @returns Rate limit statistics
 */
export function getRateLimitStats() {
  return {
    totalEntries: rateLimitStore.size,
    entries: Array.from(rateLimitStore.entries()).map(([key, entry]) => ({
      key,
      count: entry.count,
      resetTime: new Date(entry.resetTime).toISOString(),
    })),
  };
}

/**
 * Reset rate limit for a specific key
 * @param key - Rate limit key
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
  console.log(`🔄 Rate limit reset for ${key}`);
}

/**
 * Reset all rate limits
 */
export function resetAllRateLimits(): void {
  const size = rateLimitStore.size;
  rateLimitStore.clear();
  console.log(`🔄 All rate limits reset (${size} entries cleared)`);
}

// Setup periodic cleanup (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}
