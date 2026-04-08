'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { ModulePageShell, PageHeader } from '@/components/design-system';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart2, Plus, TrendingDown, TrendingUp } from 'lucide-react';
import type { PlanificacionHeadcount } from '@/types/rrhh-plugins';

const ESTADO_COLOR = {
  borrador: 'bg-slate-100 text-slate-600',
  en_revision: 'bg-yellow-100 text-yellow-700',
  aprobado: 'bg-green-100 text-green-700',
};

export default function PlanificacionPage() {
  const { user } = useAuth();
  const [planes, setPlanes] = useState<PlanificacionHeadcount[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    periodo: new Date().getFullYear().toString(),
    departamento_nombre: '',
    departamento_id: '',
    headcount_actual: '',
    headcount_objetivo: '',
    motivo: '',
    estado: 'borrador' as PlanificacionHeadcount['estado'],
  });

  const fetchData = async () => {
    if (!user) return;
    const token = await user.getIdToken();
    const res = await fetch('/api/rrhh/planificacion', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setPlanes(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleCrear = async () => {
    if (!user || !form.departamento_nombre || !form.headcount_actual) return;
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/rrhh/planificacion', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          departamento_id: form.departamento_id || `manual_${Date.now()}`,
          headcount_actual: Number(form.headcount_actual),
          headcount_objetivo: Number(form.headcount_objetivo),
        }),
      });
      if (res.ok) {
        setModalOpen(false);
        setForm({ periodo: new Date().getFullYear().toString(), departamento_nombre: '', departamento_id: '', headcount_actual: '', headcount_objetivo: '', motivo: '', estado: 'borrador' });
        fetchData();
      }
    } finally { setSaving(false); }
  };

  // Agrupar por período
  const porPeriodo = planes.reduce<Record<string, PlanificacionHeadcount[]>>((acc, p) => {
    (acc[p.periodo] ??= []).push(p);
    return acc;
  }, {});

  const totalActual = planes.reduce((s, p) => s + (p.headcount_actual || 0), 0);
  const totalObjetivo = planes.reduce((s, p) => s + (p.headcount_objetivo || 0), 0);
  const gap = totalObjetivo - totalActual;

  return (
    <ModulePageShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="RRHH"
          title="Planificación de RRHH"
          description="Headcount planning y análisis de brechas — ISO 7.1.2"
          breadcrumbs={[{ label: 'RRHH', href: '/rrhh' }, { label: 'Planificación' }]}
          actions={
            <Button onClick={() => setModalOpen(true)} className="bg-green-700 hover:bg-green-800">
              <Plus className="w-4 h-4 mr-2" /> Nuevo Plan
            </Button>
          }
        />

        {/* Stats globales */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm bg-blue-50">
            <CardContent className="p-4 flex items-center gap-3">
              <BarChart2 className="w-8 h-8 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Headcount actual</p>
                <p className="text-2xl font-bold text-blue-700">{totalActual}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-green-50">
            <CardContent className="p-4 flex items-center gap-3">
              <BarChart2 className="w-8 h-8 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Headcount objetivo</p>
                <p className="text-2xl font-bold text-green-700">{totalObjetivo}</p>
              </div>
            </CardContent>
          </Card>
          <Card className={`border-0 shadow-sm ${gap > 0 ? 'bg-yellow-50' : gap < 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
            <CardContent className="p-4 flex items-center gap-3">
              {gap > 0 ? <TrendingUp className="w-8 h-8 text-yellow-600 flex-shrink-0" /> : <TrendingDown className="w-8 h-8 text-slate-600 flex-shrink-0" />}
              <div>
                <p className="text-xs text-slate-500">Gap neto</p>
                <p className={`text-2xl font-bold ${gap > 0 ? 'text-yellow-700' : gap < 0 ? 'text-red-700' : 'text-slate-700'}`}>
                  {gap > 0 ? `+${gap}` : gap}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabla por período */}
        {loading ? (
          <div className="text-center py-12 text-slate-400">Cargando...</div>
        ) : planes.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-16 text-center text-slate-400">
              <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No hay planes de headcount registrados</p>
              <Button variant="outline" className="mt-4" onClick={() => setModalOpen(true)}>Crear primer plan</Button>
            </CardContent>
          </Card>
        ) : (
          Object.entries(porPeriodo).sort(([a], [b]) => b.localeCompare(a)).map(([periodo, items]) => (
            <Card key={periodo} className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Período {periodo}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-slate-500 text-left">
                        <th className="pb-2 px-2 font-medium">Departamento</th>
                        <th className="pb-2 px-2 font-medium text-right">Actual</th>
                        <th className="pb-2 px-2 font-medium text-right">Objetivo</th>
                        <th className="pb-2 px-2 font-medium text-right">Gap</th>
                        <th className="pb-2 px-2 font-medium">Estado</th>
                        <th className="pb-2 px-2 font-medium">Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(p => {
                        const g = p.headcount_objetivo - p.headcount_actual;
                        return (
                          <tr key={p.id} className="border-b hover:bg-slate-50">
                            <td className="py-3 px-2 font-medium text-slate-800">{p.departamento_nombre}</td>
                            <td className="py-3 px-2 text-right text-slate-600">{p.headcount_actual}</td>
                            <td className="py-3 px-2 text-right text-slate-600">{p.headcount_objetivo}</td>
                            <td className={`py-3 px-2 text-right font-semibold ${g > 0 ? 'text-yellow-600' : g < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                              {g > 0 ? `+${g}` : g}
                            </td>
                            <td className="py-3 px-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_COLOR[p.estado]}`}>
                                {p.estado.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-slate-500 text-xs">{p.motivo || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nuevo Plan de Headcount</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Período *</Label>
                <Input placeholder="2026" value={form.periodo} onChange={e => setForm(f => ({ ...f, periodo: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Estado</Label>
                <Select value={form.estado} onValueChange={v => setForm(f => ({ ...f, estado: v as PlanificacionHeadcount['estado'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="borrador">Borrador</SelectItem>
                    <SelectItem value="en_revision">En revisión</SelectItem>
                    <SelectItem value="aprobado">Aprobado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Departamento *</Label>
              <Input placeholder="Nombre del departamento" value={form.departamento_nombre} onChange={e => setForm(f => ({ ...f, departamento_nombre: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Headcount actual *</Label>
                <Input type="number" min="0" value={form.headcount_actual} onChange={e => setForm(f => ({ ...f, headcount_actual: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Headcount objetivo</Label>
                <Input type="number" min="0" value={form.headcount_objetivo} onChange={e => setForm(f => ({ ...f, headcount_objetivo: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Motivo / Justificación</Label>
              <Input placeholder="Ej: Expansión de operaciones" value={form.motivo} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCrear} disabled={saving || !form.departamento_nombre || !form.headcount_actual} className="bg-green-700 hover:bg-green-800">
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModulePageShell>
  );
}
