'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ArrowLeft,
  Archive,
  UserPlus,
  Search,
  Send,
  Loader2,
  Check,
  CheckCheck,
  X,
  User,
  Bot,
  ExternalLink,
  Link2,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ConversationSearch } from '@/components/crm/whatsapp/ConversationSearch';
import { MediaMessage } from '@/components/crm/whatsapp/MediaMessage';
import { toast } from 'sonner';
import type {
  WhatsAppConversationV2,
  WhatsAppMessageV2,
  WhatsAppConversationStatus,
} from '@/types/whatsapp';

// ─────────────────────────────────────────────────────────────────────────────
// Status config
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  WhatsAppConversationStatus,
  { label: string; color: string }
> = {
  abierta: { label: 'Abierta', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-700/50' },
  pendiente_respuesta: { label: 'Pendiente', color: 'bg-amber-500/20 text-amber-300 border-amber-700/50' },
  en_gestion: { label: 'En gestión', color: 'bg-blue-500/20 text-blue-300 border-blue-700/50' },
  resuelta: { label: 'Resuelta', color: 'bg-slate-500/20 text-slate-300 border-slate-600/50' },
  archivada: { label: 'Archivada', color: 'bg-slate-600/20 text-slate-400 border-slate-700/50' },
  spam: { label: 'Spam', color: 'bg-rose-500/20 text-rose-300 border-rose-700/50' },
};

const ALL_STATUSES: WhatsAppConversationStatus[] = [
  'abierta',
  'pendiente_respuesta',
  'en_gestion',
  'resuelta',
  'archivada',
  'spam',
];

const SOURCE_LABELS: Record<string, string> = {
  webhook: 'Webhook real',
  manual: 'Manual',
  simulation: 'Simulación',
  public_form: 'Formulario público',
};

const CHANNEL_LABELS: Record<string, string> = {
  meta: 'Meta',
  twilio: 'Twilio',
  simulator: 'Simulador',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function toDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'object' && val !== null && 'seconds' in val) {
    return new Date((val as { seconds: number }).seconds * 1000);
  }
  if (typeof val === 'string' || typeof val === 'number') return new Date(val);
  return null;
}

function formatTime(val: unknown): string {
  const d = toDate(val);
  if (!d) return '';
  return format(d, 'HH:mm', { locale: es });
}

function formatRelative(val: unknown): string {
  const d = toDate(val);
  if (!d) return '';
  return formatDistanceToNow(d, { addSuffix: true, locale: es });
}

function formatDateFull(val: unknown): string {
  const d = toDate(val);
  if (!d) return '';
  return format(d, "dd/MM/yyyy HH:mm", { locale: es });
}

function getDateLabel(val: unknown): string {
  const d = toDate(val);
  if (!d) return '';
  if (isToday(d)) return 'Hoy';
  if (isYesterday(d)) return 'Ayer';
  return format(d, "d 'de' MMMM yyyy", { locale: es });
}

// ─────────────────────────────────────────────────────────────────────────────
// Message status icon
// ─────────────────────────────────────────────────────────────────────────────

function MessageStatusIcon({ status }: { status?: string }) {
  if (status === 'read') return <CheckCheck className="h-3 w-3 text-blue-400" />;
  if (status === 'delivered') return <CheckCheck className="h-3 w-3 text-slate-400" />;
  if (status === 'sent') return <Check className="h-3 w-3 text-slate-400" />;
  if (status === 'failed') return <X className="h-3 w-3 text-rose-400" />;
  return <Check className="h-3 w-3 text-slate-500 opacity-50" />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="flex h-screen bg-slate-950 animate-pulse">
      {/* Chat column skeleton */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* header */}
        <div className="h-16 bg-slate-900 border-b border-slate-800 flex items-center gap-3 px-4">
          <div className="h-8 w-8 rounded-lg bg-slate-800" />
          <div className="h-8 w-8 rounded-full bg-slate-800" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 rounded bg-slate-800" />
            <div className="h-3 w-24 rounded bg-slate-800" />
          </div>
        </div>
        {/* messages */}
        <div className="flex-1 p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-start' : 'justify-end')}>
              <div className="h-10 w-48 rounded-2xl bg-slate-800" />
            </div>
          ))}
        </div>
        {/* input */}
        <div className="h-20 bg-slate-900 border-t border-slate-800" />
      </div>
      {/* Panel skeleton */}
      <div className="hidden lg:flex flex-col w-72 xl:w-80 border-l border-slate-800 bg-slate-900/60">
        <div className="p-4 space-y-4">
          <div className="h-16 rounded-xl bg-slate-800" />
          <div className="h-24 rounded-xl bg-slate-800" />
          <div className="h-20 rounded-xl bg-slate-800" />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Link Client Dialog
