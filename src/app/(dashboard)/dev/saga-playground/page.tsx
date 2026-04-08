'use client';

import { useState, useCallback } from 'react';
import { SagaRun, SagaStep } from '@/types/sagas';

// ─── Tipos locales ────────────────────────────────────────────────────────────

type SimulateAction = 'complete' | 'fail' | 'pending_approval' | 'approve' | 'reject';

type ScenarioKey = 'linear' | 'parallel' | 'human_loop' | 'compensation';

const SCENARIO_INFO: Record<ScenarioKey, { label: string; description: string; color: string }> = {
  linear: {
    label: 'Lineal — 3 pasos secuenciales',
    description: 'Cada paso espera al anterior. Ideal para ver dependencies simples.',
    color: 'bg-blue-50 border-blue-200',
  },
  parallel: {
    label: 'Paralelo (DAG) — A+B corren juntos, C espera ambos',
    description: 'Dos pasos independientes en paralelo, luego uno que consolida.',
    color: 'bg-purple-50 border-purple-200',
  },
  human_loop: {
    label: 'Human-in-the-loop — pausa para aprobación',
    description: 'El paso 2 requiere que apruebes manualmente antes de continuar.',
    color: 'bg-amber-50 border-amber-200',
  },
  compensation: {
    label: 'Compensación — fallo en paso 3 deshace 1 y 2',
    description: 'Prueba el mecanismo de rollback: falla el último paso y observá qué compensa.',
    color: 'bg-red-50 border-red-200',
  },
};

// ─── Helpers de UI ───────────────────────────────────────────────────────────

function statusBadge(status: SagaStep['status'] | SagaRun['status']) {
  const map: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-600',
    running: 'bg-blue-100 text-blue-700 animate-pulse',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    skipped: 'bg-gray-100 text-gray-500',
    planning: 'bg-yellow-100 text-yellow-700',
    paused: 'bg-amber-100 text-amber-700',
    cancelled: 'bg-gray-200 text-gray-600',
  };
  return map[status] ?? 'bg-gray-100 text-gray-600';
}

function statusIcon(status: SagaStep['status'] | SagaRun['status']) {
  const map: Record<string, string> = {
    pending: '○',
    running: '◉',
    completed: '✓',
    failed: '✗',
    skipped: '—',
    planning: '⋯',
    paused: '⏸',
    cancelled: '⊘',
  };
  return map[status] ?? '?';
}

// ─── Componente StepCard ─────────────────────────────────────────────────────

