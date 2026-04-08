'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type {
  WhatsAppConversationV2,
  WhatsAppConversationStatus,
  WhatsAppInboxFilters,
} from '@/types/whatsapp';

// ─── Types ────────────────────────────────────────────────────────────────────

type ConvType = 'crm' | 'iso' | 'support' | 'dealer' | 'all';

interface CreateConvForm {
  phone_e164: string;
  contact_name: string;
  type: 'crm' | 'iso' | 'support' | 'dealer';
}

interface CreateConvResponse {
  success: boolean;
  data?: {
    id: string;
    already_existed?: boolean;
  };
  error?: string;
}

// ─── Badge helpers ─────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<WhatsAppConversationStatus, string> = {
  abierta:              'bg-blue-900/40 text-blue-300 border-blue-700/50',
  pendiente_respuesta:  'bg-amber-900/40 text-amber-300 border-amber-700/50 animate-pulse',
  en_gestion:           'bg-indigo-900/40 text-indigo-300 border-indigo-700/50',
  resuelta:             'bg-emerald-900/40 text-emerald-300 border-emerald-700/50',
  archivada:            'bg-slate-800 text-slate-400 border-slate-700',
  spam:                 'bg-rose-900/40 text-rose-300 border-rose-700/50',
};

const STATUS_LABELS: Record<WhatsAppConversationStatus, string> = {
  abierta:             'Abierta',
  pendiente_respuesta: 'Pendiente',
  en_gestion:          'En gestión',
  resuelta:            'Resuelta',
  archivada:           'Archivada',
  spam:                'Spam',
};

const STATUS_SELECT: Array<{ value: WhatsAppConversationStatus | 'all'; label: string }> = [
  { value: 'all',              label: 'Todas' },
  { value: 'abierta',          label: 'Abierta' },
  { value: 'pendiente_respuesta', label: 'Pendiente respuesta' },
  { value: 'en_gestion',       label: 'En gestión' },
  { value: 'resuelta',         label: 'Resuelta' },
  { value: 'archivada',        label: 'Archivada' },
  { value: 'spam',             label: 'Spam' },
];

const TYPE_SELECT: Array<{ value: ConvType; label: string }> = [
  { value: 'all',     label: 'Todos' },
  { value: 'crm',     label: 'CRM' },
  { value: 'iso',     label: 'ISO' },
  { value: 'support', label: 'Soporte' },
  { value: 'dealer',  label: 'Dealer' },
];

// ─── Avatar helpers ────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-blue-700',
  'bg-emerald-700',
  'bg-violet-700',
  'bg-amber-700',
  'bg-rose-700',
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length] ?? 'bg-slate-700';
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || parts[0] === '') return '?';
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? '?').toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

// ─── Relative time helper ──────────────────────────────────────────────────────

