/**
 * DEPRECATED (OLA 2 - IA unificada):
 * El planner local de voz queda solo como compatibilidad temporal.
 * La planificacion de acciones debe migrar al Unified AI Core en servidor.
 */
export type VoiceSuggestionActionType = 'navigate' | 'inform';

export interface VoiceSuggestion {
  id: string;
  titulo: string;
  frase_voz: string;
  route: string;
  comandos: string[];
  prioridad: number;
  actionType: VoiceSuggestionActionType;
}

export interface MiPanelVoiceDashboardData {
  procesosAsignados?: number | null;
  registrosVencidos?: number | null;
  tareasVencidas?: number | null;
  medicionesPendientes?: number | null;
  accionesAbiertas?: number | null;
  eventosProximos?: number | null;
  [key: string]: unknown;
}

function toSafeCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

function pickOverdueRecordsCount(data: MiPanelVoiceDashboardData): number {
  return Math.max(
    toSafeCount(data.registrosVencidos),
    toSafeCount(data.tareasVencidas)
  );
}

type VoiceRoleLevel =
  | 'sin_puesto'
  | 'operativo'
  | 'supervision'
  | 'gerencial'
  | 'directivo'
  | 'desconocido';

function normalizeText(value: unknown): string {
  return typeof value === 'string'
    ? value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
    : '';
}

function extractPuesto(data: MiPanelVoiceDashboardData): string {
  const direct = normalizeText(data.puesto);
  if (direct) return direct;

  const context = data.context;
  if (context && typeof context === 'object') {
    const personnel =
      'personnel' in context &&
      context.personnel &&
      typeof context.personnel === 'object'
        ? (context.personnel as Record<string, unknown>)
        : null;
    const puesto = normalizeText(personnel?.puesto);
    if (puesto) return puesto;
  }

  return '';
}

export function inferVoiceRoleLevel(
  data: MiPanelVoiceDashboardData
): VoiceRoleLevel {
  const puesto = extractPuesto(data);
  if (!puesto) return 'sin_puesto';

  if (/(director|direccion|ceo|president|owner|propietario)/.test(puesto)) {
    return 'directivo';
  }

  if (/(gerente|manager|jefe de area|jefatura)/.test(puesto)) {
    return 'gerencial';
  }

  if (/(supervisor|coordinador|lider|responsable)/.test(puesto)) {
    return 'supervision';
  }

  if (/(analista|tecnico|operario|auxiliar|asistente|inspector)/.test(puesto)) {
    return 'operativo';
  }

  return 'desconocido';
}

function buildBaseSuggestions(
  dashboardData: MiPanelVoiceDashboardData
): VoiceSuggestion[] {
  const procesosAsignados = toSafeCount(dashboardData.procesosAsignados);
  const registrosVencidos = pickOverdueRecordsCount(dashboardData);
  const medicionesPendientes = toSafeCount(dashboardData.medicionesPendientes);
  const accionesAbiertas = toSafeCount(dashboardData.accionesAbiertas);
  const eventosProximos = toSafeCount(dashboardData.eventosProximos);
  const roleLevel = inferVoiceRoleLevel(dashboardData);

  const suggestions: VoiceSuggestion[] = [];

  if (roleLevel === 'sin_puesto') {
    suggestions.push({
      id: 'solicitar-puesto',
      titulo: 'Solicitar asignacion de puesto',
      frase_voz:
        'No tienes puesto asignado. Te recomiendo hablar con tu supervisor o con el responsable de calidad para que asignen tu puesto y permisos.',
      route: '/mi-panel?tab=perfil',
      comandos: [
        'ver perfil',
        'solicitar puesto',
        'abrir perfil',
        'hablar con supervisor',
      ],
      prioridad: 1200,
      actionType: 'navigate',
    });
  }

  if (procesosAsignados === 0) {
    suggestions.push({
      id: 'solicitar-proceso',
      titulo: 'Solicitar asignacion de procesos',
      frase_voz:
        'No tienes procesos asignados. Solicita a tu supervisor o al responsable de calidad que te asignen el proceso correspondiente.',
      route: '/mi-panel?tab=trabajo',
      comandos: [
        'ver trabajo',
        'pedir proceso',
        'solicitar procesos',
        'hablar con responsable de calidad',
      ],
      prioridad: 1100,
      actionType: 'navigate',
    });
  }

  if (registrosVencidos > 0) {
    suggestions.push({
      id: 'registros-vencidos',
      titulo: 'Revisar registros vencidos',
      frase_voz: `Tienes ${registrosVencidos} registros vencidos. Quieres que abra tu trabajo pendiente?`,
      route: '/mi-panel?tab=trabajo',
      comandos: [
        'abrir trabajo pendiente',
        'mostrar registros vencidos',
        'ir a trabajo',
      ],
      prioridad: 1000 + registrosVencidos,
      actionType: 'navigate',
    });
  }

  if (medicionesPendientes > 0) {
    suggestions.push({
      id: 'mediciones-pendientes',
      titulo: 'Cargar mediciones pendientes',
      frase_voz: `Hay ${medicionesPendientes} mediciones pendientes para actualizar.`,
      route: '/mi-panel?tab=resumen',
      comandos: [
        'ver mediciones pendientes',
        'abrir indicadores',
        'mostrar pendientes criticos',
      ],
      prioridad: 800 + medicionesPendientes,
      actionType: 'navigate',
    });
  }

  if (accionesAbiertas > 0) {
    suggestions.push({
      id: 'acciones-abiertas',
      titulo: 'Dar seguimiento a acciones abiertas',
      frase_voz: `Tienes ${accionesAbiertas} acciones abiertas para seguimiento.`,
      route: '/acciones',
      comandos: ['abrir acciones', 'ver acciones abiertas', 'ir a mejoras'],
      prioridad: 700 + accionesAbiertas,
      actionType: 'navigate',
    });
  }

  if (eventosProximos > 0) {
    suggestions.push({
      id: 'eventos-proximos',
      titulo: 'Revisar eventos proximos',
      frase_voz: `Tienes ${eventosProximos} eventos proximos en agenda.`,
      route: '/calendario',
      comandos: ['abrir calendario', 'ver eventos proximos', 'mostrar agenda'],
      prioridad: 500 + eventosProximos,
      actionType: 'navigate',
    });
  }

  return suggestions;
}

export function buildVoiceSuggestions(
  dashboardData: MiPanelVoiceDashboardData,
  isSupervisor: boolean
): VoiceSuggestion[] {
  const prioritized = buildBaseSuggestions(dashboardData)
    .sort((a, b) => b.prioridad - a.prioridad)
    .slice(0, 3);

  if (!isSupervisor) {
    return prioritized;
  }

  return prioritized.map(s => ({
    ...s,
    actionType: 'navigate',
  }));
}
