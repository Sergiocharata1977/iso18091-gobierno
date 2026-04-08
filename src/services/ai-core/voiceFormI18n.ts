import { VoiceFormLanguage } from '@/types/voice-form';

type VoiceTerms = {
  positive: string[];
  negative: string[];
  today: string[];
  yesterday: string[];
  tomorrow: string[];
  months: Record<string, number>;
  units: Record<string, string>;
};

export const VOICE_TERMS: Record<VoiceFormLanguage, VoiceTerms> = {
  es: {
    positive: [
      'si',
      'sí',
      'correcto',
      'afirmativo',
      'verdadero',
      'ok',
      'claro',
      'por supuesto',
      'efectivamente',
    ],
    negative: ['no', 'negativo', 'falso', 'incorrecto', 'para nada', 'nunca'],
    today: ['hoy', 'el dia de hoy', 'el día de hoy', 'esta fecha'],
    yesterday: ['ayer', 'el dia de ayer', 'el día de ayer'],
    tomorrow: ['manana', 'mañana', 'el dia de manana', 'el día de mañana'],
    months: {
      enero: 1,
      febrero: 2,
      marzo: 3,
      abril: 4,
      mayo: 5,
      junio: 6,
      julio: 7,
      agosto: 8,
      septiembre: 9,
      octubre: 10,
      noviembre: 11,
      diciembre: 12,
    },
    units: {
      kilos: 'kg',
      kilogramos: 'kg',
      gramos: 'g',
      litros: 'l',
      metros: 'm',
      centimetros: 'cm',
      centímetros: 'cm',
      horas: 'h',
      minutos: 'min',
      anos: 'años',
      años: 'años',
      meses: 'meses',
    },
  },
  en: {
    positive: ['yes', 'correct', 'affirmative', 'true', 'ok', 'sure', 'absolutely', 'indeed'],
    negative: ['no', 'negative', 'false', 'incorrect', 'never', 'nope'],
    today: ['today', 'this day'],
    yesterday: ['yesterday'],
    tomorrow: ['tomorrow'],
    months: {
      january: 1,
      february: 2,
      march: 3,
      april: 4,
      may: 5,
      june: 6,
      july: 7,
      august: 8,
      september: 9,
      october: 10,
      november: 11,
      december: 12,
    },
    units: {
      kilos: 'kg',
      kilograms: 'kg',
      grams: 'g',
      liters: 'l',
      meters: 'm',
      centimeters: 'cm',
      hours: 'h',
      minutes: 'min',
      years: 'years',
      months: 'months',
      pounds: 'lb',
    },
  },
};

function normalizeWord(word: string): string {
  return word
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceWholeWord(text: string, term: string, replacement: string): string {
  const escapedTerm = escapeRegExp(term);
  return text.replace(new RegExp(`\\b${escapedTerm}\\b`, 'gi'), replacement);
}

function isoDateFromOffset(offsetDays: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function detectLanguage(text: string): VoiceFormLanguage {
  const esMarkers = ['el', 'la', 'los', 'las', 'de', 'del', 'en', 'con', 'para', 'por'];
  const enMarkers = ['the', 'a', 'an', 'of', 'in', 'with', 'for', 'by', 'at', 'to'];

  const words = text
    .split(/\s+/)
    .map(token => normalizeWord(token).replace(/[^a-z0-9]/g, ''))
    .filter(Boolean);

  const esScore = words.filter(word => esMarkers.includes(word)).length;
  const enScore = words.filter(word => enMarkers.includes(word)).length;

  return enScore > esScore ? 'en' : 'es';
}

export function normalizeWithLanguage(text: string, lang: VoiceFormLanguage): string {
  const terms = VOICE_TERMS[lang];
  let normalized = text;

  for (const [term, unit] of Object.entries(terms.units)) {
    normalized = replaceWholeWord(normalized, term, unit);
  }

  const today = isoDateFromOffset(0);
  const yesterday = isoDateFromOffset(-1);
  const tomorrow = isoDateFromOffset(1);

  for (const term of terms.today) {
    normalized = replaceWholeWord(normalized, term, today);
  }

  for (const term of terms.yesterday) {
    normalized = replaceWholeWord(normalized, term, yesterday);
  }

  for (const term of terms.tomorrow) {
    normalized = replaceWholeWord(normalized, term, tomorrow);
  }

  return normalized;
}

