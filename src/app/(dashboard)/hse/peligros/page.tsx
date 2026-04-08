'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Plus,
  AlertTriangle,
  Pencil,
  Trash2,
  ChevronDown,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import type { TipoPeligro } from '@/types/hse';

// ─── Types ──────────────────────────────────────────────────────────────────

type NivelRiesgo = 'bajo' | 'medio' | 'alto' | 'critico';

interface PeligroRecord {
  id: string;
  proceso: string;
  actividad: string;
  peligro: string;
  tipo_peligro: TipoPeligro;
  consecuencia: string;
  probabilidad: number;
  severidad: number;
  nivel_riesgo: NivelRiesgo;
  controles_existentes?: string;
  controles_propuestos?: string;
  responsable_uid?: string;
  clausula_iso45001?: string;
  organization_id: string;
  created_by: string;
}

interface FormState {
  proceso: string;
  actividad: string;
  peligro: string;
  tipo_peligro: TipoPeligro;
  consecuencia: string;
  probabilidad: number;
  severidad: number;
  controles_existentes: string;
  controles_propuestos: string;
  responsable_uid: string;
  clausula_iso45001: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const TIPOS_PELIGRO: { value: TipoPeligro; label: string }[] = [
  { value: 'fisico', label: 'Físico' },
  { value: 'quimico', label: 'Químico' },
  { value: 'biologico', label: 'Biológico' },
  { value: 'ergonomico', label: 'Ergonómico' },
  { value: 'psicosocial', label: 'Psicosocial' },
  { value: 'mecanico', label: 'Mecánico' },
  { value: 'electrico', label: 'Eléctrico' },
  { value: 'locativo', label: 'Locativo' },
];

const TIPO_PELIGRO_COLORS: Record<TipoPeligro, string> = {
  fisico:      'bg-blue-900/40 text-blue-300 border-blue-700/50',
  quimico:     'bg-rose-900/40 text-rose-300 border-rose-700/50',
  biologico:   'bg-emerald-900/40 text-emerald-300 border-emerald-700/50',
  ergonomico:  'bg-amber-900/40 text-amber-300 border-amber-700/50',
  psicosocial: 'bg-violet-900/40 text-violet-300 border-violet-700/50',
  mecanico:    'bg-orange-900/40 text-orange-300 border-orange-700/50',
  electrico:   'bg-yellow-900/40 text-yellow-300 border-yellow-700/50',
  locativo:    'bg-cyan-900/40 text-cyan-300 border-cyan-700/50',
};

const NIVEL_RIESGO_COLORS: Record<NivelRiesgo, string> = {
  bajo:    'bg-emerald-900/40 text-emerald-300 border-emerald-700/50',
  medio:   'bg-amber-900/40 text-amber-300 border-amber-700/50',
  alto:    'bg-orange-900/40 text-orange-300 border-orange-700/50',
  critico: 'bg-rose-900/40 text-rose-300 border-rose-700/50',
};

const NIVEL_RIESGO_LABELS: Record<NivelRiesgo, string> = {
  bajo:    'Bajo',
  medio:   'Medio',
  alto:    'Alto',
  critico: 'Crítico',
};

// Matrix cell colors by score
const MATRIX_CELL_COLOR = (p: number, s: number) => {
  const score = p * s;
  if (score >= 15) return 'bg-rose-700/60 text-rose-200';
  if (score >= 10) return 'bg-orange-700/60 text-orange-200';
  if (score >= 5)  return 'bg-amber-700/60 text-amber-200';
  return 'bg-emerald-800/60 text-emerald-200';
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function calcularNivel(probabilidad: number, severidad: number): NivelRiesgo {
  const score = probabilidad * severidad;
  if (score >= 15) return 'critico';
  if (score >= 10) return 'alto';
  if (score >= 5)  return 'medio';
  return 'bajo';
}

const DEFAULT_FORM: FormState = {
  proceso: '',
  actividad: '',
  peligro: '',
  tipo_peligro: 'fisico',
  consecuencia: '',
  probabilidad: 1,
  severidad: 1,
  controles_existentes: '',
  controles_propuestos: '',
  responsable_uid: '',
  clausula_iso45001: '6.1.2',
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function PeligrosPage() {
  const { user } = useAuth();
  const orgId = user?.organization_id;

  const [peligros, setPeligros] = useState<PeligroRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PeligroRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [filterTipo, setFilterTipo] = useState<TipoPeligro | 'todos'>('todos');
  const [filterNivel, setFilterNivel] = useState<NivelRiesgo | 'todos'>('todos');

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadData = async () => {
    if (!orgId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `/api/hse/peligros?organization_id=${encodeURIComponent(orgId)}`,
        { cache: 'no-store' }
      );
      const json = await res.json() as { success: boolean; data?: PeligroRecord[]; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Error al cargar');
      setPeligros(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar los peligros');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  // ── Filtered data ─────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return peligros.filter(p => {
      if (filterTipo !== 'todos' && p.tipo_peligro !== filterTipo) return false;
      if (filterNivel !== 'todos' && p.nivel_riesgo !== filterNivel) return false;
      return true;
    });
  }, [peligros, filterTipo, filterNivel]);

  // ── Matrix distribution ───────────────────────────────────────────────────

  const matrixCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of peligros) {
      const key = `${p.probabilidad}-${p.severidad}`;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [peligros]);

  // ── Dialog helpers ────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingItem(null);
    setForm(DEFAULT_FORM);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (item: PeligroRecord) => {
    setEditingItem(item);
    setForm({
      proceso: item.proceso,
      actividad: item.actividad,
      peligro: item.peligro,
      tipo_peligro: item.tipo_peligro,
      consecuencia: item.consecuencia,
      probabilidad: item.probabilidad,
      severidad: item.severidad,
      controles_existentes: item.controles_existentes ?? '',
      controles_propuestos: item.controles_propuestos ?? '',
      responsable_uid: item.responsable_uid ?? '',
      clausula_iso45001: item.clausula_iso45001 ?? '6.1.2',
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
    setFormError(null);
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        proceso: form.proceso.trim(),
        actividad: form.actividad.trim(),
        peligro: form.peligro.trim(),
        tipo_peligro: form.tipo_peligro,
        consecuencia: form.consecuencia.trim(),
        probabilidad: form.probabilidad,
        severidad: form.severidad,
        controles_existentes: form.controles_existentes.trim() || undefined,
        controles_propuestos: form.controles_propuestos.trim() || undefined,
        responsable_uid: form.responsable_uid.trim() || undefined,
        clausula_iso45001: form.clausula_iso45001.trim() || '6.1.2',
      };

      const url = editingItem
        ? `/api/hse/peligros/${editingItem.id}?organization_id=${encodeURIComponent(orgId)}`
        : `/api/hse/peligros?organization_id=${encodeURIComponent(orgId)}`;
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

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este peligro identificado?')) return;
    if (!orgId) return;
    setDeletingId(id);
    try {
      const res = await fetch(
        `/api/hse/peligros/${id}?organization_id=${encodeURIComponent(orgId)}`,
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

  const nivelCalculado = calcularNivel(form.probabilidad, form.severidad);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-900/40 ring-1 ring-amber-700/50">
              <AlertTriangle className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-100">
                Identificación de Peligros
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                ISO 45001 · Cláusula 6.1.2
              </p>
            </div>
          </div>
          {canManage && (
            <Button
              onClick={openCreate}
              className="bg-amber-600 text-white hover:bg-amber-500"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Peligro
            </Button>
          )}
        </div>

        {/* Summary stats */}
        {!loading && peligros.length > 0 && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(['bajo', 'medio', 'alto', 'critico'] as NivelRiesgo[]).map(nivel => {
              const count = peligros.filter(p => p.nivel_riesgo === nivel).length;
              return (
                <div
                  key={nivel}
                  className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-center"
                >
                  <p className="text-2xl font-bold text-slate-100">{count}</p>
                  <p className={`mt-0.5 text-xs font-medium capitalize ${
                    nivel === 'bajo'    ? 'text-emerald-400' :
                    nivel === 'medio'   ? 'text-amber-400' :
                    nivel === 'alto'    ? 'text-orange-400' :
                    'text-rose-400'
                  }`}>
                    {NIVEL_RIESGO_LABELS[nivel]}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative">
            <select
              value={filterTipo}
              onChange={e => setFilterTipo(e.target.value as TipoPeligro | 'todos')}
              className="appearance-none rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 pr-8 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="todos">Todos los tipos</option>
              {TIPOS_PELIGRO.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-slate-400" />
          </div>

          <div className="relative">
            <select
              value={filterNivel}
              onChange={e => setFilterNivel(e.target.value as NivelRiesgo | 'todos')}
              className="appearance-none rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 pr-8 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="todos">Todos los niveles</option>
              <option value="bajo">Bajo</option>
              <option value="medio">Medio</option>
              <option value="alto">Alto</option>
              <option value="critico">Crítico</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-slate-400" />
          </div>

          {(filterTipo !== 'todos' || filterNivel !== 'todos') && (
            <button
              onClick={() => { setFilterTipo('todos'); setFilterNivel('todos'); }}
              className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-400 hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
              Limpiar filtros
            </button>
          )}

          <span className="ml-auto text-sm text-slate-500">
            {filtered.length} de {peligros.length} peligros
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
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-14 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/50" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && peligros.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <AlertTriangle className="h-12 w-12 text-slate-600" />
            <p className="text-slate-400">No hay peligros identificados aún.</p>
            {canManage && (
              <Button
                onClick={openCreate}
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                <Plus className="mr-2 h-4 w-4" />
                Identificar primer peligro
              </Button>
            )}
          </div>
        )}

        {/* Two-column layout: table + mini matrix */}
        {!loading && peligros.length > 0 && (
          <div className="flex flex-col gap-6 lg:flex-row">

            {/* Table */}
            <div className="flex-1 min-w-0">
              <div className="overflow-hidden rounded-2xl border border-slate-800">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/70">
                        <th className="px-4 py-3 text-left font-medium text-slate-400">Proceso / Actividad</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-400">Peligro</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-400">Tipo</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-400">Consecuencia</th>
                        <th className="px-4 py-3 text-center font-medium text-slate-400">P×S</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-400">Nivel</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-400">Controles</th>
                        {canManage && (
                          <th className="px-4 py-3 text-center font-medium text-slate-400">Acciones</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {filtered.map(item => (
                        <tr
                          key={item.id}
                          className="bg-slate-900/30 transition hover:bg-slate-900/60"
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-200">{item.proceso}</p>
                            <p className="text-xs text-slate-500">{item.actividad}</p>
                          </td>
                          <td className="max-w-[160px] px-4 py-3 text-slate-300">
                            {item.peligro}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${TIPO_PELIGRO_COLORS[item.tipo_peligro]}`}>
                              {TIPOS_PELIGRO.find(t => t.value === item.tipo_peligro)?.label ?? item.tipo_peligro}
                            </span>
                          </td>
                          <td className="max-w-[160px] px-4 py-3 text-slate-400">
                            <span className="line-clamp-2">{item.consecuencia}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-mono font-semibold text-slate-300">
                              {item.probabilidad}×{item.severidad}={item.probabilidad * item.severidad}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${NIVEL_RIESGO_COLORS[item.nivel_riesgo]}`}>
                              {NIVEL_RIESGO_LABELS[item.nivel_riesgo]}
                            </span>
                          </td>
                          <td className="max-w-[140px] px-4 py-3 text-xs text-slate-500">
                            {item.controles_existentes ? (
                              <span className="line-clamp-2">{item.controles_existentes}</span>
                            ) : (
                              <span className="italic text-slate-700">Sin controles</span>
                            )}
                          </td>
                          {canManage && (
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => openEdit(item)}
                                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
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
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Mini risk matrix */}
            <div className="w-full lg:w-64 shrink-0">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                <h3 className="mb-3 text-sm font-medium text-slate-300">Matriz de Riesgo</h3>
                <p className="mb-2 text-xs text-slate-500">Probabilidad (eje X) × Severidad (eje Y)</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        <th className="w-6 text-slate-600" />
                        {[1, 2, 3, 4, 5].map(p => (
                          <th key={p} className="pb-1 text-center text-slate-500 font-normal">P{p}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[5, 4, 3, 2, 1].map(s => (
                        <tr key={s}>
                          <td className="pr-1 text-right text-slate-500 font-normal">S{s}</td>
                          {[1, 2, 3, 4, 5].map(p => {
                            const count = matrixCounts[`${p}-${s}`] ?? 0;
                            return (
                              <td key={p} className="p-0.5">
                                <div className={`flex h-8 w-8 items-center justify-center rounded text-xs font-semibold ${MATRIX_CELL_COLOR(p, s)}`}>
                                  {count > 0 ? count : ''}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 space-y-1">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="h-3 w-3 rounded bg-emerald-800/60" />
                    Bajo (1–4)
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="h-3 w-3 rounded bg-amber-700/60" />
                    Medio (5–9)
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="h-3 w-3 rounded bg-orange-700/60" />
                    Alto (10–14)
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="h-3 w-3 rounded bg-rose-700/60" />
                    Crítico (15–25)
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Form Dialog ─────────────────────────────────────────────────────── */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">

            {/* Dialog header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-100">
                {editingItem ? 'Editar Peligro' : 'Identificar Peligro'}
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

              {/* Row: proceso + actividad */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Proceso <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.proceso}
                    onChange={e => setForm(f => ({ ...f, proceso: e.target.value }))}
                    placeholder="Ej: Producción"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Actividad <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.actividad}
                    onChange={e => setForm(f => ({ ...f, actividad: e.target.value }))}
                    placeholder="Ej: Operación de maquinaria"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                  />
                </div>
              </div>

              {/* Row: peligro + tipo */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Peligro <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.peligro}
                    onChange={e => setForm(f => ({ ...f, peligro: e.target.value }))}
                    placeholder="Ej: Contacto con partes móviles"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Tipo de Peligro <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={form.tipo_peligro}
                      onChange={e => setForm(f => ({ ...f, tipo_peligro: e.target.value as TipoPeligro }))}
                      className="w-full appearance-none rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 pr-8 text-sm text-slate-200 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                    >
                      {TIPOS_PELIGRO.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Consecuencia */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  Consecuencia <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.consecuencia}
                  onChange={e => setForm(f => ({ ...f, consecuencia: e.target.value }))}
                  placeholder="Ej: Herida grave, fractura"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                />
              </div>

              {/* Probabilidad + Severidad + Nivel calculado */}
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
                <p className="mb-3 text-xs font-medium text-slate-400">Evaluación de Riesgo</p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">
                      Probabilidad (1–5) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={form.probabilidad}
                      onChange={e => setForm(f => ({ ...f, probabilidad: Math.min(5, Math.max(1, parseInt(e.target.value) || 1)) }))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">
                      Severidad (1–5) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={form.severidad}
                      onChange={e => setForm(f => ({ ...f, severidad: Math.min(5, Math.max(1, parseInt(e.target.value) || 1)) }))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">
                      Nivel Calculado
                    </label>
                    <div className={`flex h-9 items-center justify-center rounded-xl border px-3 text-sm font-semibold ${NIVEL_RIESGO_COLORS[nivelCalculado]}`}>
                      {NIVEL_RIESGO_LABELS[nivelCalculado]}
                      <span className="ml-1 text-xs font-normal opacity-70">
                        ({form.probabilidad * form.severidad})
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Controles */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Controles Existentes
                  </label>
                  <textarea
                    value={form.controles_existentes}
                    onChange={e => setForm(f => ({ ...f, controles_existentes: e.target.value }))}
                    rows={3}
                    placeholder="Controles actuales en uso..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/40 resize-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Controles Propuestos
                  </label>
                  <textarea
                    value={form.controles_propuestos}
                    onChange={e => setForm(f => ({ ...f, controles_propuestos: e.target.value }))}
                    rows={3}
                    placeholder="Controles recomendados..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/40 resize-none"
                  />
                </div>
              </div>

              {/* Row: responsable + clausula */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Responsable (UID)
                  </label>
                  <input
                    type="text"
                    value={form.responsable_uid}
                    onChange={e => setForm(f => ({ ...f, responsable_uid: e.target.value }))}
                    placeholder="ID del responsable"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Cláusula ISO 45001
                  </label>
                  <input
                    type="text"
                    value={form.clausula_iso45001}
                    onChange={e => setForm(f => ({ ...f, clausula_iso45001: e.target.value }))}
                    placeholder="6.1.2"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
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
                disabled={
                  saving ||
                  !form.proceso.trim() ||
                  !form.actividad.trim() ||
                  !form.peligro.trim() ||
                  !form.consecuencia.trim()
                }
                className="bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : editingItem ? 'Guardar cambios' : 'Crear peligro'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
