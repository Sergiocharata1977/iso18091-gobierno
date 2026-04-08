'use client';

import { useAuth } from '@/contexts/AuthContext';
import {
  resolveAISessionId,
  sendConverseRequest,
  setStoredAIConversationId,
} from '@/lib/ai/converseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { parseVoiceIntent } from '@/lib/voice/miPanelIntentParser';
import {
  canExecuteAction,
  requiresConfirmation,
} from '@/lib/voice/miPanelVoiceGuards';
import {
  buildVoiceSuggestions,
  inferVoiceRoleLevel,
} from '@/lib/voice/miPanelVoicePlanner';
import {
  getGreetingMessage,
  markGreetingDone,
  shouldGreetToday,
} from '@/lib/voice/miPanelVoiceStorage';
import type { VoiceIntentResult } from '@/services/ai-core/voiceIntentDetector';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type MiPanelVoiceAssistantProps = {
  dashboardData: Record<string, unknown>;
  onNavigate?: (route: string) => void;
  isSupervisorMode?: boolean;
  targetUserId?: string | null;
};

function buildDashboardSummary(data: Record<string, unknown>): string {
  const parts: string[] = [];
  const vencidos = Number(data.registrosVencidos) || 0;
  const pendientes = Number(data.registrosPendientes) || 0;
  const mediciones = Number(data.medicionesPendientes) || 0;
  const acciones = Number(data.accionesAbiertas) || 0;
  const procesos = Number(data.procesosAsignados) || 0;
  const roleLevel = inferVoiceRoleLevel(data);
  const rolePrefix =
    roleLevel === 'sin_puesto'
      ? 'Aun no tienes puesto asignado. '
      : roleLevel === 'directivo'
        ? 'Perfil directivo detectado. '
        : roleLevel === 'gerencial'
          ? 'Perfil gerencial detectado. '
          : roleLevel === 'supervision'
            ? 'Perfil de supervision detectado. '
            : roleLevel === 'operativo'
              ? 'Perfil operativo detectado. '
              : '';

  if (roleLevel === 'sin_puesto' && procesos === 0) {
    return (
      rolePrefix +
      'Actualmente no tienes procesos asignados. Solicita a tu supervisor o al responsable de calidad que te asignen un puesto y un proceso de trabajo.'
    );
  }

  if (vencidos > 0)
    parts.push(
      `${vencidos} registro${vencidos > 1 ? 's' : ''} vencido${vencidos > 1 ? 's' : ''}`
    );
  if (pendientes > 0)
    parts.push(
      `${pendientes} registro${pendientes > 1 ? 's' : ''} pendiente${pendientes > 1 ? 's' : ''}`
    );
  if (mediciones > 0)
    parts.push(
      `${mediciones} medicion${mediciones > 1 ? 'es' : ''} pendiente${mediciones > 1 ? 's' : ''}`
    );
  if (acciones > 0)
    parts.push(
      `${acciones} accion${acciones > 1 ? 'es' : ''} abierta${acciones > 1 ? 's' : ''}`
    );

  if (parts.length === 0) {
    return procesos > 0
      ? `${rolePrefix}Tenes ${procesos} proceso${procesos > 1 ? 's' : ''} asignado${procesos > 1 ? 's' : ''} y todo esta al dia.`
      : `${rolePrefix}Actualmente no tenes procesos asignados. Solicita a tu supervisor o al responsable de calidad la asignacion de un proceso.`;
  }

  return `${rolePrefix}Tenes ${parts.join(', ')}.`;
}

type VoiceUiStatus = 'idle' | 'listening' | 'processing' | 'degraded';

type MinimalSpeechRecognitionEvent = {
  results?: ArrayLike<ArrayLike<{ transcript?: string }>>;
};

type MinimalSpeechRecognitionErrorEvent = {
  error?: string;
};

type MinimalSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: MinimalSpeechRecognitionEvent) => void) | null;
  onerror: ((event: MinimalSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionCtor = new () => MinimalSpeechRecognition;

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionCtor;
    SpeechRecognition?: SpeechRecognitionCtor;
  }
}

const MAX_LISTEN_MS = 10_000;
const MAX_SESSION_MS = 30_000;

function safeGetUserName(
  dashboardData: Record<string, unknown>
): string | null {
  const name = dashboardData?.userName;
  if (typeof name === 'string' && name.trim()) return name.trim();
  return null;
}

function isHighConfidenceServerIntent(
  intent: VoiceIntentResult | undefined
): intent is VoiceIntentResult {
  return Boolean(intent && intent.intent.type !== 'general' && intent.confidence > 0.8);
}

