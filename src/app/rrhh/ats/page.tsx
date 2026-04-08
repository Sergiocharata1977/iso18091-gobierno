'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { ModulePageShell, PageHeader } from '@/components/design-system';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import { Briefcase, MapPin, Plus, Search, Users } from 'lucide-react';
import type { Vacante, Candidato, EtapaSeleccion } from '@/types/rrhh-plugins';

const ESTADO_VACANTE_COLOR: Record<Vacante['estado'], string> = {
  borrador: 'bg-slate-100 text-slate-600',
  publicada: 'bg-blue-100 text-blue-700',
  en_proceso: 'bg-yellow-100 text-yellow-700',
  suspendida: 'bg-orange-100 text-orange-700',
  cerrada: 'bg-slate-100 text-slate-500',
};

const ETAPAS: { key: EtapaSeleccion; label: string; color: string }[] = [
  { key: 'postulado', label: 'Postulado', color: 'bg-slate-100 border-slate-300' },
  { key: 'screening', label: 'Screening', color: 'bg-blue-50 border-blue-300' },
  { key: 'entrevista_hr', label: 'Entrevista HR', color: 'bg-purple-50 border-purple-300' },
  { key: 'entrevista_tecnica', label: 'Entrevista Técnica', color: 'bg-indigo-50 border-indigo-300' },
  { key: 'oferta', label: 'Oferta', color: 'bg-yellow-50 border-yellow-300' },
  { key: 'contratado', label: 'Contratado', color: 'bg-green-50 border-green-300' },
  { key: 'descartado', label: 'Descartado', color: 'bg-red-50 border-red-300' },
];

