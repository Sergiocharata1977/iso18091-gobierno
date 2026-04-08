// MessageList - Lista de mensajes del chat

'use client';

import { cn } from '@/lib/utils';
import { Loader2, Volume2, VolumeX } from 'lucide-react';
import { ChatMessage } from '../types';

interface MessageListProps {
  messages: ChatMessage[];
  isSpeaking?: boolean;
  currentSpeakingId?: string;
  onSpeakMessage?: (message: ChatMessage) => void;
}

export function MessageList({
  messages,
  isSpeaking = false,
  currentSpeakingId,
  onSpeakMessage,
}: MessageListProps) {
  // Formatear contenido con markdown básico
  const formatContent = (content: string): string => {
    // Convertir **texto** a <strong>
    let formatted = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Convertir *texto* a <em>
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Convertir `código` a <code>
    formatted = formatted.replace(
      /`(.*?)`/g,
      '<code class="bg-gray-100 dark:bg-gray-700 px-1 rounded text-sm">$1</code>'
    );
    // Convertir saltos de línea
    formatted = formatted.replace(/\n/g, '<br />');
    // Convertir listas con -
    formatted = formatted.replace(/^- (.*)$/gm, '• $1');

    return formatted;
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      {messages.map(message => {
        const isUser = message.role === 'user';
        const isSystem = message.role === 'system';

        if (isSystem) {
          return (
            <div key={message.id} className="flex justify-center">
              <div className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs text-gray-500 dark:text-gray-400">
                {message.content}
              </div>
            </div>
          );
        }

        return (
          <div
            key={message.id}
            className={cn(
              'flex gap-3',
              isUser ? 'flex-row-reverse' : 'flex-row'
            )}
          >
            {/* Avatar */}
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                isUser
                  ? 'bg-blue-500'
                  : 'bg-gradient-to-br from-emerald-500 to-teal-600'
              )}
            >
              {isUser ? (
                <span className="text-white text-xs font-medium">Tú</span>
              ) : (
                <span className="text-white text-xs font-bold">DC</span>
              )}
            </div>

            {/* Message Bubble */}
            <div
              className={cn(
                'max-w-[75%] px-4 py-3 rounded-2xl',
                isUser
                  ? 'bg-blue-500 text-white rounded-tr-none'
                  : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-tl-none shadow-sm border border-gray-100 dark:border-gray-600'
              )}
            >
              <div
                className={cn(
                  'text-sm leading-relaxed',
                  isUser ? 'text-white' : 'text-gray-800 dark:text-gray-100'
                )}
                dangerouslySetInnerHTML={{
                  __html: formatContent(message.content),
                }}
              />

              {!isUser && onSpeakMessage && (
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => onSpeakMessage(message)}
                    className="h-7 w-7 inline-flex items-center justify-center rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-600"
                    title={
                      isSpeaking && currentSpeakingId === message.id
                        ? 'Detener audio'
                        : 'Reproducir audio'
                    }
                    aria-label={
                      isSpeaking && currentSpeakingId === message.id
                        ? 'Detener audio'
                        : 'Reproducir audio'
                    }
                  >
                    {isSpeaking && currentSpeakingId === message.id ? (
                      <VolumeX className="h-4 w-4" />
                    ) : currentSpeakingId === message.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              )}

              {/* Timestamp and Metadata */}
              <div
                className={cn(
                  'mt-1.5 text-[10px] flex items-center gap-2',
                  isUser ? 'text-blue-200' : 'text-gray-400 dark:text-gray-500'
                )}
              >
                {formatTime(message.createdAt)}
                {message.metadata?.provider && !isUser && (
                  <span className="opacity-70">
                    via {message.metadata.provider}
                  </span>
                )}
                {message.metadata?.latencyMs && !isUser && (
                  <span className="opacity-70">
                    • {message.metadata.latencyMs}ms
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
