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
import { Plus, AlertTriangle, CheckCircle2, CalendarDays } from 'lucide-react';
import type { Fichaje, Ausencia, TipoFichaje } from '@/types/rrhh-plugins';

const TIPO_COLOR: Record<TipoFichaje, string> = {
  presencial: 'bg-green-100 text-green-700',
  remoto: 'bg-blue-100 text-blue-700',
  ausente: 'bg-red-100 text-red-700',
  licencia: 'bg-orange-100 text-orange-700',
  vacaciones: 'bg-teal-100 text-teal-700',
  feriado: 'bg-slate-100 text-slate-600',
};

const TIPO_LABEL: Record<TipoFichaje, string> = {
  presencial: 'Presencial',
  remoto: 'Remoto',
  ausente: 'Ausente',
  licencia: 'Licencia',
  vacaciones: 'Vacaciones',
  feriado: 'Feriado',
};

export default function AsistenciaPage() {
  const { user } = useAuth();
  const [fichajes, setFichajes] = useState<Fichaje[]>([]);
  const [ausencias, setAusencias] = useState<Ausencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'fichajes' | 'ausencias'>('fichajes');
  const [fichajeModal, setFichajeModal] = useState(false);
  const [ausenciaModal, setAusenciaModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mesFiltro, setMesFiltro] = useState(() => new Date().toISOString().slice(0, 7));

  const [fichajeForm, setFichajeForm] = useState({
    personnel_nombre: '',
    fecha: new Date().toISOString().split('T')[0],
    tipo: 'presencial' as TipoFichaje,
    hora_entrada: '09:00',
    hora_salida: '18:00',
    justificacion: '',
  });

  const [ausenciaForm, setAusenciaForm] = useState({
    personnel_nombre: '',
    tipo: 'vacaciones' as Ausencia['tipo'],
    desde: '',
    hasta: '',
    motivo: '',
  });

  const fetchData = async () => {
    if (!user) return;
    const token = await user?.getIdToken?.();
    const headers = { Authorization: `Bearer ${token}` };
    const [fRes, aRes] = await Promise.all([
      fetch(`/api/rrhh/fichajes?mes=${mesFiltro}`, { headers }),
      fetch('/api/rrhh/ausencias', { headers }),
    ]);
    if (fRes.ok) setFichajes(await fRes.json());
    if (aRes.ok) setAusencias(await aRes.json());
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user, mesFiltro]);

  const handleCrearFichaje = async () => {
    if (!user || !fichajeForm.personnel_nombre || !fichajeForm.fecha) return;
    setSaving(true);
    try {
      const token = await user?.getIdToken?.();
      const res = await fetch('/api/rrhh/fichajes', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...fichajeForm,
          personnel_id: `manual_${Date.now()}`,
        }),
      });
      if (res.ok) { setFichajeModal(false); fetchData(); }
    } finally { setSaving(false); }
  };

  const handleCrearAusencia = async () => {
    if (!user || !ausenciaForm.personnel_nombre || !ausenciaForm.desde) return;
    setSaving(true);
    try {
      const token = await user?.getIdToken?.();
      const res = await fetch('/api/rrhh/ausencias', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...ausenciaForm,
          personnel_id: `manual_${Date.now()}`,
        }),
      });
      if (res.ok) { setAusenciaModal(false); fetchData(); }
    } finally { setSaving(false); }
  };

  const pendientes = ausencias.filter(a => a.estado === 'pendiente').length;
  const presentes = fichajes.filter(f => f.tipo === 'presencial' || f.tipo === 'remoto').length;
  const ausentes = fichajes.filter(f => f.tipo === 'ausente').length;
  const presentismo = fichajes.length > 0 ? Math.round((presentes / fichajes.length) * 100) : 0;

  return (
    <ModulePageShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="RRHH"
          title="Asistencia y Presentismo"
          description="Control de horarios, ausencias y alertas de ausentismo — ISO 7.1.2"
          breadcrumbs={[{ label: 'RRHH', href: '/rrhh' }, { label: 'Asistencia' }]}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAusenciaModal(true)}>
                <CalendarDays className="w-4 h-4 mr-2" /> Ausencia
              </Button>
              <Button onClick={() => setFichajeModal(true)} className="bg-green-700 hover:bg-green-800">
                <Plus className="w-4 h-4 mr-2" /> Registrar
              </Button>
            </div>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <p className="text-xs text-slate-500">Presentismo</p>
              </div>
              <p className="text-3xl font-bold text-green-700 mt-1">{presentismo}%</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-blue-50">
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">Fichajes del mes</p>
              <p className="text-3xl font-bold text-blue-700">{fichajes.length}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <p className="text-xs text-slate-500">Ausencias sin justif.</p>
              </div>
              <p className="text-3xl font-bold text-red-700 mt-1">{ausentes}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-orange-50">
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">Solicitudes pendientes</p>
              <p className="text-3xl font-bold text-orange-700">{pendientes}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1 w-fit">
          {(['fichajes', 'ausencias'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize ${tab === t ? 'bg-green-700 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'fichajes' && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Fichajes</CardTitle>
                <Input
                  type="month"
                  value={mesFiltro}
                  onChange={e => setMesFiltro(e.target.value)}
                  className="w-40"
                />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-slate-400">Cargando...</div>
              ) : fichajes.length === 0 ? (
                <div className="text-center py-8 text-slate-400">No hay fichajes en este período</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-slate-500 text-left">
                        <th className="pb-2 px-2 font-medium">Empleado</th>
                        <th className="pb-2 px-2 font-medium">Fecha</th>
                        <th className="pb-2 px-2 font-medium">Tipo</th>
                        <th className="pb-2 px-2 font-medium">Entrada</th>
                        <th className="pb-2 px-2 font-medium">Salida</th>
                        <th className="pb-2 px-2 font-medium text-right">Horas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fichajes.map(f => (
                        <tr key={f.id} className="border-b hover:bg-slate-50">
                          <td className="py-2 px-2 font-medium text-slate-800">{f.personnel_nombre || '—'}</td>
                          <td className="py-2 px-2 text-slate-600">{f.fecha}</td>
                          <td className="py-2 px-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIPO_COLOR[f.tipo]}`}>
                              {TIPO_LABEL[f.tipo]}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-slate-600">{f.hora_entrada || '—'}</td>
                          <td className="py-2 px-2 text-slate-600">{f.hora_salida || '—'}</td>
                          <td className="py-2 px-2 text-right font-medium text-slate-700">
                            {f.horas_trabajadas !== undefined ? f.horas_trabajadas.toFixed(1) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {tab === 'ausencias' && (
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Solicitudes de Ausencia</CardTitle></CardHeader>
            <CardContent>
              {ausencias.length === 0 ? (
                <div className="text-center py-8 text-slate-400">No hay ausencias registradas</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-slate-500 text-left">
                        <th className="pb-2 px-2 font-medium">Empleado</th>
                        <th className="pb-2 px-2 font-medium">Tipo</th>
                        <th className="pb-2 px-2 font-medium">Desde</th>
                        <th className="pb-2 px-2 font-medium">Hasta</th>
                        <th className="pb-2 px-2 font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ausencias.map(a => (
                        <tr key={a.id} className="border-b hover:bg-slate-50">
                          <td className="py-2 px-2 font-medium text-slate-800">{a.personnel_nombre || '—'}</td>
                          <td className="py-2 px-2 text-slate-600 capitalize">{a.tipo.replace(/_/g, ' ')}</td>
                          <td className="py-2 px-2 text-slate-600">{a.desde}</td>
                          <td className="py-2 px-2 text-slate-600">{a.hasta}</td>
                          <td className="py-2 px-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              a.estado === 'aprobada' ? 'bg-green-100 text-green-700' :
                              a.estado === 'rechazada' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {a.estado}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal fichaje */}
      <Dialog open={fichajeModal} onOpenChange={setFichajeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Registrar Asistencia</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Empleado *</Label>
              <Input value={fichajeForm.personnel_nombre} onChange={e => setFichajeForm(f => ({ ...f, personnel_nombre: e.target.value }))} placeholder="Apellido, Nombre" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Fecha *</Label>
                <Input type="date" value={fichajeForm.fecha} onChange={e => setFichajeForm(f => ({ ...f, fecha: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={fichajeForm.tipo} onValueChange={v => setFichajeForm(f => ({ ...f, tipo: v as TipoFichaje }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(fichajeForm.tipo === 'presencial' || fichajeForm.tipo === 'remoto') && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Hora entrada</Label>
                  <Input type="time" value={fichajeForm.hora_entrada} onChange={e => setFichajeForm(f => ({ ...f, hora_entrada: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Hora salida</Label>
                  <Input type="time" value={fichajeForm.hora_salida} onChange={e => setFichajeForm(f => ({ ...f, hora_salida: e.target.value }))} />
                </div>
              </div>
            )}
            <div className="space-y-1">
              <Label>Justificación</Label>
              <Input value={fichajeForm.justificacion} onChange={e => setFichajeForm(f => ({ ...f, justificacion: e.target.value }))} placeholder="Opcional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFichajeModal(false)}>Cancelar</Button>
            <Button onClick={handleCrearFichaje} disabled={saving || !fichajeForm.personnel_nombre} className="bg-green-700 hover:bg-green-800">
              {saving ? 'Guardando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal ausencia */}
      <Dialog open={ausenciaModal} onOpenChange={setAusenciaModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Solicitud de Ausencia</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Empleado *</Label>
              <Input value={ausenciaForm.personnel_nombre} onChange={e => setAusenciaForm(f => ({ ...f, personnel_nombre: e.target.value }))} placeholder="Apellido, Nombre" />
            </div>
            <div className="space-y-1">
              <Label>Tipo de ausencia</Label>
              <Select value={ausenciaForm.tipo} onValueChange={v => setAusenciaForm(f => ({ ...f, tipo: v as Ausencia['tipo'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacaciones">Vacaciones</SelectItem>
                  <SelectItem value="enfermedad">Enfermedad</SelectItem>
                  <SelectItem value="licencia_con_sueldo">Licencia con sueldo</SelectItem>
                  <SelectItem value="licencia_sin_sueldo">Licencia sin sueldo</SelectItem>
                  <SelectItem value="maternidad">Maternidad</SelectItem>
                  <SelectItem value="paternidad">Paternidad</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Desde *</Label>
                <Input type="date" value={ausenciaForm.desde} onChange={e => setAusenciaForm(f => ({ ...f, desde: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Hasta</Label>
                <Input type="date" value={ausenciaForm.hasta} onChange={e => setAusenciaForm(f => ({ ...f, hasta: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Motivo</Label>
              <Input value={ausenciaForm.motivo} onChange={e => setAusenciaForm(f => ({ ...f, motivo: e.target.value }))} placeholder="Descripción breve" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAusenciaModal(false)}>Cancelar</Button>
            <Button onClick={handleCrearAusencia} disabled={saving || !ausenciaForm.personnel_nombre || !ausenciaForm.desde} className="bg-green-700 hover:bg-green-800">
              {saving ? 'Guardando...' : 'Solicitar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModulePageShell>
  );
}
