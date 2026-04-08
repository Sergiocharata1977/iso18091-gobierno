/**
 * DEPRECATED (OLA 2 - IA unificada):
 * Este parser se mantiene temporalmente como compatibilidad/fallback local.
 * La interpretacion principal de intents debe ejecutarse en el servidor
 * via `/api/ai/converse` (Unified AI Core).
 */
export type VoiceIntentType =
  | 'select_option'
  | 'navigate'
  | 'explain'
  | 'confirm'
  | 'cancel'
  | 'unknown';

export interface VoiceSuggestionLike {
  id?: string | number;
  label?: string;
  title?: string;
  text?: string;
}

interface VoiceIntentBase {
  type: VoiceIntentType;
  transcript: string;
  normalizedTranscript: string;
}

export interface VoiceSelectOptionIntent extends VoiceIntentBase {
  type: 'select_option';
  optionIndex: number;
  optionLabel?: string;
}

export interface VoiceNavigateIntent extends VoiceIntentBase {
  type: 'navigate';
  target: 'procesos' | 'mediciones';
  path: '/procesos' | '/procesos/mediciones';
}

export interface VoiceExplainIntent extends VoiceIntentBase {
  type: 'explain';
}

export interface VoiceConfirmIntent extends VoiceIntentBase {
  type: 'confirm';
}

export interface VoiceCancelIntent extends VoiceIntentBase {
  type: 'cancel';
}

export interface VoiceUnknownIntent extends VoiceIntentBase {
  type: 'unknown';
}

export type VoiceIntent =
  | VoiceSelectOptionIntent
  | VoiceNavigateIntent
  | VoiceExplainIntent
  | VoiceConfirmIntent
  | VoiceCancelIntent
  | VoiceUnknownIntent;

const EXPLAIN_PATTERNS = [
  /\bexplica(?:me)?\b/,
  /\bexplicacion\b/,
  /\bdetalle(?:s)?\b/,
  /\bmas info\b/,
  /\bmas informacion\b/,
  /\bque significa\b/,
  /\bque hace\b/,
  /\bayuda\b/,
];

const NAVIGATION_VERB_PATTERNS = [
  /\bver\b/,
  /\bir\b/,
  /\bir a\b/,
  /\babrir\b/,
  /\bmostrar\b/,
  /\bnavegar\b/,
];

const CONFIRM_PATTERNS = [
  /^(si|dale|ok|okay|confirmo|confirmar|de acuerdo|perfecto|listo)\b/,
  /\bsi por favor\b/,
  /\bdale\b/,
];

const CANCEL_PATTERNS = [
  /^(no|nada|cancela|cancelar|cancelalo|salir|parar|detener)\b/,
  /\bno gracias\b/,
  /\bnada\b/,
];

type OptionMatcher = {
  index: number;
  patterns: RegExp[];
};

const OPTION_MATCHERS: OptionMatcher[] = [
  {
    index: 1,
    patterns: [
      /\b1\b/,
      /\buno\b/,
      /\bopcion uno\b/,
      /\bopcion 1\b/,
      /\bprimero\b/,
      /\bprimera\b/,
    ],
  },
  {
    index: 2,
    patterns: [
      /\b2\b/,
      /\bdos\b/,
      /\bopcion dos\b/,
      /\bopcion 2\b/,
      /\bsegundo\b/,
      /\bsegunda\b/,
    ],
  },
  {
    index: 3,
    patterns: [
      /\b3\b/,
      /\btres\b/,
      /\bopcion tres\b/,
      /\bopcion 3\b/,
      /\btercero\b/,
      /\btercera\b/,
    ],
  },
];

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function makeBaseIntent(
  type: VoiceIntentType,
  transcript: string,
  normalizedTranscript: string
): VoiceIntentBase {
  return {
    type,
    transcript,
    normalizedTranscript,
  };
}

