import { ChecklistField } from '@/types/checklists';
import {
  FieldValidationRule,
  VoiceFormLanguage,
} from '@/types/voice-form';
import {
  detectLanguage,
  normalizeWithLanguage,
} from '@/services/ai-core/voiceFormI18n';
import { VoiceFormValidator } from '@/services/ai-core/voiceFormValidator';

export interface FieldExtractionResult {
  campo_id: string;
  valor_extraido: string | number | boolean | null;
  confidence: number;
  texto_original: string;
}

export interface VoiceFormFillResult {
  campos_extraidos: FieldExtractionResult[];
  campos_no_encontrados: string[];
  observacion_general?: string;
}

type ClauseMatch = {
  clause: string;
  normalizedClause: string;
  score: number;
};

const POSITIVE_TERMS = [
  'conforme',
  'si',
  'sí',
  'ok',
  'correcto',
  'correcta',
  'aprobado',
  'aprobada',
  'cumple',
  'estable',
  'normal',
];

const NEGATIVE_TERMS = [
  'no conforme',
  'falla',
  'falla detectada',
  'fallo',
  'mal',
  'incorrecto',
  'incorrecta',
  'rechazado',
  'rechazada',
  'no cumple',
];

const STOP_WORDS = new Set([
  'de',
  'del',
  'la',
  'el',
  'los',
  'las',
  'y',
  'en',
  'con',
  'por',
  'para',
  'un',
  'una',
  'unos',
  'unas',
  'se',
  'al',
]);

const MONTHS: Record<string, number> = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  setiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11,
};

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s./-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeMeaningful(value: string): string[] {
  return normalizeText(value)
    .split(/\s+/)
    .filter(token => token.length > 2 && !STOP_WORDS.has(token));
}

function splitClauses(text: string): string[] {
  return text
    .split(/[,.;\n]+|\s+y\s+/i)
    .map(part => part.trim())
    .filter(Boolean);
}

function buildFieldAliases(field: ChecklistField): string[] {
  const aliases = [
    field.id.replace(/[_-]+/g, ' '),
    field.etiqueta,
    field.descripcion || '',
  ];

  if (field.tipo === 'texto' && /observ/i.test(field.etiqueta)) {
    aliases.push('observacion', 'observaciones', 'comentario', 'comentarios');
  }

  if (field.tipo === 'si_no' && /conform/i.test(field.etiqueta)) {
    aliases.push('conforme', 'conformidad');
  }

  return Array.from(
    new Set(
      aliases
        .map(alias => normalizeText(alias))
        .filter(alias => alias.length > 0)
    )
  );
}

function findBestClause(field: ChecklistField, clauses: string[]): ClauseMatch | null {
  const aliases = buildFieldAliases(field);
  const aliasTokens = aliases.flatMap(tokenizeMeaningful);

  let best: ClauseMatch | null = null;

  for (const clause of clauses) {
    const normalizedClause = normalizeText(clause);
    if (!normalizedClause) continue;

    let score = 0;

    for (const alias of aliases) {
      if (alias && normalizedClause.includes(alias)) {
        score += Math.max(2, alias.split(' ').length + 1);
      }
    }

    for (const token of aliasTokens) {
      if (normalizedClause.includes(token)) {
        score += 1;
      }
    }

    if (score === 0) continue;

    if (!best || score > best.score) {
      best = { clause, normalizedClause, score };
    }
  }

  return best;
}

function parseNumericValue(text: string): { value: number; raw: string } | null {
  const match = text.match(/(-?\d+(?:[.,]\d+)?)(?:\s*(grados|°c|c|kg|kilos?|g|gramos?|ppm|%|por ciento|cm|mm|m|litros?|l))?/i);
  if (!match) return null;

  const rawNumber = match[1].replace(',', '.');
  const value = Number(rawNumber);
  if (Number.isNaN(value)) return null;

  return {
    value,
    raw: match[0].trim(),
  };
}

function parseBooleanValue(text: string): { value: boolean; confidence: number; raw: string } | null {
  const normalized = normalizeText(text);

  for (const term of NEGATIVE_TERMS) {
    if (normalized.includes(normalizeText(term))) {
      return { value: false, confidence: 0.92, raw: text.trim() };
    }
  }

  if (/\bno\b/.test(normalized)) {
    return { value: false, confidence: 0.7, raw: text.trim() };
  }

  for (const term of POSITIVE_TERMS) {
    if (normalized.includes(normalizeText(term))) {
      return { value: true, confidence: 0.9, raw: text.trim() };
    }
  }

  return null;
}

