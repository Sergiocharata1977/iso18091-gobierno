/**
 * Dashboard principal del módulo Procesos
 */

'use client';

import { ContextHelpButton } from '@/components/docs/ContextHelpButton';
import { ModulePageShell, PageHeader } from '@/components/design-system';
import { ModuleMaturityButton } from '@/components/shared/ModuleMaturityButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import {
  BarChart3,
  CheckCircle,
  Clock3,
  FileSpreadsheet,
  FileText,
  Kanban,
  Loader2,
  Target,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface ProcesosStats {
  procesos_total: number;
  registros_total: number;
  objetivos_total: number;
  indicadores_total: number;
}

export default function ProcesosDashboardPage() {
  const { loading: authLoading } = useAuth();
  const [stats, setStats] = useState<ProcesosStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    // Por ahora usamos datos de ejemplo
    setStats({
      procesos_total: 8,
      registros_total: 45,
      objetivos_total: 12,
      indicadores_total: 24,
    });
    setLoading(false);
  }, [authLoading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  const cards = [
    {
      title: 'Procesos',
      href: '/procesos/definiciones',
      icon: FileSpreadsheet,
      color: 'bg-teal-500',
      value: stats?.procesos_total || 0,
      label: 'Definidos',
    },
    {
      title: 'Registros',
      href: '/procesos/registros',
      icon: Kanban,
      color: 'bg-blue-500',
      value: stats?.registros_total || 0,
      label: 'Total',
    },
    {
      title: 'Objetivos',
      href: '/procesos/objetivos',
      icon: Target,
      color: 'bg-purple-500',
      value: stats?.objetivos_total || 0,
      label: 'De calidad',
    },
    {
      title: 'Indicadores',
      href: '/procesos/indicadores',
      icon: TrendingUp,
      color: 'bg-emerald-500',
      value: stats?.indicadores_total || 0,
      label: 'Configurados',
    },
  ];

  return (
    <ModulePageShell>
      <div className="space-y-6">
      <PageHeader
        eyebrow="Procesos"
        title="Gestion por Procesos"
        description="Definicion de procesos, objetivos, indicadores y seguimiento operativo."
        breadcrumbs={[{ label: 'Procesos' }]}
        actions={
          <div className="flex items-center gap-2">
            <ContextHelpButton route="/procesos" />
            <ModuleMaturityButton moduleKey="procesos" />
          </div>
        }
      />
      <div className="hidden flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-teal-600" />
            Gestión por Procesos
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Definición de procesos, objetivos e indicadores de calidad
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ContextHelpButton route="/procesos" />
          <ModuleMaturityButton moduleKey="procesos" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <Link key={card.title} href={card.href}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className={`p-2 rounded-lg ${card.color} text-white`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    {card.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{card.value}</p>
                  <p className="text-xs text-gray-500">{card.label}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-teal-600" />
            Acciones Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/procesos/definiciones">
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Ver Procesos
              </Button>
            </Link>
            <Link href="/procesos/registros">
              <Button variant="outline">
                <Kanban className="h-4 w-4 mr-2" />
                Nuevo Registro
              </Button>
            </Link>
            <Link href="/procesos/objetivos">
              <Button variant="outline">
                <Target className="h-4 w-4 mr-2" />
                Objetivos
              </Button>
            </Link>
            <Link href="/procesos/mediciones">
              <Button variant="outline">
                <BarChart3 className="h-4 w-4 mr-2" />
                Mediciones
              </Button>
            </Link>
            <Link href="/procesos/checklists">
              <Button variant="outline">
                <CheckCircle className="h-4 w-4 mr-2" />
                Checklists
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <Card className="border-slate-200 bg-white/90">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock3 className="h-4 w-4 text-teal-600" />
              Estado del Modulo
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Definiciones</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{stats?.procesos_total || 0}</p>
              <p className="mt-1 text-sm text-slate-500">procesos documentados y listos para seguimiento</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Operacion</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{stats?.registros_total || 0}</p>
              <p className="mt-1 text-sm text-slate-500">registros activos para ejecucion y trazabilidad</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Medicion</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{(stats?.objetivos_total || 0) + (stats?.indicadores_total || 0)}</p>
              <p className="mt-1 text-sm text-slate-500">objetivos e indicadores para revisar calidad</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-white/90">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Siguiente Paso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">
              El recorrido recomendado del modulo es definiciones, registros y luego mediciones.
            </p>
            <Link href="/procesos/definiciones">
              <Button className="w-full justify-start bg-teal-600 hover:bg-teal-700">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Completar definiciones
              </Button>
            </Link>
            <Link href="/procesos/registros">
              <Button variant="outline" className="w-full justify-start">
                <Kanban className="mr-2 h-4 w-4" />
                Revisar registros
              </Button>
            </Link>
            <Link href="/procesos/mediciones">
              <Button variant="outline" className="w-full justify-start">
                <BarChart3 className="mr-2 h-4 w-4" />
                Cargar mediciones
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
      </div>
    </ModulePageShell>
  );
}
