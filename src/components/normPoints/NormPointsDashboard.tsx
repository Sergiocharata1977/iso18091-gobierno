'use client';

import { BaseCard } from '@/components/design-system/primitives/BaseCard';
import { typography } from '@/components/design-system/tokens';
import { ComplianceStats } from '@/types/normPoints';
import { AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';

export function NormPointsDashboard() {
  const [stats, setStats] = useState<ComplianceStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/norm-points/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Cargando estadisticas...</div>;
  }

  if (!stats) {
    return <div className="text-center py-8 text-muted-foreground">No hay datos disponibles</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <BaseCard>
          <div className="flex items-center justify-between mb-2">
            <p className={typography.small}>Cumplimiento Global</p>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {stats.global_percentage.toFixed(1)}%
          </div>
        </BaseCard>

        <BaseCard>
          <div className="flex items-center justify-between mb-2">
            <p className={typography.small}>Completos</p>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-foreground">{stats.by_status.completo}</div>
        </BaseCard>

        <BaseCard>
          <div className="flex items-center justify-between mb-2">
            <p className={typography.small}>Obligatorios Pendientes</p>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-foreground">{stats.mandatory_pending}</div>
        </BaseCard>

        <BaseCard>
          <div className="flex items-center justify-between mb-2">
            <p className={typography.small}>Proximas Revisiones</p>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {stats.upcoming_reviews.length}
          </div>
        </BaseCard>
      </div>

      <BaseCard>
        <p className={`${typography.small} mb-3`}>Cumplimiento por Capitulo ISO 9001</p>
        <div className="space-y-3">
          {Object.entries(stats.by_chapter).map(([chapter, percentage]) => (
            <div key={chapter}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">Capitulo {chapter}</span>
                <span className={typography.p}>{percentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </BaseCard>

      <BaseCard>
        <p className={`${typography.small} mb-3`}>Puntos por Estado de Cumplimiento</p>
        <div className="space-y-2">
          {Object.entries(stats.by_status).map(([status, count]) => (
            <div key={status} className="flex justify-between items-center">
              <span className="capitalize">{status.replace('_', ' ')}</span>
              <span className="font-semibold text-foreground">{count}</span>
            </div>
          ))}
        </div>
      </BaseCard>

      <BaseCard>
        <p className={`${typography.small} mb-3`}>Cumplimiento por Categoria</p>
        <div className="space-y-2">
          {Object.entries(stats.by_category).map(([category, percentage]) => (
            <div key={category} className="flex justify-between items-center">
              <span className="capitalize">{category}</span>
              <span className="font-semibold text-foreground">{percentage.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </BaseCard>
    </div>
  );
}
