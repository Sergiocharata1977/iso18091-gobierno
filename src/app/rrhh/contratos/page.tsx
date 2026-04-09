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
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Plus,
  Search,
  XCircle,
} from 'lucide-react';
import type { Contrato, TipoContrato } from '@/types/rrhh-plugins';

const ESTADO_CONFIG: Record<Contrato['estado'], { label: string; color: string; icon: React.ReactNode }> = {
  vigente: { label: 'Vigente', color: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="w-3 h-3" /> },
  por_vencer: { label: 'Por Vencer', color: 'bg-yellow-100 text-yellow-700', icon: <AlertTriangle className="w-3 h-3" /> },
  vencido: { label: 'Vencido', color: 'bg-red-100 text-red-700', icon: <XCircle className="w-3 h-3" /> },
  rescindido: { label: 'Rescindido', color: 'bg-slate-100 text-slate-600', icon: <Clock className="w-3 h-3" /> },
};

const TIPO_LABELS: Record<TipoContrato, string> = {
  indefinido: 'Indefinido',
  plazo_fijo: 'Plazo Fijo',
  eventual: 'Eventual',
  pasantia: 'Pasantía',
  monotributo: 'Monotributo',
  otro: 'Otro',
};

export default function ContratosPage() {
  const { user } = useAuth();
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    personnel_nombre: '',
    personnel_id: '',
    tipo: 'indefinido' as TipoContrato,
    fecha_inicio: '',
    fecha_fin: '',
    categoria: '',
    remuneracion_bruta: '',
    notas: '',
    alerta_dias: '30',
  });

  const fetchContratos = async () => {
    if (!user) return;
    try {
      const token = await user?.getIdToken?.();
      const res = await fetch('/api/rrhh/contratos', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setContratos(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchContratos(); }, [user]);

  const handleSubmit = async () => {
    if (!user || !form.personnel_nombre || !form.fecha_inicio) return;
    setSaving(true);
    try {
      const token = await user?.getIdToken?.();
      const body = {
        personnel_nombre: form.personnel_nombre,
        personnel_id: form.personnel_id || `manual_${Date.now()}`,
        tipo: form.tipo,
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin || undefined,
        categoria: form.categoria || undefined,
        remuneracion_bruta: form.remuneracion_bruta ? Number(form.remuneracion_bruta) : undefined,
        notas: form.notas || undefined,
        alerta_dias: Number(form.alerta_dias) || 30,
      };
      const res = await fetch('/api/rrhh/contratos', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setModalOpen(false);
        setForm({ personnel_nombre: '', personnel_id: '', tipo: 'indefinido', fecha_inicio: '', fecha_fin: '', categoria: '', remuneracion_bruta: '', notas: '', alerta_dias: '30' });
        fetchContratos();
      }
    } finally {
      setSaving(false);
    }
  };

  const filtered = contratos.filter(c =>
    (c.personnel_nombre || '').toLowerCase().includes(search.toLowerCase()) ||
    TIPO_LABELS[c.tipo]?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: contratos.length,
    vigentes: contratos.filter(c => c.estado === 'vigente').length,
    por_vencer: contratos.filter(c => c.estado === 'por_vencer').length,
    vencidos: contratos.filter(c => c.estado === 'vencido').length,
  };

  return (
    <ModulePageShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="RRHH"
          title="Contratos y Legajos"
          description="Gestión documental y contractual del personal — ISO 7.5"
          breadcrumbs={[{ label: 'RRHH', href: '/rrhh' }, { label: 'Contratos' }]}
          actions={
            <Button onClick={() => setModalOpen(true)} className="bg-green-700 hover:bg-green-800">
              <Plus className="w-4 h-4 mr-2" /> Nuevo Contrato
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, color: 'text-slate-700', bg: 'bg-slate-100' },
            { label: 'Vigentes', value: stats.vigentes, color: 'text-green-700', bg: 'bg-green-50' },
            { label: 'Por Vencer', value: stats.por_vencer, color: 'text-yellow-700', bg: 'bg-yellow-50' },
            { label: 'Vencidos', value: stats.vencidos, color: 'text-red-700', bg: 'bg-red-50' },
          ].map(s => (
            <Card key={s.label} className={`border-0 shadow-sm ${s.bg}`}>
              <CardContent className="p-4">
                <p className="text-sm text-slate-500">{s.label}</p>
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search + List */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nombre o tipo..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-slate-400">Cargando contratos...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No hay contratos registrados</p>
                <Button variant="outline" className="mt-4" onClick={() => setModalOpen(true)}>
                  Registrar primer contrato
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-slate-500">
                      <th className="text-left py-3 px-2 font-medium">Empleado</th>
                      <th className="text-left py-3 px-2 font-medium">Tipo</th>
                      <th className="text-left py-3 px-2 font-medium">Categoría</th>
                      <th className="text-left py-3 px-2 font-medium">Inicio</th>
                      <th className="text-left py-3 px-2 font-medium">Vencimiento</th>
                      <th className="text-left py-3 px-2 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(c => {
                      const cfg = ESTADO_CONFIG[c.estado];
                      return (
                        <tr key={c.id} className="border-b hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-2 font-medium text-slate-800">{c.personnel_nombre || '—'}</td>
                          <td className="py-3 px-2 text-slate-600">{TIPO_LABELS[c.tipo]}</td>
                          <td className="py-3 px-2 text-slate-500">{c.categoria || '—'}</td>
                          <td className="py-3 px-2 text-slate-600">{c.fecha_inicio}</td>
                          <td className="py-3 px-2 text-slate-600">{c.fecha_fin || 'Indefinido'}</td>
                          <td className="py-3 px-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                              {cfg.icon} {cfg.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo Contrato</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Nombre del Empleado *</Label>
              <Input
                placeholder="Apellido, Nombre"
                value={form.personnel_nombre}
                onChange={e => setForm(f => ({ ...f, personnel_nombre: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Tipo de Contrato *</Label>
                <Select
                  value={form.tipo}
                  onValueChange={v => setForm(f => ({ ...f, tipo: v as TipoContrato }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Categoría</Label>
                <Input
                  placeholder="Ej: Empleado A1"
                  value={form.categoria}
                  onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Fecha de Inicio *</Label>
                <Input
                  type="date"
                  value={form.fecha_inicio}
                  onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Fecha de Vencimiento</Label>
                <Input
                  type="date"
                  value={form.fecha_fin}
                  onChange={e => setForm(f => ({ ...f, fecha_fin: e.target.value }))}
                  placeholder="Dejar vacío si es indefinido"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Remuneración Bruta ($)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.remuneracion_bruta}
                  onChange={e => setForm(f => ({ ...f, remuneracion_bruta: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Alertar con X días de anticipación</Label>
                <Input
                  type="number"
                  value={form.alerta_dias}
                  onChange={e => setForm(f => ({ ...f, alerta_dias: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Input
                placeholder="Observaciones adicionales..."
                value={form.notas}
                onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || !form.personnel_nombre || !form.fecha_inicio}
              className="bg-green-700 hover:bg-green-800"
            >
              {saving ? 'Guardando...' : 'Guardar Contrato'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModulePageShell>
  );
}
