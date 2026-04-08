/**
 * Sanitization utilities for user input and AI output
 */

const MAX_INPUT_LENGTH = 2000;
const MAX_OUTPUT_LENGTH = 10000;

/**
 * Sanitize user input before sending to Claude API
 * - Removes potential XSS vectors
 * - Limits length
 * - Trims whitespace
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';

  // Trim whitespace
  let sanitized = input.trim();

  // Limit length
  if (sanitized.length > MAX_INPUT_LENGTH) {
    sanitized = sanitized.substring(0, MAX_INPUT_LENGTH);
  }

  // Remove potential script tags and HTML
  sanitized = sanitized
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, ''); // Remove event handlers

  return sanitized;
}

/**
 * Sanitize Claude API output before displaying to user
 * - Limits length
 * - Removes potentially harmful content
 */
export function sanitizeOutput(output: string): string {
  if (!output) return '';

  let sanitized = output.trim();

  // Limit length
  if (sanitized.length > MAX_OUTPUT_LENGTH) {
    sanitized = sanitized.substring(0, MAX_OUTPUT_LENGTH) + '...';
  }

  // Remove script tags (Claude shouldn't return these, but just in case)
  sanitized = sanitized.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    ''
  );

  return sanitized;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize filename for safe storage
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255);
}

/**
 * Remove sensitive information from error messages
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    // Remove file paths and stack traces
    return error.message
      .replace(/\/[^\s]+/g, '[path]')
      .replace(/at\s+[^\n]+/g, '')
      .trim();
  }

  return 'An error occurred';
}
