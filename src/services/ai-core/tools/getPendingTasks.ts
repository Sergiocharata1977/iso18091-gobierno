import { getAdminFirestore } from '@/lib/firebase/admin';
import { UserContextService } from '@/services/context/UserContextService';
import type { ToolDefinition } from '@/types/ai-tools';

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (
    typeof value === 'object' &&
    value !== null &&
    'seconds' in (value as Record<string, unknown>)
  ) {
    const seconds = Number((value as Record<string, unknown>).seconds);
    return Number.isFinite(seconds) ? new Date(seconds * 1000) : null;
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function statusIsCompleted(status: unknown): boolean {
  const s = String(status || '').toLowerCase();
  return (
    s === 'completado' ||
    s === 'completed' ||
    s === 'cerrada' ||
    s === 'cerrado'
  );
}

export const getPendingTasksTool: ToolDefinition = {
  name: 'getPendingTasks',
  description:
    'Retorna resumen real de tareas pendientes/vencidas desde contexto del usuario',
  matches: inputText =>
    /(tareas?|pendientes|vencidas|vencidos)/i.test(inputText) &&
    !/(crear|registr|no conform|\bnc\b)/i.test(inputText),
  score: inputText => {
    let score = 0;
    if (/(tareas?)/i.test(inputText)) score += 40;
    if (/(pendientes)/i.test(inputText)) score += 30;
    if (/(vencid)/i.test(inputText)) score += 30;
    return score;
  },
  async execute(ctx) {
    const userCtx = await UserContextService.getUserFullContext(ctx.userId);
    const now = new Date();
    const records = (
      Array.isArray(userCtx.processRecords) ? userCtx.processRecords : []
    ) as any[];

    const pendingRecords = records.filter(r => !statusIsCompleted(r?.estado));
    const overdueRecords = pendingRecords.filter(r => {
      const due = toDate(r?.fecha_vencimiento);
      return !!due && due < now;
    });

    const indicators = (
      Array.isArray(userCtx.indicadores) ? userCtx.indicadores : []
    ) as any[];
    let overdueMeasurements = 0;
    for (const ind of indicators) {
      const freq = String(ind?.measurement_frequency || ind?.frecuencia || '')
        .toLowerCase()
        .trim();
      const freqDays =
        freq === 'diaria'
          ? 1
          : freq === 'semanal'
            ? 7
            : freq === 'mensual'
              ? 30
              : freq === 'trimestral'
                ? 90
                : freq === 'anual'
                  ? 365
                  : 30;
      const last = toDate(ind?.last_measurement_date || ind?.ultima_medicion);
      if (!last) {
        overdueMeasurements += 1;
        continue;
      }
      const due = new Date(last.getTime() + freqDays * 86400000);
      if (due <= now) overdueMeasurements += 1;
    }

    // CRM acciones comerciales asignadas al usuario (vendedor_id)
    let crmOpenActions = 0;
    let crmOverdueActions = 0;
    try {
      const db = getAdminFirestore();
      const crmSnap = await db
        .collection('organizations')
        .doc(ctx.organizationId)
        .collection('crm_acciones')
        .where('vendedor_id', '==', ctx.userId)
        .limit(500)
        .get();

      crmSnap.docs.forEach(doc => {
        const a = (doc.data() || {}) as Record<string, unknown>;
        const estado = String(a.estado || '').toLowerCase();
        const isOpen = !['completada', 'cerrada', 'cancelada'].includes(estado);
        if (!isOpen) return;
        crmOpenActions += 1;

        const due = toDate(a.fecha_programada || a.fecha_vencimiento);
        if (due && due < now) crmOverdueActions += 1;
      });
    } catch (error) {
      // No bloquear la tool por CRM; dejar constancia en data
      console.warn(
        '[AI Tool getPendingTasks] CRM actions lookup failed:',
        error
      );
    }

    const summaryTextParts = [
      `Procesos asignados: ${userCtx.procesos?.length || 0}`,
      `Registros pendientes: ${pendingRecords.length}`,
      `Registros vencidos: ${overdueRecords.length}`,
      `Indicadores asignados: ${indicators.length}`,
      `Mediciones vencidas/pendientes: ${overdueMeasurements}`,
      `Acciones CRM abiertas: ${crmOpenActions}`,
      `Acciones CRM vencidas: ${crmOverdueActions}`,
    ];

    return {
      success: true,
      text: `Resumen de pendientes: ${summaryTextParts.join(' | ')}.`,
      data: {
        processCount: userCtx.procesos?.length || 0,
        pendingProcessRecords: pendingRecords.length,
        overdueProcessRecords: overdueRecords.length,
        indicatorsCount: indicators.length,
        overdueMeasurements,
        crmOpenActions,
        crmOverdueActions,
        source: 'UserContextService',
      },
      actionLogAction: 'read_pending_tasks',
    };
  },
};
