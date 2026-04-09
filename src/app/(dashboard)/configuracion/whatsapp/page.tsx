'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Link,
  Loader2,
  MessageSquare,
  Phone,
  Settings,
  ShieldCheck,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';
import NextLink from 'next/link';
import { PageHeader } from '@/components/design-system/layout';
import { KPIStatCard } from '@/components/design-system/patterns/cards/KPIStatCard';
import { BaseBadge } from '@/components/design-system/primitives/BaseBadge';
import { BaseButton } from '@/components/design-system/primitives/BaseButtonPrimitive';
import { BaseCard } from '@/components/design-system/primitives/BaseCard';
import { EmbeddedSignupButton } from '@/components/whatsapp/EmbeddedSignupButton';
import { useAuth } from '@/contexts/AuthContext';
import type { OrganizationWhatsAppConfig } from '@/types/whatsapp';

const DEFAULT_CONFIG: OrganizationWhatsAppConfig = {
  enabled: false,
  provider: 'meta',
  mode: 'notifications_only',
  whatsapp_phone_number_id: '',
  whatsapp_business_account_id: '',
  outbound_number_label: '',
  whatsapp_notificaciones_dealer: '',
  default_assigned_user_id: '',
  welcome_message: '',
  out_of_hours_message: '',
  auto_reply_enabled: false,
  auto_link_client_by_phone: false,
  auto_create_lead_if_unknown: false,
  webhook_status: 'pending',
  last_webhook_check: undefined,
};

function LoadingSkeleton() {
  return (
    <div className="ledger-shell min-h-screen">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="ledger-panel h-48 animate-pulse rounded-[28px]" />
        <div className="grid gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-[24px] bg-white/70 shadow-[0_12px_32px_rgba(25,28,29,0.06)]" />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_360px]">
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-[28px] bg-white/70 shadow-[0_12px_32px_rgba(25,28,29,0.06)]" />
            ))}
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-[28px] bg-white/70 shadow-[0_12px_32px_rgba(25,28,29,0.06)]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function WebhookBadge({ status }: { status?: 'pending' | 'verified' | 'error' }) {
  if (status === 'verified') return <BaseBadge variant="success">Verificado</BaseBadge>;
  if (status === 'error') return <BaseBadge variant="destructive">Error</BaseBadge>;
  return <BaseBadge variant="warning">Pendiente</BaseBadge>;
}

function StatusBadge({ enabled, hasPhoneId }: { enabled: boolean; hasPhoneId: boolean }) {
  if (enabled && hasPhoneId) return <BaseBadge variant="success">Configurado</BaseBadge>;
  return <BaseBadge variant="warning">Pendiente</BaseBadge>;
}

