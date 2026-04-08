import { withAuth } from '@/lib/api/withAuth';
import { ActionService } from '@/services/actions/ActionService';
import { FindingService } from '@/services/findings/FindingService';
import { DocumentService } from '@/services/documents/DocumentService';
import { adminDb } from '@/firebase/admin';
import { NextResponse } from 'next/server';
import type { ProcessMetric } from '@/types/process-map';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (_request, _context, auth) => {
  const orgId = auth.organizationId;
  if (!orgId) {
    return NextResponse.json({ error: 'organization_id requerido' }, { status: 400 });
  }

  const metrics: Record<string, ProcessMetric> = {};

  const [actionRes, findingRes, docRes, auditRes, personnelRes, crmRes] =
    await Promise.allSettled([
      ActionService.getStats(orgId),
      FindingService.getStats(orgId),
      DocumentService.getStats(orgId),
      adminDb
        .collection('audits')
        .where('organization_id', '==', orgId)
        .where('status', 'in', ['planned', 'in_progress'])
        .count()
        .get(),
      adminDb
        .collection('personnel')
        .where('organization_id', '==', orgId)
        .where('estado', '==', 'Activo')
        .count()
        .get(),
      adminDb
        .collection('crm_oportunidades')
        .where('organization_id', '==', orgId)
        .count()
        .get(),
    ]);

  // Acciones correctivas
  if (actionRes.status === 'fulfilled') {
    const s = actionRes.value;
    const overdue = s.overdueCount ?? 0;
    metrics.acciones = {
      pending: overdue,
      total: s.total,
      status: overdue > 0 ? 'warning' : 'ok',
    };
    metrics.planificacion = {
      total: s.total,
      status: overdue > 3 ? 'warning' : 'ok',
    };
  }

  // Hallazgos
  if (findingRes.status === 'fulfilled') {
    const s = findingRes.value;
    const open = s.total - (s.closedCount ?? 0);
    metrics.hallazgos = {
      pending: open,
      total: s.total,
      status: open > 5 ? 'warning' : 'ok',
    };
  }

  // Documentación
  if (docRes.status === 'fulfilled') {
    const s = docRes.value;
    metrics.documentos = {
      pending: s.expiring_soon ?? 0,
      total: s.total,
      status: (s.expiring_soon ?? 0) > 0 ? 'warning' : 'ok',
    };
  }

  // Auditorías activas
  if (auditRes.status === 'fulfilled') {
    const active = auditRes.value.data().count;
    metrics.auditorias = { pending: active, total: active, status: 'ok' };
  }

  // Recursos Humanos — personal activo
  if (personnelRes.status === 'fulfilled') {
    const count = personnelRes.value.data().count;
    metrics.rrhh = { total: count, status: 'ok' };
  }

  // CRM — oportunidades
  if (crmRes.status === 'fulfilled') {
    const count = crmRes.value.data().count;
    metrics.crm_ventas = { total: count, status: 'ok' };
    metrics.ventas = { total: count, status: 'ok' };
  }

  return NextResponse.json(metrics);
});
