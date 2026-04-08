'use client';

import { PageHeader } from '@/components/design-system/layout';
import { EntityDetailHeader } from '@/components/design-system/patterns/cards/EntityDetailHeader';
import { KPIStatCard } from '@/components/design-system/patterns/cards/KPIStatCard';
import { BaseBadge } from '@/components/design-system/primitives/BaseBadge';
import { BaseButton } from '@/components/design-system/primitives/BaseButtonPrimitive';
import { BaseCard } from '@/components/design-system/primitives/BaseCard';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import type {
  InternalNote,
  UnifiedConversationDetail,
  UnifiedConversationStatus,
  UnifiedMessage,
} from '@/types/messages';
import { format, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ArrowLeft,
  Bot,
  Loader2,
  MessageSquare,
  Send,
  Smartphone,
  StickyNote,
  User,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

type DetailResponse = {
  success: boolean;
  data?: UnifiedConversationDetail;
  error?: string;
};

type NotesResponse = {
  success: boolean;
  data?: InternalNote[];
  error?: string;
};

type CreateNoteResponse = {
  success: boolean;
  data?: InternalNote;
  error?: string;
};

const STATUS_LABELS: Record<UnifiedConversationStatus, string> = {
  unread: 'No leido',
  read: 'Leido',
  pending: 'Pendiente',
  archived: 'Archivado',
};

const STATUS_OPTIONS: UnifiedConversationStatus[] = ['pending', 'read', 'archived'];

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    return new Date((value as { seconds: number }).seconds * 1000);
  }

  const parsed = new Date(value as string | number);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatMessageTimestamp(value: unknown): string {
  const date = toDate(value);
  if (!date) return '';
  return isToday(date)
    ? format(date, 'HH:mm', { locale: es })
    : format(date, 'dd/MM HH:mm', { locale: es });
}

function formatFullDate(value: unknown): string {
  const date = toDate(value);
  if (!date) return '-';
  return format(date, 'dd/MM/yyyy HH:mm', { locale: es });
}

function getIdentifierLabel(channel: UnifiedConversationDetail['conversation']['channel']) {
  return channel === 'whatsapp' ? 'Telefono' : 'User ID';
}

function getChannelMeta(channel: UnifiedConversationDetail['conversation']['channel']) {
  if (channel === 'whatsapp') {
    return {
      label: 'WhatsApp',
      badge: 'success' as const,
      icon: Smartphone,
      bubble: 'bg-emerald-600 text-white',
      bubbleSoft: 'bg-emerald-50 text-emerald-900',
    };
  }

  return {
    label: 'IA',
    badge: 'secondary' as const,
    icon: Bot,
    bubble: 'bg-slate-950 text-white',
    bubbleSoft: 'bg-slate-100 text-slate-900',
  };
}

function normalizeDisplayStatus(status: UnifiedConversationStatus): UnifiedConversationStatus {
  return status === 'unread' ? 'pending' : status;
}

function getStatusBadge(status: UnifiedConversationStatus) {
  switch (status) {
    case 'pending':
      return 'warning' as const;
    case 'archived':
      return 'outline' as const;
    case 'read':
      return 'secondary' as const;
    case 'unread':
    default:
      return 'success' as const;
  }
}

function getMessageBubbleClasses(message: UnifiedMessage) {
  const isInbound = message.direction === 'inbound';
  const channelMeta = getChannelMeta(message.channel);

  if (isInbound) {
    return `${channelMeta.bubbleSoft} rounded-[22px] rounded-bl-md`;
  }

  return `${channelMeta.bubble} rounded-[22px] rounded-br-md`;
}

