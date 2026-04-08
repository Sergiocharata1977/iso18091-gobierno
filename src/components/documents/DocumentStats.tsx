'use client';

import { BarChart3, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface DocumentStatsData {
  total: number;
  byStatus: {
    draft: number;
    review: number;
    approved: number;
    published: number;
    archived: number;
  };
  byCategory: Record<string, number>;
  totalVersions: number;
  averageVersionsPerDocument: number;
  totalAccess: number;
  averageAccessPerDocument: number;
  mostAccessedDocument?: any;
  recentlyUpdated?: any[];
}

export function DocumentStats() {
  const [stats, setStats] = useState<DocumentStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/sdk/documents/stats');
        if (!response.ok) throw new Error('Failed to fetch stats');

        const data = await response.json();
        setStats(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        {error}
      </div>
    );
  }

  if (!stats) return null;

  const statusPercentages = {
    draft: Math.round((stats.byStatus.draft / stats.total) * 100),
    review: Math.round((stats.byStatus.review / stats.total) * 100),
    approved: Math.round((stats.byStatus.approved / stats.total) * 100),
    published: Math.round((stats.byStatus.published / stats.total) * 100),
    archived: Math.round((stats.byStatus.archived / stats.total) * 100),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="h-6 w-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">
          Estadísticas de Documentos
        </h2>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600">Total de Documentos</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
        </div>
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600">Total de Versiones</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {stats.totalVersions}
          </p>
        </div>
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600">Promedio de Versiones</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {stats.averageVersionsPerDocument}
          </p>
        </div>
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600">Total de Accesos</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {stats.totalAccess}
          </p>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="p-6 bg-white border border-gray-200 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Distribución por Estado
        </h3>
        <div className="space-y-3">
          {Object.entries(stats.byStatus).map(([status, count]) => (
            <div key={status}>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {status}
                </span>
                <span className="text-sm text-gray-600">
                  {count} (
                  {statusPercentages[status as keyof typeof statusPercentages]}
                  %)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${statusPercentages[status as keyof typeof statusPercentages]}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Categories */}
      {Object.keys(stats.byCategory).length > 0 && (
        <div className="p-6 bg-white border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Documentos por Categoría
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(stats.byCategory).map(([category, count]) => (
              <div key={category} className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700">{category}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Most Accessed */}
      {stats.mostAccessedDocument && (
        <div className="p-6 bg-white border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Documento Más Accedido
          </h3>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="font-semibold text-gray-900">
              {stats.mostAccessedDocument.title}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {stats.mostAccessedDocument.description}
            </p>
            <p className="text-sm text-blue-600 font-medium mt-2">
              {stats.mostAccessedDocument.accessCount || 0} accesos
            </p>
          </div>
        </div>
      )}

      {/* Recently Updated */}
      {stats.recentlyUpdated && stats.recentlyUpdated.length > 0 && (
        <div className="p-6 bg-white border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Documentos Actualizados Recientemente
          </h3>
          <div className="space-y-3">
            {stats.recentlyUpdated.slice(0, 5).map((doc: any, idx: number) => (
              <div key={idx} className="p-3 border border-gray-200 rounded-lg">
                <p className="font-medium text-gray-900">{doc.title}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Actualizado: {new Date(doc.updatedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