// ─────────────────────────────────────────────────────────────────────────────

interface LinkClientDialogProps {
  convId: string;
  orgId: string;
  phoneE164: string;
  contactName?: string;
  onClose: () => void;
  onLinked: () => void;
}

function LinkClientDialog({
  convId,
  orgId,
  phoneE164,
  contactName,
  onClose,
  onLinked,
}: LinkClientDialogProps) {
  const [clientInput, setClientInput] = useState('');
  const [linking, setLinking] = useState(false);

  const handleLink = async () => {
    if (!clientInput.trim()) return;
    setLinking(true);
    try {
      const res = await fetch(
        `/api/whatsapp/conversations/${convId}/link-client?organization_id=${encodeURIComponent(orgId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_id: clientInput.trim() }),
        }
      );
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Error al vincular');
      toast.success('Cliente vinculado');
      onLinked();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al vincular');
    } finally {
      setLinking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-100">Vincular con cliente CRM</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <input
          type="text"
          value={clientInput}
          onChange={e => setClientInput(e.target.value)}
          placeholder="ID o nombre del cliente"
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          onKeyDown={e => e.key === 'Enter' && void handleLink()}
        />
        <div className="mt-4 flex gap-2">
          <Button
            onClick={() => void handleLink()}
            disabled={!clientInput.trim() || linking}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            {linking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Vincular
          </Button>
          <Link
            href={`/crm/clientes/nuevo?phone=${encodeURIComponent(phoneE164)}&name=${encodeURIComponent(contactName ?? '')}`}
            className="flex-1 rounded-md border border-slate-700 px-3 py-2 text-center text-sm text-slate-300 hover:bg-slate-800 transition-colors"
            onClick={onClose}
          >
            Crear nuevo
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function CrmWhatsAppChatPage() {
  const router = useRouter();
  const params = useParams<{ convId: string }>();
  const convId = params.convId;
  const { user } = useAuth();
  const orgId = user?.organization_id ?? '';

  // Data state
  const [conversation, setConversation] = useState<WhatsAppConversationV2 | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessageV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // UI state
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [assignInput, setAssignInput] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlightedMessageIds, setHighlightedMessageIds] = useState<string[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Load data ──────────────────────────────────────────────────────────────

  const loadConversation = useCallback(async () => {
    if (!convId || !orgId) return;
    try {
      const res = await fetch(
        `/api/whatsapp/conversations/${convId}?organization_id=${encodeURIComponent(orgId)}`,
        { cache: 'no-store' }
      );
      if (res.status === 404) { setNotFound(true); return; }
      const json = (await res.json()) as { success: boolean; data: WhatsAppConversationV2; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Error al cargar conversación');
      setConversation(json.data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al cargar conversación');
    }
  }, [convId, orgId]);

  const loadMessages = useCallback(async () => {
    if (!convId || !orgId) return;
    try {
      const res = await fetch(
        `/api/whatsapp/conversations/${convId}/messages?organization_id=${encodeURIComponent(orgId)}&limit=50`,
        { cache: 'no-store' }
      );
      const json = (await res.json()) as { success: boolean; data: WhatsAppMessageV2[]; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Error al cargar mensajes');
      // Sort chronologically oldest first
      const sorted = [...(json.data ?? [])].sort((a, b) => {
        const da = toDate(a.created_at)?.getTime() ?? 0;
        const db = toDate(b.created_at)?.getTime() ?? 0;
        return da - db;
      });
      setMessages(sorted);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al cargar mensajes');
    }
  }, [convId, orgId]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadConversation(), loadMessages()]);
    setLoading(false);
  }, [loadConversation, loadMessages]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // ── Send message ───────────────────────────────────────────────────────────

  const handleSend = async () => {
    const text = newMessage.trim();
    if (!text || sending || !conversation) return;
    setNewMessage('');
    setSending(true);
    try {
      const res = await fetch(
        `/api/whatsapp/conversations/${convId}/send?organization_id=${encodeURIComponent(orgId)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            sender_user_id: user?.id ?? '',
            sender_name: user?.email?.split('@')[0] ?? 'Usuario',
          }),
        }
      );
      const json = (await res.json()) as { success: boolean; data?: WhatsAppMessageV2; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Error al enviar');
      // Optimistic: add message locally
      const optimistic: WhatsAppMessageV2 = {
        id: json.data?.id ?? `opt-${Date.now()}`,
        conversation_id: convId,
        organization_id: orgId,
        direction: 'outbound',
        text,
        provider: conversation.channel,
        sender_type: 'user',
        sender_user_id: user?.id,
        sender_name: user?.email?.split('@')[0] ?? 'Usuario',
        status: 'sent',
        is_simulation: conversation.is_simulation,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, optimistic]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al enviar');
      setNewMessage(text); // restore
    } finally {
      setSending(false);
    }
  };

  // ── Change status ──────────────────────────────────────────────────────────

  const handleChangeStatus = async (status: WhatsAppConversationStatus) => {
    if (!conversation) return;
    setStatusDropdownOpen(false);
    setChangingStatus(true);
    try {
      const res = await fetch(
        `/api/whatsapp/conversations/${convId}/status?organization_id=${encodeURIComponent(orgId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }
      );
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Error al cambiar estado');
      setConversation(prev => prev ? { ...prev, status } : prev);
      toast.success(`Estado cambiado a "${STATUS_CONFIG[status].label}"`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al cambiar estado');
    } finally {
      setChangingStatus(false);
    }
  };

  // ── Archive ────────────────────────────────────────────────────────────────

  const handleArchive = () => void handleChangeStatus('archivada');

  // ── Assign ─────────────────────────────────────────────────────────────────

  const handleAssign = async () => {
    const uid = assignInput.trim();
    if (!uid) return;
    setAssigning(true);
    try {
      const res = await fetch(
        `/api/whatsapp/conversations/${convId}/assign?organization_id=${encodeURIComponent(orgId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assigned_user_id: uid }),
        }
      );
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Error al asignar');
      toast.success('Responsable asignado');
      setAssignInput('');
      await loadConversation();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al asignar');
    } finally {
      setAssigning(false);
    }
  };

  // ── Textarea auto-expand ───────────────────────────────────────────────────

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`; // max ~4 lines
  };

  // ── Message grouping by date ───────────────────────────────────────────────

  type MessageGroup = { dateLabel: string; msgs: WhatsAppMessageV2[] };

  function groupMessagesByDate(msgs: WhatsAppMessageV2[]): MessageGroup[] {
    const groups: MessageGroup[] = [];
    let currentLabel = '';
    for (const msg of msgs) {
      const label = getDateLabel(msg.created_at) || 'Sin fecha';
      if (label !== currentLabel) {
        currentLabel = label;
        groups.push({ dateLabel: label, msgs: [] });
      }
      groups[groups.length - 1].msgs.push(msg);
    }
    return groups;
  }

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (loading) return <PageSkeleton />;

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center max-w-sm w-full">
          <p className="text-lg font-semibold text-slate-100 mb-2">Conversación no encontrada</p>
          <p className="text-sm text-slate-400 mb-6">La conversación no existe o no tienes acceso a ella.</p>
          <Button
            onClick={() => router.push('/crm/whatsapp')}
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al inbox
          </Button>
        </div>
      </div>
    );
  }

  if (!conversation) return null;

  const isArchived = conversation.status === 'archivada' || conversation.status === 'spam';
  const statusCfg = STATUS_CONFIG[conversation.status];
  const messageGroups = groupMessagesByDate(messages);
  const handleSearchResultsChange = useCallback((messageIds: string[]) => {
    setHighlightedMessageIds(messageIds);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">

      {/* ── Chat Column ────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Header */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-800 bg-slate-900 px-4 py-3 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-slate-200 hover:bg-slate-800 shrink-0"
            onClick={() => router.push('/crm/whatsapp')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          {/* Avatar */}
          <div className="h-9 w-9 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
            <User className="h-5 w-5 text-slate-300" />
          </div>

          {/* Contact info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-100 truncate">
                {conversation.contact_name ?? conversation.phone_e164}
              </span>
              {conversation.is_simulation && (
                <span className="inline-flex items-center rounded-full border border-cyan-700/60 bg-cyan-900/30 px-2 py-0.5 text-[10px] font-medium text-cyan-300 animate-pulse">
                  SIMULACIÓN
                </span>
              )}
              {conversation.ai_enabled && (
                <span className="inline-flex items-center gap-1 rounded-full border border-violet-700/60 bg-violet-900/30 px-2 py-0.5 text-[10px] font-medium text-violet-300">
                  <Bot className="h-3 w-3" />
                  IA activa
                </span>
              )}
            </div>
            <p className="text-xs font-mono text-slate-500 truncate">{conversation.phone_e164}</p>
          </div>

          {/* Status dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => setStatusDropdownOpen(v => !v)}
              disabled={changingStatus}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition hover:opacity-80',
                statusCfg.color
              )}
            >
              {changingStatus ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              {statusCfg.label}
              <ChevronDown className="h-3 w-3" />
            </button>

            {statusDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setStatusDropdownOpen(false)}
                />
                <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
                  {ALL_STATUSES.map(s => (
                    <button
                      key={s}
                      onClick={() => void handleChangeStatus(s)}
                      className={cn(
                        'w-full px-3 py-2 text-left text-sm transition hover:bg-slate-800',
                        s === conversation.status ? 'text-emerald-400 font-medium' : 'text-slate-300'
                      )}
                    >
                      {STATUS_CONFIG[s].label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Action buttons */}
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-300 hover:text-slate-100 hover:bg-slate-800 shrink-0"
            onClick={() => {
              setSearchOpen(prev => {
                if (prev) {
                  setHighlightedMessageIds([]);
                }
                return !prev;
              });
            }}
            title="Buscar en chat"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Buscar en chat</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-slate-200 hover:bg-slate-800 shrink-0"
            onClick={handleArchive}
            title="Archivar conversación"
          >
            <Archive className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-slate-200 hover:bg-slate-800 shrink-0"
            title="Asignar responsable"
          >
            <UserPlus className="h-4 w-4" />
          </Button>
        </header>

        {/* Simulation banner */}
        {conversation.is_simulation && (
          <div className="border-b border-amber-700/40 bg-amber-950/40 px-4 py-2 text-center text-xs font-medium text-amber-300">
            Modo simulación — los mensajes NO se envían por WhatsApp real
          </div>
        )}

        {searchOpen && (
          <ConversationSearch
            conversationId={convId}
            onResultsChange={handleSearchResultsChange}
          />
        )}

        {/* Messages area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
        >
          {messageGroups.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-slate-500">No hay mensajes aún</p>
            </div>
          ) : (
            messageGroups.map(group => (
              <div key={group.dateLabel}>
                {/* Date separator */}
                <div className="flex items-center gap-3 py-3">
                  <div className="flex-1 border-t border-slate-800" />
                  <span className="text-xs text-slate-500 font-medium">{group.dateLabel}</span>
                  <div className="flex-1 border-t border-slate-800" />
                </div>

                {/* Messages in group */}
                <div className="space-y-1">
                  {group.msgs.map(msg => {
                    const isInbound = msg.direction === 'inbound';
                    const isSystem = msg.sender_type === 'system';
                    const isAI = msg.sender_type === 'ai';
                    const isOutbound = msg.direction === 'outbound';
                    const isHighlighted = highlightedMessageIds.includes(msg.id);

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="text-center py-1">
                          <span className="text-xs text-slate-500">{msg.text}</span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          'flex',
                          isInbound ? 'justify-start' : 'justify-end'
                        )}
                      >
                        <div
                          className={cn(
                            'max-w-[75%] rounded-2xl px-3 py-2 shadow-sm',
                            // Bubble colors
                            isInbound && 'bg-slate-700 text-slate-100 rounded-bl-sm',
                            isOutbound && !isAI && 'bg-emerald-700 text-white rounded-br-sm',
                            isAI && 'bg-violet-700/80 text-white rounded-br-sm',
                            // Simulation dashed border
                            msg.is_simulation && 'border border-dashed border-white/30',
                            isHighlighted && 'ring-2 ring-primary'
                          )}
                        >
                          {/* AI badge */}
                          {isAI && (
                            <div className="mb-1 flex items-center gap-1">
                              <Bot className="h-3 w-3 text-violet-300" />
                              <span className="text-[10px] font-medium text-violet-300">Don Cándido</span>
                            </div>
                          )}

                          {msg.has_media && msg.media ? (
                            <MediaMessage media={msg.media} direction={msg.direction} />
                          ) : (
                            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                              {msg.text}
                            </p>
                          )}

                          <div className={cn(
                            'flex items-center gap-1 mt-0.5',
                            isInbound ? 'justify-start' : 'justify-end'
                          )}>
                            <span className={cn(
                              'text-[10px]',
                              isInbound ? 'text-slate-400' : 'text-white/60'
                            )}>
                              {formatTime(msg.created_at)}
                            </span>
                            {isOutbound && (
                              <MessageStatusIcon status={msg.status} />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Reply box or archived banner */}
        {isArchived ? (
          <div className="border-t border-slate-800 bg-slate-900 px-4 py-4 text-center">
            <p className="text-sm text-slate-400">
              Esta conversación está {conversation.status === 'spam' ? 'marcada como spam' : 'archivada'}.
            </p>
            <button
              onClick={() => void handleChangeStatus('abierta')}
              className="mt-2 text-xs text-emerald-400 hover:text-emerald-300 underline"
            >
              Reabrir conversación
            </button>
          </div>
        ) : (
          <footer className="sticky bottom-0 border-t border-slate-800 bg-slate-900 px-4 py-3 flex items-end gap-2 shrink-0">
            <Textarea
              ref={textareaRef}
              value={newMessage}
              onChange={handleTextareaChange}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="Escribe un mensaje... (Ctrl+Enter para enviar)"
              className="flex-1 min-h-[44px] max-h-24 resize-none bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-emerald-600 rounded-xl"
              rows={1}
            />
            <Button
              onClick={() => void handleSend()}
              disabled={!newMessage.trim() || sending}
              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-11 w-11 p-0 shrink-0"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </footer>
        )}
      </div>

      {/* ── CRM Panel (right) ─────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-72 xl:w-80 border-l border-slate-800 bg-slate-900/60 overflow-y-auto shrink-0">

        {/* Section 1: Contact */}
        <div className="p-4 border-b border-slate-800">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Contacto</p>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
              <User className="h-6 w-6 text-slate-300" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-100 truncate">
                {conversation.contact_name ?? 'Sin nombre'}
              </p>
              <p className="text-xs font-mono text-slate-400 truncate">{conversation.phone_e164}</p>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {conversation.client_id ? (
              <Link
                href={`/crm/clientes/${conversation.client_id}`}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-700/50 bg-emerald-900/20 px-3 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-900/40 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Ver en CRM
              </Link>
            ) : (
              <button
                onClick={() => setShowLinkDialog(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
              >
                <Link2 className="h-4 w-4" />
                Vincular con cliente CRM
              </button>
            )}
          </div>
        </div>

        {/* Section 2: Status and assignment */}
        <div className="p-4 border-b border-slate-800">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Estado y asignación</p>

          {/* Assigned user */}
          <div className="mb-3">
            <p className="text-xs text-slate-500 mb-1">Responsable</p>
            {conversation.assigned_user_name ? (
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-slate-700 flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-slate-300" />
                </div>
                <span className="text-sm text-slate-200">{conversation.assigned_user_name}</span>
              </div>
            ) : (
              <span className="text-sm text-slate-500">Sin asignar</span>
            )}
          </div>

          {/* Assign input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={assignInput}
              onChange={e => setAssignInput(e.target.value)}
              placeholder="UID del responsable"
              className="flex-1 min-w-0 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              onKeyDown={e => e.key === 'Enter' && void handleAssign()}
            />
            <Button
              onClick={() => void handleAssign()}
              disabled={!assignInput.trim() || assigning}
              size="sm"
              className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs px-3 shrink-0"
            >
              {assigning ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Asignar'}
            </Button>
          </div>

          {/* Conversation type badge */}
          <div className="mt-3">
            <p className="text-xs text-slate-500 mb-1">Tipo</p>
            <Badge variant="outline" className="border-slate-600 text-slate-300 text-xs capitalize">
              {conversation.type}
            </Badge>
          </div>
        </div>

        {/* Section 3: Quick actions */}
        <div className="p-4 border-b border-slate-800">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Acciones rápidas</p>
          <div className="space-y-2">
            <Link
              href={`/crm/acciones/nueva${conversation.client_id ? `?cliente_id=${conversation.client_id}&canal=whatsapp` : '?canal=whatsapp'}`}
              className="flex w-full items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <span className="h-2 w-2 rounded-full bg-blue-400 shrink-0" />
              Crear acción CRM
            </Link>
            <Link
              href={`/crm/oportunidades/nueva${conversation.client_id ? `?cliente_id=${conversation.client_id}` : ''}`}
              className="flex w-full items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
              Crear oportunidad
            </Link>

            {/* Status quick-change */}
            <div>
              <p className="text-xs text-slate-500 mb-1 mt-1">Cambiar estado</p>
              <div className="grid grid-cols-2 gap-1.5">
                {ALL_STATUSES.map(s => (
                  <button
                    key={s}
                    onClick={() => void handleChangeStatus(s)}
                    disabled={s === conversation.status || changingStatus}
                    className={cn(
                      'rounded-lg border px-2 py-1.5 text-xs font-medium transition',
                      s === conversation.status
                        ? STATUS_CONFIG[s].color + ' opacity-100 cursor-default'
                        : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200 hover:bg-slate-800'
                    )}
                  >
                    {STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Conversation info */}
        <div className="p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Info conversación</p>
          <dl className="space-y-2.5 text-xs">
            <div>
              <dt className="text-slate-500 mb-0.5">Origen</dt>
              <dd>
                <Badge variant="outline" className="border-slate-600 text-slate-300 text-[10px]">
                  {SOURCE_LABELS[conversation.source] ?? conversation.source}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 mb-0.5">Canal</dt>
              <dd>
                <Badge variant="outline" className="border-slate-600 text-slate-300 text-[10px]">
                  {CHANNEL_LABELS[conversation.channel] ?? conversation.channel}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 mb-0.5">Creada el</dt>
              <dd className="text-slate-300">{formatDateFull(conversation.created_at)}</dd>
            </div>
            <div>
              <dt className="text-slate-500 mb-0.5">Última actividad</dt>
              <dd className="text-slate-300">{formatRelative(conversation.last_message_at ?? conversation.updated_at)}</dd>
            </div>
          </dl>
        </div>
      </aside>

      {/* Link Client Dialog */}
      {showLinkDialog && (
        <LinkClientDialog
          convId={convId}
          orgId={orgId}
          phoneE164={conversation.phone_e164}
          contactName={conversation.contact_name}
          onClose={() => setShowLinkDialog(false)}
          onLinked={() => void loadConversation()}
        />
      )}
    </div>
  );
}
