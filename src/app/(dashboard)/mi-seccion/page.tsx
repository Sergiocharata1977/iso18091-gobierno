'use client';

import { CreateTaskDialog } from '@/components/private-sections/CreateTaskDialog';
import { TaskKanban } from '@/components/private-sections/TaskKanban';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import type {
  UserDashboardData,
  UserPrivateTask,
} from '@/types/private-sections';
import {
  AlertTriangle,
  Calendar,
  CheckSquare,
  LayoutGrid,
  List,
  Target,
} from 'lucide-react';
import { useEffect, useState } from 'react';

export default function MiSeccionPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<UserDashboardData | null>(null);
  const [allTasks, setAllTasks] = useState<UserPrivateTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [dashboardRes, tasksRes] = await Promise.all([
        fetch(`/api/users/${user?.id}/dashboard`),
        fetch(`/api/users/${user?.id}/tasks`),
      ]);

      const dashboardData = await dashboardRes.json();
      const tasksData = await tasksRes.json();

      setDashboard(dashboardData);
      setAllTasks(tasksData.tasks || []);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Mi Sección
          </h1>
          <p className="mt-2 text-muted-foreground">
            Tu espacio personal de trabajo y seguimiento
          </p>
        </div>
        <CreateTaskDialog onTaskCreated={fetchData} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">
            <LayoutGrid className="w-4 h-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="kanban">
            <List className="w-4 h-4 mr-2" />
            Kanban
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 mt-6">
          {/* Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              title="Tareas Pendientes"
              value={dashboard?.summary.pending_tasks || 0}
              icon={CheckSquare}
              color="blue"
            />
            <StatCard
              title="Metas Activas"
              value={dashboard?.summary.active_goals || 0}
              icon={Target}
              color="green"
            />
            <StatCard
              title="Auditorías Próximas"
              value={dashboard?.summary.upcoming_audits || 0}
              icon={Calendar}
              color="purple"
            />
            <StatCard
              title="Hallazgos Abiertos"
              value={dashboard?.summary.open_findings || 0}
              icon={AlertTriangle}
              color="orange"
            />
          </div>

          {/* Tareas Urgentes */}
          <Card>
            <CardHeader>
              <CardTitle>Tareas Urgentes</CardTitle>
            </CardHeader>
            <CardContent>
              {dashboard?.tasks && dashboard.tasks.length > 0 ? (
                <div className="space-y-3">
                  {dashboard.tasks.map(task => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between rounded-lg border border-card-border p-3 transition-colors hover:bg-accent"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`}
                        />
                        <div>
                          <p className="font-medium text-foreground">
                            {task.title}
                          </p>
                          {task.due_date && (
                            <p className="text-sm text-muted-foreground">
                              Vence:{' '}
                              {new Date(task.due_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getStatusColor(task.status)}`}
                      >
                        {getStatusLabel(task.status)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-muted-foreground">
                  No tienes tareas urgentes 🎉
                </p>
              )}
            </CardContent>
          </Card>

          {/* Actividad Reciente */}
          <Card>
            <CardHeader>
              <CardTitle>Actividad Reciente</CardTitle>
            </CardHeader>
            <CardContent>
              {dashboard?.recent_activity &&
              dashboard.recent_activity.length > 0 ? (
                <div className="space-y-3">
                  {dashboard.recent_activity.map((activity, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-accent"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {activity.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {activity.type === 'task'
                            ? '📋 Tarea'
                            : '🔍 Auditoría'}{' '}
                          • {new Date(activity.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-muted-foreground">
                  No hay actividad reciente
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kanban" className="mt-6">
          <TaskKanban tasks={allTasks} onTaskUpdated={fetchData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green:
      'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    purple:
      'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    orange:
      'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-2 text-3xl font-bold text-foreground">
              {value}
            </p>
          </div>
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}
          >
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getPriorityColor(priority: string) {
  const colors = {
    urgent: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500',
  };
  return colors[priority as keyof typeof colors] || colors.medium;
}

function getStatusColor(status: string) {
  const colors = {
    pending: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    in_progress:
      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    review:
      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    completed:
      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  };
  return colors[status as keyof typeof colors] || colors.pending;
}

function getStatusLabel(status: string) {
  const labels = {
    pending: 'Pendiente',
    in_progress: 'En Progreso',
    review: 'En Revisión',
    completed: 'Completado',
  };
  return labels[status as keyof typeof labels] || status;
}