function relativeTime(ts: unknown): string {
  if (!ts) return '';
  let date: Date;
  if (ts instanceof Date) {
    date = ts;
  } else if (
    typeof ts === 'object' &&
    ts !== null &&
    'toDate' in ts &&
    typeof (ts as { toDate: unknown }).toDate === 'function'
  ) {
    date = (ts as { toDate: () => Date }).toDate();
  } else if (typeof ts === 'string' || typeof ts === 'number') {
    date = new Date(ts);
  } else {
    return '';
  }
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d`;
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ListSkeleton() {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl p-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-slate-800 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-32 animate-pulse rounded bg-slate-800" />
            <div className="h-3 w-48 animate-pulse rounded bg-slate-800/70" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Conversation item ────────────────────────────────────────────────────────

interface ConvItemProps {
  conv: WhatsAppConversationV2;
  selected: boolean;
  onClick: () => void;
}

function ConvItem({ conv, selected, onClick }: ConvItemProps) {
  const name = conv.contact_name ?? conv.phone_e164;
  const color = avatarColor(name);
  const inits = initials(name);
  const lastMsg = conv.last_message_text
    ? conv.last_message_text.length > 60
      ? conv.last_message_text.slice(0, 60) + '…'
      : conv.last_message_text
    : '';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors
        ${selected ? 'bg-slate-800' : 'hover:bg-slate-800/60'}`}
    >
      {/* Avatar */}
      <div
        className={`relative h-10 w-10 shrink-0 rounded-full ${color} flex items-center justify-center text-xs font-bold text-white`}
      >
        {inits}
      </div>

      {/* Center */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="truncate text-sm font-medium text-slate-100">
            {name}
          </span>
          {conv.is_simulation && (
            <span className="shrink-0 rounded-full border border-cyan-700/50 bg-cyan-900/40 px-1.5 py-0 text-[10px] font-medium text-cyan-300">
              SIM
            </span>
          )}
          {conv.ai_enabled && (
            <span className="shrink-0 rounded-full border border-violet-700/50 bg-violet-900/40 px-1.5 py-0 text-[10px] font-medium text-violet-300">
              IA
            </span>
          )}
        </div>
        <p className="truncate text-xs text-slate-500">{lastMsg || conv.phone_e164}</p>
      </div>

      {/* Right */}
      <div className="shrink-0 flex flex-col items-end gap-1">
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex rounded-full border px-1.5 py-0 text-[10px] font-medium ${STATUS_BADGE[conv.status]}`}
          >
            {STATUS_LABELS[conv.status]}
          </span>
          <span className="text-[10px] text-slate-600">
            {relativeTime(conv.last_message_at ?? conv.updated_at)}
          </span>
        </div>
        {(conv.unread_count ?? 0) > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
            {conv.unread_count}
          </span>
        )}
      </div>
    </button>
  );
}

// ─── New Conversation Dialog ───────────────────────────────────────────────────

interface NewConvDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (form: CreateConvForm) => Promise<void>;
  loading: boolean;
}

function NewConvDialog({ open, onClose, onSubmit, loading }: NewConvDialogProps) {
  const [form, setForm] = useState<CreateConvForm>({
    phone_e164: '',
    contact_name: '',
    type: 'crm',
  });
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    if (open) {
      setForm({ phone_e164: '', contact_name: '', type: 'crm' });
      setPhoneError('');
    }
  }, [open]);

  const set = <K extends keyof CreateConvForm>(key: K, val: CreateConvForm[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const validatePhone = (val: string): boolean => {
    const e164Re = /^\+\d{10,15}$/;
    if (!e164Re.test(val)) {
      setPhoneError('Formato inválido. Ej: +5491155555555 (+ seguido de 10-15 dígitos)');
      return false;
    }
    setPhoneError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePhone(form.phone_e164)) return;
    await onSubmit(form);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">Nueva conversación</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {/* Phone */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">
              Número de teléfono *
            </label>
            <input
              type="text"
              value={form.phone_e164}
              onChange={e => set('phone_e164', e.target.value)}
              placeholder="+5491155555555"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-emerald-600"
            />
            {phoneError && (
              <p className="mt-1 text-xs text-rose-400">{phoneError}</p>
            )}
          </div>

          {/* Contact name */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">
              Nombre del contacto
            </label>
            <input
              type="text"
              value={form.contact_name}
              onChange={e => set('contact_name', e.target.value)}
              placeholder="Nombre (opcional)"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-emerald-600"
            />
          </div>

          {/* Type */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">
              Tipo
            </label>
            <select
              value={form.type}
              onChange={e => set('type', e.target.value as CreateConvForm['type'])}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-600"
            >
              <option value="crm">CRM</option>
              <option value="iso">ISO</option>
              <option value="support">Soporte</option>
              <option value="dealer">Dealer</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition"
            >
              {loading ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({
  hasFilters,
  onNew,
}: {
  hasFilters: boolean;
  onNew: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <MessageSquare className="h-12 w-12 text-slate-700" />
      {hasFilters ? (
        <p className="text-sm text-slate-500">Sin resultados para los filtros actuales</p>
      ) : (
        <>
          <p className="text-slate-400">No hay conversaciones</p>
          <button
            type="button"
            onClick={onNew}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition"
          >
            Crear primera
          </button>
        </>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WhatsAppInboxPage() {
  const router = useRouter();
  const { user } = useAuth();
  const orgId = user?.organization_id ?? '';

  const [conversations, setConversations] = useState<WhatsAppConversationV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<WhatsAppInboxFilters>({ status: 'all', type: 'all', limit: 50 });
  const [search, setSearch] = useState('');
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [newConvLoading, setNewConvLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ── Load conversations ─────────────────────────────────────────────────────

  const load = useCallback(async (silent = false) => {
    if (!orgId) return;
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams({ organization_id: orgId });
      if (filters.status && filters.status !== 'all') params.set('status', filters.status);
      if (filters.type && filters.type !== 'all') params.set('type', filters.type);
      if (filters.unread_only) params.set('unread_only', 'true');
      if (search.trim()) params.set('search', search.trim());
      params.set('limit', String(filters.limit ?? 50));

      const res = await fetch(`/api/whatsapp/conversations?${params.toString()}`, {
        cache: 'no-store',
      });
      const json = (await res.json()) as {
        success: boolean;
        data: WhatsAppConversationV2[];
        error?: string;
      };
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Error al cargar');
      setConversations(json.data);
    } catch (err) {
      if (!silent) {
        console.error('[WhatsApp Inbox] load error:', err);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [orgId, filters, search]);

  // Initial load + re-load when filters/search change
  useEffect(() => {
    void load();
  }, [load]);

  // Auto-refresh every 30 seconds (silent)
  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    const interval = setInterval(() => {
      void loadRef.current(true);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // ── Create conversation ────────────────────────────────────────────────────

  const handleCreate = async (form: CreateConvForm) => {
    setNewConvLoading(true);
    try {
      const res = await fetch(`/api/whatsapp/conversations?organization_id=${encodeURIComponent(orgId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_e164: form.phone_e164,
          contact_name: form.contact_name || undefined,
          type: form.type,
        }),
      });
      const json = (await res.json()) as CreateConvResponse;
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Error al crear');
      setNewConvOpen(false);
      const convId = json.data?.id;
      if (convId) {
        router.push(`/crm/whatsapp/${convId}`);
      } else {
        await load();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al crear conversación');
    } finally {
      setNewConvLoading(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const totalUnread = conversations.reduce(
    (acc, c) => acc + (c.unread_count > 0 ? 1 : 0),
    0
  );

  const hasActiveFilters =
    (filters.status && filters.status !== 'all') ||
    (filters.type && filters.type !== 'all') ||
    !!filters.unread_only ||
    !!search.trim();

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col">
      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-emerald-400" />
            <h1 className="text-lg font-semibold text-slate-100">WhatsApp Inbox</h1>
            {totalUnread > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 text-xs font-bold text-white">
                {totalUnread}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition"
              title="Actualizar"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <button
              type="button"
              onClick={() => setNewConvOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              Nueva conversación
            </button>
          </div>
        </div>

        {/* Filters row */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {/* Status select */}
          <select
            value={filters.status ?? 'all'}
            onChange={e =>
              setFilters(prev => ({
                ...prev,
                status: e.target.value as WhatsAppConversationStatus | 'all',
              }))
            }
            className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-emerald-600"
          >
            {STATUS_SELECT.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Type select */}
          <select
            value={filters.type ?? 'all'}
            onChange={e =>
              setFilters(prev => ({
                ...prev,
                type: e.target.value as ConvType,
              }))
            }
            className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-emerald-600"
          >
            {TYPE_SELECT.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Unread only toggle */}
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={!!filters.unread_only}
              onChange={e =>
                setFilters(prev => ({ ...prev, unread_only: e.target.checked || undefined }))
              }
              className="h-3.5 w-3.5 accent-emerald-500"
            />
            Solo no leídas
          </label>

          {/* Search */}
          <div className="relative ml-auto flex items-center">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar nombre o número..."
              className="rounded-lg border border-slate-700 bg-slate-800 py-1.5 pl-8 pr-3 text-xs text-slate-100 placeholder:text-slate-600 outline-none focus:border-emerald-600 w-48"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 text-slate-500 hover:text-slate-300"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Two-column layout ─────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: conversation list */}
        <div className="w-full shrink-0 overflow-y-auto border-r border-slate-800 md:w-[380px]">
          {loading ? (
            <ListSkeleton />
          ) : conversations.length === 0 ? (
            <EmptyState
              hasFilters={!!hasActiveFilters}
              onNew={() => setNewConvOpen(true)}
            />
          ) : (
            <div className="space-y-0.5 p-2">
              {conversations.map(conv => (
                <ConvItem
                  key={conv.id}
                  conv={conv}
                  selected={conv.id === selectedId}
                  onClick={() => {
                    setSelectedId(conv.id);
                    router.push(`/crm/whatsapp/${conv.id}`);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: placeholder (conversation detail loads via nested route) */}
        <div className="hidden flex-1 items-center justify-center md:flex">
          <div className="flex flex-col items-center gap-3 text-center">
            <MessageSquare className="h-16 w-16 text-slate-800" />
            <p className="text-sm text-slate-600">
              Seleccioná una conversación para verla
            </p>
          </div>
        </div>
      </div>

      {/* ── Dialog ────────────────────────────────────────────────────────── */}
      <NewConvDialog
        open={newConvOpen}
        onClose={() => setNewConvOpen(false)}
        onSubmit={handleCreate}
        loading={newConvLoading}
      />
    </div>
  );
}