function getSuggestionLabel(
  suggestion: VoiceSuggestionLike | undefined
): string | undefined {
  if (!suggestion) {
    return undefined;
  }

  return suggestion.label ?? suggestion.title ?? suggestion.text;
}

function isCancel(normalizedTranscript: string): boolean {
  if (/\bno conformidad(?:es)?\b/.test(normalizedTranscript)) {
    return false;
  }

  return CANCEL_PATTERNS.some(pattern => pattern.test(normalizedTranscript));
}

function isExplain(normalizedTranscript: string): boolean {
  return EXPLAIN_PATTERNS.some(pattern => pattern.test(normalizedTranscript));
}

function isConfirm(normalizedTranscript: string): boolean {
  return CONFIRM_PATTERNS.some(pattern => pattern.test(normalizedTranscript));
}

function detectNavigate(
  transcript: string,
  normalizedTranscript: string
): VoiceNavigateIntent | null {
  const mentionsProcesos = /\bproceso(?:s)?\b/.test(normalizedTranscript);
  const mentionsMediciones = /\bmedicion(?:es)?\b/.test(normalizedTranscript);

  if (!mentionsProcesos && !mentionsMediciones) {
    return null;
  }

  const hasNavVerb = NAVIGATION_VERB_PATTERNS.some(pattern =>
    pattern.test(normalizedTranscript)
  );
  const shortCommand = normalizedTranscript.split(' ').length <= 3;

  if (!hasNavVerb && !shortCommand) {
    return null;
  }

  if (mentionsMediciones) {
    return {
      ...makeBaseIntent('navigate', transcript, normalizedTranscript),
      type: 'navigate',
      target: 'mediciones',
      path: '/procesos/mediciones',
    };
  }

  return {
    ...makeBaseIntent('navigate', transcript, normalizedTranscript),
    type: 'navigate',
    target: 'procesos',
    path: '/procesos',
  };
}

function detectSelectOption(
  transcript: string,
  normalizedTranscript: string,
  suggestions: VoiceSuggestionLike[]
): VoiceSelectOptionIntent | null {
  for (const matcher of OPTION_MATCHERS) {
    if (matcher.patterns.some(pattern => pattern.test(normalizedTranscript))) {
      return {
        ...makeBaseIntent('select_option', transcript, normalizedTranscript),
        type: 'select_option',
        optionIndex: matcher.index,
        optionLabel: getSuggestionLabel(suggestions[matcher.index - 1]),
      };
    }
  }

  return null;
}

export function parseVoiceIntent(
  transcript: string,
  suggestions: VoiceSuggestionLike[] = []
): VoiceIntent {
  const safeTranscript = typeof transcript === 'string' ? transcript : '';
  const normalizedTranscript = normalizeText(safeTranscript);

  if (!normalizedTranscript) {
    return makeBaseIntent(
      'unknown',
      safeTranscript,
      normalizedTranscript
    ) as VoiceUnknownIntent;
  }

  if (isCancel(normalizedTranscript)) {
    return makeBaseIntent(
      'cancel',
      safeTranscript,
      normalizedTranscript
    ) as VoiceCancelIntent;
  }

  const navigateIntent = detectNavigate(safeTranscript, normalizedTranscript);
  if (navigateIntent) {
    return navigateIntent;
  }

  if (isExplain(normalizedTranscript)) {
    return makeBaseIntent(
      'explain',
      safeTranscript,
      normalizedTranscript
    ) as VoiceExplainIntent;
  }

  const selectIntent = detectSelectOption(
    safeTranscript,
    normalizedTranscript,
    suggestions
  );
  if (selectIntent) {
    return selectIntent;
  }

  if (isConfirm(normalizedTranscript)) {
    return makeBaseIntent(
      'confirm',
      safeTranscript,
      normalizedTranscript
    ) as VoiceConfirmIntent;
  }

  return makeBaseIntent(
    'unknown',
    safeTranscript,
    normalizedTranscript
  ) as VoiceUnknownIntent;
}
