'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { ModulePageShell, PageHeader } from '@/components/design-system';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Heart, Plus, BarChart2, Users } from 'lucide-react';
import type { EncuestaClima } from '@/types/rrhh-plugins';

const ESTADO_COLOR = {
  borrador: 'bg-slate-100 text-slate-600',
  activa: 'bg-green-100 text-green-700',
  cerrada: 'bg-slate-100 text-slate-500',
};

export default function ClimaPage() {
  const { user } = useAuth();
  const [encuestas, setEncuestas] = useState<EncuestaClima[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    periodo: '',
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_cierre: '',
    estado: 'borrador' as EncuestaClima['estado'],
  });

  const fetchData = async () => {
    if (!user) return;
    const token = await user?.getIdToken?.();
    const res = await fetch('/api/rrhh/clima', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setEncuestas(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleCrear = async () => {
    if (!user || !form.titulo) return;
    setSaving(true);
    try {
      const token = await user?.getIdToken?.();
      const res = await fetch('/api/rrhh/clima', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) { setModalOpen(false); setForm({ titulo: '', descripcion: '', periodo: '', fecha_inicio: new Date().toISOString().split('T')[0], fecha_cierre: '', estado: 'borrador' }); fetchData(); }
    } finally { setSaving(false); }
  };

  const activar = async (id: string, estado: EncuestaClima['estado']) => {
    if (!user) return;
    const token = await user?.getIdToken?.();
    await fetch(`/api/rrhh/clima/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    });
    fetchData();
  };

  const activa = encuestas.find(e => e.estado === 'activa');
  const puntajePromGlobal = encuestas.filter(e => e.puntaje_promedio).reduce((s, e, _, a) => s + (e.puntaje_promedio || 0) / a.length, 0);

  return (
    <ModulePageShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="RRHH"
          title="Clima y Bienestar"
          description="Ambiente laboral y bienestar organizacional — ISO 7.4 + 9.1"
          breadcrumbs={[{ label: 'RRHH', href: '/rrhh' }, { label: 'Clima' }]}
          actions={
            <Button onClick={() => setModalOpen(true)} className="bg-green-700 hover:bg-green-800">
              <Plus className="w-4 h-4 mr-2" /> Nueva Encuesta
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm bg-pink-50">
            <CardContent className="p-4 flex items-center gap-3">
              <Heart className="w-8 h-8 text-pink-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Satisfacción promedio</p>
                <p className="text-2xl font-bold text-pink-700">
                  {puntajePromGlobal > 0 ? `${puntajePromGlobal.toFixed(1)}/10` : '—'}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-green-50">
            <CardContent className="p-4 flex items-center gap-3">
              <BarChart2 className="w-8 h-8 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Encuestas realizadas</p>
                <p className="text-2xl font-bold text-green-700">{encuestas.filter(e => e.estado === 'cerrada').length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className={`border-0 shadow-sm ${activa ? 'bg-blue-50' : 'bg-slate-50'}`}>
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Encuesta activa</p>
                <p className="text-sm font-semibold text-blue-700 mt-1">{activa?.titulo || 'Ninguna activa'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de encuestas */}
        {loading ? (
          <div className="text-center py-12 text-slate-400">Cargando...</div>
        ) : encuestas.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-16 text-center text-slate-400">
              <Heart className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No hay encuestas de clima registradas</p>
              <Button variant="outline" className="mt-4" onClick={() => setModalOpen(true)}>Crear primera encuesta</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {encuestas.map(e => (
              <Card key={e.id} className="border-0 shadow-sm bg-white">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-800">{e.titulo}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_COLOR[e.estado]}`}>
                          {e.estado}
                        </span>
                      </div>
                      {e.periodo && <p className="text-xs text-slate-400 mt-0.5">Período: {e.periodo}</p>}
                      {e.descripcion && <p className="text-xs text-slate-500 mt-1">{e.descripcion}</p>}
                    </div>
                    {e.puntaje_promedio && (
                      <div className="text-center flex-shrink-0">
                        <p className="text-2xl font-bold text-pink-600">{e.puntaje_promedio}</p>
                        <p className="text-xs text-slate-400">/ 10</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                    <div className="flex gap-4 text-xs text-slate-400">
                      {e.total_respuestas !== undefined && <span>{e.total_respuestas} respuestas</span>}
                      <span>Inicio: {e.fecha_inicio}</span>
                    </div>
                    <div className="flex gap-2">
                      {e.estado === 'borrador' && (
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => activar(e.id, 'activa')}>
                          Activar
                        </Button>
                      )}
                      {e.estado === 'activa' && (
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => activar(e.id, 'cerrada')}>
                          Cerrar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nueva Encuesta de Clima</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Título *</Label>
              <Input placeholder="Ej: Encuesta de Clima Q1 2026" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Descripción</Label>
              <Input placeholder="Objetivo de la encuesta" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Período</Label>
                <Input placeholder="Q1-2026" value={form.periodo} onChange={e => setForm(f => ({ ...f, periodo: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Estado inicial</Label>
                <Select value={form.estado} onValueChange={v => setForm(f => ({ ...f, estado: v as EncuestaClima['estado'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="borrador">Borrador</SelectItem>
                    <SelectItem value="activa">Activa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Fecha inicio</Label>
                <Input type="date" value={form.fecha_inicio} onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Fecha cierre</Label>
                <Input type="date" value={form.fecha_cierre} onChange={e => setForm(f => ({ ...f, fecha_cierre: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCrear} disabled={saving || !form.titulo} className="bg-green-700 hover:bg-green-800">
              {saving ? 'Guardando...' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModulePageShell>
  );
}
