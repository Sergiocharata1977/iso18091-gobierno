/**
 * Error Handler Middleware
 *
 * Centralized error handling for API routes
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import {
  ValidationError,
  getErrorMessage,
  getErrorStatusCode,
  isBaseError,
} from '../base/BaseError';
import { ApiErrorResponse } from '../base/types';

/**
 * Handle error and return appropriate NextResponse
 * @param error - Error to handle
 * @returns NextResponse with error details
 */
export function errorHandler(error: unknown): NextResponse {
  // Log error for debugging (sanitize in production)
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isDevelopment) {
    console.error('❌ API Error:', error);
  } else {
    // In production, log without stack trace
    console.error('❌ API Error:', getErrorMessage(error));
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const errors: Record<string, string[]> = {};

    error.issues.forEach(err => {
      const path = err.path.join('.');
      if (!errors[path]) {
        errors[path] = [];
      }
      errors[path].push(err.message);
    });

    const response: ApiErrorResponse = {
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 400 });
  }

  // Handle custom BaseError instances
  if (isBaseError(error)) {
    const response: ApiErrorResponse = {
      success: false,
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString(),
    };

    // Include field errors for ValidationError
    if (error instanceof ValidationError) {
      response.errors = error.errors;
    }

    return NextResponse.json(response, { status: error.statusCode });
  }

  // Handle Firebase Auth errors
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('auth') || message.includes('token')) {
      const response: ApiErrorResponse = {
        success: false,
        error: 'Authentication error',
        code: 'AUTH_ERROR',
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(response, { status: 401 });
    }

    if (message.includes('permission') || message.includes('forbidden')) {
      const response: ApiErrorResponse = {
        success: false,
        error: 'Permission denied',
        code: 'PERMISSION_DENIED',
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(response, { status: 403 });
    }

    if (message.includes('not found')) {
      const response: ApiErrorResponse = {
        success: false,
        error: 'Resource not found',
        code: 'NOT_FOUND',
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(response, { status: 404 });
    }
  }

  // Handle unknown errors
  const response: ApiErrorResponse = {
    success: false,
    error: isDevelopment
      ? getErrorMessage(error)
      : 'An unexpected error occurred',
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, { status: 500 });
}

/**
 * Wrapper to use error handler with async route handlers
 *
 * @param handler - Async route handler
 * @returns Wrapped handler with error handling
 *
 * @example
 * ```typescript
 * export const GET = withErrorHandler(async (req) => {
 *   // Your code here
 *   // Errors will be caught and handled automatically
 *   return NextResponse.json({ data: 'success' });
 * });
 * ```
 */
export function withErrorHandler<
  T extends (...args: any[]) => Promise<NextResponse>,
>(handler: T): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      return errorHandler(error);
    }
  }) as T;
}

/**
 * Log error with context
 * @param error - Error to log
 * @param context - Additional context
 */
export function logError(error: unknown, context?: Record<string, any>): void {
  const timestamp = new Date().toISOString();
  const message = getErrorMessage(error);
  const statusCode = getErrorStatusCode(error);

  const logEntry = {
    timestamp,
    message,
    statusCode,
    ...context,
  };

  // In development, log full error
  if (process.env.NODE_ENV === 'development') {
    console.error('Error Log:', logEntry);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
  } else {
    // In production, log sanitized version
    console.error(JSON.stringify(logEntry));
  }

  // TODO: Send to external logging service (Sentry, CloudWatch, etc.)
}

/**
 * Sanitize error message for production
 * Removes sensitive information from error messages
 * @param message - Error message
 * @returns Sanitized message
 */
export function sanitizeErrorMessage(message: string): string {
  // Remove file paths
  message = message.replace(/\/[^\s]+/g, '[path]');

  // Remove email addresses
  message = message.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[email]');

  // Remove IP addresses
  message = message.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[ip]');

  // Remove tokens
  message = message.replace(/[A-Za-z0-9-_]{20,}/g, '[token]');

  return message;
}

/**
 * Create error response
 * @param message - Error message
 * @param code - Error code
 * @param statusCode - HTTP status code
 * @param errors - Field-specific errors
 * @returns NextResponse with error
 */
export function createErrorResponse(
  message: string,
  code: string = 'ERROR',
  statusCode: number = 500,
  errors?: Record<string, string[]>
): NextResponse {
  const response: ApiErrorResponse = {
    success: false,
    error: message,
    code,
    timestamp: new Date().toISOString(),
  };

  if (errors) {
    response.errors = errors;
  }

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Create success response
 * @param data - Response data
 * @param statusCode - HTTP status code
 * @returns NextResponse with data
 */
export function createSuccessResponse<T>(
  data: T,
  statusCode: number = 200
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}

/**
 * Handle async errors in non-route contexts
 * @param fn - Async function to wrap
 * @returns Wrapped function with error handling
 */
export function handleAsyncErrors<T extends (...args: any[]) => Promise<any>>(
  fn: T
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(error, { function: fn.name, args });
      throw error;
    }
  }) as T;
}
