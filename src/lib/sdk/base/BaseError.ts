/**
 * Custom Error Classes for SDK
 *
 * These error classes provide typed errors with HTTP status codes
 * for consistent error handling across the application.
 */

/**
 * Base error class for all SDK errors
 */
export class BaseError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly timestamp: Date;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.timestamp = new Date();

    // Maintains proper stack trace for where error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON for API responses
   */
  toJSON() {
    return {
      error: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp.toISOString(),
    };
  }
}

/**
 * 401 Unauthorized - Authentication failed or missing
 */
export class UnauthorizedError extends BaseError {
  constructor(message: string = 'Unauthorized - Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * 403 Forbidden - User doesn't have permission
 */
export class ForbiddenError extends BaseError {
  constructor(message: string = 'Forbidden - Insufficient permissions') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * 404 Not Found - Resource doesn't exist
 */
export class NotFoundError extends BaseError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

/**
 * 400 Bad Request - Validation failed
 */
export class ValidationError extends BaseError {
  public readonly errors: Record<string, string[]>;

  constructor(
    message: string = 'Validation failed',
    errors: Record<string, string[]> = {}
  ) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }

  /**
   * Convert error to JSON including field errors
   */
  toJSON() {
    return {
      ...super.toJSON(),
      errors: this.errors,
    };
  }
}

/**
 * 409 Conflict - Resource already exists or conflict
 */
export class ConflictError extends BaseError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
export class RateLimitError extends BaseError {
  public readonly retryAfter?: number;

  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.retryAfter = retryAfter;
  }

  /**
   * Convert error to JSON including retry information
   */
  toJSON() {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter,
    };
  }
}

/**
 * 500 Internal Server Error - Unexpected server error
 */
export class InternalServerError extends BaseError {
  constructor(message: string = 'Internal server error') {
    super(message, 500, 'INTERNAL_SERVER_ERROR');
  }
}

/**
 * 503 Service Unavailable - Service temporarily unavailable
 */
export class ServiceUnavailableError extends BaseError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

/**
 * Helper to check if error is a BaseError
 */
export function isBaseError(error: unknown): error is BaseError {
  return error instanceof BaseError;
}

/**
 * Helper to get error message safely
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

/**
 * Helper to get error status code
 */
export function getErrorStatusCode(error: unknown): number {
  if (isBaseError(error)) {
    return error.statusCode;
  }
  return 500;
}
