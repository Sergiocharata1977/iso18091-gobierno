'use client';

import { PageHeader, PageToolbar } from '@/components/design-system/layout';
import { DomainCard } from '@/components/design-system/patterns/cards/DomainCard';
import { KPIStatCard } from '@/components/design-system/patterns/cards/KPIStatCard';
import { BaseBadge } from '@/components/design-system/primitives/BaseBadge';
import { BaseButton } from '@/components/design-system/primitives/BaseButtonPrimitive';
import { BaseCard } from '@/components/design-system/primitives/BaseCard';
import { useAuth } from '@/contexts/AuthContext';
import type {
  MessageChannel,
  UnifiedConversation,
  UnifiedConversationStatus,
} from '@/types/messages';
import {
  AlertCircle,
  ArrowRight,
  Bot,
  MessageSquare,
  Plus,
  SearchX,
  Smartphone,
  UserCircle2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type ChannelFilter = MessageChannel | 'all';
type StatusFilter = UnifiedConversationStatus | 'all';

type SerializedConversation = Omit<
  UnifiedConversation,
  'lastMessageAt' | 'createdAt' | 'updatedAt'
> & {
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
};

const CHANNEL_OPTIONS: Array<{ value: ChannelFilter; label: string }> = [
  { value: 'all', label: 'Todos los canales' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'ai_chat', label: 'IA' },
];

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'unread', label: 'Sin leer' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'archived', label: 'Archivado' },
];

function toConversation(
  conversation: SerializedConversation
): UnifiedConversation {
  return {
    ...conversation,
    lastMessageAt: new Date(conversation.lastMessageAt),
    createdAt: new Date(conversation.createdAt),
    updatedAt: new Date(conversation.updatedAt),
  };
}

function relativeTime(value: Date): string {
  if (Number.isNaN(value.getTime())) {
    return '';
  }

  const diffMs = Date.now() - value.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `${diffMin}m`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;

  return value.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
  });
}

function truncateText(value: string, max = 96): string {
  if (value.length <= max) {
    return value;
  }

  return `${value.slice(0, max)}...`;
}

function getStatusVariant(status: UnifiedConversationStatus) {
  switch (status) {
    case 'unread':
      return 'success' as const;
    case 'pending':
      return 'warning' as const;
    case 'archived':
      return 'outline' as const;
    case 'read':
    default:
      return 'secondary' as const;
  }
}

function getStatusLabel(status: UnifiedConversationStatus) {
  switch (status) {
    case 'unread':
      return 'Sin leer';
    case 'pending':
      return 'Pendiente';
    case 'archived':
      return 'Archivado';
    case 'read':
    default:
      return 'Leido';
  }
}

function getChannelMeta(channel: MessageChannel) {
  if (channel === 'whatsapp') {
    return {
      label: 'WhatsApp',
      badge: 'success' as const,
      icon: Smartphone,
    };
  }

  return {
    label: 'IA',
    badge: 'secondary' as const,
    icon: Bot,
  };
}

function ListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="ledger-panel animate-pulse rounded-[24px] border-white/60 p-6"
        >
          <div className="h-4 w-28 rounded-full bg-slate-200" />
          <div className="mt-4 h-6 w-40 rounded bg-slate-200" />
          <div className="mt-3 h-4 w-full rounded bg-slate-100" />
          <div className="mt-2 h-4 w-3/4 rounded bg-slate-100" />
          <div className="mt-6 flex gap-2">
            <div className="h-6 w-20 rounded-full bg-slate-100" />
            <div className="h-6 w-16 rounded-full bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <BaseCard className="ledger-panel rounded-[28px] border-white/60 px-8 py-16 text-center shadow-[0_18px_44px_rgba(25,28,29,0.08)]">
      <div className="mx-auto flex max-w-md flex-col items-center gap-4">
        <div className="rounded-full bg-slate-100 p-4 text-slate-500">
          {hasFilters ? (
            <SearchX className="h-8 w-8" />
          ) : (
            <MessageSquare className="h-8 w-8" />
          )}
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-slate-950">
            {hasFilters
              ? 'No hay conversaciones para esos filtros'
              : 'Todavia no hay conversaciones'}
          </h3>
          <p className="text-sm leading-6 text-slate-600">
            {hasFilters
              ? 'Proba cambiando canal, estado o termino de busqueda.'
              : 'Las conversaciones de WhatsApp y de IA van a aparecer aca con el mismo lenguaje visual del sistema.'}
          </p>
        </div>
      </div>
    </BaseCard>
  );
}

