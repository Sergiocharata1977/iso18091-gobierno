// STT: OK
// TTS: OK
// ChatWindow - Área principal del chat con mensajes e input

'use client';

import { cn } from '@/lib/utils';
import {
  AlertCircle,
  ExternalLink,
  Headphones,
  Loader2,
  Mic,
  Send,
  Square,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { AIMode, ChatMessage, ChatSession } from '../types';
import { MessageList } from './MessageList';

interface ChatWindowProps {
  messages: ChatMessage[];
  onSendMessage: (
    content: string,
    inputType?: 'text' | 'voice'
  ) => Promise<void>;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  onClearError: () => void;
  aiMode: AIMode;
  currentSession: ChatSession | null;
}

export function ChatWindow({
  messages,
  onSendMessage,
  isLoading,
  isSending,
  error,
  onClearError,
  aiMode,
  currentSession,
}: ChatWindowProps) {
  const [inputValue, setInputValue] = useState('');
  const [prevInput, setPrevInput] = useState('');
  const [voiceMode, setVoiceMode] = useState(false); // Lee respuestas
  const [continuousMode, setContinuousMode] = useState(false); // Conversación fluida
  const [lastReadMessageId, setLastReadMessageId] = useState<string | null>(
    null
  );

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Hook de reconocimiento de voz (Speech-to-Text)
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported: isSpeechSupported,
  } = useSpeechToText();

  // Hook de síntesis de voz (Text-to-Speech)
  const {
    speak,
    stop: stopSpeaking,
    isPlaying: isSpeaking,
    error: ttsError,
  } = useTextToSpeech();

  // Detección de error de índice de Firestore
  const isIndexError =
    error?.toLowerCase().includes('requires an index') ||
    error?.toLowerCase().includes('requiere un indice') ||
    error?.toLowerCase().includes('requiere un índice');
  const indexUrl = isIndexError ? error?.match(/https:\/\/[^\s]+/)?.[0] : null;

  // Actualizar input con voz
  useEffect(() => {
    if (isListening) {
      setInputValue(
        prevInput + (prevInput && transcript ? ' ' : '') + transcript
      );
    }
  }, [transcript, isListening, prevInput]);

  // Handle inicio/fin de dictado
  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      setPrevInput(inputValue);
      startListening();
    }
  };

  const handleSpeakMessage = (message: ChatMessage) => {
    if (isSpeaking && lastReadMessageId === message.id) {
      stopSpeaking();
      setLastReadMessageId(null);
      return;
    }

    setLastReadMessageId(message.id);
    void speak(message.content, () => {
      setLastReadMessageId(current =>
        current === message.id ? null : current
      );
    });
  };

  // Toggle modes
  const toggleVoiceMode = () => {
    if (voiceMode) {
      setVoiceMode(false);
      setContinuousMode(false); // Continuous requiere voice
      stopSpeaking();
    } else {
      setVoiceMode(true);
    }
  };

  const toggleContinuousMode = () => {
    if (continuousMode) {
      setContinuousMode(false);
    } else {
      setContinuousMode(true);
      setVoiceMode(true); // Activa voz si no estaba
    }
  };

  // Auto-lectura y Conversación Continua
  useEffect(() => {
    if (!voiceMode) return;

    const lastMsg = messages[messages.length - 1];

    // Si hay un mensaje nuevo del asistente y NO se está enviando otro
    if (
      lastMsg &&
      lastMsg.role === 'assistant' &&
      lastMsg.id !== lastReadMessageId &&
      !isSending &&
      !isLoading
    ) {
      setLastReadMessageId(lastMsg.id);

      // Reproducir audio
      speak(lastMsg.content, () => {
        // Al terminar, si está en modo continuo, activar micro
        if (continuousMode) {
          // Pequeño delay para naturalidad
          setTimeout(() => {
            setPrevInput('');
            startListening();
          }, 500);
        }
      });
    }
  }, [
    messages,
    voiceMode,
    continuousMode,
    isSending,
    isLoading,
    lastReadMessageId,
    speak,
    startListening,
  ]);

  // Auto-scroll cuando llegan nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-focus en el input
  useEffect(() => {
    if (!isSending && inputRef.current && !isListening) {
      inputRef.current.focus();
    }
  }, [isSending, isListening]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (isListening) {
      stopListening();
    }
    stopSpeaking(); // Calla al asistente si se interrumpe

    const content = inputValue.trim();
    if (!content || isSending) return;

    setInputValue('');
    setPrevInput('');
    await onSendMessage(content, isListening ? 'voice' : 'text');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Mensaje de bienvenida
  const welcomeMessage: ChatMessage = {
    id: 'welcome',
    sessionId: currentSession?.id || '',
    organizationId: '',
    role: 'assistant',
    content: `¡Hola! Soy **DON CÁNDIDO**, tu asesor experto en ISO 9001.

Estoy listo para ayudarte a gestionar tu Sistema de Calidad. ¿En qué trabajamos hoy?

Puedo ayudarte con:
- 📋 Crear registros (hallazgos, acciones, auditorías)
- 📊 Consultar indicadores y objetivos
- 📝 Revisar documentación
- ❓ Resolver dudas sobre la norma ISO 9001`,
    inputType: 'text',
    createdAt: new Date(),
  };

  const displayMessages = messages.length === 0 ? [welcomeMessage] : messages;

  return (
    <div className="flex-1 flex flex-col bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm">
      {/* Header de controles de voz */}
      {(isSpeechSupported || voiceMode) && (
        <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 flex justify-end gap-2">
          <button
            onClick={toggleVoiceMode}
            className={cn(
              'p-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors',
              voiceMode
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
            )}
            title={voiceMode ? 'Desactivar voz' : 'Activar voz'}
          >
            {voiceMode ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Voz</span>
          </button>

          <button
            onClick={toggleContinuousMode}
            className={cn(
              'p-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors',
              continuousMode
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 ring-2 ring-purple-500/20'
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
            )}
            title={
              continuousMode
                ? 'Desactivar conversación continua'
                : 'Activar conversación continua'
            }
          >
            <Headphones className="w-4 h-4" />
            <span className="hidden sm:inline">Conversación Continua</span>
          </button>
        </div>
      )}

      {/* Error Banner */}
      {(error || ttsError) && (
        <div className="px-4 py-3 bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800 flex items-start justify-between">
          <div className="flex gap-2 text-red-700 dark:text-red-300 text-sm flex-1">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1 w-full">
              <span className="font-medium">Error</span>
              <span>
                {isIndexError
                  ? 'La base de datos requiere un índice para esta consulta.'
                  : error || ttsError}
              </span>

              {isIndexError && indexUrl && (
                <a
                  href={indexUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 bg-red-100 dark:bg-red-800/50 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-200 dark:hover:bg-red-800 transition-colors w-fit"
                >
                  <ExternalLink className="w-3 h-3" />
                  Crear índice en Firestore
                </a>
              )}
            </div>
          </div>
          <button
            onClick={onClearError}
            className="p-1 hover:bg-red-100 dark:hover:bg-red-800/50 rounded"
          >
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Conectando con Don Cándido...
              </p>
            </div>
          </div>
        ) : (
          <>
            <MessageList
              messages={displayMessages}
              isSpeaking={isSpeaking}
              currentSpeakingId={
                isSpeaking && lastReadMessageId ? lastReadMessageId : undefined
              }
              onSpeakMessage={handleSpeakMessage}
            />

            {/* Typing indicator */}
            {isSending && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-bold">DC</span>
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 px-4 py-3 rounded-2xl rounded-tl-none">
                  <div className="flex gap-1">
                    <div
                      className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <div
                      className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <div
                      className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div
        className={cn(
          'p-4 border-t border-gray-200 dark:border-gray-700 transition-colors',
          continuousMode
            ? 'bg-purple-50/50 dark:bg-purple-900/10'
            : 'bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm'
        )}
      >
        {continuousMode && isListening && (
          <div className="mb-2 flex justify-center">
            <span className="text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/50 px-2 py-1 rounded-full animate-pulse border border-purple-200 dark:border-purple-800">
              Modo Continuo: Escuchando...
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isListening
                  ? 'Escuchando tu voz...'
                  : continuousMode
                    ? 'Modo continuo activo...'
                    : 'Escribe tu consulta...'
              }
              disabled={isSending || isLoading}
              rows={1}
              className={cn(
                'w-full px-4 py-3 rounded-xl border',
                'bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                'focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500',
                'resize-none transition-all',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                isListening
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-500/30 animate-pulse'
                  : continuousMode
                    ? 'border-purple-300 focus:border-purple-500 focus:ring-purple-500/30'
                    : 'border-gray-200 dark:border-gray-600'
              )}
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
            {isListening && (
              <div className="absolute right-3 top-3">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              </div>
            )}
          </div>

          {isSpeechSupported && (
            <button
              type="button"
              onClick={handleMicClick}
              disabled={isSending || isLoading}
              className={cn(
                'p-3 rounded-xl transition-all duration-200 flex items-center justify-center shrink-0',
                isListening
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 hover:bg-red-600'
                  : continuousMode
                    ? 'bg-purple-100 text-purple-600 hover:bg-purple-200 border border-purple-200'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'
              )}
              title={isListening ? 'Detener grabación' : 'Dictar por voz'}
            >
              {isListening ? (
                <Square className="w-5 h-5 fill-current" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>
          )}

          <button
            type="submit"
            disabled={!inputValue.trim() || isSending || isLoading}
            className={cn(
              'p-3 rounded-xl transition-all duration-200 flex items-center justify-center shrink-0',
              inputValue.trim() && !isSending && !isLoading
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            )}
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>

        {/* Status bar */}
        <div className="mt-2 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                isSending ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'
              )}
            />
            <span>
              {isSending
                ? 'Procesando...'
                : `Modelo: ${aiMode === 'fast' ? 'Groq' : 'Claude'}`}
            </span>
          </div>
          <span className={cn(continuousMode && 'text-purple-500 font-medium')}>
            {isListening
              ? 'Escuchando... click para detener'
              : continuousMode
                ? 'Modo Conversación Continua ACTIVADO'
                : 'Presiona Enter para enviar'}
          </span>
        </div>
      </div>
    </div>
  );
}
