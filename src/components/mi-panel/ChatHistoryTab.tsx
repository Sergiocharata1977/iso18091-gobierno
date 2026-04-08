'use client';

import { AICenterPanel } from '@/components/mi-panel/AICenterPanel';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MessageSquare } from 'lucide-react';
import type { MiPanelSession } from './types';

interface ChatHistoryTabProps {
  sessions: MiPanelSession[];
  selectedSession: MiPanelSession | null;
  onSelectSession: (sessionId: string) => void;
  onLoadDetail: (sessionId: string) => void;
  loading: boolean;
  error?: string | null;
  readOnly?: boolean;
  selectedUnifiedConversationId?: string | null;
}

export function ChatHistoryTab({
  sessions,
  selectedSession,
  onSelectSession,
  onLoadDetail,
  loading,
  error,
  readOnly,
  selectedUnifiedConversationId,
}: ChatHistoryTabProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <Card className="xl:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
            Conversaciones IA
          </CardTitle>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        </CardHeader>
        <CardContent>
          {readOnly ? (
            <div className="mb-3 rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              Historial visible en Mi Panel con acceso solo lectura.
            </div>
          ) : null}
          {error ? (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
              {error}
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-slate-500">
              No hay conversaciones para este usuario.
            </p>
          ) : (
            <div className="space-y-2">
              {sessions.map(session => (
                <button
                  key={session.id}
                  onClick={() => {
                    onSelectSession(session.id);
                    onLoadDetail(session.id);
                  }}
                  className={`w-full text-left border rounded p-3 hover:bg-slate-50 transition ${selectedSession?.id === session.id ? 'border-emerald-300 bg-emerald-50' : ''}`}
                >
                  <p className="font-medium text-sm truncate">
                    {session.title || 'Conversacion'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {session.module ? (
                      <Badge variant="outline" className="text-xs">
                        {session.module}
                      </Badge>
                    ) : null}
                    <Badge variant="secondary" className="text-xs">
                      {session.status}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Detalle de conversacion</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedSession ? (
            <p className="text-sm text-slate-500">
              Selecciona una conversacion para ver los mensajes.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="border rounded p-3 text-sm">
                <p className="font-medium">{selectedSession.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Estado: {selectedSession.status} · Tipo:{' '}
                  {selectedSession.type}
                </p>
              </div>
              <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
                {(selectedSession.messages || []).length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Sin mensajes en esta sesion.
                  </p>
                ) : (
                  selectedSession.messages?.map(msg => (
                    <div
                      key={msg.id}
                      className={`rounded-lg p-3 text-sm border ${msg.role === 'assistant' ? 'bg-emerald-50 border-emerald-100' : msg.role === 'user' ? 'bg-slate-50 border-slate-200' : 'bg-amber-50 border-amber-100'}`}
                    >
                      <p className="text-xs font-medium mb-1 capitalize">
                        {msg.role}
                      </p>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  ))
                )}
              </div>
              {selectedSession.unifiedMessages &&
              selectedSession.unifiedMessages.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Historial IA unificado</p>
                  <div className="max-h-[240px] overflow-y-auto space-y-2 pr-1">
                    {selectedSession.unifiedMessages.map(msg => (
                      <div
                        key={msg.id}
                        className={`rounded-lg p-3 text-sm border ${msg.role === 'assistant' ? 'bg-emerald-50 border-emerald-100' : msg.role === 'user' ? 'bg-slate-50 border-slate-200' : 'bg-amber-50 border-amber-100'}`}
                      >
                        <p className="text-xs font-medium mb-1 capitalize">
                          {msg.role}
                          {msg.channel ? ` · ${msg.channel}` : ''}
                        </p>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <AICenterPanel
                sessionId={selectedSession.id}
                conversationId={selectedUnifiedConversationId}
                initialMessages={selectedSession.unifiedMessages?.map(msg => ({
                  id: msg.id,
                  role: msg.role,
                  channel: msg.channel || 'chat',
                  content: msg.content,
                  traceId: msg.traceId,
                  timestamp: msg.createdAt,
                }))}
                initialMeta={
                  selectedUnifiedConversationId
                    ? { id: selectedUnifiedConversationId }
                    : null
                }
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
