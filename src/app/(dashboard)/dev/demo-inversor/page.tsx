'use client';

import { useState } from 'react';

// ─── Escenarios de demo ───────────────────────────────────────────────────────

interface Scenario {
  id: string;
  tag: string;
  title: string;
  description: string;
  iaContext: string;          // Lo que "dijo" Don Cándido
  proposalTitle: string;      // Título de la propuesta
  proposalItems: { label: string; value: string }[];
  apiPayload: {
    sessionId: string;
    action: {
      type: string;
      entity: string;
      entityId?: string;
      data: Record<string, unknown>;
      reason: string;
    };
  };
}

const SCENARIOS: Scenario[] = [
  {
    id: 'nc',
    tag: 'No Conformidad',
    title: 'IA detecta incumplimiento en registros',
    description: 'El asistente analiza el historial de auditoría y detecta un desvío no registrado.',
    iaContext:
      'Revisando el historial de la auditoría interna del 22/03, detecté que el operario del turno noche no completó los registros de control de temperatura en el área de Almacén durante 3 turnos consecutivos. Esto incumple la cláusula 7.5.3 de ISO 9001. Puedo crear la No Conformidad ahora con todos los datos completos.',
    proposalTitle: 'Crear No Conformidad — NC-2026-047',
    proposalItems: [
      { label: 'Descripción', value: 'Falta de registros de temperatura — Turno noche, Almacén' },
      { label: 'Cláusula ISO', value: '7.5.3 — Control de información documentada' },
      { label: 'Tipo', value: 'No conformidad menor' },
      { label: 'Área', value: 'Almacén / Logística' },
      { label: 'Responsable', value: 'Luis Torres' },
      { label: 'Fecha límite', value: '15/04/2026' },
    ],
    apiPayload: {
      sessionId: 'demo-inversor-session',
      action: {
        type: 'CREATE',
        entity: 'non-conformity',
        data: {
          descripcion: 'Falta de registros de temperatura — Turno noche, Almacén',
          clausula_iso: '7.5.3',
          tipo: 'no_conformidad_menor',
          area: 'Almacen',
          responsable: 'Luis Torres',
          fecha_limite: '2026-04-15',
          origen: 'ia_directaction_demo',
        },
        reason: 'Detectado por análisis de auditoría interna 22/03/2026',
      },
    },
  },
  {
    id: 'assign',
    tag: 'Hallazgo',
    title: 'Asignar hallazgo sin responsable',
    description: 'La IA detecta hallazgos sin dueño y sugiere la asignación correcta.',
    iaContext:
      'Encontré 3 hallazgos abiertos de la auditoría del 15/03 que no tienen responsable asignado. El hallazgo HAL-031 "Falta de calibración en equipos de medición" corresponde al área de Calidad. Basándome en la estructura organizacional, sugiero asignárselo a Ana Martínez, quien es la responsable de esa área.',
    proposalTitle: 'Asignar HAL-031 a responsable',
    proposalItems: [
      { label: 'Hallazgo', value: 'HAL-031 — Falta de calibración en equipos de medición' },
      { label: 'Auditoría origen', value: 'Auditoría interna 15/03/2026' },
      { label: 'Asignar a', value: 'Ana Martínez — Área Calidad' },
      { label: 'Plazo para respuesta', value: '30/04/2026' },
    ],
    apiPayload: {
      sessionId: 'demo-inversor-session',
      action: {
        type: 'CREATE',
        entity: 'finding',
        data: {
          codigo: 'HAL-031',
          descripcion: 'Falta de calibración en equipos de medición',
          asignado_a: 'ana.martinez@empresa.com',
          asignado_nombre: 'Ana Martínez',
          auditoria_origen: 'Auditoría interna 15/03/2026',
          fecha_limite: '2026-04-30',
          origen: 'ia_directaction_demo',
        },
        reason: 'Hallazgo sin responsable detectado por análisis post-auditoría',
      },
    },
  },
  {
    id: 'close',
    tag: 'Acción Correctiva',
    title: 'Cerrar acción correctiva cumplida',
    description: 'Verificó que la capacitación fue completada y propone cerrar la acción.',
    iaContext:
      'La capacitación "ISO 9001:2015 para el equipo de producción" fue completada el 25/03/2026 con asistencia del 100% (12 participantes). La acción correctiva AC-2026-012 que originó esta capacitación puede cerrarse formalmente. Tengo la evidencia de cumplimiento disponible.',
    proposalTitle: 'Cerrar Acción Correctiva AC-2026-012',
    proposalItems: [
      { label: 'Acción', value: 'AC-2026-012 — Capacitación ISO equipo de producción' },
      { label: 'Evidencia', value: 'Capacitación completada 25/03/2026 — 12 participantes' },
      { label: 'Cumplimiento', value: '100% de asistencia verificada' },
      { label: 'Nuevo estado', value: 'Cerrada / Completada' },
    ],
    apiPayload: {
      sessionId: 'demo-inversor-session',
      action: {
        type: 'CREATE',
        entity: 'action',
        data: {
          codigo: 'AC-2026-012',
          titulo: 'Capacitación ISO 9001 equipo de producción',
          estado: 'completada',
          evidencia: 'Capacitación completada 25/03/2026 — 12 participantes',
          cumplimiento_porcentaje: 100,
          fecha_cierre: '2026-03-25',
          origen: 'ia_directaction_demo',
        },
        reason: 'Evidencia de cumplimiento verificada automáticamente',
      },
    },
  },
];

