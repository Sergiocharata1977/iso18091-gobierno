'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Languages,
  Loader2,
  Mic,
  RotateCcw,
} from 'lucide-react';

import { VoiceSessionBanner } from '@/components/voice/VoiceSessionBanner';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useVoiceSession } from '@/hooks/use-voice-session';
import {
  type VoiceFormFillResult,
  type VoiceFormStatus,
  useVoiceForm,
} from '@/hooks/useVoiceForm';
import { cn } from '@/lib/utils';
import { detectLanguage } from '@/services/ai-core/voiceFormI18n';
import { VoiceFormValidator } from '@/services/ai-core/voiceFormValidator';
import type {
  FieldValidationResult,
  FieldValidationRule,
  VoiceFormLanguage,
  VoiceFormSessionState,
} from '@/types/voice-form';

interface VoiceFormButtonProps {
  templateId: string;
  onFieldsExtracted: (results: VoiceFormFillResult) => void;
  disabled?: boolean;
  validationRules?: FieldValidationRule[];
  enablePersistence?: boolean;
  onSessionRestored?: (session: VoiceFormSessionState) => void;
  showLanguageIndicator?: boolean;
}

type DisplayStatus = VoiceFormStatus | 'validating';
type VoiceValue = string | number | boolean | null;

function toVoiceValue(value: unknown): VoiceValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  return null;
}

function getFieldKey(
  field: VoiceFormFillResult['extractedFields'][number],
  index: number
): string {
  return field.fieldId ?? field.fieldLabel ?? `field_${index}`;
}

function mapToValidationInput(result: VoiceFormFillResult) {
  return result.extractedFields.map((field, index) => ({
    campo_id: getFieldKey(field, index),
    valor_extraido: field.value,
  }));
}

function getStatusUi(
  status: DisplayStatus,
  options: {
    language: VoiceFormLanguage;
    extractedCount: number;
    warningCount: number;
    errorText: string | null;
  }
) {
  switch (status) {
    case 'listening':
      return {
        icon: Mic,
        label: 'Escuchando...',
        buttonClassName:
          'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
        iconClassName: 'animate-pulse text-red-600',
      };
    case 'processing':
      return {
        icon: Loader2,
        label: `Procesando en ${options.language.toUpperCase()}...`,
        buttonClassName:
          'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
        iconClassName: 'animate-spin text-amber-600',
      };
    case 'validating':
      return {
        icon: Loader2,
        label: 'Validando campos...',
        buttonClassName: 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100',
        iconClassName: 'animate-spin text-sky-600',
      };
    case 'done':
      return {
        icon: CheckCircle,
        label: `${options.extractedCount} campos completados, ${options.warningCount} con advertencia`,
        buttonClassName:
          'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
        iconClassName: 'text-emerald-600',
      };
    case 'error':
      return {
        icon: AlertTriangle,
        label: `Error: ${options.errorText ?? 'Reintentar voz'}`,
        buttonClassName:
          'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
        iconClassName: 'text-red-600',
      };
    case 'idle':
    default:
      return {
        icon: Mic,
        label: 'Completar por voz',
        buttonClassName:
          'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100',
        iconClassName: 'text-slate-500',
      };
  }
}

