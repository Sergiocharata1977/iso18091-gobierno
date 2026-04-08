/**
 * Rate Limiting Helper
 *
 * Implementa rate limiting en memoria para proteger endpoints de API.
 * Usa un algoritmo de sliding window para limitar requests por IP/usuario.
 */

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Store en memoria para rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Limpiar entradas expiradas cada 5 minutos
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  },
  5 * 60 * 1000
);

export interface RateLimitOptions {
  /** Número máximo de requests permitidos en la ventana de tiempo */
  maxRequests: number;
  /** Ventana de tiempo en segundos */
  windowSeconds: number;
  /** Identificador personalizado (por defecto usa IP) */
  identifier?: string;
}

/**
 * Verifica si una request excede el rate limit
 * @returns null si está dentro del límite, NextResponse con error 429 si excede
 */
export function checkRateLimit(
  request: NextRequest,
  options: RateLimitOptions
): NextResponse | null {
  const { maxRequests, windowSeconds, identifier } = options;

  // Obtener identificador (IP o custom)
  const key = identifier || getClientIdentifier(request);
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  // Obtener o crear entrada
  let entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime < now) {
    // Nueva ventana de tiempo
    entry = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(key, entry);
    return null;
  }

  // Incrementar contador
  entry.count++;

  // Verificar si excede el límite
  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

    return NextResponse.json(
      {
        error: 'Demasiadas solicitudes',
        message: `Has excedido el límite de ${maxRequests} solicitudes por ${windowSeconds} segundos`,
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': entry.resetTime.toString(),
        },
      }
    );
  }

  return null;
}

/**
 * Obtiene un identificador único del cliente (IP)
 */
function getClientIdentifier(request: NextRequest): string {
  // Intentar obtener IP real detrás de proxies
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  // Fallback a IP del request
  return request.ip || 'unknown';
}

/**
 * Wrapper para aplicar rate limiting a un handler
 */
export function withRateLimit<
  T extends (...args: any[]) => Promise<NextResponse>,
>(handler: T, options: RateLimitOptions): T {
  return (async (request: NextRequest, ...args: any[]) => {
    const rateLimitResponse = checkRateLimit(request, options);

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    return handler(request, ...args);
  }) as T;
}

/**
 * Limpia el rate limit para un identificador específico
 * Útil para testing o para resetear manualmente
 */
export function clearRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Limpia todo el store de rate limiting
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}

/**
 * Obtiene estadísticas del rate limit para un identificador
 */
export function getRateLimitStats(identifier: string): {
  count: number;
  remaining: number;
  resetTime: number;
} | null {
  const entry = rateLimitStore.get(identifier);

  if (!entry) {
    return null;
  }

  return {
    count: entry.count,
    remaining: Math.max(0, entry.count),
    resetTime: entry.resetTime,
  };
}
