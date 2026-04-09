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
import { Star, Plus, AlertTriangle } from 'lucide-react';
import type { TalentoIdentificado } from '@/types/rrhh-plugins';

// 9-box labels: potencial (Y) x desempeño (X)
const NINEBOXLABELS: Record<string, string> = {
  '3-3': 'Estrella / Alto Potencial',
  '3-2': 'Diamante en Bruto',
  '3-1': 'Enigma',
  '2-3': 'Alto Rendimiento',
  '2-2': 'Núcleo Sólido',
  '2-1': 'Trabajador Efectivo',
  '1-3': 'Caballo de batalla',
  '1-2': 'Por Desarrollar',
  '1-1': 'En Riesgo',
};

const NINEBOX_COLOR: Record<string, string> = {
  '3-3': 'bg-green-500',
  '3-2': 'bg-green-400',
  '3-1': 'bg-yellow-400',
  '2-3': 'bg-blue-400',
  '2-2': 'bg-blue-300',
  '2-1': 'bg-slate-300',
  '1-3': 'bg-orange-300',
  '1-2': 'bg-orange-400',
  '1-1': 'bg-red-400',
};

function get9BoxKey(potencial: number, desempeno: number) {
  return `${potencial}-${desempeno}`;
}

export default function TalentoPage() {
  const { user } = useAuth();
  const [talentos, setTalentos] = useState<TalentoIdentificado[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    personnel_nombre: '',
    potencial: '2' as '1' | '2' | '3',
    desempeno: '2' as '1' | '2' | '3',
    es_critico: false,
    notas: '',
  });

  const fetchData = async () => {
    if (!user) return;
    const token = await user?.getIdToken?.();
    const res = await fetch('/api/rrhh/talento?tipo=talentos', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setTalentos(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleCrear = async () => {
    if (!user || !form.personnel_nombre) return;
    setSaving(true);
    try {
      const token = await user?.getIdToken?.();
      const p = Number(form.potencial) as 1|2|3;
      const d = Number(form.desempeno) as 1|2|3;
      const res = await fetch('/api/rrhh/talento?tipo=talentos', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personnel_nombre: form.personnel_nombre,
          personnel_id: `manual_${Date.now()}`,
          potencial: p,
          desempeno: d,
          categoria_9box: NINEBOXLABELS[get9BoxKey(p, d)],
          es_critico: form.es_critico,
          notas: form.notas || undefined,
        }),
      });
      if (res.ok) { setModalOpen(false); fetchData(); }
    } finally { setSaving(false); }
  };

  const estrellas = talentos.filter(t => t.potencial === 3 && t.desempeno === 3).length;
  const enRiesgo = talentos.filter(t => t.potencial === 1 && t.desempeno === 1).length;

  return (
    <ModulePageShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="RRHH"
          title="Gestión del Talento"
          description="Planes de carrera, 9-box y retención — ISO 7.2"
          breadcrumbs={[{ label: 'RRHH', href: '/rrhh' }, { label: 'Talento' }]}
          actions={
            <Button onClick={() => setModalOpen(true)} className="bg-green-700 hover:bg-green-800">
              <Plus className="w-4 h-4 mr-2" /> Identificar Talento
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm bg-amber-50">
            <CardContent className="p-4 flex items-center gap-3">
              <Star className="w-8 h-8 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Talentos identificados</p>
                <p className="text-2xl font-bold text-amber-700">{talentos.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-green-50">
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">Estrellas (Alto/Alto)</p>
              <p className="text-2xl font-bold text-green-700">{estrellas}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-red-50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">En riesgo</p>
                <p className="text-2xl font-bold text-red-700">{enRiesgo}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Matriz 9-box */}
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Matriz 9-Box</CardTitle></CardHeader>
            <CardContent>
              <div className="relative">
                <div className="text-xs text-slate-400 text-center mb-1">Desempeño →</div>
                <div className="grid grid-cols-3 gap-1">
                  {[3, 2, 1].map(pot => (
                    [1, 2, 3].map(des => {
                      const key = get9BoxKey(pot, des);
                      const count = talentos.filter(t => t.potencial === pot && t.desempeno === des).length;
                      return (
                        <div
                          key={key}
                          className={`${NINEBOX_COLOR[key]} rounded-lg p-2 min-h-16 flex flex-col items-center justify-center text-white text-center`}
                        >
                          <p className="text-lg font-bold">{count}</p>
                          <p className="text-[9px] leading-tight opacity-90">{NINEBOXLABELS[key]}</p>
                        </div>
                      );
                    })
                  ))}
                </div>
                <div className="text-xs text-slate-400 text-center mt-1 rotate-0">← Potencial (↑)</div>
              </div>
            </CardContent>
          </Card>

          {/* Lista */}
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Talentos identificados</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-slate-400">Cargando...</div>
              ) : talentos.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Star className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Identificá los talentos del equipo</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {talentos.map(t => {
                    const key = get9BoxKey(t.potencial, t.desempeno);
                    return (
                      <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg border border-slate-100 bg-white">
                        <div className={`w-2 h-8 rounded-full flex-shrink-0 ${NINEBOX_COLOR[key]}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm text-slate-800">{t.personnel_nombre}</p>
                            {t.es_critico && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">Crítico</span>}
                          </div>
                          <p className="text-xs text-slate-400">{NINEBOXLABELS[key]}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-slate-400">P:{t.potencial} D:{t.desempeno}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Identificar Talento</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Empleado *</Label>
              <Input placeholder="Apellido, Nombre" value={form.personnel_nombre} onChange={e => setForm(f => ({ ...f, personnel_nombre: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Potencial (1-3)</Label>
                <Select value={form.potencial} onValueChange={v => setForm(f => ({ ...f, potencial: v as '1'|'2'|'3' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 — Bajo</SelectItem>
                    <SelectItem value="2">2 — Medio</SelectItem>
                    <SelectItem value="3">3 — Alto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Desempeño (1-3)</Label>
                <Select value={form.desempeno} onValueChange={v => setForm(f => ({ ...f, desempeno: v as '1'|'2'|'3' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 — Bajo</SelectItem>
                    <SelectItem value="2">2 — Medio</SelectItem>
                    <SelectItem value="3">3 — Alto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 text-center">
              <p className="text-xs text-slate-500">Categoría resultante</p>
              <p className="font-semibold text-slate-700 mt-0.5">
                {NINEBOXLABELS[get9BoxKey(Number(form.potencial), Number(form.desempeno))]}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="critico"
                checked={form.es_critico}
                onChange={e => setForm(f => ({ ...f, es_critico: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="critico" className="cursor-pointer">Talento crítico para la organización</Label>
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Input placeholder="Observaciones adicionales" value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCrear} disabled={saving || !form.personnel_nombre} className="bg-green-700 hover:bg-green-800">
              {saving ? 'Guardando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModulePageShell>
  );
}
