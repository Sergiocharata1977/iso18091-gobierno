'use client';

import { Button } from '@/components/ui/button';
import type { Audit } from '@/types/audits';
import { Download, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface AuditExportButtonProps {
  audits: Audit[];
  filename?: string;
}

export function AuditExportButton({
  audits,
  filename = 'auditorias',
}: AuditExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const exportToCSV = async () => {
    try {
      setIsExporting(true);

      // Prepare CSV headers
      const headers = [
        'Número',
        'Título',
        'Tipo',
        'Estado',
        'Alcance',
        'Auditor Líder',
        'Fecha Planificada',
        'Puntos de Norma',
        'Conformes',
        'No Conformidades Mayores',
        'No Conformidades Menores',
        'Fecha Creación',
      ];

      // Prepare CSV rows
      const rows = audits.map(audit => {
        const conformStats = {
          CF: 0,
          NCM: 0,
          NCm: 0,
          NCT: 0,
          R: 0,
          OM: 0,
          F: 0,
        };

        audit.normPointsVerification?.forEach(v => {
          if (v.conformityStatus && v.conformityStatus in conformStats) {
            conformStats[v.conformityStatus as keyof typeof conformStats]++;
          }
        });

        const plannedDate = audit.plannedDate?.toDate
          ? audit.plannedDate.toDate().toLocaleDateString('es-ES')
          : 'N/A';

        const createdDate = audit.createdAt?.toDate
          ? audit.createdAt.toDate().toLocaleDateString('es-ES')
          : 'N/A';

        return [
          audit.auditNumber || '',
          audit.title || '',
          audit.auditType === 'complete' ? 'Completa' : 'Parcial',
          audit.status === 'planned'
            ? 'Planificada'
            : audit.status === 'in_progress'
              ? 'En Progreso'
              : 'Completada',
          audit.scope || '',
          audit.leadAuditor || '',
          plannedDate,
          audit.selectedNormPoints?.join(', ') || '',
          conformStats.CF,
          conformStats.NCM,
          conformStats.NCm,
          createdDate,
        ];
      });

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row =>
          row
            .map(cell => {
              // Escape quotes and wrap in quotes if contains comma
              const cellStr = String(cell);
              return cellStr.includes(',') || cellStr.includes('"')
                ? `"${cellStr.replace(/"/g, '""')}"`
                : cellStr;
            })
            .join(',')
        ),
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      const timestamp = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}-${timestamp}.csv`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      alert('Error al exportar auditorías');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={exportToCSV}
      disabled={isExporting || audits.length === 0}
      variant="outline"
      className="gap-2"
    >
      {isExporting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      {isExporting ? 'Exportando...' : 'Exportar CSV'}
    </Button>
  );
}
