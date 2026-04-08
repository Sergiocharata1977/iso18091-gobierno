// SessionList - Lista de sesiones de chat en el sidebar

'use client';

import { cn } from '@/lib/utils';
import { Clock, MessageSquare, Plus, Sparkles, Trash2 } from 'lucide-react';
import { ChatSession } from '../types';

interface SessionListProps {
  sessions: ChatSession[];
  currentSessionId?: string;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  isLoading: boolean;
}

export function SessionList({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  isLoading,
}: SessionListProps) {
  const formatDate = (date: Date) => {
    const now = new Date();
    const sessionDate = new Date(date);
    const diffMs = now.getTime() - sessionDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return sessionDate.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
    });
  };

  const handleDelete = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (confirm('¿Eliminar esta conversación?')) {
      onDeleteSession(sessionId);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-gray-900 dark:text-white">
              Conversaciones
            </h2>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              {sessions.length} sesiones
            </p>
          </div>
        </div>

        {/* New Chat Button */}
        <button
          onClick={onNewSession}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <Plus className="w-4 h-4" />
          Nueva Conversación
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
            <Clock className="w-5 h-5 mx-auto mb-2 animate-spin" />
            Cargando...
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-xs">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No hay conversaciones</p>
            <p className="mt-1">Inicia una nueva para comenzar</p>
          </div>
        ) : (
          sessions.map(session => {
            const isActive = currentSessionId === session.id;
            const title = session.title || 'Nueva conversación';

            return (
              <button
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={cn(
                  'w-full flex items-start gap-2 p-2.5 rounded-xl text-left transition-all duration-200 group relative',
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 border border-transparent'
                )}
              >
                <MessageSquare
                  className={cn(
                    'w-4 h-4 mt-0.5 shrink-0',
                    isActive
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-gray-400 dark:text-gray-500'
                  )}
                />

                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-xs font-medium truncate',
                      isActive
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-gray-700 dark:text-gray-200'
                    )}
                  >
                    {title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                      {formatDate(session.lastMessageAt || session.createdAt)}
                    </span>
                    {session.messageCount > 0 && (
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">
                        • {session.messageCount} msgs
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  onClick={e => handleDelete(e, session.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-all"
                  title="Eliminar"
                >
                  <Trash2 className="w-3 h-3 text-red-500" />
                </button>

                {/* Active indicator */}
                {isActive && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>IA activa</span>
        </div>
      </div>
    </div>
  );
}
