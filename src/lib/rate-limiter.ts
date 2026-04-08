/**
 * Simple in-memory rate limiter
 * Para producción, considerar usar Redis o similar
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;

    // Limpiar entradas expiradas cada minuto
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Verificar si una solicitud está permitida
   */
  check(identifier: string): {
    allowed: boolean;
    remaining: number;
    resetAt: number;
  } {
    const now = Date.now();
    const entry = this.requests.get(identifier);

    // Si no existe o expiró, crear nueva entrada
    if (!entry || entry.resetAt < now) {
      const resetAt = now + this.windowMs;
      this.requests.set(identifier, { count: 1, resetAt });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetAt,
      };
    }

    // Si alcanzó el límite
    if (entry.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
      };
    }

    // Incrementar contador
    entry.count++;
    this.requests.set(identifier, entry);

    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetAt: entry.resetAt,
    };
  }

  /**
   * Limpiar entradas expiradas
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.requests.entries()) {
      if (entry.resetAt < now) {
        this.requests.delete(key);
      }
    }
  }

  /**
   * Resetear límite para un identificador
   */
  reset(identifier: string): void {
    this.requests.delete(identifier);
  }

  /**
   * Obtener estadísticas
   */
  getStats(): { totalKeys: number; activeKeys: number } {
    const now = Date.now();
    let activeKeys = 0;

    for (const entry of this.requests.values()) {
      if (entry.resetAt >= now) {
        activeKeys++;
      }
    }

    return {
      totalKeys: this.requests.size,
      activeKeys,
    };
  }
}

// Instancia global para APIs de IA (100 requests por minuto)
export const aiRateLimiter = new RateLimiter(100, 60000);

// Instancia para APIs generales (más permisiva)
export const generalRateLimiter = new RateLimiter(200, 60000);

/**
 * Helper para aplicar rate limiting en API routes
 */
export function applyRateLimit(
  identifier: string,
  limiter: RateLimiter = generalRateLimiter
): { allowed: boolean; remaining: number; resetAt: number } {
  return limiter.check(identifier);
}
