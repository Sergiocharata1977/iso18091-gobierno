type JSONLike =
  | string
  | number
  | boolean
  | null
  | JSONLike[]
  | { [key: string]: JSONLike };

export interface SanitizeTelemetryOptions {
  maxStringLength?: number;
  maxArrayItems?: number;
  maxObjectKeys?: number;
  maxDepth?: number;
}

const DEFAULT_OPTIONS: Required<SanitizeTelemetryOptions> = {
  maxStringLength: 160,
  maxArrayItems: 10,
  maxObjectKeys: 25,
  maxDepth: 4,
};

const SENSITIVE_TEXT_KEY_PATTERN =
  /(prompt|response|output|input|message|messages|content|completion)/i;
const SECRET_KEYS = new Set([
  'token',
  'accesstoken',
  'refreshtoken',
  'secret',
  'clientsecret',
  'password',
  'authorization',
  'auth',
  'cookie',
  'apikey',
  'api_key',
  'credential',
  'credentials',
  'privatekey',
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function stringifyPrimitive(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return Object.prototype.toString.call(value);
}

function normalizeKeyName(key: string): string {
  return key.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function isSecretKey(key: string): boolean {
  return SECRET_KEYS.has(normalizeKeyName(key));
}

export function redactString(
  value: string,
  options: SanitizeTelemetryOptions = {}
): string {
  const merged = { ...DEFAULT_OPTIONS, ...options };

  if (value.length <= merged.maxStringLength) {
    return value;
  }

  return `${value.slice(0, merged.maxStringLength)}...[truncated:${value.length}]`;
}

export function sanitizeTelemetryValue(
  value: unknown,
  options: SanitizeTelemetryOptions = {},
  depth = 0
): JSONLike {
  const merged = { ...DEFAULT_OPTIONS, ...options };

  if (value == null) return null;
  if (depth >= merged.maxDepth) return '[max-depth]';

  if (typeof value === 'string') {
    return redactString(value, merged);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    const items = value
      .slice(0, merged.maxArrayItems)
      .map(item => sanitizeTelemetryValue(item, merged, depth + 1));

    if (value.length > merged.maxArrayItems) {
      items.push(`[+${value.length - merged.maxArrayItems} items]`);
    }

    return items;
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    const limitedEntries = entries.slice(0, merged.maxObjectKeys);
    const sanitized: Record<string, JSONLike> = {};

    for (const [key, raw] of limitedEntries) {
      if (isSecretKey(key)) {
        sanitized[key] = '[redacted-secret]';
        continue;
      }

      if (SENSITIVE_TEXT_KEY_PATTERN.test(key)) {
        const preview = stringifyPrimitive(raw);
        sanitized[key] = `[redacted-text:${preview.length}]`;
        continue;
      }

      sanitized[key] = sanitizeTelemetryValue(raw, merged, depth + 1);
    }

    if (entries.length > merged.maxObjectKeys) {
      sanitized.__truncated_keys__ = entries.length - merged.maxObjectKeys;
    }

    return sanitized;
  }

  return redactString(stringifyPrimitive(value), merged);
}

export function sanitizeTelemetryObject(
  value: Record<string, unknown> | undefined,
  options: SanitizeTelemetryOptions = {}
): Record<string, unknown> | undefined {
  if (!value) return undefined;
  return sanitizeTelemetryValue(value, options) as Record<string, unknown>;
}
