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
import { Scale, Plus, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import type { AcuerdoLaboral, IncidenteLaboral } from '@/types/rrhh-plugins';

const TIPO_ACUERDO_LABEL: Record<AcuerdoLaboral['tipo'], string> = {
  acta_acuerdo: 'Acta de Acuerdo',
  convenio_colectivo: 'Convenio Colectivo',
  contrato_individual: 'Contrato Individual',
  reglamento: 'Reglamento',
  otro: 'Otro',
};

export default function RelacionesPage() {
  const { user } = useAuth();
  const [acuerdos, setAcuerdos] = useState<AcuerdoLaboral[]>([]);
  const [incidentes, setIncidentes] = useState<IncidenteLaboral[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'acuerdos' | 'incidentes'>('acuerdos');
  const [acuerdoModal, setAcuerdoModal] = useState(false);
  const [incidenteModal, setIncidenteModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [acuerdoForm, setAcuerdoForm] = useState({
    titulo: '',
    tipo: 'acta_acuerdo' as AcuerdoLaboral['tipo'],
    partes: '',
    fecha_firma: new Date().toISOString().split('T')[0],
    fecha_vigencia_hasta: '',
    notas: '',
  });

  const [incidenteForm, setIncidenteForm] = useState({
    personnel_nombre: '',
    tipo: 'conflicto' as IncidenteLaboral['tipo'],
    descripcion: '',
    fecha: new Date().toISOString().split('T')[0],
  });

  const fetchData = async () => {
    if (!user) return;
    const token = await user.getIdToken();
    const headers = { Authorization: `Bearer ${token}` };
    const [aRes, iRes] = await Promise.all([
      fetch('/api/rrhh/relaciones?tipo=acuerdos', { headers }),
      fetch('/api/rrhh/relaciones?tipo=incidentes', { headers }),
    ]);
    if (aRes.ok) setAcuerdos(await aRes.json());
    if (iRes.ok) setIncidentes(await iRes.json());
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleCrearAcuerdo = async () => {
    if (!user || !acuerdoForm.titulo) return;
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/rrhh/relaciones?tipo=acuerdos', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...acuerdoForm, estado: 'vigente' }),
      });
      if (res.ok) { setAcuerdoModal(false); fetchData(); }
    } finally { setSaving(false); }
  };

  const handleCrearIncidente = async () => {
    if (!user || !incidenteForm.descripcion) return;
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/rrhh/relaciones?tipo=incidentes', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...incidenteForm, estado: 'abierto' }),
      });
      if (res.ok) { setIncidenteModal(false); fetchData(); }
    } finally { setSaving(false); }
  };

  const vigentes = acuerdos.filter(a => a.estado === 'vigente').length;
  const abiertos = incidentes.filter(i => i.estado === 'abierto' || i.estado === 'en_gestion').length;

  return (
    <ModulePageShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="RRHH"
          title="Relaciones Laborales"
          description="Cumplimiento legal y gestión de acuerdos — ISO 7.1.2"
          breadcrumbs={[{ label: 'RRHH', href: '/rrhh' }, { label: 'Relaciones' }]}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIncidenteModal(true)}>
                <AlertTriangle className="w-4 h-4 mr-2" /> Incidente
              </Button>
              <Button onClick={() => setAcuerdoModal(true)} className="bg-green-700 hover:bg-green-800">
                <Plus className="w-4 h-4 mr-2" /> Nuevo Acuerdo
              </Button>
            </div>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm bg-slate-50">
            <CardContent className="p-4 flex items-center gap-3">
              <Scale className="w-8 h-8 text-slate-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Acuerdos vigentes</p>
                <p className="text-2xl font-bold text-slate-700">{vigentes}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-green-50">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Cumplimiento</p>
                <p className="text-2xl font-bold text-green-700">{vigentes > 0 ? '100%' : '—'}</p>
              </div>
            </CardContent>
          </Card>
          <Card className={`border-0 shadow-sm ${abiertos > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className={`w-8 h-8 flex-shrink-0 ${abiertos > 0 ? 'text-red-500' : 'text-slate-400'}`} />
              <div>
                <p className="text-xs text-slate-500">Incidentes abiertos</p>
                <p className={`text-2xl font-bold ${abiertos > 0 ? 'text-red-700' : 'text-slate-700'}`}>{abiertos}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1 w-fit">
          {(['acuerdos', 'incidentes'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize ${tab === t ? 'bg-green-700 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'acuerdos' && (
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Acuerdos y Documentos Laborales</CardTitle></CardHeader>
            <CardContent>
              {loading ? <div className="text-center py-8 text-slate-400">Cargando...</div> :
              acuerdos.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p>No hay acuerdos registrados</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {acuerdos.map(a => (
                    <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-white hover:bg-slate-50">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Scale className="w-4 h-4 text-slate-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-800">{a.titulo}</p>
                        <p className="text-xs text-slate-400">{TIPO_ACUERDO_LABEL[a.tipo]} · Firma: {a.fecha_firma}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                        a.estado === 'vigente' ? 'bg-green-100 text-green-700' :
                        a.estado === 'vencido' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>{a.estado}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {tab === 'incidentes' && (
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Incidentes Laborales</CardTitle></CardHeader>
            <CardContent>
              {incidentes.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p>Sin incidentes registrados</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {incidentes.map(i => (
                    <div key={i.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-white hover:bg-slate-50">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${i.estado === 'abierto' ? 'bg-red-100' : 'bg-slate-100'}`}>
                        <AlertTriangle className={`w-4 h-4 ${i.estado === 'abierto' ? 'text-red-500' : 'text-slate-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-800 capitalize">{i.tipo.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-slate-500 truncate">{i.descripcion}</p>
                        {i.personnel_nombre && <p className="text-xs text-slate-400">{i.personnel_nombre} · {i.fecha}</p>}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                        i.estado === 'abierto' ? 'bg-red-100 text-red-700' :
                        i.estado === 'resuelto' || i.estado === 'cerrado' ? 'bg-green-100 text-green-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>{i.estado.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal acuerdo */}
      <Dialog open={acuerdoModal} onOpenChange={setAcuerdoModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nuevo Acuerdo Laboral</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Título *</Label>
              <Input placeholder="Ej: Convenio 2026 - Sector IT" value={acuerdoForm.titulo} onChange={e => setAcuerdoForm(f => ({ ...f, titulo: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={acuerdoForm.tipo} onValueChange={v => setAcuerdoForm(f => ({ ...f, tipo: v as AcuerdoLaboral['tipo'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_ACUERDO_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Fecha de firma</Label>
                <Input type="date" value={acuerdoForm.fecha_firma} onChange={e => setAcuerdoForm(f => ({ ...f, fecha_firma: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Partes intervinientes</Label>
              <Input placeholder="Ej: Empresa / Sindicato XXXX" value={acuerdoForm.partes} onChange={e => setAcuerdoForm(f => ({ ...f, partes: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Vigencia hasta</Label>
                <Input type="date" value={acuerdoForm.fecha_vigencia_hasta} onChange={e => setAcuerdoForm(f => ({ ...f, fecha_vigencia_hasta: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Input placeholder="Observaciones" value={acuerdoForm.notas} onChange={e => setAcuerdoForm(f => ({ ...f, notas: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcuerdoModal(false)}>Cancelar</Button>
            <Button onClick={handleCrearAcuerdo} disabled={saving || !acuerdoForm.titulo} className="bg-green-700 hover:bg-green-800">
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal incidente */}
      <Dialog open={incidenteModal} onOpenChange={setIncidenteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Registrar Incidente Laboral</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Descripción *</Label>
              <Input placeholder="Descripción del incidente" value={incidenteForm.descripcion} onChange={e => setIncidenteForm(f => ({ ...f, descripcion: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={incidenteForm.tipo} onValueChange={v => setIncidenteForm(f => ({ ...f, tipo: v as IncidenteLaboral['tipo'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conflicto">Conflicto</SelectItem>
                    <SelectItem value="sancion">Sanción</SelectItem>
                    <SelectItem value="queja">Queja</SelectItem>
                    <SelectItem value="accidente">Accidente</SelectItem>
                    <SelectItem value="reclamo">Reclamo</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Fecha</Label>
                <Input type="date" value={incidenteForm.fecha} onChange={e => setIncidenteForm(f => ({ ...f, fecha: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Empleado involucrado</Label>
              <Input placeholder="Apellido, Nombre (opcional)" value={incidenteForm.personnel_nombre} onChange={e => setIncidenteForm(f => ({ ...f, personnel_nombre: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIncidenteModal(false)}>Cancelar</Button>
            <Button onClick={handleCrearIncidente} disabled={saving || !incidenteForm.descripcion} className="bg-green-700 hover:bg-green-800">
              {saving ? 'Guardando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModulePageShell>
  );
}