export function VoiceFormButton({
  templateId,
  onFieldsExtracted,
  disabled = false,
  validationRules = [],
  enablePersistence = true,
  onSessionRestored,
  showLanguageIndicator = true,
}: VoiceFormButtonProps) {
  const { toast } = useToast();
  const validator = useMemo(() => new VoiceFormValidator(), []);
  const { session, saveSession, clearSession } = useVoiceSession(templateId);

  const [displayResult, setDisplayResult] = useState<VoiceFormFillResult | null>(
    null
  );
  const [displayStatus, setDisplayStatus] = useState<DisplayStatus>('idle');
  const [detectedLanguage, setDetectedLanguage] =
    useState<VoiceFormLanguage>('es');
  const [validationResults, setValidationResults] = useState<
    FieldValidationResult[]
  >([]);
  const [dismissedValidationIds, setDismissedValidationIds] = useState<Set<string>>(
    new Set()
  );

  const {
    startListening,
    stop,
    status,
    transcript,
    error,
    isSupported,
    result,
  } = useVoiceForm({
    templateId,
    onFieldsExtracted,
  });

  const lowConfidenceFields = useMemo(
    () =>
      (displayResult?.extractedFields ?? []).filter(
        field => field.confidence < 0.6
      ),
    [displayResult]
  );

  useEffect(() => {
    setDisplayStatus(status);
  }, [status]);

  useEffect(() => {
    if (!transcript.trim()) {
      return;
    }

    setDetectedLanguage(detectLanguage(transcript));
  }, [transcript]);

  useEffect(() => {
    if (status !== 'done' || !result) {
      return;
    }

    setDisplayResult(result);
    setDismissedValidationIds(new Set());

    toast({
      title: 'Formulario completado por voz',
      description: `${result.extractedFields.length} campos extraidos, ${result.missingFields.length} pendientes.`,
    });
  }, [result, status, toast]);

  useEffect(() => {
    if (!error) {
      return;
    }

    toast({
      title: 'Error de voz',
      description: error,
      variant: 'destructive',
    });
  }, [error, toast]);

  useEffect(() => {
    if (!displayResult || validationRules.length === 0) {
      setValidationResults([]);
      return;
    }

    setDisplayStatus('validating');

    const nextValidations = validator.validateAll(
      mapToValidationInput(displayResult),
      validationRules
    );

    setValidationResults(nextValidations);
    setDisplayStatus('done');
  }, [displayResult, validationRules, validator]);

  useEffect(() => {
    if (!displayResult || !enablePersistence) {
      return;
    }

    const extracted = displayResult.extractedFields.reduce<Record<string, unknown>>(
      (acc, field, index) => {
        acc[getFieldKey(field, index)] = field.value;
        return acc;
      },
      {}
    );

    const history = session?.transcript_history ?? [];
    const currentTranscript = transcript.trim();
    const nextHistory = currentTranscript ? [...history, currentTranscript] : history;

    saveSession({
      extracted_fields: extracted,
      failed_fields: displayResult.missingFields,
      transcript_history: nextHistory,
      language: detectedLanguage,
    });
  }, [
    detectedLanguage,
    displayResult,
    enablePersistence,
    saveSession,
    session?.transcript_history,
    transcript,
  ]);

  const visibleValidations = useMemo(
    () =>
      validationResults.filter(
        validation =>
          !dismissedValidationIds.has(validation.field_id) &&
          (!validation.is_valid || Boolean(validation.warning))
      ),
    [dismissedValidationIds, validationResults]
  );

  const warningCount = useMemo(
    () => validationResults.filter(item => Boolean(item.warning)).length,
    [validationResults]
  );

  const handleClick = () => {
    if (status === 'listening') {
      stop();
      return;
    }

    startListening();
  };

  const dismissValidation = (fieldId: string) => {
    setDismissedValidationIds(prev => new Set(prev).add(fieldId));
  };

  const applyFieldValue = (fieldId: string, value: unknown) => {
    setDisplayResult(prev => {
      if (!prev) {
        return prev;
      }

      const next: VoiceFormFillResult = {
        ...prev,
        extractedFields: prev.extractedFields.map((field, index) => {
          const key = getFieldKey(field, index);
          if (key !== fieldId) {
            return field;
          }

          return {
            ...field,
            value: toVoiceValue(value),
          };
        }),
      };

      onFieldsExtracted(next);
      return next;
    });

    dismissValidation(fieldId);
  };

  const handleRestoreSession = (savedSession: VoiceFormSessionState) => {
    const restoredResult: VoiceFormFillResult = {
      extractedFields: Object.entries(savedSession.extracted_fields).map(
        ([fieldId, value]) => ({
          fieldId,
          fieldLabel: fieldId,
          value: value as string | number | boolean | null,
          confidence: 1,
        })
      ),
      missingFields: savedSession.failed_fields,
      transcript: savedSession.transcript_history.at(-1) ?? '',
      rawResponse: savedSession,
    };

    setDisplayResult(restoredResult);
    setDetectedLanguage(savedSession.language);
    onFieldsExtracted(restoredResult);
    onSessionRestored?.(savedSession);
  };

  const { icon: Icon, label, buttonClassName, iconClassName } = getStatusUi(
    displayStatus,
    {
      language: detectedLanguage,
      extractedCount: displayResult?.extractedFields.length ?? 0,
      warningCount,
      errorText: error,
    }
  );

  return (
    <div className="space-y-3">
      {enablePersistence && session && (
        <VoiceSessionBanner
          session={session}
          onRestore={handleRestoreSession}
          onDiscard={clearSession}
        />
      )}

      <Button
        type="button"
        variant="outline"
        disabled={
          disabled ||
          (!isSupported && displayStatus !== 'error') ||
          displayStatus === 'processing' ||
          displayStatus === 'validating'
        }
        onClick={handleClick}
        className={cn(
          'w-full justify-start gap-2 border transition-colors',
          buttonClassName
        )}
      >
        <Icon className={cn('h-4 w-4', iconClassName)} />
        <span className="truncate">
          {isSupported ? label : 'Voz no disponible en este navegador'}
        </span>
        {showLanguageIndicator && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-slate-300 px-2 py-0.5 text-xs text-slate-600">
            <Languages className="h-3 w-3" />
            {detectedLanguage.toUpperCase()}
          </span>
        )}
      </Button>

      {displayStatus === 'listening' && (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <p className="font-medium text-slate-800">Dictado en curso</p>
          <p className="mt-1">{transcript.trim() ? transcript : 'Escuchando...'}</p>
        </div>
      )}

      {transcript && displayStatus !== 'listening' && (
        <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          <p className="font-medium text-slate-900">Transcripcion</p>
          <p className="mt-1">{transcript}</p>
        </div>
      )}

      {displayResult && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          <p className="font-medium">Resultado</p>
          <p className="mt-1">
            {displayResult.extractedFields.length} campos extraidos,{' '}
            {displayResult.missingFields.length} pendientes.
          </p>
        </div>
      )}

      {visibleValidations.map(validation => {
        const isWarning = validation.is_valid && Boolean(validation.warning);
        const message =
          validation.error ?? validation.warning ?? 'Revision sugerida';

        return (
          <div
            key={validation.field_id}
            className={cn(
              'rounded-md border px-3 py-2 text-sm',
              isWarning
                ? 'border-sky-200 bg-sky-50 text-sky-900'
                : 'border-amber-300 bg-amber-50 text-amber-950'
            )}
          >
            <p className="font-medium">
              Campo "{validation.field_id}": {message}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {!validation.is_valid && validation.corrected_value !== undefined && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    applyFieldValue(validation.field_id, validation.corrected_value)
                  }
                >
                  Usar {String(validation.corrected_value)}
                </Button>
              )}
              {!validation.is_valid && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => applyFieldValue(validation.field_id, null)}
                >
                  Dejar vacio
                </Button>
              )}
              {!validation.is_valid ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => dismissValidation(validation.field_id)}
                >
                  Ignorar
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => dismissValidation(validation.field_id)}
                  >
                    Si, es correcto
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => applyFieldValue(validation.field_id, null)}
                  >
                    Corregir
                  </Button>
                </>
              )}
            </div>
          </div>
        );
      })}

      {lowConfidenceFields.length > 0 && (
        <div className="rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-900">
          <p className="font-medium">Campos para revisar</p>
          <ul className="mt-2 space-y-2">
            {lowConfidenceFields.map((field, index) => (
              <li
                key={`${field.fieldId ?? field.fieldLabel ?? 'field'}-${index}`}
                className="rounded-md bg-yellow-100 px-2 py-1"
              >
                <span className="font-medium">
                  {field.fieldLabel ?? field.fieldId ?? 'Campo sin nombre'}
                </span>{' '}
                <span className="text-yellow-800">
                  {String(field.value ?? 'Sin valor')} ({' '}
                  {Math.round(field.confidence * 100)}% confianza)
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {status === 'error' && error && (
        <div className="space-y-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <p>{error}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-100"
            onClick={() => {
              if (status === 'error') {
                startListening();
              }
            }}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reintentar
          </Button>
        </div>
      )}
    </div>
  );
}
