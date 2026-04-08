'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface AuditStats {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  conformityRate: number;
  averageProgress: number;
  trends: Array<{
    month: string;
    completed: number;
    pending: number;
  }>;
  topFindings: Array<{
    category: string;
    count: number;
  }>;
  topProcesses: Array<{
    name: string;
    auditCount: number;
    conformityRate: number;
  }>;
}

export default function AuditsDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    fetchStats();
  }, [period]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/sdk/audits/stats?period=${period}`);
      const result = await response.json();

      if (result.success && result.data) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/sdk/audits/export?period=${period}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audits-dashboard-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting dashboard:', error);
      alert('Error al exportar el dashboard');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">No hay datos disponibles</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard de Auditorías
          </h1>
          <p className="text-gray-600 mt-1">
            Estadísticas y análisis de auditorías
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => router.push('/auditorias')}
            variant="outline"
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Button>
          <Button
            onClick={handleExport}
            className="gap-2 bg-purple-600 hover:bg-purple-700"
          >
            <Download className="w-4 h-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-2">
          {(['month', 'quarter', 'year'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p === 'month'
                ? 'Este Mes'
                : p === 'quarter'
                  ? 'Este Trimestre'
                  : 'Este Año'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Total de Auditorías</p>
          <p className="text-4xl font-bold text-blue-600">{stats.total}</p>
          <p className="text-xs text-gray-500 mt-2">Período seleccionado</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Tasa de Conformidad</p>
          <p className="text-4xl font-bold text-green-600">
            {stats.conformityRate}%
          </p>
          <div className="w-full h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-green-600"
              style={{ width: `${stats.conformityRate}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Progreso Promedio</p>
          <p className="text-4xl font-bold text-purple-600">
            {stats.averageProgress}%
          </p>
          <div className="w-full h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-purple-600"
              style={{ width: `${stats.averageProgress}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Auditorías Completadas</p>
          <p className="text-4xl font-bold text-orange-600">
            {stats.byStatus['completada'] || 0}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {stats.total > 0
              ? Math.round(
                  ((stats.byStatus['completada'] || 0) / stats.total) * 100
                )
              : 0}
            % del total
          </p>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Distribución por Estado
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.byStatus).map(([status, count]) => (
              <div key={status}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    {getStatusLabel(status)}
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {count}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getStatusBarColor(status)}`}
                    style={{
                      width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Type */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Distribución por Tipo
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.byType).map(([type, count]) => (
              <div key={type}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    {getTypeLabel(type)}
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {count}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getTypeBarColor(type)}`}
                    style={{
                      width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Findings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Hallazgos Más Frecuentes
        </h3>
        <div className="space-y-3">
          {stats.topFindings.map((finding, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                {finding.category}
              </span>
              <div className="flex items-center gap-3">
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500"
                    style={{
                      width: `${
                        stats.topFindings.length > 0
                          ? (finding.count /
                              Math.max(
                                ...stats.topFindings.map(f => f.count)
                              )) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <span className="text-sm font-bold text-gray-900 w-8 text-right">
                  {finding.count}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Processes */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Procesos Más Auditados
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Proceso
                </th>
                <th className="text-center py-3 px-4 font-semibold text-gray-900">
                  Auditorías
                </th>
                <th className="text-center py-3 px-4 font-semibold text-gray-900">
                  Conformidad
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.topProcesses.map((process, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-900">{process.name}</td>
                  <td className="py-3 px-4 text-center text-gray-900">
                    {process.auditCount}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500"
                          style={{ width: `${process.conformityRate}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-900 w-10 text-right">
                        {process.conformityRate}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trends */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Tendencias Históricas
        </h3>
        <div className="space-y-4">
          {stats.trends.map((trend, index) => (
            <div key={index}>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {trend.month}
                </span>
                <span className="text-sm text-gray-600">
                  Completadas: {trend.completed} | Pendientes: {trend.pending}
                </span>
              </div>
              <div className="flex gap-1 h-8">
                <div
                  className="bg-green-500 rounded-l"
                  style={{
                    width: `${
                      trend.completed + trend.pending > 0
                        ? (trend.completed /
                            (trend.completed + trend.pending)) *
                          100
                        : 0
                    }%`,
                  }}
                  title={`Completadas: ${trend.completed}`}
                />
                <div
                  className="bg-yellow-500 rounded-r"
                  style={{
                    width: `${
                      trend.completed + trend.pending > 0
                        ? (trend.pending / (trend.completed + trend.pending)) *
                          100
                        : 0
                    }%`,
                  }}
                  title={`Pendientes: ${trend.pending}`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    planificada: 'Planificada',
    en_ejecucion: 'En Ejecución',
    completada: 'Completada',
    verificada: 'Verificada',
    cerrada: 'Cerrada',
  };
  return labels[status] || status;
}

function getStatusBarColor(status: string): string {
  const colors: Record<string, string> = {
    planificada: 'bg-blue-500',
    en_ejecucion: 'bg-yellow-500',
    completada: 'bg-green-500',
    verificada: 'bg-purple-500',
    cerrada: 'bg-gray-500',
  };
  return colors[status] || 'bg-gray-500';
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    interna: 'Auditoría Interna',
    externa: 'Auditoría Externa',
    seguimiento: 'Auditoría de Seguimiento',
  };
  return labels[type] || type;
}

function getTypeBarColor(type: string): string {
  const colors: Record<string, string> = {
    interna: 'bg-blue-500',
    externa: 'bg-orange-500',
    seguimiento: 'bg-green-500',
  };
  return colors[type] || 'bg-gray-500';
}
