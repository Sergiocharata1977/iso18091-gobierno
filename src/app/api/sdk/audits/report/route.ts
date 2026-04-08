import { withAuth } from '@/lib/sdk/middleware/auth';
import { errorHandler } from '@/lib/sdk/middleware/errorHandler';
import { AuditService } from '@/lib/sdk/modules/audits/AuditService';
import { NextResponse } from 'next/server';

export const GET = withAuth(async request => {
  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'summary';
    const format = searchParams.get('format') || 'pdf';
    const auditId = searchParams.get('auditId');
    const includeCharts = searchParams.get('charts') === 'true';
    const includeForecast = searchParams.get('forecast') === 'true';

    const auditService = new AuditService();

    let auditData;
    if (auditId) {
      // Reporte de una auditoría específica
      auditData = await auditService.getById(auditId);
      if (!auditData) {
        return NextResponse.json(
          { success: false, error: 'Auditoría no encontrada' },
          { status: 404 }
        );
      }
    } else {
      // Reporte general de todas las auditorías
      auditData = await auditService.list({}, { limit: 1000 });
    }

    if (format === 'csv') {
      return generateCSVReport(auditData, reportType);
    } else if (format === 'excel') {
      return generateExcelReport(auditData, reportType);
    } else if (format === 'pdf') {
      return generatePDFReport(
        auditData,
        reportType,
        includeCharts,
        includeForecast
      );
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

function generateCSVReport(data: any, reportType: string) {
  let csv = '';

  if (Array.isArray(data)) {
    // Reporte general
    const headers = [
      'ID',
      'Nombre',
      'Tipo',
      'Estado',
      'Proceso',
      'Conformidad',
      'Progreso',
      'Responsable',
      'Fecha Creación',
    ];

    csv = [
      headers.map(h => `"${h}"`).join(','),
      ...data.map(audit =>
        [
          audit.id || '',
          audit.name || '',
          audit.type || '',
          audit.status || '',
          audit.processName || '',
          audit.conformityStatus || '',
          audit.progress || 0,
          audit.responsible || '',
          audit.createdAt?.toDate?.().toISOString() ||
            new Date(audit.createdAt).toISOString(),
        ]
          .map(cell => `"${cell}"`)
          .join(',')
      ),
    ].join('\n');
  } else {
    // Reporte de auditoría individual
    csv = generateAuditDetailCSV(data, reportType);
  }

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="audit-report-${reportType}-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}

function generateExcelReport(data: any, reportType: string) {
  // Simulación de Excel - en producción usar librería como xlsx
  const content = JSON.stringify(
    {
      reportType,
      generatedAt: new Date().toISOString(),
      data: Array.isArray(data) ? data : [data],
    },
    null,
    2
  );

  return new NextResponse(content, {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="audit-report-${reportType}-${new Date().toISOString().split('T')[0]}.xlsx"`,
    },
  });
}

function generatePDFReport(
  data: any,
  reportType: string,
  includeCharts: boolean,
  includeForecast: boolean
) {
  // Simulación de PDF - en producción usar librería como pdfkit o html2pdf
  const content = generatePDFContent(
    data,
    reportType,
    includeCharts,
    includeForecast
  );

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="audit-report-${reportType}-${new Date().toISOString().split('T')[0]}.pdf"`,
    },
  });
}

function generateAuditDetailCSV(audit: any, reportType: string): string {
  const lines: string[] = [];

  lines.push('REPORTE DE AUDITORÍA');
  lines.push(`Tipo de Reporte,${reportType}`);
  lines.push(`Fecha de Generación,${new Date().toISOString()}`);
  lines.push('');

  lines.push('INFORMACIÓN GENERAL');
  lines.push(`ID,${audit.id}`);
  lines.push(`Nombre,${audit.name}`);
  lines.push(`Tipo,${audit.type}`);
  lines.push(`Estado,${audit.status}`);
  lines.push(`Proceso,${audit.processName}`);
  lines.push(`Conformidad,${audit.conformityStatus}`);
  lines.push(`Progreso,${audit.progress}%`);
  lines.push(`Responsable,${audit.responsible}`);
  lines.push(`Descripción,${(audit.description || '').replace(/"/g, '""')}`);
  lines.push('');

  if (reportType === 'findings' || reportType === 'detailed') {
    lines.push('HALLAZGOS');
    if (audit.findings && Array.isArray(audit.findings)) {
      lines.push('ID,Nombre,Categoría,Severidad,Estado,Progreso');
      audit.findings.forEach((finding: any) => {
        lines.push(
          `${finding.id},${finding.registration?.name},${finding.registration?.category},${finding.registration?.severity},${finding.status},${finding.progress}%`
        );
      });
    }
    lines.push('');
  }

  if (reportType === 'actions' || reportType === 'detailed') {
    lines.push('ACCIONES');
    if (audit.actions && Array.isArray(audit.actions)) {
      lines.push(
        'ID,Descripción,Tipo,Estado,Responsable,Prioridad,Fecha Límite,Progreso'
      );
      audit.actions.forEach((action: any) => {
        lines.push(
          `${action.id},${action.description},${action.type},${action.status},${action.responsible},${action.priority},${action.dueDate},${action.progress}%`
        );
      });
    }
    lines.push('');
  }

  return lines.join('\n');
}

function generatePDFContent(
  data: any,
  reportType: string,
  includeCharts: boolean,
  includeForecast: boolean
): string {
  // Simulación de contenido PDF en texto plano
  // En producción, usar librería como pdfkit
  const lines: string[] = [];

  lines.push('═'.repeat(80));
  lines.push('REPORTE DE AUDITORÍA - ' + reportType.toUpperCase());
  lines.push('═'.repeat(80));
  lines.push('');
  lines.push(`Fecha de Generación: ${new Date().toLocaleString('es-ES')}`);
  lines.push('');

  if (Array.isArray(data)) {
    lines.push('RESUMEN GENERAL');
    lines.push('-'.repeat(80));
    lines.push(`Total de Auditorías: ${data.length}`);
    lines.push(
      `Completadas: ${data.filter((a: any) => a.status === 'completada').length}`
    );
    lines.push(
      `En Ejecución: ${data.filter((a: any) => a.status === 'en_ejecucion').length}`
    );
    lines.push(
      `Pendientes: ${data.filter((a: any) => a.status === 'planificada').length}`
    );
    lines.push('');

    if (includeCharts) {
      lines.push('GRÁFICOS Y VISUALIZACIONES');
      lines.push('-'.repeat(80));
      lines.push('[Gráfico de distribución por estado]');
      lines.push('[Gráfico de tendencias]');
      lines.push('');
    }

    if (includeForecast) {
      lines.push('PRONÓSTICOS Y TENDENCIAS');
      lines.push('-'.repeat(80));
      lines.push('[Análisis de tendencias futuras]');
      lines.push('[Proyecciones de conformidad]');
      lines.push('');
    }
  } else {
    lines.push('INFORMACIÓN DE LA AUDITORÍA');
    lines.push('-'.repeat(80));
    lines.push(`Nombre: ${data.name}`);
    lines.push(`Tipo: ${data.type}`);
    lines.push(`Estado: ${data.status}`);
    lines.push(`Proceso: ${data.processName}`);
    lines.push(`Conformidad: ${data.conformityStatus}`);
    lines.push(`Progreso: ${data.progress}%`);
    lines.push(`Responsable: ${data.responsible}`);
    lines.push('');
    lines.push(`Descripción: ${data.description}`);
    lines.push('');

    if (
      (reportType === 'findings' || reportType === 'detailed') &&
      data.findings
    ) {
      lines.push('HALLAZGOS ENCONTRADOS');
      lines.push('-'.repeat(80));
      data.findings.forEach((finding: any, index: number) => {
        lines.push(`${index + 1}. ${finding.registration?.name}`);
        lines.push(`   Categoría: ${finding.registration?.category}`);
        lines.push(`   Severidad: ${finding.registration?.severity}`);
        lines.push(`   Estado: ${finding.status}`);
        lines.push(`   Progreso: ${finding.progress}%`);
        lines.push('');
      });
    }

    if (
      (reportType === 'actions' || reportType === 'detailed') &&
      data.actions
    ) {
      lines.push('ACCIONES CORRECTIVAS/PREVENTIVAS');
      lines.push('-'.repeat(80));
      data.actions.forEach((action: any, index: number) => {
        lines.push(`${index + 1}. ${action.description}`);
        lines.push(`   Tipo: ${action.type}`);
        lines.push(`   Responsable: ${action.responsible}`);
        lines.push(`   Prioridad: ${action.priority}`);
        lines.push(`   Estado: ${action.status}`);
        lines.push(`   Progreso: ${action.progress}%`);
        lines.push('');
      });
    }
  }

  lines.push('═'.repeat(80));
  lines.push('FIN DEL REPORTE');
  lines.push('═'.repeat(80));

  return lines.join('\n');
}
