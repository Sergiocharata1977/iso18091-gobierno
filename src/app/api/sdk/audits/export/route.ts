import { withAuth } from '@/lib/sdk/middleware/auth';
import { errorHandler } from '@/lib/sdk/middleware/errorHandler';
import { AuditService } from '@/lib/sdk/modules/audits/AuditService';
import { NextResponse } from 'next/server';

export const GET = withAuth(async request => {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';
    const format = searchParams.get('format') || 'csv';

    const auditService = new AuditService();

    // Calcular fechas según el período
    const now = new Date();
    const startDate = new Date();

    switch (period) {
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'month':
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    // Obtener auditorías del período
    const audits = await auditService.list({}, { limit: 1000 });

    if (format === 'csv') {
      return exportToCSV(audits);
    } else if (format === 'json') {
      return exportToJSON(audits);
    } else {
      return NextResponse.json(
        { success: false, error: 'Formato no soportado' },
        { status: 400 }
      );
    }
  } catch (error) {
    return errorHandler(error);
  }
});

function exportToCSV(audits: any[]) {
  // Headers
  const headers = [
    'ID',
    'Nombre',
    'Tipo',
    'Estado',
    'Proceso',
    'Conformidad',
    'Progreso',
    'Fecha Creación',
    'Fecha Actualización',
    'Responsable',
    'Descripción',
  ];

  // Rows
  const rows = audits.map(audit => [
    audit.id || '',
    audit.name || '',
    audit.type || '',
    audit.status || '',
    audit.processName || '',
    audit.conformityStatus || '',
    audit.progress || 0,
    audit.createdAt?.toDate?.().toISOString() ||
      new Date(audit.createdAt).toISOString(),
    audit.updatedAt?.toDate?.().toISOString() ||
      new Date(audit.updatedAt).toISOString(),
    audit.responsible || '',
    (audit.description || '').replace(/"/g, '""'),
  ]);

  // Crear CSV
  const csv = [
    headers.map(h => `"${h}"`).join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  // Retornar como archivo
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="audits-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}

function exportToJSON(audits: any[]) {
  const data = {
    exportDate: new Date().toISOString(),
    totalAudits: audits.length,
    audits: audits.map(audit => ({
      id: audit.id,
      name: audit.name,
      type: audit.type,
      status: audit.status,
      processName: audit.processName,
      conformityStatus: audit.conformityStatus,
      progress: audit.progress,
      createdAt:
        audit.createdAt?.toDate?.().toISOString() ||
        new Date(audit.createdAt).toISOString(),
      updatedAt:
        audit.updatedAt?.toDate?.().toISOString() ||
        new Date(audit.updatedAt).toISOString(),
      responsible: audit.responsible,
      description: audit.description,
      findings: audit.findings || [],
      actions: audit.actions || [],
    })),
  };

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="audits-${new Date().toISOString().split('T')[0]}.json"`,
    },
  });
}
