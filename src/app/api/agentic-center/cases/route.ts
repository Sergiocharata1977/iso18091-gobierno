/**
 * GET /api/agentic-center/cases
 *
 * Devuelve la lista de casos del Centro Agéntico para la organización del
 * usuario autenticado.
 *
 * En PRODUCCIÓN: solo casos reales derivados de Firestore (direct_action_confirmations,
 * agent_sagas y agent_jobs) para la org del usuario.
 *
 * En DESARROLLO: si se pasa ?demo=true, se añaden 4 casos demo prearmados
 * en lenguaje de negocio para facilitar el diseño de la UI.
 */

import { withAuth } from '@/lib/api/withAuth';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { NextResponse } from 'next/server';
import type { AgenticCenterCase } from '@/types/agentic-center';
import { AgenticCenterCaseMapper } from '@/services/agentic-center/AgenticCenterCaseMapper';
import { StrategicAnalysisReportService } from '@/services/strategic-analysis/StrategicAnalysisReportService';
import { StrategicAnalysisToCaseBridge } from '@/services/agentic-center/StrategicAnalysisToCaseBridge';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Casos demo prearmados en lenguaje de negocio
// Solo se usan si NODE_ENV !== 'production' y query param ?demo=true
// ---------------------------------------------------------------------------

