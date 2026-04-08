'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Plus,
  HardHat,
  Pencil,
  Trash2,
  ChevronDown,
  X,
  Shield,
  Eye,
  Ear,
  Wind,
  Hand,
  Footprints,
  PersonStanding,
  ArrowDown,
  Package,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

// ─── Types ──────────────────────────────────────────────────────────────────

type TipoEPP =
  | 'cabeza'
  | 'ojos_cara'
  | 'oidos'
  | 'respiratorio'
  | 'manos'
  | 'pies'
  | 'cuerpo'
  | 'caidas'
  | 'otro';

type EstadoEPP = 'disponible' | 'en_uso' | 'en_mantenimiento' | 'dado_de_baja';

interface EPPRecord {
  id: string;
  nombre: string;
  tipo: TipoEPP;
  descripcion?: string;
  norma_certificacion?: string;
  fecha_vencimiento?: string;
  estado: EstadoEPP;
  cantidad_disponible: number;
  organization_id: string;
  created_by: string;
}

interface FormState {
  nombre: string;
  tipo: TipoEPP;
  descripcion: string;
  norma_certificacion: string;
  fecha_vencimiento: string;
  estado: EstadoEPP;
  cantidad_disponible: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const TIPOS_EPP: { value: TipoEPP; label: string }[] = [
  { value: 'cabeza',      label: 'Cabeza' },
  { value: 'ojos_cara',   label: 'Ojos y Cara' },
  { value: 'oidos',       label: 'Oídos' },
  { value: 'respiratorio', label: 'Respiratorio' },
  { value: 'manos',       label: 'Manos' },
  { value: 'pies',        label: 'Pies' },
  { value: 'cuerpo',      label: 'Cuerpo' },
  { value: 'caidas',      label: 'Caídas' },
  { value: 'otro',        label: 'Otro' },
];

const ESTADOS_EPP: { value: EstadoEPP; label: string }[] = [
  { value: 'disponible',       label: 'Disponible' },
  { value: 'en_uso',           label: 'En Uso' },
  { value: 'en_mantenimiento', label: 'En Mantenimiento' },
  { value: 'dado_de_baja',     label: 'Dado de Baja' },
];

const ESTADO_COLORS: Record<EstadoEPP, string> = {
  disponible:       'bg-emerald-900/40 text-emerald-300 border-emerald-700/50',
  en_uso:           'bg-blue-900/40 text-blue-300 border-blue-700/50',
  en_mantenimiento: 'bg-amber-900/40 text-amber-300 border-amber-700/50',
  dado_de_baja:     'bg-rose-900/40 text-rose-300 border-rose-700/50',
};

const ESTADO_LABELS: Record<EstadoEPP, string> = {
  disponible:       'Disponible',
  en_uso:           'En Uso',
  en_mantenimiento: 'En Mantenimiento',
  dado_de_baja:     'Dado de Baja',
};

const TIPO_LABELS: Record<TipoEPP, string> = {
  cabeza:       'Cabeza',
  ojos_cara:    'Ojos y Cara',
  oidos:        'Oídos',
  respiratorio: 'Respiratorio',
  manos:        'Manos',
  pies:         'Pies',
  cuerpo:       'Cuerpo',
  caidas:       'Caídas',
  otro:         'Otro',
};

// ─── Icon mapping ────────────────────────────────────────────────────────────

function TipoIcon({ tipo, className }: { tipo: TipoEPP; className?: string }) {
  const props = { className: className ?? 'h-6 w-6' };
  switch (tipo) {
    case 'cabeza':       return <HardHat {...props} />;
    case 'ojos_cara':    return <Eye {...props} />;
    case 'oidos':        return <Ear {...props} />;
    case 'respiratorio': return <Wind {...props} />;
    case 'manos':        return <Hand {...props} />;
    case 'pies':         return <Footprints {...props} />;
    case 'cuerpo':       return <PersonStanding {...props} />;
    case 'caidas':       return <ArrowDown {...props} />;
    default:             return <Package {...props} />;
  }
}

const TIPO_BG: Record<TipoEPP, string> = {
  cabeza:       'bg-amber-900/40 text-amber-400',
  ojos_cara:    'bg-cyan-900/40 text-cyan-400',
  oidos:        'bg-violet-900/40 text-violet-400',
  respiratorio: 'bg-blue-900/40 text-blue-400',
  manos:        'bg-emerald-900/40 text-emerald-400',
  pies:         'bg-orange-900/40 text-orange-400',
  cuerpo:       'bg-indigo-900/40 text-indigo-400',
  caidas:       'bg-rose-900/40 text-rose-400',
  otro:         'bg-slate-800 text-slate-400',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isVencido(fecha?: string): boolean {
  if (!fecha) return false;
  return new Date(fecha) < new Date();
}

const DEFAULT_FORM: FormState = {
  nombre: '',
  tipo: 'cabeza',
  descripcion: '',
  norma_certificacion: '',
  fecha_vencimiento: '',
  estado: 'disponible',
  cantidad_disponible: 0,
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function EPPPage() {
  const { user } = useAuth();
  const orgId = user?.organization_id;

  const [items, setItems] = useState<EPPRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EPPRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [filterTipo, setFilterTipo] = useState<TipoEPP | 'todos'>('todos');
  const [filterEstado, setFilterEstado] = useState<EstadoEPP | 'todos'>('todos');

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  // ── Data loading ────────────────────────────────────────────────────────

  const loadData = async () => {
    if (!orgId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `/api/hse/epp?organization_id=${encodeURIComponent(orgId)}`,
        { cache: 'no-store' }
      );
      const json = await res.json() as { success: boolean; data?: EPPRecord[]; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Error al cargar');
      setItems(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar los EPP');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  // ── Filtered data ──────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return items.filter(item => {
      if (filterTipo !== 'todos' && item.tipo !== filterTipo) return false;
      if (filterEstado !== 'todos' && item.estado !== filterEstado) return false;
      return true;
    });
  }, [items, filterTipo, filterEstado]);

  // ── Dialog helpers ──────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingItem(null);
    setForm(DEFAULT_FORM);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (item: EPPRecord) => {
    setEditingItem(item);
    setForm({
      nombre: item.nombre,
      tipo: item.tipo,
      descripcion: item.descripcion ?? '',
      norma_certificacion: item.norma_certificacion ?? '',
      fecha_vencimiento: item.fecha_vencimiento ?? '',
      estado: item.estado,
      cantidad_disponible: item.cantidad_disponible,
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
    setFormError(null);
  };

  // ── Save ────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    setFormError(null);
    try {
      const payload: Record<string, unknown> = {
        nombre: form.nombre.trim(),
        tipo: form.tipo,
        estado: form.estado,
        cantidad_disponible: form.cantidad_disponible,
      };
      if (form.descripcion.trim()) payload.descripcion = form.descripcion.trim();
      if (form.norma_certificacion.trim()) payload.norma_certificacion = form.norma_certificacion.trim();
      if (form.fecha_vencimiento) payload.fecha_vencimiento = form.fecha_vencimiento;

      const url = editingItem
        ? `/api/hse/epp/${editingItem.id}?organization_id=${encodeURIComponent(orgId)}`
        : `/api/hse/epp?organization_id=${encodeURIComponent(orgId)}`;
      const method = editingItem ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Error al guardar');
      closeDialog();
      await loadData();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este EPP del registro?')) return;
    if (!orgId) return;
    setDeletingId(id);
    try {
      const res = await fetch(
        `/api/hse/epp/${id}?organization_id=${encodeURIComponent(orgId)}`,
        { method: 'DELETE' }
      );
      const json = await res.json() as { success: boolean; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Error al eliminar');
      await loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo eliminar');
    } finally {
      setDeletingId(null);
    }
  };

  const canManage =
    user?.rol === 'admin' ||
    user?.rol === 'gerente' ||
    user?.rol === 'jefe' ||
    user?.rol === 'super_admin';

  // ── Summary counts ────────────────────────────────────────────────────

  const vencidosCount = items.filter(i => isVencido(i.fecha_vencimiento)).length;

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-900/40 ring-1 ring-blue-700/50">
              <Shield className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-100">
                Equipos de Protección Personal
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                ISO 45001 · Control de EPP
              </p>
            </div>
          </div>
          {canManage && (
            <Button
              onClick={openCreate}
              className="bg-blue-600 text-white hover:bg-blue-500"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuevo EPP
            </Button>
          )}
        </div>

        {/* Summary bar */}
        {!loading && items.length > 0 && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-center">
              <p className="text-2xl font-bold text-slate-100">{items.length}</p>
              <p className="mt-0.5 text-xs text-slate-400">Total EPP</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-center">
              <p className="text-2xl font-bold text-emerald-400">
                {items.filter(i => i.estado === 'disponible').length}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">Disponibles</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-center">
              <p className="text-2xl font-bold text-blue-400">
                {items.filter(i => i.estado === 'en_uso').length}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">En Uso</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-center">
              <p className={`text-2xl font-bold ${vencidosCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {vencidosCount}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">Vencidos</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative">
            <select
              value={filterTipo}
              onChange={e => setFilterTipo(e.target.value as TipoEPP | 'todos')}
              className="appearance-none rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 pr-8 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="todos">Todos los tipos</option>
              {TIPOS_EPP.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-slate-400" />
          </div>

          <div className="relative">
            <select
              value={filterEstado}
              onChange={e => setFilterEstado(e.target.value as EstadoEPP | 'todos')}
              className="appearance-none rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 pr-8 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="todos">Todos los estados</option>
              {ESTADOS_EPP.map(e => (
                <option key={e.value} value={e.value}>{e.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-slate-400" />
          </div>

          {(filterTipo !== 'todos' || filterEstado !== 'todos') && (
            <button
              onClick={() => { setFilterTipo('todos'); setFilterEstado('todos'); }}
              className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-400 hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
              Limpiar filtros
            </button>
          )}

          <span className="ml-auto text-sm text-slate-500">
            {filtered.length} de {items.length} EPP
          </span>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-2xl border border-rose-900/60 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-44 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/50" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && items.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <Shield className="h-12 w-12 text-slate-600" />
            <p className="text-slate-400">No hay EPP registrados aún.</p>
            {canManage && (
              <Button
                onClick={openCreate}
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                <Plus className="mr-2 h-4 w-4" />
                Registrar primer EPP
              </Button>
            )}
          </div>
        )}

        {/* EPP Grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map(item => {
              const vencido = isVencido(item.fecha_vencimiento);
              return (
                <div
                  key={item.id}
                  className="group relative flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition hover:border-slate-700"
                >
                  {/* Hover actions */}
                  {canManage && (
                    <div className="absolute right-4 top-4 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                      <button
                        onClick={() => openEdit(item)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => void handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-950 hover:text-rose-300 disabled:opacity-40"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {/* Icon + nombre */}
                  <div className="flex items-start gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${TIPO_BG[item.tipo]}`}>
                      <TipoIcon tipo={item.tipo} className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1 pr-16">
                      <p className="font-semibold text-slate-100 leading-tight">{item.nombre}</p>
                      {item.descripcion && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{item.descripcion}</p>
                      )}
                    </div>
                  </div>

                  {/* Badges: tipo + estado */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-slate-700/50 bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                      {TIPO_LABELS[item.tipo]}
                    </span>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${ESTADO_COLORS[item.estado]}`}>
                      {ESTADO_LABELS[item.estado]}
                    </span>
                  </div>

                  {/* Quantity */}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-400">Cantidad disponible:</span>
                    <span className={`font-semibold ${item.cantidad_disponible === 0 ? 'text-rose-400' : 'text-slate-200'}`}>
                      {item.cantidad_disponible}
                    </span>
                  </div>

                  {/* Certification */}
                  {item.norma_certificacion && (
                    <p className="text-xs text-slate-500">
                      <span className="text-slate-600">Certificación:</span>{' '}
                      {item.norma_certificacion}
                    </p>
                  )}

                  {/* Expiry */}
                  {item.fecha_vencimiento && (
                    <div className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs ${
                      vencido
                        ? 'bg-rose-950/40 text-rose-300 border border-rose-900/60'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {vencido && <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
                      <span>
                        {vencido ? 'Vencido: ' : 'Vence: '}
                        {new Date(item.fecha_vencimiento).toLocaleDateString('es-AR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* No results after filter */}
        {!loading && items.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <p className="text-slate-400">No hay EPP que coincidan con los filtros.</p>
            <button
              onClick={() => { setFilterTipo('todos'); setFilterEstado('todos'); }}
              className="text-sm text-blue-400 hover:underline"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* ── Form Dialog ──────────────────────────────────────────────────────── */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">

            {/* Dialog header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-100">
                {editingItem ? 'Editar EPP' : 'Registrar EPP'}
              </h2>
              <button
                onClick={closeDialog}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Dialog body */}
            <div className="space-y-4 px-6 py-5">
              {formError && (
                <div className="rounded-xl border border-rose-900/60 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
                  {formError}
                </div>
              )}

              {/* Nombre */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  Nombre <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej: Casco de seguridad MSA V-Gard"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
                />
              </div>

              {/* Tipo */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  Tipo <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <select
                    value={form.tipo}
                    onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoEPP }))}
                    className="w-full appearance-none rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 pr-8 text-sm text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
                  >
                    {TIPOS_EPP.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              {/* Descripcion */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  Descripción
                </label>
                <textarea
                  value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  rows={2}
                  placeholder="Descripción opcional del EPP..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/40 resize-none"
                />
              </div>

              {/* Norma + Fecha vencimiento */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Norma / Certificación
                  </label>
                  <input
                    type="text"
                    value={form.norma_certificacion}
                    onChange={e => setForm(f => ({ ...f, norma_certificacion: e.target.value }))}
                    placeholder="IRAM 3620"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Fecha de Vencimiento
                  </label>
                  <input
                    type="date"
                    value={form.fecha_vencimiento}
                    onChange={e => setForm(f => ({ ...f, fecha_vencimiento: e.target.value }))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
                  />
                </div>
              </div>

              {/* Estado + Cantidad */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Estado <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={form.estado}
                      onChange={e => setForm(f => ({ ...f, estado: e.target.value as EstadoEPP }))}
                      className="w-full appearance-none rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 pr-8 text-sm text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
                    >
                      {ESTADOS_EPP.map(e => (
                        <option key={e.value} value={e.value}>{e.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-slate-400" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Cantidad Disponible
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.cantidad_disponible}
                    onChange={e => setForm(f => ({ ...f, cantidad_disponible: Math.max(0, parseInt(e.target.value) || 0) }))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
                  />
                </div>
              </div>
            </div>

            {/* Dialog footer */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-800 px-6 py-4">
              <Button
                variant="outline"
                onClick={closeDialog}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => void handleSave()}
                disabled={saving || !form.nombre.trim()}
                className="bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : editingItem ? 'Guardar cambios' : 'Registrar EPP'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
