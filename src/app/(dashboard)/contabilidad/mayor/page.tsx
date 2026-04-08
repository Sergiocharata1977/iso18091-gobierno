'use client';

import { ModulePageShell, PageHeader } from '@/components/design-system';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useCallback, useState } from 'react';

interface LedgerLine {
  fecha: string;
  descripcion: string;
  plugin_id: string;
  debe: number;
  haber: number;
  saldo_acumulado: number;
  moneda: string;
}

interface Account {
  codigo: string;
  nombre: string;
  naturaleza: string;
}

export default function MayorPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedCuenta, setSelectedCuenta] = useState('');
  const [periodo, setPeriodo] = useState('');
  const [lines, setLines] = useState<LedgerLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [accountsLoaded, setAccountsLoaded] = useState(false);

  const loadAccounts = useCallback(() => {
    if (accountsLoaded) return;
    setLoadingAccounts(true);
    fetch('/api/accounting/accounts')
      .then(r => r.json())
      .then(json => { if (json.success) setAccounts(json.data ?? []); setAccountsLoaded(true); })
      .catch(() => null)
      .finally(() => setLoadingAccounts(false));
  }, [accountsLoaded]);

  function loadLedger() {
    if (!selectedCuenta) return;
    setLoading(true);
    const params = new URLSearchParams({ cuenta: selectedCuenta });
    if (periodo) params.set('periodo', periodo);
    fetch(`/api/accounting/accounts/${encodeURIComponent(selectedCuenta)}/ledger?${params}`)
      .then(r => r.json())
      .then(json => { if (json.success) setLines(json.data ?? []); })
      .catch(() => null)
      .finally(() => setLoading(false));
  }

  const saldoFinal = lines.at(-1)?.saldo_acumulado ?? 0;
  const cuentaActual = accounts.find(a => a.codigo === selectedCuenta);

  return (
    <ModulePageShell>
      <div className="space-y-6">
      <PageHeader
        eyebrow="Contabilidad"
        title="Mayor"
        description="Movimientos por cuenta contable — igual que filtrar por columna en Excel."
        breadcrumbs={[
          { label: 'Contabilidad', href: '/contabilidad' },
          { label: 'Mayor' },
        ]}
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Cuenta</label>
          <select
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm min-w-[240px]"
            value={selectedCuenta}
            onChange={e => setSelectedCuenta(e.target.value)}
            onFocus={loadAccounts}
          >
            <option value="">— Seleccioná una cuenta —</option>
            {loadingAccounts && <option disabled>Cargando...</option>}
            {accounts.map(a => (
              <option key={a.codigo} value={a.codigo}>
                {a.codigo} — {a.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Período</label>
          <input
            type="month"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            value={periodo}
            onChange={e => setPeriodo(e.target.value)}
          />
        </div>
        <Button onClick={loadLedger} disabled={!selectedCuenta || loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Ver mayor
        </Button>
      </div>

      {cuentaActual && (
        <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div>
            <p className="text-xs text-slate-500">Cuenta</p>
            <p className="font-medium text-slate-800">{cuentaActual.codigo} — {cuentaActual.nombre}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-slate-500">Saldo final</p>
            <p className={`text-lg font-semibold ${saldoFinal >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
              ${Math.abs(saldoFinal).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              {saldoFinal < 0 ? ' (acreedor)' : ''}
            </p>
          </div>
        </div>
      )}

      {lines.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              {lines.length} movimientos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Fecha</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Descripción</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600">Debe</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600">Haber</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((l, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{l.fecha?.slice(0, 10)}</td>
                    <td className="px-4 py-2 text-slate-700">{l.descripcion}</td>
                    <td className="px-4 py-2 text-right font-mono text-slate-700">
                      {l.debe > 0 ? `$${l.debe.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : ''}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-slate-700">
                      {l.haber > 0 ? `$${l.haber.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : ''}
                    </td>
                    <td className={`px-4 py-2 text-right font-mono font-medium ${l.saldo_acumulado < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                      ${Math.abs(l.saldo_acumulado).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
      </div>
    </ModulePageShell>
  );
}
