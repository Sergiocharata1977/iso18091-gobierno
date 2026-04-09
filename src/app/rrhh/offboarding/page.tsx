'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { ModulePageShell, PageHeader } from '@/components/design-system';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, Circle, Plus, UserX } from 'lucide-react';
import type { Offboarding, MotivoEgreso, TareaOffboarding } from '@/types/rrhh-plugins';

const MOTIVO_LABELS: Record<MotivoEgreso, string> = {
  renuncia_voluntaria: 'Renuncia Voluntaria',
  despido_causa: 'Despido con Causa',
  despido_sin_causa: 'Despido sin Causa',
  fin_contrato: 'Fin de Contrato',
  jubilacion: 'Jubilación',
  mutuo_acuerdo: 'Mutuo Acuerdo',
  fallecimiento: 'Fallecimiento',
  otro: 'Otro',
};

const CATEGORIA_COLOR: Record<TareaOffboarding['categoria'], string> = {
  documentacion: 'bg-blue-100 text-blue-700',
  accesos: 'bg-purple-100 text-purple-700',
  equipamiento: 'bg-orange-100 text-orange-700',
  liquidacion: 'bg-green-100 text-green-700',
  entrevista: 'bg-pink-100 text-pink-700',
  otro: 'bg-slate-100 text-slate-600',
};

export default function OffboardingPage() {
  const { user } = useAuth();
  const [offboardings, setOffboardings] = useState<Offboarding[]>([]);
  const [selected, setSelected] = useState<Offboarding | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    personnel_nombre: '',
    fecha_egreso: '',
    motivo: 'renuncia_voluntaria' as MotivoEgreso,
    notas: '',
  });

  const fetchData = async () => {
    if (!user) return;
    const token = await user?.getIdToken?.();
    const res = await fetch('/api/rrhh/offboarding', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setOffboardings(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleCrear = async () => {
    if (!user || !form.personnel_nombre || !form.fecha_egreso) return;
    setSaving(true);
    try {
      const token = await user?.getIdToken?.();
      const res = await fetch('/api/rrhh/offboarding', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personnel_nombre: form.personnel_nombre,
          personnel_id: `manual_${Date.now()}`,
          fecha_egreso: form.fecha_egreso,
          motivo: form.motivo,
          notas: form.notas || undefined,
        }),
      });
      if (res.ok) {
        setModalOpen(false);
        setForm({ personnel_nombre: '', fecha_egreso: '', motivo: 'renuncia_voluntaria', notas: '' });
        fetchData();
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleTarea = async (offb: Offboarding, tareaId: string) => {
    if (!user) return;
    const token = await user?.getIdToken?.();
    const nuevasTareas = offb.tareas.map(t => {
      if (t.id !== tareaId) return t;
      return {
        ...t,
        estado: t.estado === 'completada' ? ('pendiente' as const) : ('completada' as const),
        completada_en: t.estado !== 'completada' ? new Date().toISOString() : undefined,
      };
    });
    const res = await fetch(`/api/rrhh/offboarding/${offb.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tareas: nuevasTareas }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSelected(updated);
      fetchData();
    }
  };

  return (
    <ModulePageShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="RRHH"
          title="Offboarding"
          description="Gestión de egresos y desvinculaciones — ISO 7.1.2"
          breadcrumbs={[{ label: 'RRHH', href: '/rrhh' }, { label: 'Offboarding' }]}
          actions={
            <Button onClick={() => setModalOpen(true)} className="bg-green-700 hover:bg-green-800">
              <Plus className="w-4 h-4 mr-2" /> Registrar Egreso
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm bg-orange-50">
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">En proceso</p>
              <p className="text-3xl font-bold text-orange-700">{offboardings.filter(o => o.estado === 'en_proceso').length}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-slate-100">
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Completados</p>
              <p className="text-3xl font-bold text-slate-700">{offboardings.filter(o => o.estado === 'completado').length}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-slate-50">
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Total egresos</p>
              <p className="text-3xl font-bold text-slate-700">{offboardings.length}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Lista */}
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8 text-slate-400">Cargando...</div>
            ) : offboardings.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-12 text-center text-slate-400">
                  <UserX className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>No hay egresos registrados</p>
                </CardContent>
              </Card>
            ) : (
              offboardings.map(o => (
                <Card
                  key={o.id}
                  className={`border cursor-pointer shadow-sm hover:shadow-md transition-all ${selected?.id === o.id ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-white'}`}
                  onClick={() => setSelected(o)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-800">{o.personnel_nombre}</p>
                        <p className="text-xs text-slate-400">Egreso: {o.fecha_egreso}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{MOTIVO_LABELS[o.motivo]}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${o.estado === 'completado' ? 'bg-slate-100 text-slate-600' : 'bg-orange-100 text-orange-700'}`}>
                        {o.estado === 'completado' ? 'Completado' : 'En proceso'}
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Progreso</span>
                        <span>{o.progreso}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-400 rounded-full transition-all" style={{ width: `${o.progreso}%` }} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Checklist */}
          <div className="lg:col-span-2">
            {!selected ? (
              <Card className="border-0 shadow-sm h-full flex items-center justify-center">
                <CardContent className="text-center py-16">
                  <UserX className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-400">Seleccioná un egreso para ver el checklist</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{selected.personnel_nombre}</CardTitle>
                      <p className="text-sm text-slate-400">{MOTIVO_LABELS[selected.motivo]} · Egreso: {selected.fecha_egreso}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-orange-600">{selected.progreso}%</p>
                      <p className="text-xs text-slate-400">completado</p>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-orange-400 rounded-full transition-all" style={{ width: `${selected.progreso}%` }} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selected.tareas.sort((a, b) => a.orden - b.orden).map(tarea => (
                      <div
                        key={tarea.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:bg-slate-50 ${tarea.estado === 'completada' ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'}`}
                        onClick={() => toggleTarea(selected, tarea.id)}
                      >
                        {tarea.estado === 'completada' ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-300 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${tarea.estado === 'completada' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                            {tarea.titulo}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${CATEGORIA_COLOR[tarea.categoria]}`}>
                          {tarea.categoria}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Registrar Egreso</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Nombre del empleado *</Label>
              <Input placeholder="Apellido, Nombre" value={form.personnel_nombre} onChange={e => setForm(f => ({ ...f, personnel_nombre: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Fecha de egreso *</Label>
              <Input type="date" value={form.fecha_egreso} onChange={e => setForm(f => ({ ...f, fecha_egreso: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Motivo *</Label>
              <Select value={form.motivo} onValueChange={v => setForm(f => ({ ...f, motivo: v as MotivoEgreso }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(MOTIVO_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Input placeholder="Observaciones..." value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCrear} disabled={saving || !form.personnel_nombre || !form.fecha_egreso} className="bg-green-700 hover:bg-green-800">
              {saving ? 'Guardando...' : 'Iniciar Offboarding'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModulePageShell>
  );
}