function StepCard({
  step,
  sagaId,
  sagaStatus,
  onSimulate,
  loading,
}: {
  step: SagaStep;
  sagaId: string;
  sagaStatus: SagaRun['status'];
  onSimulate: (sagaId: string, action: SimulateAction, stepId: string, extra?: Record<string, string>) => void;
  loading: boolean;
}) {
  const canAct = !loading && sagaStatus === 'running' && step.status === 'running';
  const canApprove = !loading && sagaStatus === 'paused' && step.status === 'running';

  return (
    <div className={`border rounded-lg p-3 text-sm ${step.status === 'failed' ? 'border-red-300 bg-red-50' : step.status === 'completed' ? 'border-green-300 bg-green-50' : step.status === 'running' ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className={`px-2 py-0.5 rounded-full font-semibold ${statusBadge(step.status)}`}>
            {statusIcon(step.status)} {step.status}
          </span>
          <span className="font-semibold text-gray-800">{step.id}</span>
        </div>
        {step.depends_on && step.depends_on.length > 0 && (
          <span className="text-xs text-gray-400">
            espera: {step.depends_on.join(', ')}
          </span>
        )}
      </div>

      <div className="text-gray-600 text-xs mb-1">{step.description ?? step.intent}</div>

      <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
        <span>intent: <code className="bg-gray-100 px-1 rounded">{step.intent}</code></span>
        {step.compensate_intent && (
          <span>compensate: <code className="bg-orange-50 text-orange-600 px-1 rounded">{step.compensate_intent}</code></span>
        )}
        {step.job_id && (
          <span className="truncate max-w-[200px]">job: <code className="text-gray-500">{step.job_id}</code></span>
        )}
      </div>

      {step.result && (
        <pre className="bg-green-50 border border-green-200 rounded p-2 text-xs text-green-800 mb-2 overflow-auto max-h-20">
          {JSON.stringify(step.result, null, 2)}
        </pre>
      )}

      {step.error && (
        <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700 mb-2">
          Error: {step.error}
        </div>
      )}

      {/* Acciones de simulación */}
      <div className="flex gap-2 flex-wrap">
        {canAct && (
          <>
            <button
              onClick={() => onSimulate(sagaId, 'complete', step.id)}
              className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
              disabled={loading}
            >
              ✓ Completar
            </button>
            <button
              onClick={() => onSimulate(sagaId, 'fail', step.id)}
              className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50"
              disabled={loading}
            >
              ✗ Fallar
            </button>
            <button
              onClick={() => onSimulate(sagaId, 'pending_approval', step.id)}
              className="px-2 py-1 bg-amber-500 text-white rounded text-xs hover:bg-amber-600 disabled:opacity-50"
              disabled={loading}
            >
              ⏸ Pedir aprobación
            </button>
          </>
        )}

        {canApprove && (
          <>
            <button
              onClick={() => onSimulate(sagaId, 'approve', step.id)}
              className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
              disabled={loading}
            >
              ✓ Aprobar
            </button>
            <button
              onClick={() => onSimulate(sagaId, 'reject', step.id)}
              className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
              disabled={loading}
            >
              ✗ Rechazar
            </button>
          </>
        )}

        {step.status === 'pending' && (
          <span className="text-xs text-gray-400 italic">Esperando dependencias...</span>
        )}
      </div>
    </div>
  );
}

// ─── Componente SagaCard ──────────────────────────────────────────────────────

function SagaCard({
  saga,
  onSimulate,
  onRefresh,
  loading,
}: {
  saga: SagaRun;
  onSimulate: (sagaId: string, action: SimulateAction, stepId: string) => void;
  onRefresh: (sagaId: string) => void;
  loading: boolean;
}) {
  return (
    <div className="border border-gray-300 rounded-xl p-4 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusBadge(saga.status)}`}>
              {statusIcon(saga.status)} {saga.status.toUpperCase()}
            </span>
            <code className="text-xs text-gray-400">{saga.id}</code>
          </div>
          <div className="font-semibold text-gray-800 mt-1">{saga.goal}</div>
          <div className="text-xs text-gray-400">
            Escenario: <strong>{(saga.context as any)?._dev_playground ? (saga.context as any).scenario : 'custom'}</strong>
            {' · '}
            {saga.steps.length} pasos
          </div>
        </div>
        <button
          onClick={() => onRefresh(saga.id)}
          className="text-xs text-blue-500 hover:text-blue-700 underline"
          disabled={loading}
        >
          Refrescar
        </button>
      </div>

      {/* Pasos */}
      <div className="space-y-2">
        {saga.steps.map(step => (
          <StepCard
            key={step.id}
            step={step}
            sagaId={saga.id}
            sagaStatus={saga.status}
            onSimulate={onSimulate}
            loading={loading}
          />
        ))}
      </div>

      {/* Error global */}
      {saga.error && (
        <div className="mt-3 border border-red-300 bg-red-50 rounded-lg p-3 text-xs">
          <div className="font-semibold text-red-700 mb-1">
            Error: [{saga.error.code}] {saga.error.message}
          </div>
          {saga.error.failed_step_id && (
            <div className="text-red-600">Falló en paso: <code>{saga.error.failed_step_id}</code></div>
          )}
          {saga.error.compensation && saga.error.compensation.policy === 'manual_per_step' && (
            <div className="mt-2 bg-orange-50 border border-orange-200 rounded p-2">
              <div className="font-semibold text-orange-700 mb-1">
                Compensación pendiente ({saga.error.compensation.reason}):
              </div>
              <ul className="list-disc list-inside space-y-1">
                {saga.error.compensation.pending_steps.map(ps => (
                  <li key={ps.step_id} className="text-orange-600">
                    Paso <code>{ps.step_id}</code> → ejecutar <code>{ps.compensate_intent}</code>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Contexto compartido */}
      {Object.keys(saga.context).filter(k => !k.startsWith('_')).length > 0 && (
        <details className="mt-3">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
            Contexto compartido entre pasos ({Object.keys(saga.context).filter(k => !k.startsWith('_')).length} entradas)
          </summary>
          <pre className="mt-1 bg-gray-50 border border-gray-200 rounded p-2 text-xs overflow-auto max-h-40">
            {JSON.stringify(
              Object.fromEntries(Object.entries(saga.context).filter(([k]) => !k.startsWith('_'))),
              null,
              2
            )}
          </pre>
        </details>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function SagaPlaygroundPage() {
  const [sagas, setSagas] = useState<SagaRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  const addLog = (msg: string) =>
    setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));

  // ── Cargar sagas ────────────────────────────────────────────────────────────
  const loadSagas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dev/sagas');
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSagas(data.sagas ?? []);
      setLoaded(true);
      addLog(`Cargadas ${data.sagas?.length ?? 0} sagas`);
    } catch (e: any) {
      addLog(`Error cargando sagas: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Crear saga ──────────────────────────────────────────────────────────────
  const createSaga = useCallback(async (scenario: ScenarioKey) => {
    setLoading(true);
    addLog(`Creando saga: escenario "${scenario}"...`);
    try {
      const res = await fetch('/api/dev/sagas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSagas(prev => [data.saga, ...prev]);
      addLog(`Saga creada: ${data.sagaId} (${data.saga.steps.filter((s: SagaStep) => s.status === 'running').length} pasos en running)`);
    } catch (e: any) {
      addLog(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Simular evento ──────────────────────────────────────────────────────────
  const simulate = useCallback(async (
    sagaId: string,
    action: SimulateAction,
    stepId: string
  ) => {
    setLoading(true);
    addLog(`Simulando ${action} en paso "${stepId}" de saga ${sagaId.slice(0, 8)}...`);
    try {
      const res = await fetch(`/api/dev/sagas/${sagaId}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, step_id: stepId }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSagas(prev => prev.map(s => (s.id === sagaId ? data.saga : s)));
      const updatedSaga: SagaRun = data.saga;
      addLog(`OK — Saga ahora: ${updatedSaga.status} | Pasos: ${updatedSaga.steps.map((s: SagaStep) => `${s.id}:${s.status}`).join(' → ')}`);
    } catch (e: any) {
      addLog(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Refrescar una saga ──────────────────────────────────────────────────────
  const refreshSaga = useCallback(async (sagaId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/mcp/sagas/${sagaId}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSagas(prev => prev.map(s => (s.id === sagaId ? data : s)));
      addLog(`Saga ${sagaId.slice(0, 8)} refrescada`);
    } catch (e: any) {
      addLog(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-900">SagaService Playground</h1>
        <p className="text-gray-500 text-sm mt-1">
          Entorno personal para experimentar con el orquestador de workflows multi-paso.
          Las sagas se crean en Firestore real bajo tu org.
        </p>
      </div>

      {/* Guía rápida */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm space-y-2">
        <div className="font-semibold text-gray-700">Cómo funciona:</div>
        <ol className="list-decimal list-inside space-y-1 text-gray-600">
          <li>Elegí un escenario y hacé click en "Crear saga"</li>
          <li>Los pasos sin dependencias arrancan en <span className="font-mono bg-blue-100 text-blue-700 px-1 rounded">running</span> automáticamente</li>
          <li>Simulá completar o fallar cada paso con los botones</li>
          <li>Cuando un paso completa, los que dependen de él pasan a <span className="font-mono bg-blue-100 text-blue-700 px-1 rounded">running</span></li>
          <li>Si un paso falla, la saga registra qué pasos necesitan compensación (rollback)</li>
        </ol>
      </div>

      {/* Escenarios */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800">Crear nueva saga</h2>
          <button
            onClick={loadSagas}
            disabled={loading}
            className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {loaded ? 'Recargar sagas' : 'Cargar sagas existentes'}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(Object.keys(SCENARIO_INFO) as ScenarioKey[]).map(key => (
            <div key={key} className={`border rounded-lg p-3 ${SCENARIO_INFO[key].color}`}>
              <div className="font-semibold text-sm text-gray-800 mb-1">{SCENARIO_INFO[key].label}</div>
              <div className="text-xs text-gray-600 mb-3">{SCENARIO_INFO[key].description}</div>
              <button
                onClick={() => createSaga(key)}
                disabled={loading}
                className="px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg hover:bg-gray-700 disabled:opacity-50"
              >
                {loading ? 'Creando...' : 'Crear saga'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Sagas activas */}
      {sagas.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-800 mb-3">
            Sagas ({sagas.length})
          </h2>
          <div className="space-y-4">
            {sagas.map(saga => (
              <SagaCard
                key={saga.id}
                saga={saga}
                onSimulate={simulate}
                onRefresh={refreshSaga}
                loading={loading}
              />
            ))}
          </div>
        </div>
      )}

      {loaded && sagas.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          No hay sagas aún. Creá una arriba.
        </div>
      )}

      {/* Log de actividad */}
      {log.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-800 mb-2 text-sm">Log de actividad</h2>
          <div className="bg-gray-900 text-green-400 rounded-lg p-3 font-mono text-xs space-y-0.5 max-h-48 overflow-auto">
            {log.map((entry, i) => (
              <div key={i}>{entry}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
