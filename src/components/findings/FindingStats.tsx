'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FindingStats as FindingStatsType } from '@/types/findings';
import { AlertTriangle, CheckCircle, FileText, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';

export function FindingStats() {
  const [stats, setStats] = useState<FindingStatsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/findings/stats');
      if (!response.ok) throw new Error('Error al cargar estadísticas');

      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !stats) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Hallazgos</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
        </CardContent>
      </Card>

      {/* Cerrados */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cerrados</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.closedCount}</div>
          <p className="text-xs text-muted-foreground">
            {stats.total > 0
              ? Math.round((stats.closedCount / stats.total) * 100)
              : 0}
            % del total
          </p>
        </CardContent>
      </Card>

      {/* Requieren Acción */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Requieren Acción
          </CardTitle>
          <AlertTriangle className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.requiresActionCount}</div>
        </CardContent>
      </Card>

      {/* Progreso Promedio */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Progreso Promedio
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.averageProgress}%</div>
        </CardContent>
      </Card>
    </div>
  );
}