export default function ATSPage() {
  const { user } = useAuth();
  const [vacantes, setVacantes] = useState<Vacante[]>([]);
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [selectedVacante, setSelectedVacante] = useState<Vacante | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [vacanteModalOpen, setVacanteModalOpen] = useState(false);
  const [candidatoModalOpen, setCandidatoModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [vacanteForm, setVacanteForm] = useState({
    titulo: '',
    descripcion: '',
    modalidad: 'presencial' as Vacante['modalidad'],
    ubicacion: '',
    fecha_apertura: new Date().toISOString().split('T')[0],
    cantidad_posiciones: '1',
  });

  const [candidatoForm, setCandidatoForm] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
  });

  const fetchData = async () => {
    if (!user) return;
    const token = await user.getIdToken();
    const headers = { Authorization: `Bearer ${token}` };
    const [vRes, cRes] = await Promise.all([
      fetch('/api/rrhh/vacantes', { headers }),
      fetch('/api/rrhh/candidatos', { headers }),
    ]);
    if (vRes.ok) setVacantes(await vRes.json());
    if (cRes.ok) setCandidatos(await cRes.json());
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const candidatosByVacante = selectedVacante
    ? candidatos.filter(c => c.vacante_id === selectedVacante.id)
    : [];

  const candidatosByEtapa = (etapa: EtapaSeleccion) =>
    candidatosByVacante.filter(c => c.etapa === etapa);

  const handleCrearVacante = async () => {
    if (!user || !vacanteForm.titulo) return;
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/rrhh/vacantes', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...vacanteForm,
          cantidad_posiciones: Number(vacanteForm.cantidad_posiciones) || 1,
          estado: 'publicada',
        }),
      });
      if (res.ok) {
        setVacanteModalOpen(false);
        setVacanteForm({ titulo: '', descripcion: '', modalidad: 'presencial', ubicacion: '', fecha_apertura: new Date().toISOString().split('T')[0], cantidad_posiciones: '1' });
        fetchData();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCrearCandidato = async () => {
    if (!user || !selectedVacante || !candidatoForm.nombre || !candidatoForm.email) return;
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/rrhh/candidatos', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...candidatoForm,
          vacante_id: selectedVacante.id,
          vacante_titulo: selectedVacante.titulo,
          etapa: 'postulado',
          fecha_postulacion: new Date().toISOString().split('T')[0],
        }),
      });
      if (res.ok) {
        setCandidatoModalOpen(false);
        setCandidatoForm({ nombre: '', apellido: '', email: '', telefono: '' });
        fetchData();
      }
    } finally {
      setSaving(false);
    }
  };

  const moverCandidato = async (candidato: Candidato, nuevaEtapa: EtapaSeleccion) => {
    if (!user) return;
    const token = await user.getIdToken();
    await fetch(`/api/rrhh/candidatos/${candidato.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ etapa: nuevaEtapa }),
    });
    fetchData();
  };

  const filteredVacantes = vacantes.filter(v =>
    v.titulo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ModulePageShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="RRHH"
          title="Atracción y Selección"
          description="Pipeline de reclutamiento y gestión de candidatos — ISO 7.1.2"
          breadcrumbs={[{ label: 'RRHH', href: '/rrhh' }, { label: 'ATS' }]}
          actions={
            <Button onClick={() => setVacanteModalOpen(true)} className="bg-green-700 hover:bg-green-800">
              <Plus className="w-4 h-4 mr-2" /> Nueva Vacante
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm bg-blue-50">
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Vacantes abiertas</p>
              <p className="text-3xl font-bold text-blue-700">{vacantes.filter(v => v.estado === 'publicada' || v.estado === 'en_proceso').length}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-purple-50">
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Candidatos activos</p>
              <p className="text-3xl font-bold text-purple-700">{candidatos.filter(c => c.etapa !== 'contratado' && c.etapa !== 'descartado').length}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-green-50">
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Contratados este mes</p>
              <p className="text-3xl font-bold text-green-700">{candidatos.filter(c => c.etapa === 'contratado').length}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Panel izq: lista vacantes */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar vacante..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>
            {loading ? (
              <div className="text-center py-8 text-slate-400">Cargando...</div>
            ) : (
              <div className="space-y-2">
                {filteredVacantes.map(v => (
                  <Card
                    key={v.id}
                    className={`border cursor-pointer transition-all shadow-sm hover:shadow-md ${selectedVacante?.id === v.id ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-white'}`}
                    onClick={() => setSelectedVacante(v)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-slate-800 truncate">{v.titulo}</p>
                          {v.ubicacion && (
                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" /> {v.ubicacion}
                            </p>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${ESTADO_VACANTE_COLOR[v.estado]}`}>
                          {v.estado.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> {v.candidatos_count || 0} candidatos
                        </span>
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3 h-3" /> {v.modalidad}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filteredVacantes.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    No hay vacantes
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Panel der: Kanban de candidatos */}
          <div className="lg:col-span-2">
            {!selectedVacante ? (
              <Card className="border-0 shadow-sm h-full flex items-center justify-center">
                <CardContent className="text-center py-16">
                  <Briefcase className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-400">Seleccioná una vacante para ver el pipeline</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-800">{selectedVacante.titulo}</h3>
                      <p className="text-xs text-slate-400">{candidatosByVacante.length} candidatos en pipeline</p>
                    </div>
                    <Button size="sm" onClick={() => setCandidatoModalOpen(true)} className="bg-green-700 hover:bg-green-800">
                      <Plus className="w-3 h-3 mr-1" /> Candidato
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto pb-2">
                    <div className="flex gap-3 min-w-max">
                      {ETAPAS.map(etapa => (
                        <div key={etapa.key} className="w-44">
                          <div className={`rounded-t-lg border-t-2 border-x px-2 py-1.5 text-xs font-semibold text-slate-600 ${etapa.color}`}>
                            {etapa.label}
                            <span className="ml-1 text-slate-400">({candidatosByEtapa(etapa.key).length})</span>
                          </div>
                          <div className={`rounded-b-lg border-b border-x min-h-32 p-2 space-y-2 ${etapa.color}`}>
                            {candidatosByEtapa(etapa.key).map(c => (
                              <div key={c.id} className="bg-white rounded-lg p-2 shadow-sm border border-slate-100 text-xs">
                                <p className="font-medium text-slate-700">{c.nombre} {c.apellido}</p>
                                <p className="text-slate-400 truncate">{c.email}</p>
                                {etapa.key !== 'contratado' && etapa.key !== 'descartado' && (
                                  <div className="flex gap-1 mt-1.5 flex-wrap">
                                    {ETAPAS.filter(e => e.key !== etapa.key && e.key !== 'descartado').slice(0, 2).map(e => (
                                      <button
                                        key={e.key}
                                        onClick={() => moverCandidato(c, e.key)}
                                        className="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-green-100 rounded text-slate-500 hover:text-green-700 transition-colors"
                                      >
                                        → {e.label}
                                      </button>
                                    ))}
                                    <button
                                      onClick={() => moverCandidato(c, 'descartado')}
                                      className="text-[10px] px-1.5 py-0.5 bg-red-50 hover:bg-red-100 rounded text-red-400 hover:text-red-600 transition-colors"
                                    >
                                      Descartar
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Modal nueva vacante */}
      <Dialog open={vacanteModalOpen} onOpenChange={setVacanteModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nueva Vacante</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Título del puesto *</Label>
              <Input value={vacanteForm.titulo} onChange={e => setVacanteForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ej: Desarrollador Frontend" />
            </div>
            <div className="space-y-1">
              <Label>Descripción</Label>
              <Input value={vacanteForm.descripcion} onChange={e => setVacanteForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Descripción del puesto..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Modalidad</Label>
                <Select value={vacanteForm.modalidad} onValueChange={v => setVacanteForm(f => ({ ...f, modalidad: v as Vacante['modalidad'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="remoto">Remoto</SelectItem>
                    <SelectItem value="hibrido">Híbrido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Posiciones</Label>
                <Input type="number" min="1" value={vacanteForm.cantidad_posiciones} onChange={e => setVacanteForm(f => ({ ...f, cantidad_posiciones: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Ubicación</Label>
                <Input value={vacanteForm.ubicacion} onChange={e => setVacanteForm(f => ({ ...f, ubicacion: e.target.value }))} placeholder="Ciudad / Región" />
              </div>
              <div className="space-y-1">
                <Label>Fecha apertura</Label>
                <Input type="date" value={vacanteForm.fecha_apertura} onChange={e => setVacanteForm(f => ({ ...f, fecha_apertura: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVacanteModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCrearVacante} disabled={saving || !vacanteForm.titulo} className="bg-green-700 hover:bg-green-800">
              {saving ? 'Guardando...' : 'Crear Vacante'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal nuevo candidato */}
      <Dialog open={candidatoModalOpen} onOpenChange={setCandidatoModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Agregar Candidato — {selectedVacante?.titulo}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Nombre *</Label>
                <Input value={candidatoForm.nombre} onChange={e => setCandidatoForm(f => ({ ...f, nombre: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Apellido</Label>
                <Input value={candidatoForm.apellido} onChange={e => setCandidatoForm(f => ({ ...f, apellido: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Email *</Label>
              <Input type="email" value={candidatoForm.email} onChange={e => setCandidatoForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Teléfono</Label>
              <Input value={candidatoForm.telefono} onChange={e => setCandidatoForm(f => ({ ...f, telefono: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCandidatoModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCrearCandidato} disabled={saving || !candidatoForm.nombre || !candidatoForm.email} className="bg-green-700 hover:bg-green-800">
              {saving ? 'Guardando...' : 'Agregar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModulePageShell>
  );
}