function parseSelectionValue(
  field: ChecklistField,
  text: string
): { value: string; confidence: number; raw: string } | null {
  const options = field.opciones || [];
  if (options.length === 0) return null;

  const normalizedText = normalizeText(text);
  let bestOption: { value: string; confidence: number } | null = null;

  for (const option of options) {
    const normalizedOption = normalizeText(option);
    if (!normalizedOption) continue;

    if (normalizedText.includes(normalizedOption)) {
      const confidence = normalizedText === normalizedOption ? 0.98 : 0.9;
      if (!bestOption || confidence > bestOption.confidence) {
        bestOption = { value: option, confidence };
      }
      continue;
    }

    const optionTokens = tokenizeMeaningful(option);
    if (optionTokens.length === 0) continue;

    const matchedTokens = optionTokens.filter(token =>
      normalizedText.includes(token)
    ).length;

    if (matchedTokens === 0) continue;

    const confidence = Math.min(0.55 + matchedTokens / optionTokens.length * 0.3, 0.85);
    if (!bestOption || confidence > bestOption.confidence) {
      bestOption = { value: option, confidence };
    }
  }

  if (!bestOption) return null;

  return {
    value: bestOption.value,
    confidence: bestOption.confidence,
    raw: text.trim(),
  };
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateValue(text: string): { value: string; confidence: number; raw: string } | null {
  const normalized = normalizeText(text);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (normalized.includes('hoy')) {
    return { value: toIsoDate(today), confidence: 0.96, raw: text.trim() };
  }

  if (normalized.includes('ayer')) {
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return { value: toIsoDate(yesterday), confidence: 0.95, raw: text.trim() };
  }

  const slashMatch = normalized.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
  if (slashMatch) {
    const day = Number(slashMatch[1]);
    const month = Number(slashMatch[2]) - 1;
    const rawYear = Number(slashMatch[3]);
    const year = rawYear < 100 ? 2000 + rawYear : rawYear;
    const date = new Date(year, month, day);
    if (!Number.isNaN(date.getTime())) {
      return { value: toIsoDate(date), confidence: 0.93, raw: slashMatch[0] };
    }
  }

  const isoMatch = normalized.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) {
    const date = new Date(
      Number(isoMatch[1]),
      Number(isoMatch[2]) - 1,
      Number(isoMatch[3])
    );
    if (!Number.isNaN(date.getTime())) {
      return { value: toIsoDate(date), confidence: 0.95, raw: isoMatch[0] };
    }
  }

  const verboseMatch = normalized.match(
    /\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+de\s+(\d{4}))?\b/
  );
  if (verboseMatch) {
    const day = Number(verboseMatch[1]);
    const month = MONTHS[verboseMatch[2]];
    const year = verboseMatch[3] ? Number(verboseMatch[3]) : today.getFullYear();
    const date = new Date(year, month, day);
    if (!Number.isNaN(date.getTime())) {
      return { value: toIsoDate(date), confidence: 0.92, raw: verboseMatch[0] };
    }
  }

  return null;
}

