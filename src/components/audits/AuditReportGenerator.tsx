'use client';

import { Button } from '@/components/ui/button';
import { Download, Loader2, X } from 'lucide-react';
import { useState } from 'react';

interface AuditReportGeneratorProps {
  auditId?: string;
  onClose?: () => void;
}

export function AuditReportGenerator({
  auditId,
  onClose,
}: AuditReportGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<
    'summary' | 'detailed' | 'findings' | 'actions'
  >('summary');
  const [format, setFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeForecast, setIncludeForecast] = useState(false);

  const handleGenerateReport = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        type: reportType,
        format,
        charts: includeCharts.toString(),
        forecast: includeForecast.toString(),
      });

      if (auditId) {
        params.append('auditId', auditId);
      }

      const response = await fetch(
        `/api/sdk/audits/report?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error('Error generating report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const timestamp = new Date().toISOString().split('T')[0];
      const extension =
        format === 'pdf' ? 'pdf' : format === 'excel' ? 'xlsx' : 'csv';
      a.download = `audit-report-${reportType}-${timestamp}.${extension}`;

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      onClose?.();
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error al generar el reporte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Generar Reporte</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Report Type */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          Tipo de Reporte
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              value: 'summary',
              label: 'Resumen Ejecutivo',
              desc: 'Visión general rápida',
            },
            {
              value: 'detailed',
              label: 'Reporte Detallado',
              desc: 'Análisis completo',
            },
            {
              value: 'findings',
              label: 'Hallazgos',
              desc: 'Enfoque en hallazgos',
            },
            {
              value: 'actions',
              label: 'Acciones',
              desc: 'Seguimiento de acciones',
            },
          ].map(option => (
            <button
              key={option.value}
              onClick={() => setReportType(option.value as any)}
              className={`p-3 rounded-lg border-2 transition-all text-left ${
                reportType === option.value
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="font-medium text-gray-900">{option.label}</p>
              <p className="text-xs text-gray-600">{option.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Format */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          Formato de Salida
        </label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'pdf', label: 'PDF', icon: '📄' },
            { value: 'excel', label: 'Excel', icon: '📊' },
            { value: 'csv', label: 'CSV', icon: '📋' },
          ].map(option => (
            <button
              key={option.value}
              onClick={() => setFormat(option.value as any)}
              className={`p-3 rounded-lg border-2 transition-all ${
                format === option.value
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="text-2xl mb-1">{option.icon}</p>
              <p className="font-medium text-gray-900">{option.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Options */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-900">
          Opciones Adicionales
        </label>

        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <input
            type="checkbox"
            id="charts"
            checked={includeCharts}
            onChange={e => setIncludeCharts(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300"
          />
          <label
            htmlFor="charts"
            className="text-sm text-gray-700 cursor-pointer"
          >
            Incluir gráficos y visualizaciones
          </label>
        </div>

        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <input
            type="checkbox"
            id="forecast"
            checked={includeForecast}
            onChange={e => setIncludeForecast(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300"
          />
          <label
            htmlFor="forecast"
            className="text-sm text-gray-700 cursor-pointer"
          >
            Incluir pronósticos y tendencias
          </label>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>Vista previa:</strong> Se generará un reporte de tipo{' '}
          <strong>
            {reportType === 'summary'
              ? 'Resumen Ejecutivo'
              : reportType === 'detailed'
                ? 'Detallado'
                : reportType === 'findings'
                  ? 'Hallazgos'
                  : 'Acciones'}
          </strong>{' '}
          en formato <strong>{format.toUpperCase()}</strong>
          {includeCharts && ' con gráficos'}
          {includeForecast && ' y pronósticos'}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleGenerateReport}
          disabled={loading}
          className="gap-2 bg-blue-600 hover:bg-blue-700"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          <Download className="w-4 h-4" />
          Generar Reporte
        </Button>
      </div>
    </div>
  );
}
