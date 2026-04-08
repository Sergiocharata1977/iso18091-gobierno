/**
 * Botón reutilizable que muestra el estado de madurez de un módulo específico.
 * Usa los datos existentes de Madurez Organizacional.
 */

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/firebase/config';
import { ImplementationMaturity, MaturityTaskNode } from '@/types/maturity';
import { doc, onSnapshot } from 'firebase/firestore';
import { BarChart3, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

// Mapeo de módulos a tareas del árbol de madurez
const MODULE_TASK_MAP: Record<
  string,
  { taskIds: string[]; title: string; color: string }
> = {
  // RRHH - Recursos Humanos
  rrhh: {
    taskIds: ['sup_hr', 'sup_training'],
    title: 'Recursos Humanos',
    color: '#10b981', // Green
  },
  personal: {
    taskIds: ['sup_hr'],
    title: 'Personal',
    color: '#10b981',
  },
  capacitaciones: {
    taskIds: ['sup_training'],
    title: 'Capacitación',
    color: '#10b981',
  },
  // Mejoras
  mejoras: {
    taskIds: ['ctrl_nconformance', 'ctrl_audit'],
    title: 'Control y Mejora',
    color: '#f59e0b', // Amber
  },
  hallazgos: {
    taskIds: ['ctrl_nconformance'],
    title: 'Hallazgos',
    color: '#f59e0b',
  },
  // Procesos
  procesos: {
    taskIds: [
      'op_purchases',
      'op_sales',
      'op_stock',
      'op_production',
      'op_logistics',
    ],
    title: 'Procesos Operativos',
    color: '#3b82f6', // Blue
  },
  // Documentación
  documentos: {
    taskIds: ['sup_docs'],
    title: 'Documentación',
    color: '#10b981',
  },
  // Calidad
  calidad: {
    taskIds: ['ctrl_kpi', 'ctrl_customer_sat'],
    title: 'Indicadores de Calidad',
    color: '#f59e0b',
  },
  // Planificación
  planificacion: {
    taskIds: ['dir_context', 'dir_planning', 'dir_review', 'dir_risk'],
    title: 'Dirección Estratégica',
    color: '#8b5cf6', // Violet
  },
};

interface ModuleMaturityButtonProps {
  moduleKey: keyof typeof MODULE_TASK_MAP;
  className?: string;
}

export function ModuleMaturityButton({
  moduleKey,
  className = '',
}: ModuleMaturityButtonProps) {
  const { user } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [maturityData, setMaturityData] =
    useState<ImplementationMaturity | null>(null);
  const [loading, setLoading] = useState(true);

  const moduleConfig = MODULE_TASK_MAP[moduleKey];

  // Escuchar cambios en madurez
  useEffect(() => {
    if (!user?.organization_id) {
      setLoading(false);
      return;
    }

    const maturityRef = doc(
      db,
      'organizations',
      user.organization_id,
      'maturity',
      'current'
    );

    const unsubscribe = onSnapshot(
      maturityRef,
      docSnap => {
        if (docSnap.exists()) {
          setMaturityData(docSnap.data() as ImplementationMaturity);
        } else {
          setMaturityData(null);
        }
        setLoading(false);
      },
      err => {
        const code = (err as { code?: string } | null)?.code;
        if (code === 'permission-denied') {
          // Estado esperado en algunos roles/tenants: no bloquear la UI ni ensuciar consola.
          console.warn('Maturity data not accessible for current user/role');
          setMaturityData(null);
          setLoading(false);
          return;
        }
        console.error('Error fetching maturity data:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.organization_id]);

  // Filtrar tareas del módulo
  const moduleTasks = useMemo(() => {
    if (!maturityData || !moduleConfig) return [];

    const tasks: MaturityTaskNode[] = [];

    // Buscar en todos los niveles
    Object.values(maturityData.levels).forEach(levelStatus => {
      levelStatus.tasks.forEach(task => {
        if (moduleConfig.taskIds.includes(task.id)) {
          tasks.push(task);
        }
      });
    });

    return tasks;
  }, [maturityData, moduleConfig]);

  // Calcular score promedio del módulo
  const moduleScore = useMemo(() => {
    if (moduleTasks.length === 0) return 0;
    const total = moduleTasks.reduce((sum, task) => sum + (task.score || 0), 0);
    return Math.round(total / moduleTasks.length);
  }, [moduleTasks]);

  // Preparar datos para el gráfico
  const chartData = useMemo(() => {
    return moduleTasks.map(task => ({
      name:
        task.name.length > 15 ? task.name.substring(0, 13) + '...' : task.name,
      fullName: task.name,
      score: task.score || 0,
      exists: task.exists,
    }));
  }, [moduleTasks]);

  if (!moduleConfig) return null;

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setShowDialog(true)}
        className={`bg-white ${className}`}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <BarChart3 className="w-4 h-4 mr-2" />
        )}
        {moduleScore}%
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[500px] bg-white">
          <DialogHeader>
            <DialogTitle>Estado: {moduleConfig.title}</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : !maturityData ? (
            <div className="py-8 text-center text-gray-500">
              <p>Sin datos de madurez.</p>
              <p className="text-sm mt-2">
                Visitá <strong>Mi SGC → Madurez</strong> para ver el diagnóstico
                completo.
              </p>
            </div>
          ) : moduleTasks.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <p>Este módulo no tiene tareas de madurez asignadas.</p>
            </div>
          ) : (
            <div className="py-4 space-y-4">
              {/* Score general del módulo */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Nivel de Madurez
                    </CardTitle>
                    <span
                      className="text-2xl font-bold"
                      style={{ color: moduleConfig.color }}
                    >
                      {moduleScore}%
                    </span>
                  </div>
                  <Progress
                    value={moduleScore}
                    className="h-2"
                    indicatorColor={moduleConfig.color}
                  />
                </CardHeader>
              </Card>

              {/* Gráfico de barras */}
              {chartData.length > 0 && (
                <Card>
                  <CardContent className="pt-4">
                    <ResponsiveContainer
                      width="100%"
                      height={chartData.length * 45 + 20}
                    >
                      <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          horizontal={false}
                          stroke="#e5e7eb"
                        />
                        <XAxis type="number" domain={[0, 100]} hide />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={100}
                          tick={{ fontSize: 11, fill: '#6b7280' }}
                        />
                        <Tooltip
                          cursor={{ fill: 'transparent' }}
                          contentStyle={{
                            borderRadius: '8px',
                            border: 'none',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          }}
                          formatter={(value: number | undefined) => [
                            `${value ?? 0}%`,
                            'Score',
                          ]}
                        />
                        <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={20}>
                          {chartData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                entry.score > 0 ? moduleConfig.color : '#e5e7eb'
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Explicación */}
              <p className="text-xs text-gray-500 text-center">
                Basado en el diagnóstico de Madurez Organizacional
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
