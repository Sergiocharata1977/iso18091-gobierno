'use client';

import {
  ACTION_TYPE_LABELS,
  ActionStats as ActionStatsType,
} from '@/types/actions';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useState } from 'react';

export function ActionStats() {
  const [stats, setStats] = useState<ActionStatsType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/actions/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Total */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Total Acciones</p>
            <p className="text-3xl font-bold text-gray-900">
              {stats.total || 0}
            </p>
          </div>
          <BarChart3 className="w-10 h-10 text-blue-500" />
        </div>
      </div>

      {/* En Progreso */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">En Control</p>
            <p className="text-3xl font-bold text-blue-600">
              {stats.byStatus?.en_control || 0}
            </p>
          </div>
          <Clock className="w-10 h-10 text-blue-500" />
        </div>
      </div>

      {/* Completadas */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Completadas</p>
            <p className="text-3xl font-bold text-green-600">
              {stats.byStatus?.completada || 0}
            </p>
          </div>
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
      </div>

      {/* Vencidas */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Vencidas</p>
            <p className="text-3xl font-bold text-red-600">
              {stats.overdueCount || 0}
            </p>
          </div>
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>
      </div>

      {/* Progreso Promedio */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Progreso Promedio</p>
            <p className="text-3xl font-bold text-purple-600">
              {stats.averageProgress || 0}%
            </p>
          </div>
          <TrendingUp className="w-10 h-10 text-purple-500" />
        </div>
      </div>

      {/* Desglose por Tipo */}
      <div className="bg-white rounded-lg shadow p-6 md:col-span-2 lg:col-span-3">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">
          Por Tipo de Acción
        </h3>
        <div className="space-y-3">
          {stats.byType &&
            Object.entries(stats.byType).map(([type, count]) => (
              <div key={type}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">
                    {
                      ACTION_TYPE_LABELS[
                        type as keyof typeof ACTION_TYPE_LABELS
                      ]
                    }
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {count}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Verificación */}
      <div className="bg-white rounded-lg shadow p-6 md:col-span-2">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">
          Verificación de Efectividad
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Verificadas</span>
            <span className="text-lg font-semibold text-gray-900">
              {stats.verifiedCount || 0}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Efectivas</span>
            <span className="text-lg font-semibold text-green-600">
              {stats.effectiveCount || 0}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">No Efectivas</span>
            <span className="text-lg font-semibold text-red-600">
              {(stats.verifiedCount || 0) - (stats.effectiveCount || 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
