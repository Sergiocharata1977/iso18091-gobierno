import type { z } from 'zod';

import type { AIContractId } from '@/ai/types';
import { aiStructuredOutputSchemas } from '@/ai/schemas';

export type StructuredParseErrorCode =
  | 'invalid_json'
  | 'schema_validation'
  | 'missing_fields';

export interface StructuredParseSuccess<T> {
  ok: true;
  data: T;
  jsonText: string;
  rawText: string;
}

export interface StructuredParseFailure {
  ok: false;
  code: StructuredParseErrorCode;
  message: string;
  rawText: string;
  jsonText?: string;
  missingFields?: string[];
  issues?: Array<{ path: string; message: string; code: string }>;
}

export type StructuredParseResult<T> =
  | StructuredParseSuccess<T>
  | StructuredParseFailure;

export function normalizeAIOutput(rawText: string): string {
  return rawText.replace(/^\uFEFF/, '').trim();
}

export function extractJsonCandidate(rawText: string): string {
  const normalized = normalizeAIOutput(rawText);
  const fencedMatch = normalized.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = normalized.indexOf('{');
  const lastBrace = normalized.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return normalized.slice(firstBrace, lastBrace + 1).trim();
  }

  return normalized;
}

function normalizeZodIssues(error: z.ZodError): Array<{
  path: string;
  message: string;
  code: string;
}> {
  return error.issues.map(issue => ({
    path: issue.path.join('.') || '(root)',
    message: issue.message,
    code: issue.code,
  }));
}

function getMissingFieldPaths(error: z.ZodError): string[] {
  return error.issues
    .filter(issue => {
      if (issue.code !== 'invalid_type') {
        return false;
      }

      const issueWithMaybeInput = issue as { input?: unknown };
      const hasExplicitUndefinedInput =
        'input' in issueWithMaybeInput &&
        issueWithMaybeInput.input === undefined;

      const messageSuggestsMissing = /received\s+undefined|required/i.test(
        issue.message
      );

      return hasExplicitUndefinedInput || messageSuggestsMissing;
    })
    .map(issue => issue.path.join('.') || '(root)');
}

export function parseStructuredOutput<T>(
  rawText: string,
  schema: z.ZodType<T>
): StructuredParseResult<T> {
  const jsonText = extractJsonCandidate(rawText);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    return {
      ok: false,
      code: 'invalid_json',
      message:
        error instanceof Error ? error.message : 'No se pudo parsear JSON',
      rawText,
      jsonText,
    };
  }

  const validation = schema.safeParse(parsed);
  if (validation.success) {
    return {
      ok: true,
      data: validation.data,
      rawText,
      jsonText,
    };
  }

  const missingFields = getMissingFieldPaths(validation.error);
  return {
    ok: false,
    code: missingFields.length > 0 ? 'missing_fields' : 'schema_validation',
    message:
      missingFields.length > 0
        ? `Faltan campos requeridos: ${missingFields.join(', ')}`
        : 'El JSON no cumple el contrato esperado',
    rawText,
    jsonText,
    missingFields: missingFields.length > 0 ? missingFields : undefined,
    issues: normalizeZodIssues(validation.error),
  };
}

export function parseStructuredOutputByContract<T>(
  contractId: AIContractId,
  rawText: string
): StructuredParseResult<T> {
  const schema = aiStructuredOutputSchemas[contractId] as z.ZodType<T>;
  return parseStructuredOutput(rawText, schema);
}