function ErrorState({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <BaseCard className="ledger-panel rounded-[28px] border-white/60 px-8 py-16 text-center shadow-[0_18px_44px_rgba(25,28,29,0.08)]">
      <div className="mx-auto flex max-w-md flex-col items-center gap-4">
        <div className="rounded-full bg-rose-100 p-4 text-rose-700">
          <AlertCircle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-slate-950">
            Error al cargar conversaciones
          </h3>
          <p className="text-sm leading-6 text-slate-600">{error}</p>
        </div>
        <BaseButton className="ledger-primary-button border-0" onClick={onRetry}>
          Reintentar
        </BaseButton>
      </div>
    </BaseCard>
  );
}

function ConversationCard({
  conversation,
  onOpen,
}: {
  conversation: UnifiedConversation;
  onOpen: () => void;
}) {
  const channel = getChannelMeta(conversation.channel);
  const ChannelIcon = channel.icon;

  return (
    <DomainCard
      title={conversation.contactName || 'Sin nombre'}
      subtitle={truncateText(
        conversation.lastMessageText || conversation.contactIdentifier,
        88
      )}
      status={{
        label: getStatusLabel(conversation.status),
        variant: getStatusVariant(conversation.status),
      }}
      className="ledger-panel rounded-[24px] border-white/70 bg-white/88 shadow-[0_18px_44px_rgba(25,28,29,0.08)] transition-transform duration-200 hover:-translate-y-0.5"
      leading={
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
          <ChannelIcon className="h-5 w-5" />
        </div>
      }
      meta={
        <div className="flex flex-wrap items-center gap-2">
          <BaseBadge variant={channel.badge}>{channel.label}</BaseBadge>
          <BaseBadge variant="outline">{relativeTime(conversation.lastMessageAt)}</BaseBadge>
          {conversation.unreadCount > 0 ? (
            <BaseBadge variant="warning">
              {conversation.unreadCount} sin leer
            </BaseBadge>
          ) : null}
        </div>
      }
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Asignado
            </p>
            <p className="truncate text-sm text-slate-700">
              {conversation.assignedUserName || 'Sin asignar'}
            </p>
          </div>
          <BaseButton
            variant="outline"
            className="shrink-0"
            onClick={event => {
              event.stopPropagation();
              onOpen();
            }}
          >
            Abrir
            <ArrowRight className="ml-2 h-4 w-4" />
          </BaseButton>
        </div>
      }
      onClick={onOpen}
    >
      <div className="space-y-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Identificador
          </p>
          <p className="mt-1 truncate text-sm text-slate-700">
            {conversation.contactIdentifier}
          </p>
        </div>
      </div>
    </DomainCard>
  );
}

