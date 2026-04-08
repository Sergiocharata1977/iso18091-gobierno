'use client';

import { useState } from 'react';
import { DirectActionConfirmation } from '@/components/direct-actions/DirectActionConfirmation';
import type {
  DirectActionConfirmation as ConfType,
  DirectActionEntity,
  DirectActionType,
} from '@/types/direct-actions';

// ─── Entidades y tipos disponibles ───────────────────────────────────────────

const ENTITIES: { value: DirectActionEntity; label: string }[] = [
  { value: 'audit', label: 'Auditoría' },
  { value: 'finding', label: 'Hallazgo' },
  { value: 'action', label: 'Acción Correctiva' },
  { value: 'non-conformity', label: 'No Conformidad' },
  { value: 'personnel', label: 'Personal' },
  { value: 'training', label: 'Capacitación' },
  { value: 'evaluation', label: 'Evaluación' },
  { value: 'process-record', label: 'Registro de Proceso' },
];

const ACTION_TYPES: { value: DirectActionType; label: string; color: string }[] = [
  { value: 'CREATE', label: 'Crear', color: 'bg-green-100 text-green-800' },
  { value: 'UPDATE', label: 'Actualizar', color: 'bg-blue-100 text-blue-800' },
  { value: 'COMPLETE', label: 'Completar', color: 'bg-purple-100 text-purple-800' },
  { value: 'ASSIGN', label: 'Asignar', color: 'bg-orange-100 text-orange-800' },
  { value: 'CHANGE_STATUS', label: 'Cambiar Estado', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'DELETE', label: 'Eliminar', color: 'bg-red-100 text-red-800' },
];

// ─── Datos de prueba prearmados ───────────────────────────────────────────────

