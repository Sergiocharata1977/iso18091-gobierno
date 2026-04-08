'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Send,
  RotateCcw,
  Bot,
  User,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
  ShieldOff,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type {
  WhatsAppSimulatePayload,
  WhatsAppSimulateResult,
} from '@/types/whatsapp';

// ─── Types ────────────────────────────────────────────────────────────────────

type HistoryRole = 'client' | 'ai';

interface HistoryEntry {
  role: HistoryRole;
  text: string;
  timestamp: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LoadingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      <span className="block h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
      <span className="block h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:120ms]" />
      <span className="block h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:240ms]" />
    </div>
  );
}

interface BubbleProps {
  entry: HistoryEntry;
}

function MessageBubble({ entry }: BubbleProps) {
  const isClient = entry.role === 'client';
  return (
    <div className={`flex w-full gap-2 ${isClient ? 'justify-start' : 'justify-end'}`}>
      {isClient && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-700 text-slate-300">
          <User className="h-3.5 w-3.5" />
        </div>
      )}
      <div
        className={`max-w-[72%] rounded-2xl border border-dashed px-3.5 py-2.5 text-sm leading-relaxed ${
          isClient
            ? 'rounded-tl-sm border-slate-600 bg-slate-700 text-slate-100'
            : 'rounded-tr-sm border-violet-600/60 bg-violet-700/80 text-violet-100'
        }`}
      >
        {!isClient && (
          <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-violet-300">
            <Bot className="h-3 w-3" />
            Don Cándido
          </p>
        )}
        <p className="whitespace-pre-wrap break-words">{entry.text}</p>
        <p
          className={`mt-1.5 text-right text-[10px] ${
            isClient ? 'text-slate-500' : 'text-violet-400/70'
          }`}
        >
          {formatTime(entry.timestamp)}
        </p>
      </div>
      {!isClient && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-700 text-violet-200">
          <Bot className="h-3.5 w-3.5" />
        </div>
      )}
    </div>
  );
}

interface CopyButtonProps {
  text: string;
}

function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <button
      onClick={handleCopy}
      className="ml-1 rounded p-0.5 text-slate-500 transition hover:text-slate-300"
      title="Copiar"
      type="button"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

interface ToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}

function Toggle({ checked, onChange, label, description }: ToggleProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-slate-200">{label}</p>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-emerald-600' : 'bg-slate-700'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}

// ─── Access Denied ────────────────────────────────────────────────────────────

function AccessDenied() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-900/30 text-rose-400">
        <ShieldOff className="h-8 w-8" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold text-slate-100">Acceso denegado</h2>
        <p className="mt-1 text-sm text-slate-400">
          Esta herramienta solo está disponible para super administradores.
        </p>
      </div>
    </div>
  );
}

// ─── Quick message examples ───────────────────────────────────────────────────

