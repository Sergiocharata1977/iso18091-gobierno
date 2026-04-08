'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus,
  ChevronLeft,
  X,
  Pencil,
  Trash2,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import type { TipoIncidente, GravedadIncidente } from '@/types/hse';

// ─── Types ────────────────────────────────────────────────────────────────────

type EstadoIncidente = 'abierto' | 'en_investigacion' | 'cerrado';

// API shape (dates come as strings/timestamps from Firestore JSON)
interface IncidenteRow {
  id: string;
  organization_id: string;
  tipo: TipoIncidente;
  fecha: string;       // ISO string
  hora?: string;
  descripcion: string;
  lugar: string;
  involucrados?: string[];
  gravedad?: 'leve' | 'moderado' | 'grave' | 'muy_grave';
  dias_perdidos?: number;
  causa_raiz?: string;
  acciones_correctivas?: string[];
  estado: EstadoIncidente;
  reported_by?: string;
  created_at?: unknown;
  updated_at?: unknown;
}

interface IncidenteFormState {
  tipo: TipoIncidente;
  fecha: string;
  hora: string;
  descripcion: string;
  lugar: string;
  gravedad: '' | 'leve' | 'moderado' | 'grave' | 'muy_grave';
  estado: EstadoIncidente;
  causa_raiz: string;
  observaciones: string;
}

// ─── Badge helpers ────────────────────────────────────────────────────────────

const GRAVEDAD_BADGE: Record<'leve' | 'moderado' | 'grave' | 'muy_grave', string> = {
  leve:      'bg-slate-800 text-slate-300 border-slate-700',
  moderado:  'bg-amber-900/40 text-amber-300 border-amber-700/50',
  grave:     'bg-orange-900/40 text-orange-300 border-orange-700/50',
  muy_grave: 'bg-rose-900/40 text-rose-300 border-rose-700/50',
};

const GRAVEDAD_LABELS: Record<'leve' | 'moderado' | 'grave' | 'muy_grave', string> = {
  leve:      'Leve',
  moderado:  'Moderado',
  grave:     'Grave',
  muy_grave: 'Muy grave',
};

const ESTADO_BADGE: Record<EstadoIncidente, string> = {
  abierto:          'bg-blue-900/40 text-blue-300 border-blue-700/50',
  en_investigacion: 'bg-amber-900/40 text-amber-300 border-amber-700/50',
  cerrado:          'bg-emerald-900/40 text-emerald-300 border-emerald-700/50',
};

const ESTADO_LABELS: Record<EstadoIncidente, string> = {
  abierto:          'Abierto',
  en_investigacion: 'En investigación',
  cerrado:          'Cerrado',
};

const TIPO_LABELS: Record<TipoIncidente, string> = {
  accidente:            'Accidente',
  incidente:            'Incidente',
  casi_accidente:       'Casi accidente',
  enfermedad_profesional: 'Enfermedad profesional',
};

function GravedadBadge({ gravedad }: { gravedad?: 'leve' | 'moderado' | 'grave' | 'muy_grave' }) {
  if (!gravedad) return <span className="text-slate-600">—</span>;
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${GRAVEDAD_BADGE[gravedad]}`}>
      {GRAVEDAD_LABELS[gravedad]}
    </span>
  );
}

function EstadoBadge({ estado }: { estado: EstadoIncidente }) {
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${ESTADO_BADGE[estado]}`}>
      {ESTADO_LABELS[estado]}
    </span>
  );
}

// ─── Empty form defaults ──────────────────────────────────────────────────────

function emptyForm(): IncidenteFormState {
  return {
    tipo: 'incidente',
    fecha: new Date().toISOString().split('T')[0] ?? '',
    hora: '',
    descripcion: '',
    lugar: '',
    gravedad: '',
    estado: 'abierto',
    causa_raiz: '',
    observaciones: '',
  };
}

function formFromRow(row: IncidenteRow): IncidenteFormState {
  return {
    tipo: row.tipo,
    fecha: row.fecha ? row.fecha.split('T')[0] ?? '' : '',
    hora: row.hora ?? '',
    descripcion: row.descripcion,
    lugar: row.lugar,
    gravedad: row.gravedad ?? '',
    estado: row.estado,
    causa_raiz: row.causa_raiz ?? '',
    observaciones: '',
  };
}

// ─── Incidente Form Dialog ────────────────────────────────────────────────────

interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (form: IncidenteFormState) => Promise<void>;
  initial?: IncidenteRow | null;
  loading: boolean;
}