const MOCK_DATA: Record<string, Partial<Record<DirectActionType, object>>> = {
  audit: {
    CREATE: { titulo: 'Auditoría interna Q2 2026', tipo: 'interna', estado: 'planificada', responsable: 'Juan Pérez', fecha_planificada: '2026-04-15' },
    UPDATE: { entityId: 'audit-001', titulo: 'Auditoría actualizada', estado: 'en_progreso' },
    COMPLETE: { entityId: 'audit-001' },
    ASSIGN: { entityId: 'audit-001', assignedTo: 'maria.garcia@empresa.com' },
    CHANGE_STATUS: { entityId: 'audit-001', newStatus: 'completada' },
  },
  finding: {
    CREATE: { descripcion: 'Falta de control en proceso de almacenamiento', tipo: 'observacion', proceso: 'Almacén', responsable: 'Luis Torres', fecha_limite: '2026-05-01' },
    UPDATE: { entityId: 'finding-001', descripcion: 'Descripción actualizada del hallazgo' },
    COMPLETE: { entityId: 'finding-001' },
    ASSIGN: { entityId: 'finding-001', assignedTo: 'carlos.ruiz@empresa.com' },
    CHANGE_STATUS: { entityId: 'finding-001', newStatus: 'en_revision' },
  },
  action: {
    CREATE: { titulo: 'Implementar checklist de revisión diaria', tipo: 'correctiva', descripcion: 'Crear checklist para revisión de almacén', responsable: 'Ana Martínez', fecha_limite: '2026-04-30' },
    UPDATE: { entityId: 'action-001', titulo: 'Acción de mejora actualizada', progreso: 75 },
    COMPLETE: { entityId: 'action-001' },
    ASSIGN: { entityId: 'action-001', assignedTo: 'pedro.lopez@empresa.com' },
    CHANGE_STATUS: { entityId: 'action-001', newStatus: 'en_progreso' },
  },
  'non-conformity': {
    CREATE: { descripcion: 'Procedimiento de almacén no documentado', clausula_iso: '7.5.1', tipo: 'no_conformidad_menor', responsable: 'Roberto García', fecha_limite: '2026-05-15' },
    UPDATE: { entityId: 'nc-001', descripcion: 'NC actualizada con evidencias' },
    COMPLETE: { entityId: 'nc-001' },
    CHANGE_STATUS: { entityId: 'nc-001', newStatus: 'cerrada' },
  },
  personnel: {
    CREATE: { nombre: 'María González', puesto: 'Analista de Calidad', departamento: 'Calidad', email: 'maria.g@empresa.com' },
    UPDATE: { entityId: 'person-001', puesto: 'Jefa de Calidad', departamento: 'Calidad' },
    ASSIGN: { entityId: 'person-001', assignedTo: 'departamento_calidad' },
  },
  training: {
    CREATE: { titulo: 'ISO 9001:2015 Fundamentos', responsable: 'Carlos Mendez', fecha: '2026-04-20', duracion_horas: 8 },
    COMPLETE: { entityId: 'training-001' },
    ASSIGN: { entityId: 'training-001', assignedTo: 'juan.perez@empresa.com' },
  },
  evaluation: {
    CREATE: { titulo: 'Evaluación de competencias — Calidad', empleado: 'Juan Pérez', evaluador: 'Ana Martínez', fecha: '2026-04-10' },
    COMPLETE: { entityId: 'eval-001' },
    CHANGE_STATUS: { entityId: 'eval-001', newStatus: 'aprobada' },
  },
  'process-record': {
    CREATE: { proceso: 'Gestión de Compras', fecha: '2026-03-28', resultado: 'conforme', observaciones: 'Sin desvíos detectados' },
    UPDATE: { entityId: 'pr-001', observaciones: 'Desvío menor documentado y corregido' },
    COMPLETE: { entityId: 'pr-001' },
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function actionTypeBadge(type: DirectActionType) {
  const info = ACTION_TYPES.find(a => a.value === type);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${info?.color ?? 'bg-gray-100 text-gray-700'}`}>
      {info?.label ?? type}
    </span>
  );
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending_confirmation: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-green-100 text-green-700',
    executed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

type Step = 'form' | 'pending' | 'done';

interface ActionResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

export default function DirectActionsPlayground() {
  const [step, setStep] = useState<Step>('form');
  const [entity, setEntity] = useState<DirectActionEntity>('action');
  const [actionType, setActionType] = useState<DirectActionType>('CREATE');
  const [reason, setReason] = useState('La IA detectó que falta esta acción según el último informe de auditoría.');
  const [dataJson, setDataJson] = useState(() => JSON.stringify(MOCK_DATA['action']?.CREATE ?? {}, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<ConfType | null>(null);
  const [actionResponse, setActionResponse] = useState<Record<string, unknown> | null>(null);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [history, setHistory] = useState<{ actionId: string; entity: DirectActionEntity; type: DirectActionType; summary: string; outcome: 'confirmed' | 'cancelled' }[]>([]);

  // Actualiza el JSON de muestra cuando cambian entidad o tipo
  const handleEntityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value as DirectActionEntity;
    setEntity(v);
    const mockData = MOCK_DATA[v]?.[actionType] ?? {};
    setDataJson(JSON.stringify(mockData, null, 2));
    setJsonError(null);
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value as DirectActionType;
    setActionType(v);
    const mockData = MOCK_DATA[entity]?.[v] ?? {};
    setDataJson(JSON.stringify(mockData, null, 2));
    setJsonError(null);
  };

  const handleDataChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDataJson(e.target.value);
    try {
      JSON.parse(e.target.value);
      setJsonError(null);
    } catch {
      setJsonError('JSON inválido');
    }
  };

  // ─── Crear solicitud ──────────────────────────────────────────────────────

  const handleRequest = async () => {
    let parsedData: Record<string, unknown>;
    try {
      parsedData = JSON.parse(dataJson);
    } catch {
      setJsonError('JSON inválido — corregí antes de enviar');
      return;
    }

    // entityId viene dentro del data mock para UPDATE/COMPLETE/etc.
    const entityId = typeof parsedData.entityId === 'string' ? parsedData.entityId : undefined;

    setLoading(true);
    setApiError(null);

    try {
      const res = await fetch('/api/direct-actions/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: `dev-session-${Date.now()}`,
          action: {
            type: actionType,
            entity,
            entityId,
            data: parsedData,
            reason,
            requiresConfirmation: true,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setApiError(data.error ?? `Error ${res.status}`);
        return;
      }

      setActionResponse(data);

      // Construir el objeto de confirmación que necesita el componente
      const mockConf: ConfType = {
        actionId: data.actionId as string,
        userId: '',
        sessionId: `dev-session-${Date.now()}`,
        request: {
          type: actionType,
          entity,
          entityId,
          data: parsedData,
          reason,
          requiresConfirmation: true,
        },
        summary: data.summary as string,
        status: 'pending' as const,
        confirmed: false,
      };

      setPendingConfirmation(mockConf);
      setStep('pending');
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  // ─── Confirmar / Cancelar ─────────────────────────────────────────────────

  const handleConfirm = async (actionId: string) => {
    const res = await fetch('/api/direct-actions/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionId, confirmed: true }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
    setResult({ success: true, message: data.message, data: data.data });
    if (pendingConfirmation) {
      setHistory(h => [{ actionId, entity, type: actionType, summary: pendingConfirmation.summary, outcome: 'confirmed' }, ...h]);
    }
    setStep('done');
  };

  const handleCancel = async (actionId: string) => {
    const res = await fetch('/api/direct-actions/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionId, confirmed: false }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
    setResult({ success: false, message: 'Acción cancelada por el usuario' });
    if (pendingConfirmation) {
      setHistory(h => [{ actionId, entity, type: actionType, summary: pendingConfirmation.summary, outcome: 'cancelled' }, ...h]);
    }
    setStep('done');
  };

  const handleReset = () => {
    setStep('form');
    setPendingConfirmation(null);
    setActionResponse(null);
    setResult(null);
    setApiError(null);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold">IA</div>
          <h1 className="text-2xl font-bold text-gray-900">Playground — DirectAction Service</h1>
        </div>
        <p className="text-sm text-gray-500 ml-11">
          Simulá el flujo completo: la IA propone una acción → vos ves el preview → confirmás o cancelás → se ejecuta en Firestore.
        </p>
      </div>

      {/* Diagrama de flujo */}
      <div className="flex items-center gap-2 text-xs font-medium">
        {[
          { step: 'form' as Step, label: '1. Crear solicitud' },
          { step: 'pending' as Step, label: '2. Confirmar' },
          { step: 'done' as Step, label: '3. Resultado' },
        ].map(({ step: s, label }, i, arr) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${
              step === s
                ? 'bg-indigo-600 text-white border-indigo-600'
                : step === 'done' && s !== 'form'
                  ? 'bg-green-100 text-green-700 border-green-300'
                  : 'bg-gray-100 text-gray-500 border-gray-200'
            }`}>
              {label}
            </div>
            {i < arr.length - 1 && <span className="text-gray-300">→</span>}
          </div>
        ))}
      </div>

      {/* ── STEP 1: Formulario ── */}
      {step === 'form' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5 shadow-sm">
          <h2 className="font-semibold text-gray-800">Configurar acción de prueba</h2>

          <div className="grid grid-cols-2 gap-4">
            {/* Entidad */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Entidad</label>
              <select
                value={entity}
                onChange={handleEntityChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                {ENTITIES.map(e => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </select>
            </div>

            {/* Tipo de acción */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de acción</label>
              <select
                value={actionType}
                onChange={handleTypeChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                {ACTION_TYPES.map(a => (
                  <option key={a.value} value={a.value}>{a.label} ({a.value})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Razón */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Razón / Justificación (reason)</label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="¿Por qué la IA está proponiendo esto?"
            />
          </div>

          {/* Data JSON */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Datos (JSON)
              <span className="ml-2 text-gray-400 font-normal">— pre-armado según entidad/tipo, editable</span>
            </label>
            <textarea
              value={dataJson}
              onChange={handleDataChange}
              rows={8}
              className={`w-full border rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none ${
                jsonError ? 'border-red-400 bg-red-50' : 'border-gray-300'
              }`}
            />
            {jsonError && <p className="text-xs text-red-600 mt-1">{jsonError}</p>}
          </div>

          {apiError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <strong>Error:</strong> {apiError}
            </div>
          )}

          <button
            onClick={handleRequest}
            disabled={loading || !!jsonError}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Enviando al servicio...
              </>
            ) : (
              <>
                <span>🤖</span>
                Solicitar acción (simular propuesta IA)
              </>
            )}
          </button>
        </div>
      )}

      {/* ── STEP 2: Confirmación pendiente ── */}
      {step === 'pending' && pendingConfirmation && (
        <div className="space-y-4">
          {/* Banner explicativo */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-800">
            <strong>Don Cándido propone esta acción.</strong> Revisá el detalle y decidí si confirmar o cancelar.
            El componente de abajo es el mismo que aparecería inline en el chat.
          </div>

          {/* Componente de confirmación */}
          <DirectActionConfirmation
            confirmation={pendingConfirmation}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />

          {/* Debug: response completa del API */}
          <details className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <summary className="text-xs font-medium text-gray-500 cursor-pointer select-none">
              Ver respuesta completa de la API (debug)
            </summary>
            <pre className="mt-2 text-xs text-gray-700 overflow-auto font-mono whitespace-pre-wrap">
              {JSON.stringify(actionResponse, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {/* ── STEP 3: Resultado ── */}
      {step === 'done' && result && (
        <div className="space-y-4">
          {/* Resultado */}
          <div className={`rounded-xl border p-5 ${result.success ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">{result.success ? '✅' : '❌'}</span>
              <div>
                <h3 className={`font-semibold ${result.success ? 'text-green-900' : 'text-gray-700'}`}>
                  {result.success ? 'Acción ejecutada correctamente' : 'Acción cancelada'}
                </h3>
                <p className={`text-sm mt-1 ${result.success ? 'text-green-700' : 'text-gray-600'}`}>
                  {result.message}
                </p>
                {result.data && (
                  <pre className="mt-3 text-xs font-mono bg-white/60 border border-green-100 rounded p-2 text-green-800">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handleReset}
            className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            ↩ Probar otra acción
          </button>
        </div>
      )}

      {/* ── Historial de la sesión ── */}
      {history.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-3">Historial de esta sesión</h3>
          <div className="space-y-2">
            {history.map((h, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                <span className="text-base">{h.outcome === 'confirmed' ? '✅' : '❌'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {actionTypeBadge(h.type)}
                    <span className="text-xs text-gray-500">{h.entity}</span>
                    {statusBadge(h.outcome === 'confirmed' ? 'executed' : 'cancelled')}
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5 truncate">{h.summary}</p>
                  <p className="text-xs text-gray-400 font-mono">{h.actionId}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Referencia rápida ── */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-700 mb-3 text-sm">Referencia: cómo funciona el servicio</h3>
        <div className="space-y-2 text-xs text-gray-600">
          <div className="flex gap-2">
            <span className="font-mono bg-gray-200 px-1 rounded">POST /api/direct-actions/request</span>
            <span>→ crea pending en Firestore <code>direct_action_confirmations</code></span>
          </div>
          <div className="flex gap-2">
            <span className="font-mono bg-gray-200 px-1 rounded">POST /api/direct-actions/confirm</span>
            <span>→ ejecuta o cancela + guarda en <code>direct_action_audit_logs</code></span>
          </div>
          <div className="flex gap-2">
            <span className="font-mono bg-gray-200 px-1 rounded">DirectActionService</span>
            <span>→ <code>src/services/direct-actions/DirectActionService.ts</code></span>
          </div>
          <div className="flex gap-2">
            <span className="font-mono bg-gray-200 px-1 rounded">Componente</span>
            <span>→ <code>src/components/direct-actions/DirectActionConfirmation.tsx</code></span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            <strong>Entidades soportadas:</strong> audit · finding · action · non-conformity · process-record · personnel · training · evaluation
          </p>
          <p className="text-xs text-gray-500 mt-1">
            <strong>Tipos de acción:</strong> CREATE · UPDATE · COMPLETE · ASSIGN · CHANGE_STATUS · DELETE
          </p>
          <p className="text-xs text-gray-500 mt-1">
            <strong>Roles autorizados:</strong> admin · gerente · jefe · super_admin
          </p>
        </div>
      </div>
    </div>
  );
}