export default function UnifiedMessageDetailPage() {
  const router = useRouter();
  const params = useParams<{ conversationId: string }>();
  const { user, loading: authLoading } = useAuth();

  const encodedConversationId = params.conversationId ?? '';
  const conversationId = useMemo(() => {
    try {
      return decodeURIComponent(encodedConversationId);
    } catch {
      return encodedConversationId;
    }
  }, [encodedConversationId]);

  const organizationId = user?.organization_id ?? '';

  const [detail, setDetail] = useState<UnifiedConversationDetail | null>(null);
  const [notes, setNotes] = useState<InternalNote[]>([]);
  const [detailLoading, setDetailLoading] = useState(true);
  const [notesLoading, setNotesLoading] = useState(true);
  const [submittingNote, setSubmittingNote] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const loadConversation = useCallback(async () => {
    if (!conversationId || !organizationId) return;

    setDetailLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/messages/${encodeURIComponent(conversationId)}?organization_id=${encodeURIComponent(organizationId)}`,
        { cache: 'no-store' }
      );
      const json = (await response.json()) as DetailResponse;

      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.error ?? 'No se pudo cargar la conversacion');
      }

      const sortedMessages = [...json.data.messages].sort((a, b) => {
        const first = toDate(a.timestamp)?.getTime() ?? 0;
        const second = toDate(b.timestamp)?.getTime() ?? 0;
        return first - second;
      });

      setDetail({ ...json.data, messages: sortedMessages });
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : 'No se pudo cargar la conversacion';
      setError(message);
      toast.error(message);
    } finally {
      setDetailLoading(false);
    }
  }, [conversationId, organizationId]);

  const loadNotes = useCallback(async () => {
    if (!conversationId || !organizationId) return;

    setNotesLoading(true);

    try {
      const response = await fetch(
        `/api/messages/${encodeURIComponent(conversationId)}/notes?organization_id=${encodeURIComponent(organizationId)}`,
        { cache: 'no-store' }
      );
      const json = (await response.json()) as NotesResponse;

      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.error ?? 'No se pudieron cargar las notas');
      }

      const sortedNotes = [...json.data].sort((a, b) => {
        const first = toDate(b.createdAt)?.getTime() ?? 0;
        const second = toDate(a.createdAt)?.getTime() ?? 0;
        return first - second;
      });

      setNotes(sortedNotes);
    } catch (loadError) {
      toast.error(loadError instanceof Error ? loadError.message : 'No se pudieron cargar las notas');
    } finally {
      setNotesLoading(false);
    }
  }, [conversationId, organizationId]);

  useEffect(() => {
    if (authLoading || !organizationId || !conversationId) return;
    void loadConversation();
    void loadNotes();
  }, [authLoading, conversationId, loadConversation, loadNotes, organizationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [detail?.messages]);

  const handleAddNote = useCallback(async () => {
    const content = noteContent.trim();
    if (!content || !conversationId || !organizationId) return;

    setSubmittingNote(true);

    try {
      const response = await fetch(
        `/api/messages/${encodeURIComponent(conversationId)}/notes?organization_id=${encodeURIComponent(organizationId)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        }
      );
      const json = (await response.json()) as CreateNoteResponse;

      if (!response.ok || !json.success) {
        throw new Error(json.error ?? 'No se pudo agregar la nota');
      }

      setNoteContent('');
      await loadNotes();
      toast.success('Nota interna agregada');
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : 'No se pudo agregar la nota');
    } finally {
      setSubmittingNote(false);
    }
  }, [conversationId, loadNotes, noteContent, organizationId]);

  if (authLoading || detailLoading) {
    return (
      <div className="ledger-shell flex min-h-screen items-center justify-center px-6">
        <BaseCard className="ledger-panel rounded-[28px] border-white/60 px-8 py-10">
          <div className="flex items-center gap-3 text-sm text-slate-700">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando hilo...
          </div>
        </BaseCard>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="ledger-shell flex min-h-screen items-center justify-center px-6">
        <BaseCard className="ledger-panel w-full max-w-lg rounded-[28px] border-white/60 px-8 py-10 shadow-[0_18px_44px_rgba(25,28,29,0.08)]">
          <div className="space-y-5">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-slate-950">
                No se pudo abrir el hilo
              </h1>
              <p className="text-sm leading-6 text-slate-600">
                {error ??
                  'La conversacion no existe o no esta disponible para esta organizacion.'}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <BaseButton variant="outline" onClick={() => router.push('/mensajes')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </BaseButton>
              <BaseButton className="ledger-primary-button border-0" onClick={() => void loadConversation()}>
                Reintentar
              </BaseButton>
            </div>
          </div>
        </BaseCard>
      </div>
    );
  }

  const { conversation, threadMetadata } = detail;
  const currentStatus = normalizeDisplayStatus(
    threadMetadata?.status ?? conversation.status
  );
  const assignedUserName =
    threadMetadata?.assignedUserName ??
    conversation.assignedUserName ??
    'Sin asignar';
  const channelMeta = getChannelMeta(conversation.channel);
  const ChannelIcon = channelMeta.icon;

  return (
    <div className="ledger-shell min-h-screen">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="ledger-panel rounded-[28px] p-4 md:p-6">
          <PageHeader
            title="Detalle del hilo"
            description="Vista de seguimiento alineada al design system: identidad, contexto, timeline de mensajes y notas internas."
            breadcrumbs={[
              { label: 'Mensajes', href: '/mensajes' },
              { label: conversation.contactName || 'Hilo' },
            ]}
            actions={
              <BaseButton variant="outline" onClick={() => router.push('/mensajes')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al inbox
              </BaseButton>
            }
          />

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KPIStatCard
              label="CANAL"
              value={channelMeta.label}
              icon={<ChannelIcon className="h-4 w-4" />}
              subtext={getIdentifierLabel(conversation.channel)}
            />
            <KPIStatCard
              label="MENSAJES"
              value={String(detail.messages.length)}
              icon={<MessageSquare className="h-4 w-4" />}
              subtext="Intercambios cargados en el hilo"
            />
            <KPIStatCard
              label="ESTADO"
              value={STATUS_LABELS[currentStatus] ?? currentStatus}
              icon={<User className="h-4 w-4" />}
              subtext="Estado visible del thread"
            />
            <KPIStatCard
              label="NOTAS"
              value={String(notes.length)}
              icon={<StickyNote className="h-4 w-4" />}
              subtext="Contexto interno registrado"
            />
          </div>
        </section>

        <EntityDetailHeader
          name={conversation.contactName || 'Sin nombre'}
          subtitle={conversation.contactIdentifier}
          tags={[
            { label: channelMeta.label, color: conversation.channel === 'whatsapp' ? 'green' : 'blue' },
            { label: STATUS_LABELS[currentStatus] ?? currentStatus, color: currentStatus === 'pending' ? 'amber' : currentStatus === 'archived' ? 'gray' : 'green' },
          ]}
          stats={[
            { label: 'ASIGNADO', value: assignedUserName },
            { label: 'CREADO', value: formatFullDate(conversation.createdAt) },
            { label: 'ULTIMO MOV.', value: formatMessageTimestamp(conversation.lastMessageAt) || '-' },
          ]}
          actions={[
            {
              icon: <ArrowLeft className="h-4 w-4" />,
              label: 'Volver',
              onClick: () => router.push('/mensajes'),
            },
          ]}
        />

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
          <BaseCard className="ledger-panel rounded-[28px] border-white/70 bg-white/88 p-0 shadow-[0_18px_44px_rgba(25,28,29,0.08)]">
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex flex-wrap items-center gap-3">
                <BaseBadge variant={channelMeta.badge}>{channelMeta.label}</BaseBadge>
                <BaseBadge variant={getStatusBadge(currentStatus)}>
                  {STATUS_LABELS[currentStatus] ?? currentStatus}
                </BaseBadge>
                <BaseBadge variant="outline">{detail.messages.length} mensajes</BaseBadge>
              </div>
            </div>

            <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-6">
              {detail.messages.length === 0 ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center">
                  <div className="rounded-full bg-slate-100 p-4 text-slate-500">
                    <MessageSquare className="h-8 w-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-slate-950">
                      No hay mensajes en este hilo
                    </h3>
                    <p className="text-sm text-slate-600">
                      Cuando lleguen nuevas interacciones se van a listar aca.
                    </p>
                  </div>
                </div>
              ) : (
                detail.messages.map(message => {
                  const isInbound = message.direction === 'inbound';

                  return (
                    <div
                      key={message.id}
                      className={cn('flex', isInbound ? 'justify-start' : 'justify-end')}
                    >
                      <div
                        className={cn(
                          'flex max-w-[88%] flex-col gap-1.5',
                          !isInbound && 'items-end'
                        )}
                      >
                        <p
                          className={cn(
                            'text-xs font-semibold uppercase tracking-[0.14em] text-slate-500',
                            !isInbound && 'text-right'
                          )}
                        >
                          {message.senderName}
                        </p>
                        <div
                          className={cn(
                            'px-4 py-3 shadow-sm',
                            getMessageBubbleClasses(message)
                          )}
                        >
                          <p className="whitespace-pre-wrap break-words text-sm leading-6">
                            {message.content}
                          </p>
                        </div>
                        <p
                          className={cn(
                            'text-xs text-slate-400',
                            !isInbound && 'text-right'
                          )}
                        >
                          {formatMessageTimestamp(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>
          </BaseCard>

          <div className="space-y-6">
            <BaseCard className="ledger-panel rounded-[28px] border-white/70 bg-white/88 p-6 shadow-[0_18px_44px_rgba(25,28,29,0.08)]">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-2xl bg-slate-950 p-3 text-white">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">
                    Informacion del hilo
                  </h2>
                  <p className="text-sm text-slate-600">
                    Datos visibles y trazabilidad basica.
                  </p>
                </div>
              </div>

              <dl className="space-y-4 text-sm">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Canal
                  </dt>
                  <dd className="mt-2">
                    <BaseBadge variant={channelMeta.badge}>{channelMeta.label}</BaseBadge>
                  </dd>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Estado
                  </dt>
                  <dd className="mt-2 text-slate-700">
                    {STATUS_LABELS[currentStatus] ?? currentStatus}
                  </dd>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Asignacion
                  </dt>
                  <dd className="mt-2 text-slate-700">{assignedUserName}</dd>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Creacion
                  </dt>
                  <dd className="mt-2 text-slate-700">
                    {formatFullDate(conversation.createdAt)}
                  </dd>
                </div>
              </dl>
            </BaseCard>

            <BaseCard className="ledger-panel rounded-[28px] border-white/70 bg-white/88 p-6 shadow-[0_18px_44px_rgba(25,28,29,0.08)]">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                  <StickyNote className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">
                    Notas internas
                  </h2>
                  <p className="text-sm text-slate-600">
                    Contexto operativo del hilo para seguimiento interno.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <Textarea
                  value={noteContent}
                  onChange={event => setNoteContent(event.target.value)}
                  placeholder="Agregar contexto interno del hilo..."
                  className="min-h-[120px] rounded-2xl border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                />
                <BaseButton
                  className="ledger-primary-button w-full border-0"
                  onClick={() => void handleAddNote()}
                  disabled={!noteContent.trim() || submittingNote}
                >
                  {submittingNote ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Agregar nota
                </BaseButton>
              </div>

              <div className="mt-6 space-y-3">
                {notesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando notas...
                  </div>
                ) : notes.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    Todavia no hay notas internas.
                  </div>
                ) : (
                  notes.map(note => (
                    <div
                      key={note.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-800">
                          {note.authorName}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatFullDate(note.createdAt)}
                        </p>
                      </div>
                      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                        {note.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </BaseCard>

            <BaseCard className="ledger-panel rounded-[28px] border-white/70 bg-white/88 p-6 shadow-[0_18px_44px_rgba(25,28,29,0.08)]">
              <h2 className="text-lg font-semibold text-slate-950">Estados visibles</h2>
              <p className="mt-1 text-sm text-slate-600">
                Referencia rapida del estado actual del thread.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {STATUS_OPTIONS.map(status => (
                  <BaseBadge
                    key={status}
                    variant={
                      currentStatus === status
                        ? getStatusBadge(status)
                        : 'outline'
                    }
                  >
                    {STATUS_LABELS[status]}
                  </BaseBadge>
                ))}
              </div>
            </BaseCard>
          </div>
        </section>
      </div>
    </div>
  );
}
