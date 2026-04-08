/**
 * Validation Helpers
 *
 * Helper functions for data validation using Zod
 */

import { z, ZodSchema } from 'zod';
import { ValidationError } from '../base/BaseError';
import { ValidationResult } from '../base/types';

/**
 * Validate data for create operation
 * @param schema - Zod schema
 * @param data - Data to validate
 * @returns Validated data
 * @throws ValidationError if validation fails
 */
export function validateCreate<T>(schema: ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {};
      error.issues.forEach((err: any) => {
        const path = err.path.join('.');
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(err.message);
      });
      throw new ValidationError('Validation failed', errors);
    }
    throw error;
  }
}

/**
 * Validate data for update operation (partial validation)
 * @param schema - Zod schema
 * @param data - Data to validate
 * @returns Validated data
 * @throws ValidationError if validation fails
 */
export function validateUpdate<T>(
  schema: ZodSchema<T>,
  data: unknown
): Partial<T> {
  try {
    return (schema as any).partial().parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {};
      error.issues.forEach((err: any) => {
        const path = err.path.join('.');
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(err.message);
      });
      throw new ValidationError('Validation failed', errors);
    }
    throw error;
  }
}

/**
 * Validate query parameters
 * @param schema - Zod schema
 * @param params - Query parameters
 * @returns Validated parameters
 * @throws ValidationError if validation fails
 */
export function validateQuery<T>(schema: ZodSchema<T>, params: unknown): T {
  return validateCreate(schema, params);
}

/**
 * Safe validation (returns result instead of throwing)
 * @param schema - Zod schema
 * @param data - Data to validate
 * @returns Validation result
 */
export function safeValidate<T>(
  schema: ZodSchema<T>,
  data: unknown
): ValidationResult & { data?: T } {
  try {
    const validated = schema.parse(data);
    return {
      isValid: true,
      errors: {},
      data: validated,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {};
      error.issues.forEach((err: any) => {
        const path = err.path.join('.');
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(err.message);
      });
      return {
        isValid: false,
        errors,
      };
    }
    return {
      isValid: false,
      errors: { _error: ['Unknown validation error'] },
    };
  }
}

/**
 * Common Zod schemas for reuse
 */
export const commonSchemas = {
  /**
   * Organization ID schema
   */
  organizationId: z.string().min(1, 'Organization ID is required'),

  /**
   * User ID schema
   */
  userId: z.string().min(1, 'User ID is required'),

  /**
   * Email schema
   */
  email: z.string().email('Invalid email format'),

  /**
   * URL schema
   */
  url: z.string().url('Invalid URL format'),

  /**
   * Date schema (ISO string)
   */
  dateString: z.string().datetime('Invalid date format'),

  /**
   * Positive integer schema
   */
  positiveInt: z.number().int().positive('Must be a positive integer'),

  /**
   * Non-negative integer schema
   */
  nonNegativeInt: z
    .number()
    .int()
    .nonnegative('Must be a non-negative integer'),

  /**
   * Percentage schema (0-100)
   */
  percentage: z.number().min(0).max(100, 'Must be between 0 and 100'),

  /**
   * Phone number schema (basic)
   */
  phone: z.string().regex(/^\+?[\d\s-()]+$/, 'Invalid phone number format'),

  /**
   * File upload schema
   */
  fileUpload: z.object({
    fileName: z.string().min(1, 'File name is required'),
    fileSize: z.number().positive('File size must be positive'),
    mimeType: z.string().min(1, 'MIME type is required'),
    filePath: z.string().min(1, 'File path is required'),
  }),

  /**
   * Pagination schema
   */
  pagination: z.object({
    limit: z.number().int().positive().max(100).optional(),
    offset: z.number().int().nonnegative().optional(),
  }),

  /**
   * Sort schema
   */
  sort: z.object({
    field: z.string().min(1),
    direction: z.enum(['asc', 'desc']),
  }),

  /**
   * Date range schema
   */
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
};

/**
 * Validate organization ID
 * @param organizationId - Organization ID to validate
 * @returns Validated organization ID
 */
export function validateOrganizationId(organizationId: unknown): string {
  return commonSchemas.organizationId.parse(organizationId);
}

/**
 * Validate user ID
 * @param userId - User ID to validate
 * @returns Validated user ID
 */
export function validateUserId(userId: unknown): string {
  return commonSchemas.userId.parse(userId);
}

/**
 * Validate email
 * @param email - Email to validate
 * @returns Validated email
 */
export function validateEmail(email: unknown): string {
  return commonSchemas.email.parse(email);
}

/**
 * Validate URL
 * @param url - URL to validate
 * @returns Validated URL
 */
export function validateUrl(url: unknown): string {
  return commonSchemas.url.parse(url);
}

/**
 * Validate pagination parameters
 * @param params - Pagination parameters
 * @returns Validated pagination
 */
export function validatePagination(params: unknown) {
  return commonSchemas.pagination.parse(params);
}

/**
 * Create a schema for enum values
 * @param values - Enum values
 * @param errorMessage - Custom error message
 * @returns Zod enum schema
 */
export function createEnumSchema<T extends string>(
  values: readonly [T, ...T[]],
  errorMessage?: string
) {
  return z.enum(values, errorMessage ? { message: errorMessage } : undefined);
}

/**
 * Create a schema for optional enum values
 * @param values - Enum values
 * @param errorMessage - Custom error message
 * @returns Zod enum schema (optional)
 */
export function createOptionalEnumSchema<T extends string>(
  values: readonly [T, ...T[]],
  errorMessage?: string
) {
  return createEnumSchema(values, errorMessage).optional();
}

/**
 * Validate array of items
 * @param schema - Schema for each item
 * @param data - Array to validate
 * @returns Validated array
 */
export function validateArray<T>(schema: ZodSchema<T>, data: unknown): T[] {
  return z.array(schema).parse(data);
}

/**
 * Validate object with dynamic keys
 * @param valueSchema - Schema for values
 * @param data - Object to validate
 * @returns Validated object
 */
export function validateRecord<T>(
  valueSchema: ZodSchema<T>,
  data: unknown
): Record<string, T> {
  return z.record(z.string(), valueSchema).parse(data);
}

/**
 * Merge multiple validation errors
 * @param errors - Array of error records
 * @returns Merged errors
 */
export function mergeValidationErrors(
  ...errors: Record<string, string[]>[]
): Record<string, string[]> {
  const merged: Record<string, string[]> = {};

  for (const errorRecord of errors) {
    for (const [key, messages] of Object.entries(errorRecord)) {
      if (!merged[key]) {
        merged[key] = [];
      }
      merged[key].push(...messages);
    }
  }

  return merged;
}

/**
 * Check if validation result has errors
 * @param result - Validation result
 * @returns True if there are errors
 */
export function hasValidationErrors(result: ValidationResult): boolean {
  return !result.isValid || Object.keys(result.errors).length > 0;
}

/**
 * Get first error message from validation result
 * @param result - Validation result
 * @returns First error message or null
 */
export function getFirstError(result: ValidationResult): string | null {
  const errors = result.errors;
  const firstKey = Object.keys(errors)[0];
  if (!firstKey) return null;
  return errors[firstKey][0] || null;
}

/**
 * Format validation errors for display
 * @param errors - Validation errors
 * @returns Formatted error messages
 */
export function formatValidationErrors(
  errors: Record<string, string[]>
): string[] {
  const messages: string[] = [];
  for (const [field, fieldErrors] of Object.entries(errors)) {
    for (const error of fieldErrors) {
      messages.push(`${field}: ${error}`);
    }
  }
  return messages;
}