const QUICK_MESSAGES = [
  'Hola, necesito ayuda',
  '¿Cuándo llega mi pedido?',
  'Quiero hacer una reclamación',
  'Información sobre repuestos',
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function WhatsAppSimulatorPage() {
  const { user, loading: authLoading } = useAuth();

  // ── Form state ──
  const [orgId, setOrgId] = useState('');
  const [fromPhone, setFromPhone] = useState('+5491155555555');
  const [fromName, setFromName] = useState('Cliente Test');
  const [message, setMessage] = useState('');
  const [simulateAI, setSimulateAI] = useState(true);
  const [linkClient, setLinkClient] = useState(true);

  // ── UI state ──
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<WhatsAppSimulateResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ── Scroll ref for chat area ──
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Pre-fill orgId once user loads
  useEffect(() => {
    if (user?.organization_id) {
      setOrgId(user.organization_id);
    }
  }, [user?.organization_id]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // ── Auth guard ──
  if (authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  if (user?.rol !== 'super_admin') {
    return <AccessDenied />;
  }

  // ── Handlers ──
  async function handleSend() {
    if (!message.trim() || sending) return;

    const trimmed = message.trim();
    setSending(true);
    setError(null);

    // Optimistically add client message to history
    const clientEntry: HistoryEntry = {
      role: 'client',
      text: trimmed,
      timestamp: new Date(),
    };

    setHistory(prev => [...prev, clientEntry]);
    setMessage('');

    try {
      const token = await user!.getIdToken();

      const payload: WhatsAppSimulatePayload = {
        org_id: orgId,
        from_phone: fromPhone,
        from_name: fromName || undefined,
        message: trimmed,
        simulate_ai_reply: simulateAI,
        link_client_by_phone: linkClient,
      };

      const res = await fetch('/api/dev/whatsapp/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as {
        success: boolean;
        data?: WhatsAppSimulateResult;
        error?: string;
      };

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? `Error ${res.status}`);
      }

      const simResult = json.data!;
      setResult(simResult);

      // Add AI reply to history if present
      if (simResult.ai_reply) {
        const aiEntry: HistoryEntry = {
          role: 'ai',
          text: simResult.ai_reply,
          timestamp: new Date(),
        };
        setHistory(prev => [...prev, aiEntry]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
      // Remove the optimistically added message on error
      setHistory(prev => prev.slice(0, -1));
    } finally {
      setSending(false);
    }
  }

  function handleReset() {
    setHistory([]);
    setResult(null);
    setError(null);
    setMessage('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && message.trim() && !sending) {
      void handleSend();
    }
  }

  // ── Render ──
  return (
    <div className="px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">

        {/* ── Page Header ── */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-900/30 text-cyan-400">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold text-slate-100">Simulador WhatsApp</h1>
                <span className="inline-flex items-center rounded-full border border-cyan-700/50 bg-cyan-900/20 px-2.5 py-0.5 text-xs font-semibold text-cyan-300">
                  SIMULACION
                </span>
              </div>
              <p className="mt-0.5 text-sm text-slate-400">Solo accesible en super-admin</p>
            </div>
          </div>
          {result && (
            <Link
              href={`/crm/whatsapp/${result.conversation_id}`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:text-white"
            >
              <MessageSquare className="h-4 w-4" />
              Ver en inbox
            </Link>
          )}
        </div>

        {/* ── Warning banner ── */}
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-700/50 bg-amber-900/20 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p className="text-sm text-amber-200">
            Los mensajes simulados <strong>no se envian a WhatsApp real</strong>. Usados
            unicamente para testing del pipeline IA.
          </p>
        </div>

        {/* ── Two-column layout ── */}
        <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">

          {/* ════════════════════════════════════════════════ LEFT COLUMN ══ */}
          <div className="flex flex-col gap-4">

            {/* Card: Configuracion del cliente */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-500">
                Configuracion del cliente simulado
              </h2>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Organizacion (org_id)
                  </label>
                  <input
                    type="text"
                    value={orgId}
                    onChange={e => setOrgId(e.target.value)}
                    placeholder="org_id de la organizacion"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none transition focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600/40"
                  />
                  <p className="mt-1 text-xs text-slate-600">
                    Pre-cargado con tu org. Super-admin puede probar otras.
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Numero simulado (E.164)
                  </label>
                  <input
                    type="text"
                    value={fromPhone}
                    onChange={e => setFromPhone(e.target.value)}
                    placeholder="+5491155555555"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none transition focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600/40"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Nombre del contacto
                  </label>
                  <input
                    type="text"
                    value={fromName}
                    onChange={e => setFromName(e.target.value)}
                    placeholder="Cliente Test"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none transition focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600/40"
                  />
                </div>
              </div>
            </div>

            {/* Card: Mensaje */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-500">
                Mensaje
              </h2>
              <textarea
                rows={6}
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe el mensaje que el cliente envia..."
                className="w-full resize-none rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600/40"
              />
              <p className="mt-1 text-right text-xs text-slate-600">Ctrl+Enter para enviar</p>

              {/* Quick examples */}
              <div className="mt-3 flex flex-wrap gap-2">
                {QUICK_MESSAGES.map(q => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setMessage(q)}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-400 transition hover:border-slate-600 hover:text-slate-200"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Card: Opciones */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-500">
                Opciones
              </h2>
              <div className="flex flex-col gap-4">
                <Toggle
                  checked={simulateAI}
                  onChange={setSimulateAI}
                  label="Activar respuesta de Don Candido IA"
                  description="simulate_ai_reply — genera respuesta automatica con el mismo pipeline del webhook"
                />
                <Toggle
                  checked={linkClient}
                  onChange={setLinkClient}
                  label="Vincular con cliente CRM por telefono"
                  description="link_client_by_phone — si existe cliente con ese telefono, se vincula automaticamente"
                />
              </div>
            </div>

            {/* Error display */}
            {error && (
              <div className="flex items-start gap-2 rounded-2xl border border-rose-800/60 bg-rose-950/40 px-4 py-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                <p className="text-sm text-rose-200">{error}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={!message.trim() || sending}
                onClick={() => void handleSend()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Enviar como cliente
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-400 transition hover:text-slate-200"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reiniciar conversacion
              </button>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════ RIGHT COLUMN ══ */}
          <div className="flex flex-col gap-4">

            {/* Chat header */}
            <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/60 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-200">Conversacion simulada</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Los mensajes no salen de esta plataforma
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-400">
                  {history.length} {history.length === 1 ? 'mensaje' : 'mensajes'}
                </span>
                {result?.client_linked && result.client_id && (
                  <span className="rounded-full border border-emerald-700/50 bg-emerald-900/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                    Cliente vinculado
                  </span>
                )}
              </div>
            </div>

            {/* Chat area */}
            <div className="flex min-h-[360px] flex-1 flex-col rounded-2xl border border-slate-800 bg-slate-900/30">
              {history.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                  <MessageSquare className="h-10 w-10 text-slate-700" />
                  <p className="text-sm text-slate-600">
                    Envia el primer mensaje para comenzar la simulacion
                  </p>
                </div>
              ) : (
                <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
                  {history.map((entry, idx) => (
                    <MessageBubble key={idx} entry={entry} />
                  ))}
                  {sending && (
                    <div className="flex justify-end">
                      <div className="rounded-2xl rounded-tr-sm border border-dashed border-violet-600/40 bg-violet-700/50 px-4 py-2">
                        <LoadingDots />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            {/* Result info panel */}
            {result && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-300">Informacion del pipeline</h3>
                  <span className="rounded-full border border-emerald-700/50 bg-emerald-900/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                    Pipeline real
                  </span>
                </div>

                <div className="flex flex-col gap-2.5 text-xs">
                  {/* conversation_id */}
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-800/60 px-3 py-2">
                    <span className="shrink-0 text-slate-500">conversation_id</span>
                    <div className="flex min-w-0 items-center gap-1">
                      <span className="truncate font-mono text-slate-300">
                        {result.conversation_id}
                      </span>
                      <CopyButton text={result.conversation_id} />
                    </div>
                  </div>

                  {/* inbound_message_id */}
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-800/60 px-3 py-2">
                    <span className="shrink-0 text-slate-500">inbound_msg_id</span>
                    <div className="flex min-w-0 items-center gap-1">
                      <span className="truncate font-mono text-slate-300">
                        {result.inbound_message_id}
                      </span>
                      <CopyButton text={result.inbound_message_id} />
                    </div>
                  </div>

                  {/* client_id (if linked) */}
                  {result.client_linked && result.client_id && (
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-800/40 bg-emerald-900/20 px-3 py-2">
                      <span className="shrink-0 text-emerald-600">client_id</span>
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate font-mono text-emerald-300">
                          {result.client_id}
                        </span>
                        <Link
                          href={`/crm/clientes/${result.client_id}`}
                          className="shrink-0 rounded border border-emerald-700/50 bg-emerald-900/30 px-1.5 py-0.5 text-[10px] text-emerald-300 transition hover:bg-emerald-800/50"
                        >
                          Ver
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* ai_reply preview */}
                  {result.ai_reply && (
                    <div className="rounded-xl border border-violet-800/40 bg-violet-900/20 px-3 py-2">
                      <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-violet-400">
                        <Bot className="h-3 w-3" />
                        ai_reply
                      </p>
                      <p className="line-clamp-3 text-violet-200">{result.ai_reply}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
          {/* ══════════════════════════════════════════════════════════════ */}

        </div>
      </div>
    </div>
  );
}
