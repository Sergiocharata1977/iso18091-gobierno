'use client';

import { ModulePageShell, PageHeader } from '@/components/design-system';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, TrendingUp, Scale, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface DashboardData {
  periodo_actual: string;
  periodo_status: 'abierto' | 'cerrado';
  total_asientos: number;
  total_debe: number;
  total_haber: number;
}

export default function ContabilidadPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/accounting/balance-trial')
      .then(r => r.json())
      .then(json => {
        if (json.success) setData(json.data);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const accesos = [
    {
      href: '/contabilidad/libro-diario',
      icon: <BookOpen className="h-6 w-6 text-sky-600" />,
      title: 'Libro Diario',
      description: 'Todos los asientos del período, ordenados por fecha.',
    },
    {
      href: '/contabilidad/mayor',
      icon: <TrendingUp className="h-6 w-6 text-emerald-600" />,
      title: 'Mayor',
      description: 'Movimientos filtrados por cuenta contable.',
    },
    {
      href: '/contabilidad/balance',
      icon: <Scale className="h-6 w-6 text-violet-600" />,
      title: 'Balance',
      description: 'Sumas y saldos por naturaleza de cuenta.',
    },
    {
      href: '/contabilidad/periodos',
      icon: <Calendar className="h-6 w-6 text-amber-600" />,
      title: 'Períodos',
      description: 'Apertura y cierre de períodos contables.',
    },
  ];

  return (
    <ModulePageShell>
      <div className="space-y-6">
      <PageHeader
        eyebrow="Contabilidad"
        title="Contabilidad"
        description="Libro único del tenant — asientos generados automáticamente por cada módulo."
        breadcrumbs={[{ label: 'Contabilidad' }]}
      />

      {!loading && data && (
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
          <span className="text-sm font-medium text-slate-700">
            Período actual: <span className="text-sky-700">{data.periodo_actual}</span>
          </span>
          <Badge className={data.periodo_status === 'abierto' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}>
            {data.periodo_status}
          </Badge>
          <span className="ml-auto text-sm text-slate-500">
            {data.total_asientos} asientos · Debe ${data.total_debe?.toLocaleString('es-AR')} · Haber ${data.total_haber?.toLocaleString('es-AR')}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {accesos.map(item => (
          <Link key={item.href} href={item.href}>
            <Card className="h-full cursor-pointer border-slate-200 transition-shadow hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="mb-2">{item.icon}</div>
                <CardTitle className="text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500">{item.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      </div>
    </ModulePageShell>
  );
}
