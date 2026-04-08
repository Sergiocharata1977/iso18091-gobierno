'use client';

import { ModulePageShell, PageHeader } from '@/components/design-system';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface EntryLine {
  cuenta_codigo: string;
  cuenta_nombre?: string;
  lado: 'debe' | 'haber';
  importe: number;
  moneda: string;
}

interface Entry {
  id: string;
  fecha: string;
  periodo: string;
  descripcion: string;
  plugin_id: string;
  operation_type: string;
  status: string;
  total_debe: number;
  total_haber: number;
  lines?: EntryLine[];
}

export default function LibroDiarioPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [periodo, setPeriodo] = useState('');

  const load = useCallback((p?: string) => {
    setLoading(true);
    const params = p ? `?periodo=${p}` : '';
    fetch(`/api/accounting/entries${params}`)
      .then(r => r.json())
      .then(json => { if (json.success) setEntries(json.data ?? []); })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function statusColor(s: string) {
    if (s === 'confirmado') return 'bg-emerald-100 text-emerald-700';
    if (s === 'anulado') return 'bg-red-100 text-red-700';
    return 'bg-amber-100 text-amber-700';
  }

  return (
    <ModulePageShell>
      <div className="space-y-6">
      <PageHeader
        eyebrow="Contabilidad"
        title="Libro Diario"
        description="Asientos contables ordenados por fecha. Generados automáticamente por cada módulo."
        breadcrumbs={[
          { label: 'Contabilidad', href: '/contabilidad' },
          { label: 'Libro Diario' },
        ]}
      />

      <div className="flex items-center gap-3">
        <input
          type="month"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          value={periodo}
          onChange={e => { setPeriodo(e.target.value); load(e.target.value || undefined); }}
        />
        <Button variant="outline" size="sm" onClick={() => load(periodo || undefined)}>
          Actualizar
        </Button>
        <span className="text-sm text-slate-500">{entries.length} asientos</span>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">Asientos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
            </div>
          ) : entries.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No hay asientos para este período.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-600 w-8" />
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Fecha</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Descripción</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Origen</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600">Debe</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600">Haber</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map(e => (
                  <>
                    <tr
                      key={e.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => toggleExpand(e.id)}
                    >
                      <td className="px-4 py-2 text-slate-400">
                        {expanded.has(e.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </td>
                      <td className="px-4 py-2 text-slate-600 whitespace-nowrap">{e.fecha?.slice(0, 10)}</td>
                      <td className="px-4 py-2 text-slate-700">{e.descripcion || e.operation_type}</td>
                      <td className="px-4 py-2">
                        <Badge variant="secondary" className="text-xs">{e.plugin_id}</Badge>
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-slate-700">
                        ${e.total_debe?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-slate-700">
                        ${e.total_haber?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-2">
                        <Badge className={statusColor(e.status)}>{e.status}</Badge>
                      </td>
                    </tr>
                    {expanded.has(e.id) && e.lines && (
                      <tr key={`${e.id}-lines`} className="bg-slate-50">
                        <td colSpan={7} className="px-8 py-2">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-slate-500">
                                <th className="text-left py-1 font-medium">Cuenta</th>
                                <th className="text-right py-1 font-medium">Debe</th>
                                <th className="text-right py-1 font-medium">Haber</th>
                              </tr>
                            </thead>
                            <tbody>
                              {e.lines.map((l, i) => (
                                <tr key={i} className="border-t border-slate-100">
                                  <td className="py-1 text-slate-600">{l.cuenta_codigo} {l.cuenta_nombre && `— ${l.cuenta_nombre}`}</td>
                                  <td className="py-1 text-right font-mono text-slate-700">{l.lado === 'debe' ? `$${l.importe.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : ''}</td>
                                  <td className="py-1 text-right font-mono text-slate-700">{l.lado === 'haber' ? `$${l.importe.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : ''}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </>
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
