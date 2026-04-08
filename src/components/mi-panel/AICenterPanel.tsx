'use client';

import { useAuth } from '@/contexts/AuthContext';
import {
  sendConverseRequest,
  setStoredAIConversationId,
  setStoredActiveAISessionId,
} from '@/lib/ai/converseClient';
import { MermaidDiagram, parseMermaidBlocks } from '@/components/chat/MermaidDiagram';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, RefreshCw, Send } from 'lucide-react';
import type { MiPanelUnifiedMessage } from './types';

type AICenterPanelProps = {
  sessionId?: string | null;
  targetUserId?: string | null;
  conversationId?: string | null;
  title?: string;
  initialMessages?: MiPanelUnifiedMessage[];
  initialMeta?: Record<string, unknown> | null;
  allowCreateConversation?: boolean;
  allowNewConversation?: boolean;
  openChatHref?: string;
};

type NormalizableMessage = {
  id?: string;
  role?: string;
  channel?: string;
  content?: string;
  traceId?: string;
  metadata?: {
    traceId?: string;
  };
  timestamp?: string | Date;
  createdAt?: string | Date;
};

function formatDate(value: unknown): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
}

function normalizeMessage(raw: NormalizableMessage): MiPanelUnifiedMessage {
  return {
    id: typeof raw.id === 'string' ? raw.id : undefined,
    role: raw.role === 'assistant' || raw.role === 'system' ? raw.role : 'user',
    channel:
      raw.channel === 'voice' || raw.channel === 'whatsapp'
        ? raw.channel
        : 'chat',
    content: typeof raw.content === 'string' ? raw.content : '',
    traceId:
      typeof raw.traceId === 'string'
        ? raw.traceId
        : typeof raw.metadata?.traceId === 'string'
          ? raw.metadata.traceId
          : undefined,
    timestamp:
      typeof raw.timestamp === 'string' || raw.timestamp instanceof Date
        ? raw.timestamp
        : raw.createdAt instanceof Date || typeof raw.createdAt === 'string'
          ? raw.createdAt
          : undefined,
  };
}

function buildOptimisticUserMessage(content: string): MiPanelUnifiedMessage {
  return {
    id: `local-user-${Date.now()}`,
    role: 'user',
    channel: 'chat',
    content,
    timestamp: new Date().toISOString(),
  };
}

