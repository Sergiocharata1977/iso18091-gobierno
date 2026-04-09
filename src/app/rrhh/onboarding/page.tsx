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
import { CheckCircle2, Circle, Plus, UserCheck } from 'lucide-react';
import type { Onboarding, TareaOnboarding } from '@/types/rrhh-plugins';

const CATEGORIA_COLOR: Record<TareaOnboarding['categoria'], string> = {
  documentacion: 'bg-blue-100 text-blue-700',
  accesos: 'bg-purple-100 text-purple-700',
  equipamiento: 'bg-orange-100 text-orange-700',
  capacitacion: 'bg-green-100 text-green-700',
  presentacion: 'bg-pink-100 text-pink-700',
  otro: 'bg-slate-100 text-slate-600',
};

export default function OnboardingPage() {
  const { user } = useAuth();
  const [onboardings, setOnboardings] = useState<Onboarding[]>([]);
  const [selected, setSelected] = useState<Onboarding | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ personnel_nombre: '', fecha_ingreso: '', buddy_nombre: '' });

  const fetchData = async () => {
    if (!user) return;
    const token = await user?.getIdToken?.();
    const res = await fetch('/api/rrhh/onboarding', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setOnboardings(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleCrear = async () => {
    if (!user || !form.personnel_nombre || !form.fecha_ingreso) return;
    setSaving(true);
    try {
      const token = await user?.getIdToken?.();
      const res = await fetch('/api/rrhh/onboarding', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personnel_nombre: form.personnel_nombre,
          personnel_id: `manual_${Date.now()}`,
          fecha_ingreso: form.fecha_ingreso,
          buddy_nombre: form.buddy_nombre || undefined,
        }),
      });
      if (res.ok) {
        setModalOpen(false);
        setForm({ personnel_nombre: '', fecha_ingreso: '', buddy_nombre: '' });
        fetchData();
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleTarea = async (onb: Onboarding, tareaId: string) => {
    if (!user) return;
    const token = await user?.getIdToken?.();
    const nuevasTareas = onb.tareas.map(t => {
      if (t.id !== tareaId) return t;
      return {
        ...t,
        estado: t.estado === 'completada' ? ('pendiente' as const) : ('completada' as const),
        completada_en: t.estado !== 'completada' ? new Date().toISOString() : undefined,
      };
    });
    const res = await fetch(`/api/rrhh/onboarding/${onb.id}`, {
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
          title="Onboarding"
          description="Integración de nuevos colaboradores — ISO 7.2"
          breadcrumbs={[{ label: 'RRHH', href: '/rrhh' }, { label: 'Onboarding' }]}
          actions={
            <Button onClick={() => setModalOpen(true)} className="bg-green-700 hover:bg-green-800">
              <Plus className="w-4 h-4 mr-2" /> Nuevo Ingreso
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm bg-blue-50">
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">En proceso</p>
              <p className="text-3xl font-bold text-blue-700">{onboardings.filter(o => o.estado === 'en_proceso').length}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-green-50">
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Completados</p>
              <p className="text-3xl font-bold text-green-700">{onboardings.filter(o => o.estado === 'completado').length}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-slate-50">
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Total ingresos</p>
              <p className="text-3xl font-bold text-slate-700">{onboardings.length}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Lista */}
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8 text-slate-400">Cargando...</div>
            ) : onboardings.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-12 text-center text-slate-400">
                  <UserCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>No hay ingresos registrados</p>
                </CardContent>
              </Card>
            ) : (
              onboardings.map(o => (
                <Card
                  key={o.id}
                  className={`border cursor-pointer shadow-sm hover:shadow-md transition-all ${selected?.id === o.id ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-white'}`}
                  onClick={() => setSelected(o)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-slate-800">{o.personnel_nombre}</p>
                        <p className="text-xs text-slate-400">Ingreso: {o.fecha_ingreso}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${o.estado === 'completado' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {o.estado === 'completado' ? 'Completado' : 'En proceso'}
                      </span>
                    </div>
                    {/* Barra de progreso */}
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Progreso</span>
                        <span>{o.progreso}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{ width: `${o.progreso}%` }}
                        />
                      </div>
                    </div>
                    {o.buddy_nombre && (
                      <p className="text-xs text-slate-400 mt-2">Buddy: {o.buddy_nombre}</p>
                    )}
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
                  <CheckCircle2 className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-400">Seleccioná un ingreso para ver el checklist</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{selected.personnel_nombre}</CardTitle>
                      <p className="text-sm text-slate-400">Ingreso: {selected.fecha_ingreso}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-700">{selected.progreso}%</p>
                      <p className="text-xs text-slate-400">completado</p>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${selected.progreso}%` }} />
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
                          {tarea.descripcion && <p className="text-xs text-slate-400">{tarea.descripcion}</p>}
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
          <DialogHeader><DialogTitle>Nuevo Ingreso</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Nombre del empleado *</Label>
              <Input placeholder="Apellido, Nombre" value={form.personnel_nombre} onChange={e => setForm(f => ({ ...f, personnel_nombre: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Fecha de ingreso *</Label>
              <Input type="date" value={form.fecha_ingreso} onChange={e => setForm(f => ({ ...f, fecha_ingreso: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Buddy asignado</Label>
              <Input placeholder="Nombre del compañero guía" value={form.buddy_nombre} onChange={e => setForm(f => ({ ...f, buddy_nombre: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCrear} disabled={saving || !form.personnel_nombre || !form.fecha_ingreso} className="bg-green-700 hover:bg-green-800">
              {saving ? 'Guardando...' : 'Iniciar Onboarding'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModulePageShell>
  );
}