// ─── Tipos UI ─────────────────────────────────────────────────────────────────

type DemoStep = 'select' | 'proposal' | 'confirming' | 'done';

interface AuditEntry {
  scenario: string;
  tag: string;
  actionId: string;
  outcome: 'confirmed' | 'cancelled';
  timestamp: string;
}

// ─── Componentes menores ──────────────────────────────────────────────────────

function TagBadge({ text, color = 'indigo' }: { text: string; color?: string }) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    green: 'bg-green-100 text-green-700 border-green-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
    red: 'bg-red-100 text-red-700 border-red-200',
    gray: 'bg-gray-100 text-gray-600 border-gray-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${colors[color] ?? colors.indigo}`}>
      {text}
    </span>
  );
}

function TimelineStep({
  number,
  label,
  active,
  done,
}: {
  number: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className={`flex flex-col items-center gap-1 transition-all duration-500 ${active || done ? 'opacity-100' : 'opacity-30'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors duration-500 ${
        done ? 'bg-green-500 text-white' : active ? 'bg-indigo-600 text-white ring-4 ring-indigo-200' : 'bg-gray-200 text-gray-500'
      }`}>
        {done ? '✓' : number}
      </div>
      <span className={`text-xs font-medium text-center leading-tight max-w-16 ${active ? 'text-indigo-700' : done ? 'text-green-700' : 'text-gray-400'}`}>
        {label}
      </span>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function DemoInversor() {
  const [step, setStep] = useState<DemoStep>('select');
  const [selected, setSelected] = useState<Scenario | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionResult, setActionResult] = useState<{ success: boolean; message: string; actionId: string } | null>(null);
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);

  const timelineStep = step === 'select' ? 0 : step === 'proposal' ? 1 : step === 'confirming' ? 2 : 3;

  // ── Seleccionar escenario ─────────────────────────────────────────────────

  const handleSelectScenario = (scenario: Scenario) => {
    setSelected(scenario);
    setApiError(null);
    setPendingActionId(null);
    setActionResult(null);
    setStep('proposal');
  };

  // ── Enviar propuesta al servicio ──────────────────────────────────────────

  const handleSendProposal = async () => {
    if (!selected) return;
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch('/api/direct-actions/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selected.apiPayload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setPendingActionId(data.actionId as string);
      setStep('confirming');
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Error al enviar propuesta');
    } finally {
      setLoading(false);
    }
  };

  // ── Confirmar / Cancelar ──────────────────────────────────────────────────

  const handleDecision = async (confirmed: boolean) => {
    if (!pendingActionId || !selected) return;
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch('/api/direct-actions/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId: pendingActionId, confirmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);

      const outcome = confirmed ? 'confirmed' : 'cancelled';
      setActionResult({ success: confirmed, message: data.message ?? (confirmed ? 'Operación registrada' : 'Cancelado'), actionId: pendingActionId });
      setAuditTrail(prev => [
        {
          scenario: selected.title,
          tag: selected.tag,
          actionId: pendingActionId,
          outcome,
          timestamp: new Date().toLocaleTimeString('es-AR'),
        },
        ...prev,
      ]);
      setStep('done');
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Error al procesar decisión');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('select');
    setSelected(null);
    setApiError(null);
    setPendingActionId(null);
    setActionResult(null);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow">
              DC
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-lg leading-none">Don Cándido IA</h1>
              <p className="text-xs text-gray-500 mt-0.5">Gestión operativa inteligente — Demo comercial</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TagBadge text="Demo en vivo" color="green" />
            <TagBadge text="ISO 9001" color="indigo" />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Columna principal (2/3) ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Claim */}
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-6 text-white shadow-lg">
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-200 mb-2">Diferencial de producto</p>
              <h2 className="text-xl font-bold leading-snug">
                La IA no solo responde — propone, pide aprobación y ejecuta con trazabilidad.
              </h2>
              <p className="text-sm text-indigo-200 mt-2">
                Menos formularios. Menos clicks. Más adopción. Evidencia auditable de cada acción.
              </p>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-2xl border border-gray-200 px-6 py-4 shadow-sm">
              <div className="flex items-start justify-between">
                {[
                  { label: 'IA detecta', n: 1 },
                  { label: 'Prepara operación', n: 2 },
                  { label: 'Usuario aprueba', n: 3 },
                  { label: 'Sistema registra', n: 4 },
                ].map(({ label, n }, i, arr) => (
                  <div key={n} className="flex items-center flex-1">
                    <TimelineStep
                      number={n}
                      label={label}
                      active={timelineStep === i}
                      done={timelineStep > i}
                    />
                    {i < arr.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-1 mt-[-18px] transition-colors duration-700 ${timelineStep > i ? 'bg-green-400' : timelineStep === i ? 'bg-indigo-300' : 'bg-gray-200'}`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ── STEP: Selección de escenario ── */}
            {step === 'select' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-700 text-sm">
                  Elegí un escenario de negocio para ver el flujo completo:
                </h3>
                {SCENARIOS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => handleSelectScenario(s)}
                    className="w-full text-left bg-white border border-gray-200 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-md transition-all duration-200 group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-lg flex-shrink-0 group-hover:bg-indigo-100 transition-colors">
                        {s.id === 'nc' ? '⚠️' : s.id === 'assign' ? '👤' : '✅'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <TagBadge text={s.tag} />
                        </div>
                        <h4 className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">
                          {s.title}
                        </h4>
                        <p className="text-sm text-gray-500 mt-0.5">{s.description}</p>
                      </div>
                      <span className="text-gray-300 group-hover:text-indigo-400 text-xl flex-shrink-0">→</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* ── STEP: Propuesta de IA ── */}
            {step === 'proposal' && selected && (
              <div className="space-y-4">
                {/* Chat bubble */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      DC
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-indigo-700 mb-1">Don Cándido</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{selected.iaContext}</p>
                    </div>
                  </div>
                </div>

                {/* Propuesta de acción */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-amber-500">⚡</span>
                    <span className="font-semibold text-amber-900 text-sm">Acción propuesta</span>
                    <TagBadge text={selected.tag} color="amber" />
                  </div>

                  <h4 className="font-bold text-gray-900 mb-4">{selected.proposalTitle}</h4>

                  <div className="space-y-2 mb-5">
                    {selected.proposalItems.map(item => (
                      <div key={item.label} className="flex gap-3 text-sm">
                        <span className="text-gray-500 min-w-32 flex-shrink-0">{item.label}</span>
                        <span className="font-medium text-gray-900">{item.value}</span>
                      </div>
                    ))}
                  </div>

                  {apiError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      {apiError}
                    </div>
                  )}

                  <button
                    onClick={handleSendProposal}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Preparando operación...
                      </>
                    ) : (
                      'Ver propuesta completa →'
                    )}
                  </button>
                </div>

                <button
                  onClick={handleReset}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ← Elegir otro escenario
                </button>
              </div>
            )}

            {/* ── STEP: Confirmación ── */}
            {step === 'confirming' && selected && (
              <div className="space-y-4">
                {/* Tarjeta de confirmación — diseño comercial */}
                <div className="bg-white border-2 border-indigo-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                      <span className="text-xl">🤖</span>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Don Cándido solicita tu aprobación</p>
                      <p className="text-xs text-gray-500">La operación está lista. Un click y se registra.</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 mb-5">
                    <h4 className="font-bold text-gray-900 mb-3">{selected.proposalTitle}</h4>
                    <div className="space-y-2">
                      {selected.proposalItems.map(item => (
                        <div key={item.label} className="flex gap-3 text-sm">
                          <span className="text-gray-500 min-w-32 flex-shrink-0">{item.label}</span>
                          <span className="font-medium text-gray-900">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 mb-5">
                    Si confirmás, esta operación queda registrada en el SGC con trazabilidad completa. No se puede deshacer automáticamente, pero queda en el historial de auditoría.
                  </p>

                  {apiError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      {apiError}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleDecision(true)}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm text-sm"
                    >
                      {loading ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>✅ Confirmar y ejecutar</>
                      )}
                    </button>
                    <button
                      onClick={() => handleDecision(false)}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 disabled:opacity-50 transition-colors text-sm"
                    >
                      ❌ Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP: Resultado ── */}
            {step === 'done' && actionResult && selected && (
              <div className="space-y-4">
                {actionResult.success ? (
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-2xl flex-shrink-0">
                        ✅
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-green-900 text-lg">Operación ejecutada</p>
                        <p className="text-sm text-green-700 mt-1">{actionResult.message}</p>

                        {/* Comprobante */}
                        <div className="mt-4 bg-white rounded-xl border border-green-200 p-4 space-y-2">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Comprobante de ejecución</p>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                            <div>
                              <span className="text-gray-500 text-xs">Operación</span>
                              <p className="font-medium text-gray-900">{selected.proposalTitle}</p>
                            </div>
                            <div>
                              <span className="text-gray-500 text-xs">Estado</span>
                              <p className="font-medium text-green-700">Ejecutada</p>
                            </div>
                            <div>
                              <span className="text-gray-500 text-xs">Hora</span>
                              <p className="font-medium text-gray-900">{new Date().toLocaleString('es-AR')}</p>
                            </div>
                            <div>
                              <span className="text-gray-500 text-xs">Audit trail</span>
                              <p className="font-medium text-gray-900">ISO 7.5.3 ✓</p>
                            </div>
                          </div>
                          <div className="pt-2 border-t border-gray-100">
                            <span className="text-gray-400 text-xs">ID de operación: </span>
                            <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-mono">
                              {actionResult.actionId.substring(0, 18)}...
                            </code>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">❌</span>
                      <div>
                        <p className="font-semibold text-gray-800">Operación cancelada</p>
                        <p className="text-sm text-gray-500 mt-0.5">La acción no fue ejecutada. Queda registrado el rechazo.</p>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleReset}
                  className="w-full px-5 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors text-sm shadow-sm"
                >
                  ← Probar otro escenario
                </button>
              </div>
            )}
          </div>

          {/* ── Columna lateral (1/3) ── */}
          <div className="space-y-4">

            {/* Métricas de la demo */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Esta sesión</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-indigo-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-indigo-700">{auditTrail.filter(a => a.outcome === 'confirmed').length}</p>
                  <p className="text-xs text-indigo-500 mt-0.5">Ejecutadas</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-gray-500">{auditTrail.filter(a => a.outcome === 'cancelled').length}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Canceladas</p>
                </div>
              </div>
            </div>

            {/* Audit trail en vivo */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Registro de auditoría</p>
                {auditTrail.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" title="En vivo" />
                )}
              </div>

              {auditTrail.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  <div className="text-3xl mb-2">📋</div>
                  <p className="text-xs">Las acciones confirmadas aparecen aquí en tiempo real</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {auditTrail.map((entry, i) => (
                    <div key={i} className={`rounded-xl p-3 border transition-all ${
                      entry.outcome === 'confirmed'
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-start gap-2">
                        <span className="text-sm flex-shrink-0">{entry.outcome === 'confirmed' ? '✅' : '❌'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <TagBadge text={entry.tag} color={entry.outcome === 'confirmed' ? 'green' : 'gray'} />
                          </div>
                          <p className="text-xs text-gray-700 font-medium truncate">{entry.scenario}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{entry.timestamp}</p>
                          <code className="text-xs text-gray-300 font-mono">{entry.actionId.substring(0, 12)}...</code>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Mensaje comercial */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">¿Por qué importa?</p>
              <ul className="space-y-2">
                {[
                  'Reduce el trabajo administrativo hasta un 60%',
                  'Aumenta la adopción porque baja la fricción',
                  'Trazabilidad completa para auditorías ISO',
                  'Cada acción de IA requiere aprobación humana',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-indigo-800">
                    <span className="text-indigo-400 flex-shrink-0 mt-0.5">›</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