export default function MensajesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const organizationId = user?.organization_id ?? '';

  const [conversations, setConversations] = useState<UnifiedConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!organizationId) {
      setConversations([]);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function loadConversations() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          organization_id: organizationId,
        });

        if (channelFilter !== 'all') {
          params.set('channel', channelFilter);
        }

        if (statusFilter !== 'all') {
          params.set('status', statusFilter);
        }

        if (debouncedSearch) {
          params.set('search', debouncedSearch);
        }

        const response = await fetch(`/api/messages?${params.toString()}`, {
          cache: 'no-store',
          signal: controller.signal,
        });

        const json = (await response.json()) as {
          success: boolean;
          data?: SerializedConversation[];
          error?: string;
        };

        if (!response.ok || !json.success) {
          throw new Error(json.error ?? 'No se pudieron cargar las conversaciones');
        }

        setConversations((json.data ?? []).map(toConversation));
      } catch (fetchError) {
        if (controller.signal.aborted) {
          return;
        }

        setConversations([]);
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'No se pudieron cargar las conversaciones'
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadConversations();

    return () => controller.abort();
  }, [
    authLoading,
    organizationId,
    channelFilter,
    statusFilter,
    debouncedSearch,
    reloadNonce,
  ]);

  const hasActiveFilters =
    channelFilter !== 'all' ||
    statusFilter !== 'all' ||
    debouncedSearch.length > 0;

  const metrics = useMemo(() => {
    const total = conversations.length;
    const unread = conversations.filter(
      conversation => conversation.status === 'unread'
    ).length;
    const pending = conversations.filter(
      conversation => conversation.status === 'pending'
    ).length;
    const assigned = conversations.filter(
      conversation => Boolean(conversation.assignedUserName)
    ).length;

    return { total, unread, pending, assigned };
  }, [conversations]);

  return (
    <div className="ledger-shell min-h-screen">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="ledger-panel rounded-[28px] p-6 md:p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-800">
                <MessageSquare className="h-4 w-4" />
                Workspace unificado
              </div>
              <h1 className="text-4xl font-black tracking-tight text-slate-950">
                Centro de mensajes
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                Bandeja unica para conversaciones de WhatsApp e IA con el mismo
                lenguaje visual del design system. La lectura prioriza estado,
                asignacion y ultimo movimiento.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:w-[430px]">
              <BaseCard className="rounded-[22px] border-white/70 bg-white/82 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Prioridad visual
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  Superficies claras, estados legibles y accion directa.
                </p>
              </BaseCard>
              <BaseCard className="rounded-[22px] border-white/70 bg-white/82 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Vista canonicа
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  Mismo modelo visual que configuracion, super-admin y RRHH.
                </p>
              </BaseCard>
              <BaseCard className="rounded-[22px] border-white/70 bg-white/82 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Accion rapida
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  Abrir hilo y seguir contexto sin perder trazabilidad.
                </p>
              </BaseCard>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KPIStatCard
            label="CONVERSACIONES"
            value={String(metrics.total)}
            icon={<MessageSquare className="h-4 w-4" />}
            subtext="Hilos visibles en la bandeja"
          />
          <KPIStatCard
            label="SIN LEER"
            value={String(metrics.unread)}
            icon={<Smartphone className="h-4 w-4" />}
            progress={{
              value: metrics.total ? (metrics.unread / metrics.total) * 100 : 0,
              color: 'success',
              label: 'Proporcion sobre la bandeja',
            }}
          />
          <KPIStatCard
            label="PENDIENTES"
            value={String(metrics.pending)}
            icon={<AlertCircle className="h-4 w-4" />}
            progress={{
              value: metrics.total ? (metrics.pending / metrics.total) * 100 : 0,
              color: 'warning',
              label: 'Conversaciones en seguimiento',
            }}
          />
          <KPIStatCard
            label="ASIGNADAS"
            value={String(metrics.assigned)}
            icon={<UserCircle2 className="h-4 w-4" />}
            progress={{
              value: metrics.total ? (metrics.assigned / metrics.total) * 100 : 0,
              color: 'info',
              label: 'Con responsable visible',
            }}
          />
        </section>

        <section className="ledger-panel rounded-[28px] p-4 md:p-6">
          <PageHeader
            title="Workspace de conversaciones"
            description="La estructura replica el design system del sistema: header, toolbar, metricas y tarjetas de dominio."
            breadcrumbs={[{ label: 'Mensajes' }]}
            actions={
              <BaseButton
                className="ledger-primary-button border-0"
                onClick={() => setReloadNonce(value => value + 1)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Actualizar bandeja
              </BaseButton>
            }
          />

          <div className="rounded-[24px] bg-[#f3f4f5] p-4 md:p-5">
            <PageToolbar
              searchValue={search}
              onSearch={setSearch}
              searchPlaceholder="Buscar por nombre, identificador o ultimo mensaje..."
              className="border-white/60 bg-white/80 shadow-[0_12px_32px_rgba(25,28,29,0.06)]"
              filterOptions={
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Canal
                    </label>
                    <select
                      value={channelFilter}
                      onChange={event =>
                        setChannelFilter(event.target.value as ChannelFilter)
                      }
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
                    >
                      {CHANNEL_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Estado
                    </label>
                    <select
                      value={statusFilter}
                      onChange={event =>
                        setStatusFilter(event.target.value as StatusFilter)
                      }
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
                    >
                      {STATUS_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <BaseBadge variant="outline">
                      {channelFilter === 'all'
                        ? 'Canales: todos'
                        : `Canal: ${CHANNEL_OPTIONS.find(option => option.value === channelFilter)?.label ?? channelFilter}`}
                    </BaseBadge>
                    <BaseBadge variant="outline">
                      {statusFilter === 'all'
                        ? 'Estado: todos'
                        : `Estado: ${STATUS_OPTIONS.find(option => option.value === statusFilter)?.label ?? statusFilter}`}
                    </BaseBadge>
                  </div>
                </div>
              }
            />

            <div className="mt-5">
              {loading || authLoading ? (
                <ListSkeleton />
              ) : error ? (
                <ErrorState
                  error={error}
                  onRetry={() => setReloadNonce(value => value + 1)}
                />
              ) : conversations.length === 0 ? (
                <EmptyState hasFilters={hasActiveFilters} />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {conversations.map(conversation => (
                    <ConversationCard
                      key={conversation.id}
                      conversation={conversation}
                      onOpen={() =>
                        router.push(`/mensajes/${encodeURIComponent(conversation.id)}`)
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