function cleanFreeText(field: ChecklistField, clause: string): string {
  let value = clause.trim();

  for (const alias of buildFieldAliases(field)) {
    const regex = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b\\s*:?-?`, 'ig');
    value = value.replace(regex, ' ');
  }

  value = value
    .replace(/\b(es|esta|está|seria|sería|fue|son)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return value;
}

function extractObservationGeneral(
  voiceText: string,
  extracted: FieldExtractionResult[],
  textFields: ChecklistField[]
): string | undefined {
  const normalized = normalizeText(voiceText);
  const mentionsObservation = /(observacion|observaciones|comentario|comentarios)/.test(
    normalized
  );

  if (!mentionsObservation) return undefined;

  const textFieldIds = new Set(textFields.map(field => field.id));
  const fieldObservation = extracted.find(item => textFieldIds.has(item.campo_id));
  if (fieldObservation && typeof fieldObservation.valor_extraido === 'string') {
    return fieldObservation.valor_extraido;
  }

  const match = voiceText.match(
    /(?:observaciones?|comentarios?)\s*:?\s*(.+)$/i
  );
  return match?.[1]?.trim() || undefined;
}

function extractForField(
  field: ChecklistField,
  clauses: string[],
  fullText: string
): FieldExtractionResult | null {
  const bestClause = findBestClause(field, clauses);
  const clauseText = bestClause?.clause || fullText;

  if (field.tipo === 'numero') {
    const parsed = parseNumericValue(clauseText);
    if (!parsed) return null;

    const confidence = bestClause ? 0.94 : 0.58;
    return {
      campo_id: field.id,
      valor_extraido: parsed.value,
      confidence,
      texto_original: parsed.raw,
    };
  }

  if (field.tipo === 'si_no') {
    const parsed = parseBooleanValue(clauseText);
    if (!parsed) return null;

    const confidence = bestClause
      ? parsed.confidence
      : Math.min(parsed.confidence, 0.59);

    return {
      campo_id: field.id,
      valor_extraido: parsed.value,
      confidence,
      texto_original: parsed.raw,
    };
  }

  if (field.tipo === 'seleccion') {
    const parsed = parseSelectionValue(field, clauseText);
    if (!parsed) return null;

    return {
      campo_id: field.id,
      valor_extraido: parsed.value,
      confidence: bestClause ? parsed.confidence : Math.min(parsed.confidence, 0.59),
      texto_original: parsed.raw,
    };
  }

  if (field.tipo === 'fecha') {
    const parsed = parseDateValue(clauseText);
    if (!parsed) return null;

    return {
      campo_id: field.id,
      valor_extraido: parsed.value,
      confidence: bestClause ? parsed.confidence : Math.min(parsed.confidence, 0.59),
      texto_original: parsed.raw,
    };
  }

  if (field.tipo === 'texto') {
    if (!bestClause) return null;
    const cleaned = cleanFreeText(field, bestClause.clause);
    if (!cleaned) return null;

    return {
      campo_id: field.id,
      valor_extraido: cleaned,
      confidence: Math.min(0.65 + bestClause.score * 0.08, 0.92),
      texto_original: bestClause.clause.trim(),
    };
  }

  return null;
}

export async function extractFieldsFromVoice(
  voiceText: string,
  checklistFields: ChecklistField[],
  options?: {
    validationRules?: FieldValidationRule[];
    language?: VoiceFormLanguage;
  }
): Promise<VoiceFormFillResult> {
  const language = options?.language ?? detectLanguage(voiceText);
  const normalizedVoiceText = normalizeWithLanguage(voiceText, language);
  const clauses = splitClauses(normalizedVoiceText);
  const normalizedText = normalizeText(normalizedVoiceText);
  const extracted: FieldExtractionResult[] = [];
  const notFound: string[] = [];
  const validator = new VoiceFormValidator();

  for (const field of checklistFields) {
    const result = extractForField(field, clauses, normalizedVoiceText);

    if (result) {
      extracted.push(result);
      continue;
    }

    if (
      field.tipo === 'numero' &&
      clauses.length === 1 &&
      /\d/.test(normalizedText)
    ) {
      const numericFallback = parseNumericValue(normalizedVoiceText);
      if (numericFallback) {
        extracted.push({
          campo_id: field.id,
          valor_extraido: numericFallback.value,
          confidence: 0.55,
          texto_original: numericFallback.raw,
        });
        continue;
      }
    }

    if (field.tipo === 'si_no') {
      const booleanFallback = parseBooleanValue(normalizedVoiceText);
      if (booleanFallback) {
        extracted.push({
          campo_id: field.id,
          valor_extraido: booleanFallback.value,
          confidence: 0.55,
          texto_original: booleanFallback.raw,
        });
        continue;
      }
    }

    notFound.push(field.id);
  }

  const validationRules = options?.validationRules;
  if ((validationRules?.length ?? 0) > 0) {
    const validationResults = validator.validateAll(extracted, validationRules);

    const invalidFieldIds = validationResults
      .filter(result => !result.is_valid)
      .map(result => `${result.field_id}:invalid`);

    for (const invalidFieldId of invalidFieldIds) {
      if (!notFound.includes(invalidFieldId)) {
        notFound.push(invalidFieldId);
      }
    }
  }

  return {
    campos_extraidos: extracted,
    campos_no_encontrados: notFound,
    observacion_general: extractObservationGeneral(
      normalizedVoiceText,
      extracted,
      checklistFields.filter(field => field.tipo === 'texto')
    ),
  };
}
