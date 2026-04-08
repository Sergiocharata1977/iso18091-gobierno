'use client';

import { ModulePageShell, PageHeader } from '@/components/design-system';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Lock, Unlock } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';

interface Period {
  id: string;
  periodo: string;
  status: 'abierto' | 'cerrado';
  total_asientos: number;
  created_at: string;
  closed_at?: string;
}

export default function PeriodosPage() {
  const { toast } = useToast();
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [closingId, setClosingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/accounting/periods')
      .then(r => r.json())
      .then(json => { if (json.success) setPeriods(json.data ?? []); })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleClose(period: Period) {
    if (!window.confirm(`¿Cerrar el período ${period.periodo}? Esta acción bloquea nuevos asientos.`)) return;
    setClosingId(period.id);
    try {
      const res = await fetch('/api/accounting/close-period', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodo: period.periodo }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Error al cerrar período');
      toast({ title: 'Período cerrado', description: `${period.periodo} cerrado correctamente.` });
      load();
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setClosingId(null);
    }
  }

  return (
    <ModulePageShell>
      <div className="space-y-6">
      <PageHeader
        eyebrow="Contabilidad"
        title="Períodos Contables"
        description="Apertura y cierre de períodos. Los períodos cerrados bloquean nuevos asientos."
        breadcrumbs={[
          { label: 'Contabilidad', href: '/contabilidad' },
          { label: 'Períodos' },
        ]}
      />

      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">Períodos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
            </div>
          ) : periods.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No hay períodos registrados.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Período</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Estado</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600">Asientos</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Cerrado</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {periods.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-mono font-medium text-slate-800">{p.periodo}</td>
                    <td className="px-4 py-2">
                      <Badge className={p.status === 'abierto' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}>
                        {p.status === 'abierto' ? <Unlock className="mr-1 h-3 w-3 inline" /> : <Lock className="mr-1 h-3 w-3 inline" />}
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-right text-slate-600">{p.total_asientos}</td>
                    <td className="px-4 py-2 text-slate-500 text-xs">{p.closed_at?.slice(0, 10) ?? '—'}</td>
                    <td className="px-4 py-2 text-right">
                      {p.status === 'abierto' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleClose(p)}
                          disabled={closingId === p.id}
                        >
                          {closingId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Lock className="h-3 w-3" />}
                          <span className="ml-1">Cerrar</span>
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
      </div>
    </ModulePageShell>
  );
}