export function AICenterPanel({
  sessionId,
  targetUserId,
  conversationId,
  title = 'Centro de Asistencia (IA unificada)',
  initialMessages,
  initialMeta,
  allowCreateConversation,
  allowNewConversation = false,
  openChatHref = '/chat',
}: AICenterPanelProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<MiPanelUnifiedMessage[]>(
    initialMessages || []
  );
  const [meta, setMeta] = useState<Record<string, unknown> | null>(
    initialMeta || null
  );
  const [draft, setDraft] = useState('');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    sessionId || null
  );
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(conversationId || null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const canCreateConversation = allowCreateConversation ?? allowNewConversation;

  const canChat = useMemo(
    () => Boolean(activeConversationId || canCreateConversation),
    [activeConversationId, canCreateConversation]
  );

  useEffect(() => {
    setMessages(initialMessages || []);
    setMeta(initialMeta || null);
  }, [initialMessages, initialMeta]);

  useEffect(() => {
    setActiveSessionId(sessionId || null);
  }, [sessionId]);

  useEffect(() => {
    setActiveConversationId(conversationId || null);
  }, [conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, sending]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = '0px';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  }, [draft]);

  const load = async () => {
    if (!activeConversationId) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `/api/ai/conversations/${activeConversationId}/history?limit=100`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'No se pudo cargar el historial IA');
      }

      setMessages(
        Array.isArray(data.messages)
          ? data.messages.map(normalizeMessage)
          : initialMessages || []
      );
      setMeta(data.conversation || null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error cargando historial IA'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialMessages?.length && initialMeta) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId, initialMessages, initialMeta]);

  const ensureSession = async () => {
    if (activeSessionId) return activeSessionId;
    if (!canCreateConversation) {
      throw new Error(
        'Este panel esta en modo solo lectura hasta que exista una conversacion.'
      );
    }

    const res = await fetch('/api/chat/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: targetUserId || undefined,
        type: 'assistant',
        module: 'mi-panel',
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'No se pudo crear la sesion de chat');
    }

    const createdSessionId =
      typeof data?.session?.id === 'string' ? data.session.id : null;
    if (!createdSessionId) {
      throw new Error('La sesion de chat no devolvio un id valido');
    }

    setActiveSessionId(createdSessionId);
    if (targetUserId) {
      setStoredActiveAISessionId(targetUserId, createdSessionId);
    }
    return createdSessionId;
  };

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || sending || !canChat) return;

    const optimisticMessage = buildOptimisticUserMessage(content);

    try {
      setSending(true);
      setError(null);

      const resolvedSessionId = await ensureSession();
      if (targetUserId) {
        setStoredActiveAISessionId(targetUserId, resolvedSessionId);
      }
      setMessages(prev => [...prev, optimisticMessage]);
      setDraft('');

      const data = await sendConverseRequest({
        channel: 'chat',
        message: content,
        organizationId: user?.organization_id || '',
        sessionId: resolvedSessionId,
        pathname: '/mi-panel',
      });

      const nextMessages = Array.isArray(data.messages)
        ? data.messages.map(normalizeMessage)
        : [];

      setMessages(prev => {
        const withoutOptimistic = prev.filter(
          message => message.id !== optimisticMessage.id
        );
        return nextMessages.length > 0
          ? [...withoutOptimistic, ...nextMessages]
          : withoutOptimistic;
      });

      const nextSessionId =
        typeof data.sessionId === 'string' ? data.sessionId : resolvedSessionId;
      if (nextSessionId) {
        setActiveSessionId(nextSessionId);
      }

      const nextConversationId = data.conversationId || activeConversationId;
      if (typeof nextConversationId === 'string' && nextConversationId.trim()) {
        setStoredAIConversationId(resolvedSessionId, nextConversationId);
        setActiveConversationId(nextConversationId);
        setMeta(prev => ({
          ...(prev || {}),
          id: nextConversationId,
          status: 'active',
        }));
      }
    } catch (err) {
      setMessages(prev =>
        prev.filter(message => message.id !== optimisticMessage.id)
      );
      setError(err instanceof Error ? err.message : 'Error enviando mensaje');
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="border-emerald-200/60">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void load()}
            disabled={!activeConversationId || loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Actualizar
          </Button>
          <Button asChild type="button" size="sm" variant="ghost">
            <Link href={openChatHref}>Abrir chat completo</Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {!canChat ? (
          <p className="text-sm text-slate-500">
            No hay una conversacion vinculada. Este panel permanece en solo
            lectura.
          </p>
        ) : !activeConversationId ? (
          <p className="text-sm text-slate-500">
            No hay una conversacion unificada vinculada todavia. Puedes iniciar
            una desde este panel.
          </p>
        ) : null}

        {error ? (
          <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {meta ? (
          <div className="space-y-1 rounded border bg-muted/30 p-3 text-xs text-slate-600">
            <p>
              <span className="font-medium">Conversation ID:</span>{' '}
              {String(meta.id || activeConversationId || 'No vinculada')}
            </p>
            <p>
              <span className="font-medium">Session ID:</span>{' '}
              {activeSessionId || 'Pendiente'}
            </p>
            <p>
              <span className="font-medium">Estado:</span>{' '}
              {String(meta.status || 'active')}
            </p>
          </div>
        ) : null}

        <div
          ref={scrollRef}
          className="max-h-[360px] space-y-2 overflow-y-auto pr-1"
        >
          {messages.length === 0 ? (
            <p className="text-sm text-slate-500">Sin mensajes.</p>
          ) : (
            messages.map(msg => (
              <div
                key={
                  msg.id ||
                  `${msg.traceId}-${msg.role}-${msg.content.slice(0, 10)}`
                }
                className={`rounded-lg border p-3 text-sm ${
                  msg.role === 'assistant'
                    ? 'border-emerald-100 bg-emerald-50'
                    : msg.role === 'user'
                      ? 'border-slate-200 bg-slate-50'
                      : 'border-amber-100 bg-amber-50'
                }`}
              >
                <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-medium capitalize">{msg.role}</span>
                  <span className="text-slate-500">canal: {msg.channel}</span>
                  {msg.timestamp ? (
                    <span className="text-slate-500">
                      {formatDate(msg.timestamp)}
                    </span>
                  ) : null}
                </div>
                {parseMermaidBlocks(msg.content).map((part, i) =>
                  part.type === 'mermaid' ? (
                    <MermaidDiagram key={i} code={part.content} />
                  ) : (
                    <p key={i} className="whitespace-pre-wrap">{part.content}</p>
                  )
                )}
              </div>
            ))
          )}

          {sending ? (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800">
              <Loader2 className="h-4 w-4 animate-spin" />
              IA respondiendo...
            </div>
          ) : null}
        </div>

        {canChat ? (
          <div className="space-y-2 border-t pt-3">
            <Textarea
              ref={textareaRef}
              value={draft}
              onChange={event => setDraft(event.target.value)}
              placeholder="Escribe un mensaje..."
              rows={1}
              disabled={sending}
              className="min-h-[88px] max-h-[180px] resize-none border-emerald-200 focus-visible:ring-emerald-500"
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void handleSend();
                }
              }}
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                POST /api/chat/messages requiere `sessionId` y `content`;
                `conversationId` llega en la respuesta cuando la conversacion
                unificada queda vinculada.
              </p>
              <Button
                type="button"
                onClick={() => void handleSend()}
                disabled={!draft.trim() || sending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {sending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Enviar
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default AICenterPanel;