function SectionCard({
  title,
  description,
  icon,
  children,
  headerExtra,
}: {
  title: string;
  description?: string;
  icon: ReactNode;
  children: ReactNode;
  headerExtra?: ReactNode;
}) {
  return (
    <BaseCard className="ledger-panel rounded-[28px] border-white/70 bg-white/88 p-6 shadow-[0_18px_44px_rgba(25,28,29,0.08)] md:p-7">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_12px_28px_rgba(15,23,42,0.18)]">{icon}</div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
            {description ? <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{description}</p> : null}
          </div>
        </div>
        {headerExtra ? <div className="shrink-0">{headerExtra}</div> : null}
      </div>
      {children}
    </BaseCard>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  label,
  sublabel,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  sublabel?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-[22px] border border-slate-200 bg-white/80 px-4 py-4">
      <div>
        <p className="text-sm font-semibold text-slate-950">{label}</p>
        {sublabel ? <p className="mt-1 text-sm leading-6 text-slate-600">{sublabel}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900/20 ${checked ? 'bg-emerald-500' : 'bg-slate-300'}`}
      >
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </label>
  );
}

function CheckboxField({
  checked,
  onChange,
  label,
  sublabel,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  sublabel?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-[22px] border border-slate-200 bg-white/80 px-4 py-4">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-900/20" />
      <div>
        <p className="text-sm font-semibold text-slate-950">{label}</p>
        {sublabel ? <p className="mt-1 text-sm leading-6 text-slate-600">{sublabel}</p> : null}
      </div>
    </label>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  sublabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  sublabel?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-800">{label}</label>
      {sublabel ? <p className="mb-2 text-xs leading-5 text-slate-500">{sublabel}</p> : null}
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5" />
    </div>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="text-sm font-semibold text-slate-800">{label}</label>
        {typeof maxLength === 'number' ? <span className="text-xs tabular-nums text-slate-500">{value.length}/{maxLength}</span> : null}
      </div>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} rows={4} className="w-full resize-none rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5" />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-800">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5">
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}

function formatDateTime(value?: string | number | Date | null) {
  if (!value) return 'Sin registro';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin registro';
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SummaryItem({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white/80 px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${muted ? 'text-slate-500' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

export default function ConfiguracionWhatsAppPage() {
  const { user } = useAuth();
  const orgId = user?.organization_id;
  const [config, setConfig] = useState<OrganizationWhatsAppConfig | null>(null);
  const [draft, setDraft] = useState<OrganizationWhatsAppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [webhookResult, setWebhookResult] = useState<{ status: string; details: string } | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const isAllowed = user?.rol === 'admin' || user?.rol === 'super_admin';

  const loadConfig = useCallback(async () => {
    if (!orgId) return;
    try {
      setLoading(true);
      const token = await user?.getIdToken?.();
      const response = await fetch(`/api/configuracion/whatsapp?organization_id=${encodeURIComponent(orgId)}`, {
        headers: { Authorization: `Bearer ${token ?? ''}` },
        cache: 'no-store',
      });
      const json = (await response.json()) as { success: boolean; data: OrganizationWhatsAppConfig; error?: string };
      if (!response.ok || !json.success) {
        setConfig(null);
        setDraft(DEFAULT_CONFIG);
        return;
      }
      setConfig(json.data);
      setDraft({ ...DEFAULT_CONFIG, ...json.data });
    } catch {
      setConfig(null);
      setDraft(DEFAULT_CONFIG);
    } finally {
      setLoading(false);
    }
  }, [orgId, user]);

  useEffect(() => {
    if (!orgId) return;
    void loadConfig();
  }, [orgId, loadConfig]);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timeout);
  }, [toast]);

  function patchDraft(partial: Partial<OrganizationWhatsAppConfig>) {
    setDraft(previous => ({ ...previous, ...partial }));
  }

  function formatConnectedAt(value: OrganizationWhatsAppConfig['connected_at']) {
    if (!value) return null;
    if (value instanceof Date || typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : formatDateTime(date);
    }
    if (typeof value === 'object') {
      const timestampLike = value as { seconds?: number; _seconds?: number };
      const seconds = timestampLike.seconds ?? timestampLike._seconds;
      if (typeof seconds === 'number') return formatDateTime(new Date(seconds * 1000));
    }
    return null;
  }

  async function handleSave() {
    if (!orgId) return;
    setSaving(true);
    try {
      const token = await user?.getIdToken?.();
      const response = await fetch(`/api/configuracion/whatsapp?organization_id=${encodeURIComponent(orgId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token ?? ''}`,
        },
        body: JSON.stringify(draft),
      });
      const json = (await response.json()) as { success: boolean; error?: string };
      if (!response.ok || !json.success) {
        setToast({ type: 'error', message: json.error ?? 'Error al guardar' });
        return;
      }
      setConfig(draft);
      setToast({ type: 'success', message: 'Configuracion guardada correctamente' });
    } catch {
      setToast({ type: 'error', message: 'Error de red al guardar' });
    } finally {
      setSaving(false);
    }
  }

  async function handleTestWebhook() {
    if (!orgId) return;
    setTestingWebhook(true);
    setWebhookResult(null);
    try {
      const token = await user?.getIdToken?.();
      const response = await fetch(`/api/configuracion/whatsapp/test-webhook?organization_id=${encodeURIComponent(orgId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token ?? ''}`,
        },
      });
      const json = (await response.json()) as { success: boolean; status?: string; details?: string; error?: string };
      if (!response.ok || !json.success) {
        setWebhookResult({ status: 'error', details: json.error ?? 'No se pudo verificar el webhook' });
        patchDraft({ webhook_status: 'error' });
        return;
      }
      setWebhookResult({ status: json.status ?? 'ok', details: json.details ?? 'Webhook verificado correctamente' });
      patchDraft({ webhook_status: 'verified', last_webhook_check: new Date().toISOString() });
    } catch {
      setWebhookResult({ status: 'error', details: 'Error de red al verificar webhook' });
    } finally {
      setTestingWebhook(false);
    }
  }

  const handleEmbeddedSignupSuccess = async (result: {
    phone_number_id: string;
    waba_id: string;
    access_token: string;
    display_phone_number?: string;
  }) => {
    const phoneNumberId = result.phone_number_id || window.prompt('Ingresa el Phone Number ID de tu cuenta de WhatsApp Business:') || '';
    if (!phoneNumberId) {
      setConnectError('Se necesita el Phone Number ID para completar la conexion.');
      return;
    }
    setConnecting(true);
    setConnectError(null);
    try {
      const token = await user?.getIdToken?.();
      const response = await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token ?? ''}`,
        },
        body: JSON.stringify({ ...result, phone_number_id: phoneNumberId }),
      });
      const data = (await response.json()) as { success: boolean; error?: string };
      if (!data.success) throw new Error(data.error ?? 'Error al conectar');
      await loadConfig();
    } catch (error) {
      setConnectError(error instanceof Error ? error.message : 'Error al conectar');
    } finally {
      setConnecting(false);
    }
  };

  if (loading) return <LoadingSkeleton />;

  if (!isAllowed) {
    return (
      <div className="ledger-shell min-h-screen">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <BaseCard className="rounded-[28px] border-rose-200 bg-rose-50 p-8 text-rose-800">Acceso denegado. Esta pagina es solo para administradores.</BaseCard>
        </div>
      </div>
    );
  }

  const hasPhoneId = Boolean(draft.whatsapp_phone_number_id);
  const isConnected = draft.connection_status === 'connected';
  const lastConnectedAt = formatConnectedAt(draft.connected_at);

  return (
    <div className="ledger-shell min-h-screen">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="ledger-panel rounded-[28px] p-6 md:p-8">
          <PageHeader
            className="rounded-[24px] bg-transparent px-0 py-0"
            title="Configuracion de WhatsApp"
            description="Canal operativo para notificaciones, inbox y automatizaciones. La interfaz toma el sistema visual del super-admin y concentra estado, conexion, webhook y operacion en un mismo workspace."
            breadcrumbs={[
              { label: 'Configuracion', href: '/configuracion' },
              { label: 'WhatsApp' },
            ]}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge enabled={draft.enabled} hasPhoneId={hasPhoneId} />
                <BaseButton
                  variant="outline"
                  className="border-slate-200 bg-white/80"
                  onClick={() => void handleTestWebhook()}
                  disabled={testingWebhook}
                >
                  {testingWebhook ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="mr-2 h-4 w-4" />
                  )}
                  Probar webhook
                </BaseButton>
                <BaseButton
                  className="ledger-primary-button border-0"
                  onClick={() => void handleSave()}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Guardar configuracion
                </BaseButton>
              </div>
            }
          />

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[22px] bg-emerald-100/80 px-4 py-3 text-sm text-emerald-900">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-800">canal</p>
              <p className="mt-1 font-semibold">{draft.enabled ? 'Activo y listo para operar' : 'Inactivo'}</p>
            </div>
            <div className="rounded-[22px] bg-slate-100/90 px-4 py-3 text-sm text-slate-900">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">proveedor</p>
              <p className="mt-1 font-semibold">{draft.provider === 'meta' ? 'Meta Graph API' : 'Twilio legacy'}</p>
            </div>
            <div className="rounded-[22px] bg-amber-100/80 px-4 py-3 text-sm text-amber-900">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-800">modo</p>
              <p className="mt-1 font-semibold">
                {draft.mode === 'notifications_only'
                  ? 'Solo notificaciones'
                  : draft.mode === 'inbox'
                    ? 'Inbox completo'
                    : 'Hibrido'}
              </p>
            </div>
            <div className="rounded-[22px] bg-sky-100/80 px-4 py-3 text-sm text-sky-900">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-800">numero</p>
              <p className="mt-1 font-semibold">{draft.outbound_number_label || draft.whatsapp_phone_number_id || 'Sin definir'}</p>
            </div>
          </div>
        </section>

        {toast ? (
          <BaseCard
            className={`rounded-[22px] border p-4 ${
              toast.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-rose-200 bg-rose-50 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-3 text-sm font-medium">
              {toast.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              {toast.message}
            </div>
          </BaseCard>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KPIStatCard
            label="ESTADO DEL CANAL"
            value={draft.enabled ? 'Activo' : 'Inactivo'}
            subtext={hasPhoneId ? 'Numero configurado' : 'Falta Phone Number ID'}
            icon={draft.enabled ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
            className="ledger-panel rounded-[24px] border-white/70 bg-white/88"
          />
          <KPIStatCard
            label="CONEXION"
            value={isConnected ? 'Conectado' : 'Pendiente'}
            subtext={lastConnectedAt ?? 'Sin registro'}
            icon={<Phone className="h-5 w-5" />}
            className="ledger-panel rounded-[24px] border-white/70 bg-white/88"
          />
          <KPIStatCard
            label="WEBHOOK"
            value={
              draft.webhook_status === 'verified'
                ? 'Verificado'
                : draft.webhook_status === 'error'
                  ? 'Con error'
                  : 'Pendiente'
            }
            subtext={formatDateTime(draft.last_webhook_check)}
            icon={<Link className="h-5 w-5" />}
            className="ledger-panel rounded-[24px] border-white/70 bg-white/88"
          />
          <KPIStatCard
            label="AUTOMATIZACION"
            value={draft.auto_reply_enabled ? 'Auto reply ON' : 'Manual'}
            subtext={draft.auto_link_client_by_phone || draft.auto_create_lead_if_unknown ? 'CRM enlazado' : 'Sin reglas CRM activas'}
            icon={<MessageSquare className="h-5 w-5" />}
            className="ledger-panel rounded-[24px] border-white/70 bg-white/88"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_360px]">
          <div className="space-y-6">
            <SectionCard
              title="Conexion WhatsApp Business"
              description="Centraliza alta de cuenta, revision de conexion y acceso a la guia operativa sin salir de configuracion."
              icon={<Phone className="h-5 w-5" />}
              headerExtra={<WebhookBadge status={draft.webhook_status} />}
            >
              {isConnected ? (
                <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        <p className="text-sm font-semibold text-emerald-900">
                          Cuenta conectada: {draft.outbound_number_label ?? draft.whatsapp_phone_number_id}
                        </p>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-emerald-800">
                        Metodo: Embedded Signup. Phone Number ID: {draft.whatsapp_phone_number_id || 'Sin definir'}.
                      </p>
                      {lastConnectedAt ? (
                        <p className="mt-1 text-sm leading-6 text-emerald-700">Conectada el {lastConnectedAt}.</p>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <BaseButton variant="outline" className="border-emerald-200 bg-white text-emerald-900" asChild>
                        <NextLink href="/documentacion/don-candido/whatsapp-conexion">
                          <BookOpen className="mr-2 h-4 w-4" />
                          Ver guia
                        </NextLink>
                      </BaseButton>
                      <BaseButton
                        variant="outline"
                        className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                        onClick={() => {
                          if (confirm('Desconectar esta cuenta? La organizacion dejara de recibir y enviar mensajes de WhatsApp.')) {
                            setDraft(previous => ({ ...previous, connection_status: 'not_connected', enabled: false }));
                          }
                        }}
                      >
                        Desconectar
                      </BaseButton>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 rounded-[24px] border border-slate-200 bg-[#f7f7f8] p-5">
                  <p className="text-sm leading-6 text-slate-700">
                    Conecta la cuenta de WhatsApp Business de la organizacion directamente con la plataforma. El flujo embebido toma menos de dos minutos y deja la cuenta lista para mensajes salientes, automatizaciones y monitoreo.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <EmbeddedSignupButton onSuccess={handleEmbeddedSignupSuccess} onError={error => setConnectError(error)} disabled={connecting} />
                    <BaseButton variant="outline" className="border-slate-200 bg-white" asChild>
                      <NextLink href="/documentacion/don-candido/whatsapp-conexion">
                        <BookOpen className="mr-2 h-4 w-4" />
                        Ver guia
                      </NextLink>
                    </BaseButton>
                  </div>
                  <p className="text-xs leading-5 text-slate-500">
                    Si preferis configuracion manual, completa Phone Number ID y Business Account ID en el bloque tecnico.
                  </p>
                  {connectError ? (
                    <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{connectError}</div>
                  ) : null}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Estado del canal"
              description="Define si el canal opera, que proveedor usa y bajo que modo funcional trabaja la organizacion."
              icon={draft.enabled ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
              headerExtra={<BaseBadge variant={draft.enabled ? 'success' : 'outline'}>{draft.enabled ? 'Activo' : 'Inactivo'}</BaseBadge>}
            >
              <div className="space-y-4">
                <ToggleSwitch
                  checked={draft.enabled}
                  onChange={value => patchDraft({ enabled: value })}
                  label="Canal activo"
                  sublabel="Habilita el envio y recepcion de mensajes de WhatsApp para toda la organizacion."
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <SelectField
                    label="Proveedor"
                    value={draft.provider}
                    onChange={value => patchDraft({ provider: value as OrganizationWhatsAppConfig['provider'] })}
                    options={[
                      { value: 'meta', label: 'Meta Graph API' },
                      { value: 'twilio', label: 'Twilio (legacy)' },
                    ]}
                  />
                  <SelectField
                    label="Modo de operacion"
                    value={draft.mode}
                    onChange={value => patchDraft({ mode: value as OrganizationWhatsAppConfig['mode'] })}
                    options={[
                      { value: 'notifications_only', label: 'Solo notificaciones' },
                      { value: 'inbox', label: 'Inbox completo' },
                      { value: 'hybrid', label: 'Hibrido' },
                    ]}
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Configuracion tecnica"
              description="Credenciales, Phone Number ID, estado del webhook y chequeo tecnico del canal."
              icon={<Settings className="h-5 w-5" />}
            >
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <InputField label="Phone Number ID" value={draft.whatsapp_phone_number_id ?? ''} onChange={value => patchDraft({ whatsapp_phone_number_id: value })} placeholder="Ej: 123456789012345" />
                  <InputField label="Business Account ID" value={draft.whatsapp_business_account_id ?? ''} onChange={value => patchDraft({ whatsapp_business_account_id: value })} placeholder="Opcional" />
                </div>
                <InputField label="Nombre del numero" value={draft.outbound_number_label ?? ''} onChange={value => patchDraft({ outbound_number_label: value })} placeholder="Ej: Don Candido - Soporte" />
                <div className="rounded-[24px] border border-slate-200 bg-[#f7f7f8] p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Estado del webhook</p>
                      <div className="mt-2 flex items-center gap-2">
                        <WebhookBadge status={draft.webhook_status} />
                        <span className="text-sm text-slate-600">Ultimo chequeo: {formatDateTime(draft.last_webhook_check)}</span>
                      </div>
                    </div>
                    <BaseButton variant="outline" className="border-slate-200 bg-white" onClick={() => void handleTestWebhook()} disabled={testingWebhook}>
                      {testingWebhook ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                      Verificar conexion
                    </BaseButton>
                  </div>
                  {webhookResult ? (
                    <div className={`mt-4 rounded-[18px] border px-4 py-3 text-sm ${webhookResult.status === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
                      {webhookResult.details}
                    </div>
                  ) : null}
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Operacion y mensajes"
              description="Configura destinatarios internos, responsable por defecto y respuestas automaticas."
              icon={<Users className="h-5 w-5" />}
            >
              <div className="space-y-4">
                <InputField label="Numero para alertas internas" value={draft.whatsapp_notificaciones_dealer ?? ''} onChange={value => patchDraft({ whatsapp_notificaciones_dealer: value })} placeholder="+549..." sublabel="Numero del operario o admin que recibe alertas de nuevas solicitudes." />
                <InputField label="Responsable por defecto" value={draft.default_assigned_user_id ?? ''} onChange={value => patchDraft({ default_assigned_user_id: value })} placeholder="UID del usuario responsable" />
                <ToggleSwitch checked={draft.auto_reply_enabled ?? false} onChange={value => patchDraft({ auto_reply_enabled: value })} label="Respuesta automatica activada" sublabel="Envia mensajes automaticos a contactos entrantes cuando corresponde." />
                {draft.auto_reply_enabled ? (
                  <div className="grid gap-4">
                    <TextareaField label="Mensaje de bienvenida" value={draft.welcome_message ?? ''} onChange={value => patchDraft({ welcome_message: value })} placeholder="Hola, soy Don Candido. En que puedo ayudarte?" maxLength={500} />
                    <TextareaField label="Mensaje fuera de horario" value={draft.out_of_hours_message ?? ''} onChange={value => patchDraft({ out_of_hours_message: value })} placeholder="Estamos fuera de horario. Te responderemos a la brevedad." maxLength={500} />
                  </div>
                ) : null}
              </div>
            </SectionCard>

            <SectionCard
              title="Integracion CRM"
              description="Reglas de vinculacion automatica entre el canal y la capa comercial."
              icon={<Link className="h-5 w-5" />}
            >
              <div className="space-y-4">
                <CheckboxField checked={draft.auto_link_client_by_phone ?? false} onChange={value => patchDraft({ auto_link_client_by_phone: value })} label="Vincular automaticamente por telefono" sublabel="Si el numero coincide con un cliente del CRM, se vincula automaticamente." />
                <CheckboxField checked={draft.auto_create_lead_if_unknown ?? false} onChange={value => patchDraft({ auto_create_lead_if_unknown: value })} label="Crear lead si no existe" sublabel="Si no hay cliente con ese numero, crear un lead nuevo automaticamente." />
              </div>
            </SectionCard>
          </div>

          <div className="space-y-6">
            <BaseCard className="ledger-panel rounded-[28px] border-white/70 bg-white/88 p-6 shadow-[0_18px_44px_rgba(25,28,29,0.08)]">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Workspace</p>
              <h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">Resumen operativo del canal</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Esta columna concentra las decisiones rapidas que normalmente quedan dispersas entre varios formularios.
              </p>
              <div className="mt-5 space-y-3">
                <SummaryItem label="Conexion" value={isConnected ? 'Embedded Signup conectado' : 'Cuenta aun no enlazada'} muted={!isConnected} />
                <SummaryItem label="Webhook" value={draft.webhook_status === 'verified' ? 'Verificado y operativo' : draft.webhook_status === 'error' ? 'Revisar conexion tecnica' : 'Pendiente de verificacion'} muted={draft.webhook_status !== 'verified'} />
                <SummaryItem label="Numero visible" value={draft.outbound_number_label || draft.whatsapp_phone_number_id || 'Sin numero configurado'} muted={!hasPhoneId} />
                <SummaryItem label="Automatizacion" value={draft.auto_reply_enabled ? 'Respuestas automaticas activas' : 'Operacion manual'} muted={!draft.auto_reply_enabled} />
              </div>
            </BaseCard>

            <BaseCard className="ledger-panel rounded-[28px] border-white/70 bg-white/88 p-6 shadow-[0_18px_44px_rgba(25,28,29,0.08)]">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Flujo recomendado</p>
              <div className="mt-4 space-y-4">
                {[
                  'Conectar la cuenta con Embedded Signup o cargar el Phone Number ID.',
                  'Verificar webhook y guardar la configuracion tecnica.',
                  'Definir modo operativo, responsable y reglas CRM antes de activar el canal.',
                ].map((step, index) => (
                  <div key={step} className="rounded-[22px] border border-slate-200 bg-white/80 px-4 py-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">{index + 1}</div>
                      <p className="text-sm leading-6 text-slate-700">{step}</p>
                    </div>
                  </div>
                ))}
              </div>
            </BaseCard>

            <BaseCard className="ledger-panel rounded-[28px] border-white/70 bg-white/88 p-6 shadow-[0_18px_44px_rgba(25,28,29,0.08)]">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Documentacion</p>
              <h3 className="mt-3 text-lg font-semibold text-slate-950">Guia de conexion y soporte</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Usa la guia para pairing inicial, credenciales Meta y diagnostico de errores comunes del webhook.
              </p>
              <BaseButton variant="outline" className="mt-5 w-full border-slate-200 bg-white" asChild>
                <NextLink href="/documentacion/don-candido/whatsapp-conexion">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Abrir documentacion
                </NextLink>
              </BaseButton>
            </BaseCard>
          </div>
        </section>

        <div className="sticky bottom-4 z-20">
          <div className="ledger-panel mx-auto flex max-w-7xl flex-col gap-3 rounded-[24px] border border-white/70 bg-white/88 px-5 py-4 shadow-[0_18px_44px_rgba(25,28,29,0.1)] md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-600">
              {config ? 'Hay una configuracion previa cargada. Guarda para aplicar cambios nuevos.' : 'Todavia no hay configuracion guardada para esta organizacion.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <BaseButton variant="outline" className="border-slate-200 bg-white" onClick={() => void loadConfig()}>
                Recargar
              </BaseButton>
              <BaseButton className="ledger-primary-button border-0" onClick={() => void handleSave()} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Guardar configuracion
              </BaseButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
