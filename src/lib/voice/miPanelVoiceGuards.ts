export interface VoiceGuardDecision {
  allowed: boolean;
  message?: string;
}

export type VoiceIntentLike =
  | string
  | null
  | undefined
  | {
      intent?: unknown;
      action?: unknown;
      type?: unknown;
      operation?: unknown;
      name?: unknown;
    };

export type VoiceSuggestionLike =
  | string
  | null
  | undefined
  | {
      intent?: unknown;
      action?: unknown;
      type?: unknown;
      operation?: unknown;
      name?: unknown;
      requiresConfirmation?: unknown;
      mutates?: unknown;
    };

const SUPERVISOR_MODE_QUERY_KEY = 'modo';
const SUPERVISOR_MODE_QUERY_VALUE = 'supervisor';
const SUPERVISOR_BLOCKED_ACTIONS = new Set(['create', 'update']);
const MUTATING_ACTIONS = new Set([
  'create',
  'update',
  'delete',
  'remove',
  'edit',
  'assign',
  'complete',
  'close',
  'cancel',
  'approve',
  'reject',
  'execute',
  'run',
  'submit',
  'archive',
  'restore',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function extractActionText(
  value: VoiceIntentLike | VoiceSuggestionLike
): string {
  if (typeof value === 'string') {
    return value;
  }

  if (!isRecord(value)) {
    return '';
  }

  const keys = ['intent', 'action', 'operation', 'type', 'name'] as const;
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate;
    }
  }

  return '';
}

function hasAnyToken(value: string, allowedTokens: Set<string>): boolean {
  const tokens = tokenize(value);
  return tokens.some(token => allowedTokens.has(token));
}

export function isSupervisorMode(
  source?: string | URLSearchParams | { search?: string | null }
): boolean {
  let params: URLSearchParams;

  if (typeof source === 'string') {
    const search = source.startsWith('?') ? source.slice(1) : source;
    params = new URLSearchParams(search);
  } else if (source instanceof URLSearchParams) {
    params = source;
  } else if (source && typeof source.search === 'string') {
    params = new URLSearchParams(source.search);
  } else if (
    typeof window !== 'undefined' &&
    typeof window.location !== 'undefined'
  ) {
    params = new URLSearchParams(window.location.search);
  } else {
    return false;
  }

  return (
    normalizeText(params.get(SUPERVISOR_MODE_QUERY_KEY)) ===
    SUPERVISOR_MODE_QUERY_VALUE
  );
}

export function canExecuteAction(
  intent: VoiceIntentLike,
  isSupervisor: boolean
): VoiceGuardDecision {
  const actionText = extractActionText(intent);

  if (!isSupervisor) {
    return { allowed: true };
  }

  if (hasAnyToken(actionText, SUPERVISOR_BLOCKED_ACTIONS)) {
    return {
      allowed: false,
      message: 'Modo supervisor: acciones create/update bloqueadas.',
    };
  }

  return { allowed: true };
}

export function requiresConfirmation(suggestion: VoiceSuggestionLike): boolean {
  if (isRecord(suggestion)) {
    if (suggestion.requiresConfirmation === true) {
      return true;
    }

    if (suggestion.mutates === true) {
      return true;
    }
  }

  const actionText = extractActionText(suggestion);
  return hasAnyToken(actionText, MUTATING_ACTIONS);
}
