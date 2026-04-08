'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type VoiceFormStatus =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'done'
  | 'error';

export interface VoiceFormExtractedField {
  fieldId?: string;
  fieldLabel?: string;
  value: string | number | boolean | null;
  confidence: number;
  rawValue?: unknown;
}

export interface VoiceFormFillResult {
  extractedFields: VoiceFormExtractedField[];
  missingFields: string[];
  transcript: string;
  rawResponse?: unknown;
}

export interface UseVoiceFormOptions {
  templateId: string;
  onFieldsExtracted: (results: VoiceFormFillResult) => void;
}

type MinimalSpeechRecognitionAlternative = {
  transcript: string;
};

type MinimalSpeechRecognitionResult = {
  isFinal: boolean;
  0: MinimalSpeechRecognitionAlternative;
};

type MinimalSpeechRecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<MinimalSpeechRecognitionResult>;
};

type MinimalSpeechRecognitionErrorEvent = {
  error: string;
};

type MinimalSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: MinimalSpeechRecognitionEvent) => void) | null;
  onerror: ((event: MinimalSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionCtor = new () => MinimalSpeechRecognition;

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(item => {
      if (typeof item === 'string') {
        return item;
      }

      if (item && typeof item === 'object') {
        const candidate = (item as Record<string, unknown>).fieldLabel;
        if (typeof candidate === 'string') {
          return candidate;
        }
      }

      return null;
    })
    .filter((item): item is string => Boolean(item));
}

function toExtractedField(
  field: unknown
): VoiceFormExtractedField | null {
  if (!field || typeof field !== 'object') {
    return null;
  }

  const source = field as Record<string, unknown>;
  const value =
    'value' in source
      ? (source.value as VoiceFormExtractedField['value'])
      : 'valor' in source
        ? (source.valor as VoiceFormExtractedField['value'])
        : null;

  const confidenceRaw =
    typeof source.confidence === 'number'
      ? source.confidence
      : typeof source.confianza === 'number'
        ? source.confianza
        : typeof source.score === 'number'
          ? source.score
          : 0;

  return {
    fieldId:
      typeof source.fieldId === 'string'
        ? source.fieldId
        : typeof source.field_id === 'string'
          ? source.field_id
          : typeof source.id === 'string'
            ? source.id
            : undefined,
    fieldLabel:
      typeof source.fieldLabel === 'string'
        ? source.fieldLabel
        : typeof source.field_label === 'string'
          ? source.field_label
          : typeof source.label === 'string'
            ? source.label
            : typeof source.etiqueta === 'string'
              ? source.etiqueta
              : undefined,
    value,
    confidence: Math.max(0, Math.min(1, confidenceRaw)),
    rawValue:
      'rawValue' in source
        ? source.rawValue
        : 'raw_value' in source
          ? source.raw_value
          : undefined,
  };
}

function normalizeVoiceFormFillResult(
  payload: unknown,
  transcript: string
): VoiceFormFillResult {
  const root =
    payload && typeof payload === 'object'
      ? ((payload as Record<string, unknown>).result ??
          (payload as Record<string, unknown>).data ??
          payload)
      : payload;

  const source =
    root && typeof root === 'object' ? (root as Record<string, unknown>) : {};

  const extractedSource =
    (source.extractedFields as unknown[]) ??
    (source.extracted_fields as unknown[]) ??
    (source.fields as unknown[]) ??
    (source.matches as unknown[]) ??
    [];

  const missingSource =
    source.missingFields ??
    source.missing_fields ??
    source.pendingFields ??
    source.pending_fields ??
    [];

  return {
    extractedFields: Array.isArray(extractedSource)
      ? extractedSource
          .map(toExtractedField)
          .filter((field): field is VoiceFormExtractedField => field !== null)
      : [],
    missingFields: toStringArray(missingSource),
    transcript,
    rawResponse: payload,
  };
}

export function useVoiceForm({
  templateId,
  onFieldsExtracted,
}: UseVoiceFormOptions) {
  const [status, setStatus] = useState<VoiceFormStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [result, setResult] = useState<VoiceFormFillResult | null>(null);

  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null);
  const transcriptRef = useRef('');
  const stopRequestedRef = useRef(false);
  const processingRef = useRef(false);

  const processTranscript = useCallback(
    async (finalTranscript: string) => {
      const voiceText = finalTranscript.trim();

      if (!voiceText) {
        setStatus('idle');
        return;
      }

      processingRef.current = true;
      setStatus('processing');
      setError(null);

      try {
        const response = await fetch('/api/ai/fill-form', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            voice_text: voiceText,
            template_id: templateId,
          }),
        });

        const payload = (await response.json().catch(() => null)) as unknown;

        if (!response.ok) {
          const message =
            payload &&
            typeof payload === 'object' &&
            'error' in payload &&
            typeof (payload as Record<string, unknown>).error === 'string'
              ? ((payload as Record<string, unknown>).error as string)
              : 'No se pudo completar el formulario por voz.';
          throw new Error(message);
        }

        const normalized = normalizeVoiceFormFillResult(payload, voiceText);
        setResult(normalized);
        onFieldsExtracted(normalized);
        setStatus('done');
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Ocurrió un error al procesar la voz.';
        setError(message);
        setStatus('error');
      } finally {
        processingRef.current = false;
      }
    },
    [onFieldsExtracted, templateId]
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const w = window as unknown as Record<string, SpeechRecognitionCtor | undefined>;
    const SpeechRecognition = w['SpeechRecognition'] ?? w['webkitSpeechRecognition'];

    if (!SpeechRecognition) {
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'es-AR';

    recognition.onresult = event => {
      let nextTranscript = '';

      for (let index = 0; index < event.results.length; index += 1) {
        const resultItem = event.results[index];
        const alternative = resultItem?.[0];

        if (resultItem?.isFinal && alternative?.transcript) {
          nextTranscript += `${alternative.transcript} `;
        }
      }

      const normalizedTranscript = nextTranscript.trim();
      transcriptRef.current = normalizedTranscript;
      setTranscript(normalizedTranscript);
    };

    recognition.onerror = event => {
      if (event.error === 'aborted' && stopRequestedRef.current) {
        return;
      }

      const message =
        event.error === 'not-allowed'
          ? 'El navegador bloqueó el acceso al micrófono.'
          : `Error de reconocimiento de voz: ${event.error}`;

      setError(message);
      setStatus('error');
    };

    recognition.onend = () => {
      const shouldProcess =
        !stopRequestedRef.current &&
        !processingRef.current &&
        transcriptRef.current.trim().length > 0;

      if (status === 'listening') {
        setStatus('idle');
      }

      if (shouldProcess) {
        void processTranscript(transcriptRef.current);
      }
    };

    recognitionRef.current = recognition;
    setIsSupported(true);

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [processTranscript, status]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      setError('Tu navegador no soporta reconocimiento de voz.');
      setStatus('error');
      return;
    }

    if (status === 'listening' || status === 'processing') {
      return;
    }

    stopRequestedRef.current = false;
    transcriptRef.current = '';
    setTranscript('');
    setResult(null);
    setError(null);
    setStatus('listening');

    try {
      recognitionRef.current.start();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo iniciar la captura de voz.';
      setError(message);
      setStatus('error');
    }
  }, [status]);

  const stop = useCallback(() => {
    if (!recognitionRef.current) {
      return;
    }

    stopRequestedRef.current = true;

    try {
      recognitionRef.current.stop();
    } finally {
      setStatus('idle');
    }
  }, []);

  return {
    startListening,
    stop,
    status,
    transcript,
    error,
    isSupported,
    result,
  };
}