function buildDemoCases(): AgenticCenterCase[] {
  const ahora = new Date().toISOString();

  // Caso 1: Capacitación vencida — ciclo AgentWorker → Saga → DirectAction → Sentinel
  const caso1: AgenticCenterCase = {
    id: 'demo-capacitacion-vencida',
    titulo: 'Capacitación vencida — Juan Pérez',
    descripcion:
      'El motor detectó que Juan Pérez tiene una capacitación obligatoria vencida hace 15 días. ' +
      'Se activó el flujo automático para inscribirlo al próximo turno disponible.',
    estado: 'esperando',
    timestamp: ahora,
    evento_detectado: {
      id: 'demo-ev-1',
      tipo: 'Capacitación vencida',
      descripcion:
        'Juan Pérez — Operario de Producción no completó "Seguridad en Planta" antes del 14/03/2026.',
      origen: 'agente',
      timestamp: ahora,
      prioridad: 'alta',
    },
    workflow_pasos: [
      {
        paso: 1,
        label: 'Motor detecta capacitación vencida',
        estado: 'completado',
        timestamp_opcional: ahora,
      },
      {
        paso: 2,
        label: 'Flujo coordina búsqueda de turno disponible',
        estado: 'completado',
        timestamp_opcional: ahora,
      },
      {
        paso: 3,
        label: 'IA propone inscripción al curso del 02/04/2026',
        estado: 'activo',
        timestamp_opcional: ahora,
      },
      {
        paso: 4,
        label: 'Notificación a terminal de Juan Pérez',
        estado: 'pendiente',
        timestamp_opcional: null,
      },
    ],
    accion_propuesta: {
      actionId: 'demo-action-1',
      titulo: 'Inscribir a Juan Pérez al curso del 02/04/2026',
      descripcion_negocio:
        'La IA identificó el próximo turno de "Seguridad en Planta" y propone inscribir al empleado. ' +
        'La acción se ejecutará en su terminal Sentinel una vez aprobada.',
      entidad: 'Capacitación',
      tipo_operacion: 'Inscribir al curso',
      estado: 'pendiente',
    },
    persona_target: {
      nombre: 'Juan Pérez',
      puesto: 'Operario de Producción',
      terminal_nombre: 'Terminal Planta 1 — Línea A',
      canal: 'terminal',
      estado_terminal: 'Conectado',
      requiere_aprobacion: true,
      politica_aplicada: 'Política Capacitaciones Obligatorias',
    },
    evidencia_final: null,
  };

  // Caso 2: Hallazgo sin responsable — ciclo sistema → DirectAction
  const caso2: AgenticCenterCase = {
    id: 'demo-hallazgo-sin-responsable',
    titulo: 'Hallazgo sin responsable — Almacén',
    descripcion:
      'El sistema detectó que el hallazgo HAL-031 del área de Almacén lleva 8 días sin responsable asignado. ' +
      'La IA propone asignarlo a Ana Martínez, Jefa de Almacén.',
    estado: 'esperando',
    timestamp: ahora,
    evento_detectado: {
      id: 'demo-ev-2',
      tipo: 'Hallazgo sin responsable',
      descripcion:
        'HAL-031 "Discrepancia en stock físico vs sistema" — Almacén — sin responsable desde el 21/03/2026.',
      origen: 'sistema',
      timestamp: ahora,
      prioridad: 'media',
    },
    workflow_pasos: [
      {
        paso: 1,
        label: 'Sistema identifica hallazgo sin dueño',
        estado: 'completado',
        timestamp_opcional: ahora,
      },
      {
        paso: 2,
        label: 'IA analiza área y sugiere responsable',
        estado: 'completado',
        timestamp_opcional: ahora,
      },
      {
        paso: 3,
        label: 'Esperando aprobación para asignar a Ana Martínez',
        estado: 'activo',
        timestamp_opcional: ahora,
      },
    ],
    accion_propuesta: {
      actionId: 'demo-action-2',
      titulo: 'Asignar HAL-031 a Ana Martínez',
      descripcion_negocio:
        'Asignar el hallazgo HAL-031 a Ana Martínez (Jefa de Almacén) con fecha límite de respuesta 07/04/2026. ' +
        'La acción se registrará en el SGC con trazabilidad completa.',
      entidad: 'Hallazgo',
      tipo_operacion: 'Asignar responsable',
      estado: 'pendiente',
    },
    persona_target: {
      nombre: 'Ana Martínez',
      puesto: 'Jefa de Almacén',
      terminal_nombre: null,
      canal: 'email',
      estado_terminal: null,
      requiere_aprobacion: true,
      politica_aplicada: null,
    },
    evidencia_final: null,
  };

  // Caso 3: No Conformidad detectada por auditoría — ciclo IA → DirectAction
  const caso3: AgenticCenterCase = {
    id: 'demo-nc-auditoria',
    titulo: 'No Conformidad detectada por auditoría',
    descripcion:
      'La IA analizó el informe de la auditoría INT-2026-08 y detectó una desviación en el proceso de ' +
      'control de calidad de proveedores. Propone crear la No Conformidad NC-2026-047.',
    estado: 'activo',
    timestamp: ahora,
    evento_detectado: {
      id: 'demo-ev-3',
      tipo: 'Desviación detectada en auditoría',
      descripcion:
        'Auditoría INT-2026-08 — El proceso de evaluación de proveedores no cumple el requisito 8.4.1 de ISO 9001.',
      origen: 'agente',
      timestamp: ahora,
      prioridad: 'alta',
    },
    workflow_pasos: [
      {
        paso: 1,
        label: 'IA analiza informe de auditoría',
        estado: 'completado',
        timestamp_opcional: ahora,
      },
      {
        paso: 2,
        label: 'Se identifica desviación en control de proveedores',
        estado: 'completado',
        timestamp_opcional: ahora,
      },
      {
        paso: 3,
        label: 'IA redacta borrador de No Conformidad',
        estado: 'completado',
        timestamp_opcional: ahora,
      },
      {
        paso: 4,
        label: 'Aprobación del borrador NC-2026-047',
        estado: 'activo',
        timestamp_opcional: ahora,
      },
    ],
    accion_propuesta: {
      actionId: 'demo-action-3',
      titulo: 'Crear No Conformidad NC-2026-047',
      descripcion_negocio:
        'Crear la No Conformidad NC-2026-047 "Proceso de evaluación de proveedores no documentado" ' +
        'vinculada a la auditoría INT-2026-08, con clasificación mayor y plazo de cierre 30 días.',
      entidad: 'No Conformidad',
      tipo_operacion: 'Crear no conformidad',
      estado: 'pendiente',
    },
    persona_target: null,
    evidencia_final: null,
  };

  const caso4: AgenticCenterCase = {
    id: 'demo-aprobacion-terminal-pendiente',
    titulo: 'Aprobacion pendiente en terminal - Supervisor de despacho',
    descripcion:
      'El sistema preparo la liberacion de un despacho observado y dejo la accion lista en la terminal ' +
      'del supervisor para su confirmacion final antes de ejecutarse.',
    estado: 'esperando',
    timestamp: ahora,
    evento_detectado: {
      id: 'demo-ev-4',
      tipo: 'Aprobacion pendiente en terminal',
      descripcion:
        'La terminal Sentinel de Despacho Sur espera confirmacion para liberar la OT-2981 con control reforzado.',
      origen: 'terminal',
      timestamp: ahora,
      prioridad: 'media',
    },
    workflow_pasos: [
      {
        paso: 1,
        label: 'El sistema consolida contexto y deja la accion preparada',
        estado: 'completado',
        timestamp_opcional: ahora,
      },
      {
        paso: 2,
        label: 'La politica Sentinel exige aprobacion del supervisor',
        estado: 'completado',
        timestamp_opcional: ahora,
      },
      {
        paso: 3,
        label: 'La terminal espera decision humana para ejecutar',
        estado: 'activo',
        timestamp_opcional: ahora,
      },
      {
        paso: 4,
        label: 'La ejecucion se registra con evidencia final',
        estado: 'pendiente',
        timestamp_opcional: null,
      },
    ],
    accion_propuesta: {
      actionId: 'demo-action-4',
      titulo: 'Aprobar liberacion controlada de la OT-2981',
      descripcion_negocio:
        'La IA recomienda habilitar la orden OT-2981 porque la documentacion obligatoria esta completa y ' +
        'solo resta la conformidad del supervisor en terminal.',
      entidad: 'Orden de trabajo',
      tipo_operacion: 'Aprobar ejecucion en terminal',
      estado: 'pendiente',
    },
    persona_target: {
      nombre: 'Lucia Gomez',
      puesto: 'Supervisora de Despacho',
      terminal_nombre: 'Sentinel Despacho Sur',
      canal: 'terminal',
      estado_terminal: 'Conectado',
      requiere_aprobacion: true,
      politica_aplicada: 'Politica de liberacion controlada',
    },
    evidencia_final: null,
  };

  return [caso1, caso2, caso3, caso4];
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const GET = withAuth(
  async (req, _context, auth) => {
    const orgScope = await resolveAuthorizedOrganizationId(auth, undefined, {
      requireOrg: true,
    });

    if (!orgScope.ok || !orgScope.organizationId) {
      const apiError = toOrganizationApiError(orgScope);
      return NextResponse.json(
        { success: false, error: apiError.error, errorCode: apiError.errorCode },
        { status: apiError.status }
      );
    }

    const orgId = orgScope.organizationId;
    const db = getAdminFirestore();

    // Casos reales desde Firestore — siempre org-scoped
    const mapper = new AgenticCenterCaseMapper();
    const realCases = await mapper.mapRealCases(orgId, db);
    const bridge = new StrategicAnalysisToCaseBridge();
    const lastReport = await StrategicAnalysisReportService.getLatestReport(orgId);
    const bridgedCases = lastReport ? bridge.toBridgedCases(lastReport, orgId) : [];

    // Demo: SOLO si NODE_ENV !== 'production' Y query param ?demo=true
    const isDemoMode =
      process.env.NODE_ENV !== 'production' &&
      req.nextUrl.searchParams.get('demo') === 'true';

    const demoCases: AgenticCenterCase[] = isDemoMode ? buildDemoCases() : [];

    const casos: AgenticCenterCase[] = [...realCases, ...bridgedCases, ...demoCases];

    return NextResponse.json({
      success: true,
      data: {
        organizationId: orgId,
        generatedAt: new Date().toISOString(),
        casos,
        meta: {
          real_count: realCases.length,
          bridged_count: bridgedCases.length,
          demo_count: demoCases.length,
          demo_mode: isDemoMode,
        },
      },
    });
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
