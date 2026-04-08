'use client';

import { ModulePageShell, PageHeader } from '@/components/design-system';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface BalanceLine {
  cuenta_codigo: string;
  cuenta_nombre: string;
  naturaleza: string;
  total_debe: number;
  total_haber: number;
  saldo: number;
}

interface BalanceGroup {
  naturaleza: string;
  label: string;
  lines: BalanceLine[];
  subtotal_debe: number;
  subtotal_haber: number;
  subtotal_saldo: number;
}

const NATURALEZA_LABEL: Record<string, string> = {
  activo: 'Activo',
  pasivo: 'Pasivo',
  patrimonio: 'Patrimonio Neto',
  resultado_positivo: 'Ingresos',
  resultado_negativo: 'Egresos',
};

export default function BalancePage() {
  const [groups, setGroups] = useState<BalanceGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [periodo, setPeriodo] = useState('');
  const [balanceCuadra, setBalanceCuadra] = useState<boolean | null>(null);

  const load = useCallback((p?: string) => {
    setLoading(true);
    const params = p ? `?periodo=${p}` : '';
    fetch(`/api/accounting/balance-trial${params}`)
      .then(r => r.json())
      .then(json => {
        if (!json.success) return;
        const lines: BalanceLine[] = json.data?.lines ?? [];
        const grouped: Record<string, BalanceGroup> = {};
        for (const l of lines) {
          const nat = l.naturaleza;
          if (!grouped[nat]) {
            grouped[nat] = {
              naturaleza: nat,
              label: NATURALEZA_LABEL[nat] ?? nat,
              lines: [],
              subtotal_debe: 0,
              subtotal_haber: 0,
              subtotal_saldo: 0,
            };
          }
          grouped[nat].lines.push(l);
          grouped[nat].subtotal_debe += l.total_debe;
          grouped[nat].subtotal_haber += l.total_haber;
          grouped[nat].subtotal_saldo += l.saldo;
        }
        setGroups(Object.values(grouped));
        const totalDebe = lines.reduce((s, l) => s + l.total_debe, 0);
        const totalHaber = lines.reduce((s, l) => s + l.total_haber, 0);
        setBalanceCuadra(Math.abs(totalDebe - totalHaber) < 0.01);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const fmt = (n: number) => `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

  return (
    <ModulePageShell>
      <div className="space-y-6">
      <PageHeader
        eyebrow="Contabilidad"
        title="Balance de Sumas y Saldos"
        description="Saldos por cuenta agrupados por naturaleza. Calculados en tiempo real desde los asientos."
        breadcrumbs={[
          { label: 'Contabilidad', href: '/contabilidad' },
          { label: 'Balance' },
        ]}
        actions={
          balanceCuadra !== null ? (
            <Badge className={balanceCuadra ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
              {balanceCuadra ? 'Balance cuadra ✓' : 'Balance no cuadra ✗'}
            </Badge>
          ) : undefined
        }
      />

      <div className="flex items-center gap-3">
        <input
          type="month"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          value={periodo}
          onChange={e => setPeriodo(e.target.value)}
        />
        <Button variant="outline" size="sm" onClick={() => load(periodo || undefined)} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Actualizar
        </Button>
      </div>

      {groups.map(g => (
        <Card key={g.naturaleza} className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-slate-700">{g.label}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Cuenta</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600">Debe</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600">Haber</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {g.lines.map(l => (
                  <tr key={l.cuenta_codigo} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-700">
                      <span className="font-mono text-xs text-slate-400 mr-2">{l.cuenta_codigo}</span>
                      {l.cuenta_nombre}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-slate-600">{fmt(l.total_debe)}</td>
                    <td className="px-4 py-2 text-right font-mono text-slate-600">{fmt(l.total_haber)}</td>
                    <td className="px-4 py-2 text-right font-mono font-medium text-slate-800">{fmt(l.saldo)}</td>
                  </tr>
                ))}
                <tr className="border-t border-slate-300 bg-slate-50 font-semibold">
                  <td className="px-4 py-2 text-slate-700">Subtotal {g.label}</td>
                  <td className="px-4 py-2 text-right font-mono">{fmt(g.subtotal_debe)}</td>
                  <td className="px-4 py-2 text-right font-mono">{fmt(g.subtotal_haber)}</td>
                  <td className="px-4 py-2 text-right font-mono">{fmt(g.subtotal_saldo)}</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}

      {!loading && groups.length === 0 && (
        <p className="text-sm text-slate-500">No hay movimientos para mostrar.</p>
      )}
      </div>
    </ModulePageShell>
  );
}