function IncidenteFormDialog({ open, onClose, onSubmit, initial, loading }: FormDialogProps) {
  const [form, setForm] = useState<IncidenteFormState>(initial ? formFromRow(initial) : emptyForm());
  const [errors, setErrors] = useState<Partial<Record<keyof IncidenteFormState, string>>>({});

  useEffect(() => {
    if (open) {
      setForm(initial ? formFromRow(initial) : emptyForm());
      setErrors({});
    }
  }, [open, initial]);

  const set = (key: keyof IncidenteFormState, val: string) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const validate = (): boolean => {
    const errs: Partial<Record<keyof IncidenteFormState, string>> = {};
    if (form.descripcion.trim().length < 10) errs.descripcion = 'Mínimo 10 caracteres';
    if (form.lugar.trim().length < 2) errs.lugar = 'Mínimo 2 caracteres';
    if (!form.fecha) errs.fecha = 'Requerido';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(form);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">
            {initial ? 'Editar incidente' : 'Nuevo incidente'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {/* Tipo */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">
              Tipo *
            </label>
            <select
              value={form.tipo}
              onChange={e => set('tipo', e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-600"
            >
              <option value="accidente">Accidente</option>
              <option value="incidente">Incidente</option>
              <option value="casi_accidente">Casi accidente</option>
              <option value="enfermedad_profesional">Enfermedad profesional</option>
            </select>
          </div>

          {/* Fecha + Hora */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">
                Fecha *
              </label>
              <input
                type="date"
                value={form.fecha}
                onChange={e => set('fecha', e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-600"
              />
              {errors.fecha && <p className="mt-1 text-xs text-rose-400">{errors.fecha}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">
                Hora
              </label>
              <input
                type="time"
                value={form.hora}
                onChange={e => set('hora', e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">
              Descripción *
            </label>
            <textarea
              value={form.descripcion}
              onChange={e => set('descripcion', e.target.value)}
              rows={3}
              placeholder="Descripción detallada del incidente..."
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-emerald-600 resize-none"
            />
            {errors.descripcion && <p className="mt-1 text-xs text-rose-400">{errors.descripcion}</p>}
          </div>

          {/* Lugar */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">
              Lugar *
            </label>
            <input
              type="text"
              value={form.lugar}
              onChange={e => set('lugar', e.target.value)}
              placeholder="Área, sector o dirección"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-emerald-600"
            />
            {errors.lugar && <p className="mt-1 text-xs text-rose-400">{errors.lugar}</p>}
          </div>

          {/* Gravedad + Estado */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">
                Gravedad
              </label>
              <select
                value={form.gravedad}
                onChange={e => set('gravedad', e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-600"
              >
                <option value="">Sin definir</option>
                <option value="leve">Leve</option>
                <option value="moderado">Moderado</option>
                <option value="grave">Grave</option>
                <option value="muy_grave">Muy grave</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">
                Estado
              </label>
              <select
                value={form.estado}
                onChange={e => set('estado', e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-600"
              >
                <option value="abierto">Abierto</option>
                <option value="en_investigacion">En investigación</option>
                <option value="cerrado">Cerrado</option>
              </select>
            </div>
          </div>

          {/* Causa raíz */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">
              Causa raíz
            </label>
            <textarea
              value={form.causa_raiz}
              onChange={e => set('causa_raiz', e.target.value)}
              rows={2}
              placeholder="Causa raíz identificada..."
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-emerald-600 resize-none"
            />
          </div>

          {/* Observaciones */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">
              Observaciones
            </label>
            <textarea
              value={form.observaciones}
              onChange={e => set('observaciones', e.target.value)}
              rows={2}
              placeholder="Observaciones adicionales..."
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-emerald-600 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : initial ? 'Guardar cambios' : 'Crear incidente'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Detail Panel ────────────────────────────────────────────────────────────

interface DetailPanelProps {
  incidente: IncidenteRow;
  onClose: () => void;
  onEdit: () => void;
  onClose_estado: () => void;
  canDelete: boolean;
  onDelete: () => void;
}

function DetailPanel({ incidente, onClose, onEdit, onClose_estado, canDelete, onDelete }: DetailPanelProps) {
  const fecha = incidente.fecha
    ? new Date(incidente.fecha + (incidente.fecha.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      })
    : '—';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="w-full max-w-md border-l border-slate-700 bg-slate-900 flex flex-col h-full overflow-hidden shadow-2xl">
        {/* Panel header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 shrink-0">
          <div>
            <p className="font-semibold text-slate-100">
              {TIPO_LABELS[incidente.tipo]}
            </p>
            <p className="mt-0.5 font-mono text-xs text-slate-500">#{incidente.id.slice(-8)}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onEdit}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              title="Editar"
            >
              <Pencil className="h-4 w-4" />
            </button>
            {canDelete && (
              <button
                onClick={onDelete}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-950 hover:text-rose-300"
                title="Eliminar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Estado + Gravedad */}
          <div className="flex items-center gap-2 flex-wrap">
            <EstadoBadge estado={incidente.estado} />
            <GravedadBadge gravedad={incidente.gravedad} />
          </div>

          {/* Fields */}
          <div className="space-y-3">
            <Field label="Fecha" value={`${fecha}${incidente.hora ? ' · ' + incidente.hora : ''}`} />
            <Field label="Lugar" value={incidente.lugar} />
            <Field label="Descripción" value={incidente.descripcion} />
            {incidente.causa_raiz && (
              <Field label="Causa raíz" value={incidente.causa_raiz} />
            )}
            {(incidente.dias_perdidos !== undefined && incidente.dias_perdidos !== null) && (
              <Field label="Días perdidos" value={String(incidente.dias_perdidos)} />
            )}
          </div>

          {/* Cerrar incidente (si está abierto/en investigación) */}
          {incidente.estado !== 'cerrado' && (
            <div className="border-t border-slate-800 pt-4">
              <button
                onClick={onClose_estado}
                className="w-full rounded-lg border border-emerald-700/50 bg-emerald-900/30 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-900/50 transition"
              >
                Marcar como cerrado
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-0.5">{label}</p>
      <p className="text-sm text-slate-200">{value || '—'}</p>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
      <div className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-800" />
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function IncidentesSSTPage() {
  const { user } = useAuth();
  const orgId = user?.organization_id ?? '';
  const isAdmin = user?.rol === 'admin' || user?.rol === 'super_admin';

  const [incidentes, setIncidentes] = useState<IncidenteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterTipo, setFilterTipo] = useState<'' | TipoIncidente>('');
  const [filterEstado, setFilterEstado] = useState<'' | EstadoIncidente>('');

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editingRow, setEditingRow] = useState<IncidenteRow | null>(null);

  // Detail panel
  const [selectedRow, setSelectedRow] = useState<IncidenteRow | null>(null);

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!orgId) return;
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ organization_id: orgId });
      if (filterTipo) params.set('tipo', filterTipo);
      if (filterEstado) params.set('estado', filterEstado);
      const res = await fetch(`/api/hse/incidentes?${params.toString()}`, { cache: 'no-store' });
      const json = await res.json() as { success: boolean; data: IncidenteRow[]; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Error al cargar');
      setIncidentes(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar los incidentes');
    } finally {
      setLoading(false);
    }
  }, [orgId, filterTipo, filterEstado]);

  useEffect(() => { void load(); }, [load]);

  // ── Create ────────────────────────────────────────────────────────────────

  const handleCreate = async (form: IncidenteFormState) => {
    setFormLoading(true);
    try {
      const body: Record<string, unknown> = {
        tipo: form.tipo,
        fecha: form.fecha,
        descripcion: form.descripcion,
        lugar: form.lugar,
        estado: form.estado,
        involucrados: [],
        acciones_correctivas: [],
      };
      if (form.hora) body.hora = form.hora;
      if (form.gravedad) body.gravedad = form.gravedad;
      if (form.causa_raiz.trim()) body.causa_raiz = form.causa_raiz.trim();

      const res = await fetch(`/api/hse/incidentes?organization_id=${encodeURIComponent(orgId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Error al crear');
      setFormOpen(false);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al crear');
    } finally {
      setFormLoading(false);
    }
  };

  // ── Edit ──────────────────────────────────────────────────────────────────

  const handleEdit = async (form: IncidenteFormState) => {
    if (!editingRow) return;
    setFormLoading(true);
    try {
      const body: Record<string, unknown> = {
        tipo: form.tipo,
        fecha: form.fecha,
        descripcion: form.descripcion,
        lugar: form.lugar,
        estado: form.estado,
      };
      if (form.hora) body.hora = form.hora;
      if (form.gravedad) body.gravedad = form.gravedad;
      if (form.causa_raiz.trim()) body.causa_raiz = form.causa_raiz.trim();

      const res = await fetch(
        `/api/hse/incidentes/${editingRow.id}?organization_id=${encodeURIComponent(orgId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      const json = await res.json() as { success: boolean; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Error al actualizar');
      setEditingRow(null);
      setFormOpen(false);
      setSelectedRow(null);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al actualizar');
    } finally {
      setFormLoading(false);
    }
  };

  // ── Close (estado → cerrado) ──────────────────────────────────────────────

  const handleCloseEstado = async (row: IncidenteRow) => {
    try {
      const res = await fetch(
        `/api/hse/incidentes/${row.id}?organization_id=${encodeURIComponent(orgId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: 'cerrado' }),
        }
      );
      const json = await res.json() as { success: boolean; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Error');
      setSelectedRow(null);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al cerrar');
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async (row: IncidenteRow) => {
    if (!confirm('¿Eliminar este incidente? Esta acción no se puede deshacer.')) return;
    try {
      const res = await fetch(
        `/api/hse/incidentes/${row.id}?organization_id=${encodeURIComponent(orgId)}`,
        { method: 'DELETE' }
      );
      const json = await res.json() as { success: boolean; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Error');
      setSelectedRow(null);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al eliminar');
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  const truncate = (text: string, max = 80) =>
    text.length > max ? text.slice(0, max) + '…' : text;

  const formatFecha = (fecha: string) => {
    if (!fecha) return '—';
    try {
      return new Date(fecha + (fecha.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      });
    } catch {
      return fecha;
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">

        {/* Breadcrumb */}
        <Link
          href="/hse"
          className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Dashboard HSE
        </Link>

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-100">Incidentes SST</h1>
            <p className="mt-1 text-sm text-slate-400">ISO 45001 · Cláusula 10.2</p>
          </div>
          <Button
            onClick={() => { setEditingRow(null); setFormOpen(true); }}
            className="bg-emerald-600 text-white hover:bg-emerald-500 self-start md:self-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Incidente
          </Button>
        </div>

        {/* Filters */}
        <div className="mb-5 flex flex-wrap gap-3">
          <select
            value={filterTipo}
            onChange={e => setFilterTipo(e.target.value as '' | TipoIncidente)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-emerald-600"
          >
            <option value="">Todos los tipos</option>
            <option value="accidente">Accidente</option>
            <option value="incidente">Incidente</option>
            <option value="casi_accidente">Casi accidente</option>
            <option value="enfermedad_profesional">Enfermedad profesional</option>
          </select>

          <select
            value={filterEstado}
            onChange={e => setFilterEstado(e.target.value as '' | EstadoIncidente)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-emerald-600"
          >
            <option value="">Todos los estados</option>
            <option value="abierto">Abierto</option>
            <option value="en_investigacion">En investigación</option>
            <option value="cerrado">Cerrado</option>
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 rounded-2xl border border-rose-900/60 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && <TableSkeleton />}

        {/* Empty */}
        {!loading && incidentes.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center rounded-2xl border border-slate-800 bg-slate-900/50">
            <AlertTriangle className="h-12 w-12 text-slate-600" />
            <p className="text-slate-400">No hay incidentes registrados.</p>
            <Button
              onClick={() => { setEditingRow(null); setFormOpen(true); }}
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              <Plus className="mr-2 h-4 w-4" />
              Registrar primer incidente
            </Button>
          </div>
        )}

        {/* Table */}
        {!loading && incidentes.length > 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Fecha</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500 hidden sm:table-cell">Tipo</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Descripción</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500 hidden md:table-cell">Gravedad</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Estado</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500 w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {incidentes.map(row => (
                  <tr
                    key={row.id}
                    className="group cursor-pointer hover:bg-slate-800/40 transition-colors"
                    onClick={() => setSelectedRow(row)}
                  >
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                      {formatFecha(row.fecha)}
                    </td>
                    <td className="px-4 py-3 text-slate-400 hidden sm:table-cell whitespace-nowrap">
                      {TIPO_LABELS[row.tipo]}
                    </td>
                    <td className="px-4 py-3 text-slate-200 max-w-xs">
                      {truncate(row.descripcion)}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <GravedadBadge gravedad={row.gravedad} />
                    </td>
                    <td className="px-4 py-3">
                      <EstadoBadge estado={row.estado} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={e => { e.stopPropagation(); setSelectedRow(row); }}
                          className="rounded-lg p-1 text-slate-500 hover:text-slate-200 transition"
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setEditingRow(row); setFormOpen(true); }}
                          className="rounded-lg p-1 text-slate-500 hover:text-slate-200 transition"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={e => { e.stopPropagation(); void handleDelete(row); }}
                            className="rounded-lg p-1 text-slate-500 hover:text-rose-300 transition"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <IncidenteFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingRow(null); }}
        onSubmit={editingRow ? handleEdit : handleCreate}
        initial={editingRow}
        loading={formLoading}
      />

      {/* Detail Panel */}
      {selectedRow && !formOpen && (
        <DetailPanel
          incidente={selectedRow}
          onClose={() => setSelectedRow(null)}
          onEdit={() => { setEditingRow(selectedRow); setFormOpen(true); }}
          onClose_estado={() => void handleCloseEstado(selectedRow)}
          canDelete={isAdmin}
          onDelete={() => void handleDelete(selectedRow)}
        />
      )}
    </div>
  );
}
