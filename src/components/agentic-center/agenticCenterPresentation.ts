'use client';

import type { AgenticCenterCase, AgenticCenterTimelineItem } from '@/types/agentic-center';

export type AgenticCaseType = 'alerta' | 'accion-sugerida' | 'cambio-registro';
export type AgenticBoardColumnId =
  | 'detectado'
  | 'pendiente-revision'
  | 'en-ejecucion'
  | 'completado';

export interface AgenticCaseViewModel {
  caseItem: AgenticCenterCase;
  type: AgenticCaseType;
  columnId: AgenticBoardColumnId;
  priority: string;
  origin: string;
  area: string;
  owner: string;
  traceabilityLabel: string;
  summary: string;
  proposedAction: string;
  recordLabel: string;
  currentStep: AgenticCenterTimelineItem | null;
}

export function getCaseType(caseItem: AgenticCenterCase): AgenticCaseType {
  const entity = caseItem.accion_propuesta?.entidad.toLowerCase() ?? '';
  const operation = caseItem.accion_propuesta?.tipo_operacion.toLowerCase() ?? '';
  const eventType = caseItem.evento_detectado.tipo.toLowerCase();

  if (
    entity.includes('registro') ||
    entity.includes('no conformidad') ||
    operation.includes('crear') ||
    operation.includes('actualizar') ||
    operation.includes('cambiar estado')
  ) {
    return 'cambio-registro';
  }

  if (
    operation.includes('aprobar') ||
    operation.includes('asignar') ||
    operation.includes('inscribir') ||
    eventType.includes('aprobacion')
  ) {
    return 'accion-sugerida';
  }

  return 'alerta';
}

export function getBoardColumn(caseItem: AgenticCenterCase): AgenticBoardColumnId {
  if (caseItem.estado === 'completado') return 'completado';

  const activeStep = caseItem.workflow_pasos.find(step => step.estado === 'activo');
  const activeLabel = activeStep?.label.toLowerCase() ?? '';

  if (
    caseItem.estado === 'esperando' ||
    activeLabel.includes('aprob') ||
    activeLabel.includes('esper') ||
    activeLabel.includes('revision') ||
    activeLabel.includes('decision')
  ) {
    return 'pendiente-revision';
  }

  if (caseItem.estado === 'activo') return 'en-ejecucion';

  return 'detectado';
}

export function getAreaLabel(caseItem: AgenticCenterCase): string {
  const text = `${caseItem.titulo} ${caseItem.descripcion} ${caseItem.persona_target?.puesto ?? ''}`.toLowerCase();

  if (text.includes('almac')) return 'Almacen';
  if (text.includes('despacho')) return 'Despacho';
  if (text.includes('proveedor')) return 'Calidad';
  if (text.includes('capacit')) return 'Personas';
  if (text.includes('auditor')) return 'Auditoria';
  return caseItem.accion_propuesta?.entidad ?? 'Operacion';
}

export function getTraceabilityLabel(caseItem: AgenticCenterCase): string {
  const completedSteps = caseItem.workflow_pasos.filter(step => step.estado === 'completado').length;
  return `${completedSteps}/${caseItem.workflow_pasos.length} hitos`;
}

export function getStatusLabel(columnId: AgenticBoardColumnId): string {
  switch (columnId) {
    case 'detectado':
      return 'Detectado';
    case 'pendiente-revision':
      return 'Pendiente de revision';
    case 'en-ejecucion':
      return 'En ejecucion';
    case 'completado':
      return 'Completado';
  }
}

export function buildCaseViewModel(caseItem: AgenticCenterCase): AgenticCaseViewModel {
  const currentStep = caseItem.workflow_pasos.find(step => step.estado === 'activo') ?? null;

  return {
    caseItem,
    type: getCaseType(caseItem),
    columnId: getBoardColumn(caseItem),
    priority: caseItem.evento_detectado.prioridad,
    origin: caseItem.evento_detectado.origen,
    area: getAreaLabel(caseItem),
    owner: caseItem.persona_target?.nombre ?? 'Sin responsable',
    traceabilityLabel: getTraceabilityLabel(caseItem),
    summary: caseItem.descripcion,
    proposedAction: caseItem.accion_propuesta?.titulo ?? 'Sin accion propuesta',
    recordLabel: caseItem.accion_propuesta?.entidad ?? 'Caso operativo',
    currentStep,
  };
}

export function getTypeLabel(type: AgenticCaseType): string {
  switch (type) {
    case 'alerta':
      return 'Alerta';
    case 'accion-sugerida':
      return 'Accion sugerida';
    case 'cambio-registro':
      return 'Cambio de registro';
  }
}

export function getTypeClasses(type: AgenticCaseType): string {
  switch (type) {
    case 'alerta':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    case 'accion-sugerida':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'cambio-registro':
      return 'border-sky-200 bg-sky-50 text-sky-700';
  }
}

export function getPriorityClasses(priority: string): string {
  switch (priority) {
    case 'alta':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    case 'media':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    default:
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
}