export function MiPanelVoiceAssistant(props: MiPanelVoiceAssistantProps) {
  const {
    dashboardData,
    onNavigate,
    isSupervisorMode = false,
    targetUserId,
  } = props;
  const pathname = usePathname();
  const { user } = useAuth();
  const [uiStatus, setUiStatus] = useState<VoiceUiStatus>('idle');
  const [assistantText, setAssistantText] = useState<string>(
    'Don Candido esta listo para ayudarte. Usa voz o los botones.'
  );
  const [inputText, setInputText] = useState('');
  const [userTranscript, setUserTranscript] = useState('');
  const [ttsAvailable, setTtsAvailable] = useState(true);
  const [sttAvailable, setSttAvailable] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [pendingSuggestionId, setPendingSuggestionId] = useState<string | null>(
    null
  );

  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null);
  const listenTimeoutRef = useRef<number | null>(null);
  const sessionTimeoutRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const speechAttemptRef = useRef(0);

  const suggestions = buildVoiceSuggestions(dashboardData, isSupervisorMode);

  function clearTimeoutRef(ref: { current: number | null }) {
    if (ref.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(ref.current);
      ref.current = null;
    }
  }

  function stopListening() {
    clearTimeoutRef(listenTimeoutRef);
    setIsListening(false);
    try {
      recognitionRef.current?.stop();
    } catch {
      // Browser can throw if stop is called before start settles.
    }
  }

  function startSessionTimeout() {
    clearTimeoutRef(sessionTimeoutRef);
    if (typeof window === 'undefined') return;
    sessionTimeoutRef.current = window.setTimeout(() => {
      stopListening();
      setUiStatus(prev => (prev === 'degraded' ? prev : 'idle'));
      setAssistantText(
        'Tiempo maximo de sesion alcanzado (30s). Puedes continuar con botones o texto.'
      );
    }, MAX_SESSION_MS);
  }

  async function speakText(message: string): Promise<void> {
    setAssistantText(message);

    if (
      !ttsAvailable ||
      typeof window === 'undefined' ||
      !window.speechSynthesis
    ) {
      setUiStatus(prev => (prev === 'listening' ? prev : 'degraded'));
      return;
    }

    window.speechSynthesis.cancel();

    await new Promise<void>((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = 'es-ES';
      utterance.onend = () => resolve();
      utterance.onerror = () => reject(new Error('tts_error'));
      try {
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        reject(error);
      }
    }).catch(async () => {
      if (speechAttemptRef.current < 1) {
        speechAttemptRef.current += 1;
        await speakText(message);
        return;
      }

      setTtsAvailable(false);
      setUiStatus('degraded');
      setAssistantText(`${message} (Audio no disponible, mostrado en texto).`);
    });

    speechAttemptRef.current = 0;
  }

  function executeNavigation(route: string) {
    if (typeof route !== 'string' || !route.trim()) return;
    if (onNavigate) {
      onNavigate(route);
      return;
    }
    if (typeof window !== 'undefined') {
      window.location.assign(route);
    }
  }

  async function executeSuggestion(
    optionIndex: number,
    options?: { skipConfirmation?: boolean; spokenMessage?: string }
  ) {
    const suggestion = suggestions[optionIndex - 1];
    if (!suggestion) {
      await speakText(`No existe la opcion ${optionIndex}.`);
      return;
    }

    const guard = canExecuteAction(suggestion.actionType, isSupervisorMode);
    if (!guard.allowed) {
      await speakText(guard.message ?? 'Accion no permitida en este modo.');
      return;
    }

    if (
      !options?.skipConfirmation &&
      requiresConfirmation({ action: suggestion.actionType })
    ) {
      setPendingSuggestionId(suggestion.id);
      await speakText(
        `Confirma si deseas ejecutar ${suggestion.titulo}. Responde si o no.`
      );
      return;
    }

    await speakText(options?.spokenMessage || suggestion.frase_voz);
    executeNavigation(suggestion.route);
  }

  async function explainSuggestions(spokenMessage?: string) {
    if (spokenMessage?.trim()) {
      await speakText(spokenMessage);
      return;
    }

    if (suggestions.length === 0) {
      await speakText('No hay sugerencias prioritarias ahora mismo.');
      return;
    }

    const summary = suggestions
      .map((s, idx) => `Opcion ${idx + 1}: ${s.titulo}`)
      .join('. ');
    await speakText(summary);
  }

  async function confirmPending(spokenMessage?: string) {
    if (!pendingSuggestionId) {
      await speakText('No hay ninguna accion pendiente por confirmar.');
      return;
    }

    const index = suggestions.findIndex(s => s.id === pendingSuggestionId);
    setPendingSuggestionId(null);
    if (index >= 0) {
      await executeSuggestion(index + 1, {
        skipConfirmation: true,
        spokenMessage,
      });
      return;
    }

    await speakText('La accion pendiente ya no esta disponible.');
  }

  async function cancelPending(spokenMessage?: string) {
    setPendingSuggestionId(null);
    await speakText(
      spokenMessage || 'Accion cancelada. Puedes elegir otra opcion.'
    );
  }

  async function handleTranscript(rawText: string) {
    const transcript = (rawText ?? '').trim();
    setUserTranscript(transcript);
    if (!transcript) {
      await speakText('No detecte texto. Prueba otra vez o usa los botones.');
      return;
    }

    setUiStatus(prev => (prev === 'degraded' ? 'degraded' : 'processing'));
    const unifiedSessionId = resolveAISessionId({
      userId: targetUserId || user?.id || null,
      preferredSessionId: null,
      fallbackPrefix: 'voice',
    });

    let assistantReply = '';
    try {
      const response = await sendConverseRequest({
        channel: 'voice',
        message: transcript,
        organizationId: user?.organization_id || '',
        sessionId: unifiedSessionId,
        pathname: pathname || '/mi-panel',
        dashboardData,
      });

      assistantReply = response.reply;
      if (response.conversationId) {
        setStoredAIConversationId(unifiedSessionId, response.conversationId);
      }

      if (isHighConfidenceServerIntent(response.voiceIntent)) {
        await speakText(assistantReply || response.voiceIntent.response_text);

        if (response.voiceIntent.intent.type === 'navigate') {
          executeNavigation(response.voiceIntent.intent.route);
        }

        setUiStatus(prev => (prev === 'degraded' ? 'degraded' : 'idle'));
        return;
      }
    } catch (error) {
      console.warn('[MiPanelVoiceAssistant] Unified converse failed:', error);
    }

    const intent = parseVoiceIntent(transcript, suggestions);

    if (intent.type === 'select_option') {
      await executeSuggestion(intent.optionIndex, {
        spokenMessage: assistantReply || undefined,
      });
    } else if (intent.type === 'navigate') {
      await speakText(assistantReply || `Abriendo ${intent.target}.`);
      executeNavigation(intent.path);
    } else if (intent.type === 'explain') {
      await explainSuggestions(assistantReply || undefined);
    } else if (intent.type === 'confirm') {
      await confirmPending(assistantReply || undefined);
    } else if (intent.type === 'cancel') {
      await cancelPending(assistantReply || undefined);
    } else {
      await speakText(
        assistantReply ||
          'No entendi el comando. Usa opciones 1, 2 o 3, o escribe una instruccion.'
      );
    }

    setUiStatus(prev => (prev === 'degraded' ? 'degraded' : 'idle'));
  }

  function ensureRecognition(): MinimalSpeechRecognition | null {
    if (typeof window === 'undefined') return null;
    if (recognitionRef.current) return recognitionRef.current;

    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) {
      return null;
    }

    const recognition = new Ctor();
    recognition.lang = 'es-ES';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      if (!isMountedRef.current) return;
      setIsListening(true);
      setUiStatus(prev => (prev === 'degraded' ? 'degraded' : 'listening'));
      clearTimeoutRef(listenTimeoutRef);
      if (typeof window !== 'undefined') {
        listenTimeoutRef.current = window.setTimeout(() => {
          stopListening();
          setAssistantText(
            'Tiempo maximo de escucha alcanzado (10s). Usa texto o intenta de nuevo.'
          );
          setUiStatus(prev => (prev === 'degraded' ? 'degraded' : 'idle'));
        }, MAX_LISTEN_MS);
      }
    };

    recognition.onresult = event => {
      const transcript =
        event.results?.[0]?.[0]?.transcript?.toString().trim() ?? '';
      void handleTranscript(transcript);
    };

    recognition.onerror = event => {
      setSttAvailable(false);
      setIsListening(false);
      setUiStatus('degraded');
      clearTimeoutRef(listenTimeoutRef);
      setAssistantText(
        `Audio de entrada no disponible (${event.error ?? 'error'}). Usa botones 1/2/3 o texto.`
      );
    };

    recognition.onend = () => {
      clearTimeoutRef(listenTimeoutRef);
      setIsListening(false);
      setUiStatus(prev =>
        prev === 'processing' ? prev : prev === 'degraded' ? 'degraded' : 'idle'
      );
    };

    recognitionRef.current = recognition;
    return recognition;
  }

  function startListening() {
    startSessionTimeout();

    const recognition = ensureRecognition();
    if (!recognition) {
      setSttAvailable(false);
      setUiStatus('degraded');
      setAssistantText(
        'Tu navegador no soporta STT. Usa botones 1/2/3 o escribe texto.'
      );
      return;
    }

    try {
      recognition.start();
    } catch {
      setSttAvailable(false);
      setUiStatus('degraded');
      setAssistantText(
        'No se pudo iniciar el microfono. Usa modo texto/manual.'
      );
    }
  }

  function submitTextInput() {
    startSessionTimeout();
    const value = inputText;
    setInputText('');
    void handleTranscript(value);
  }

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearTimeoutRef(listenTimeoutRef);
      clearTimeoutRef(sessionTimeoutRef);
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore cleanup error
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (!shouldGreetToday()) return;

    const userName = safeGetUserName(dashboardData);
    const greeting = getGreetingMessage(userName);
    const supervisorAnnounce = isSupervisorMode
      ? ' Estas visualizando el panel en modo supervisor. Solo puedo ayudarte a navegar y analizar.'
      : '';
    const summary = buildDashboardSummary(dashboardData);

    // Build complete copilot speech
    const suggestionsText =
      suggestions.length > 0
        ? ' Te recomiendo ' +
          suggestions.length +
          ' acciones prioritarias. ' +
          suggestions.map((s, i) => `${i + 1}: ${s.titulo}`).join('. ') +
          '. Decime uno, dos o tres.'
        : ' No hay acciones prioritarias por ahora.';

    const fullMessage = `${greeting}.${supervisorAnnounce} ${summary}${suggestionsText}`;

    void speakText(fullMessage)
      .then(() => {
        markGreetingDone();
        // Auto-listen after speaking (if STT available)
        if (sttAvailable && isMountedRef.current) {
          startListening();
        }
      })
      .catch(() => {
        markGreetingDone();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card className="mb-4 border border-emerald-200/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            🎤 Don Candido Asistente
            {isSupervisorMode && (
              <span className="text-xs font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                Supervisor
              </span>
            )}
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            {uiStatus === 'degraded'
              ? '⚠️ Modo texto'
              : uiStatus === 'listening'
                ? '🔴 Escuchando...'
                : uiStatus === 'processing'
                  ? '⏳ Procesando...'
                  : '✅ Listo'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <p className="font-medium text-emerald-700">Don Candido dice:</p>
          <p className="mt-1 text-muted-foreground">{assistantText}</p>
          {!!userTranscript && (
            <p className="mt-2 text-xs text-muted-foreground">
              Ultimo comando: &quot;{userTranscript}&quot;
            </p>
          )}
          {(!ttsAvailable || !sttAvailable) && (
            <p className="mt-2 text-xs text-amber-700">
              Modo texto activo:{' '}
              {!ttsAvailable ? 'audio de salida no disponible' : ''}
              {!ttsAvailable && !sttAvailable ? ' · ' : ''}
              {!sttAvailable ? 'microfono no disponible' : ''}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={startListening}
            disabled={isListening}
            variant={sttAvailable ? 'default' : 'outline'}
          >
            {isListening ? '🔴 Escuchando...' : '🎤 Hablar'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void explainSuggestions()}
          >
            Explicar opciones
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => void cancelPending()}
          >
            Cancelar
          </Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {[0, 1, 2].map(idx => {
            const suggestion = suggestions[idx];
            return (
              <Button
                key={suggestion?.id ?? `option-${idx + 1}`}
                type="button"
                variant="outline"
                className="h-auto min-h-16 justify-start whitespace-normal text-left"
                disabled={!suggestion}
                onClick={() => void executeSuggestion(idx + 1)}
              >
                {suggestion
                  ? `${idx + 1}. ${suggestion.titulo}`
                  : `${idx + 1}. Sin sugerencia`}
              </Button>
            );
          })}
        </div>

        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={event => {
            event.preventDefault();
            submitTextInput();
          }}
        >
          <Input
            value={inputText}
            onChange={event => setInputText(event.target.value)}
            placeholder="Escribe un comando (ej: opcion 1, abrir procesos, explica)"
            aria-label="Comando de voz en texto"
          />
          <Button type="submit" disabled={!inputText.trim()}>
            Enviar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default MiPanelVoiceAssistant;
