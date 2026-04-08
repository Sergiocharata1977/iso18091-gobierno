'use client';

import { useEffect, useState } from 'react';
import {
  Plus,
  Target,
  Pencil,
  Trash2,
  X,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

// ─── Types ───────────────────────────────────────────────────────────────────

type EstadoObjetivo = 'pendiente' | 'en_curso' | 'completado' | 'cancelado';

interface ObjetivoAmbiental {
  id: string;
  organization_id: string;
  descripcion: string;
  meta: string;
  indicador: string;
  fecha_limite: string;
  avance_porcentaje: number;
  estado: EstadoObjetivo;
  responsable_uid?: string;
  clausula_iso14001?: string;
  created_at: unknown;
  updated_at: unknown;
}

type FormData = {
  descripcion: string;
  meta: string;
  indicador: string;
  fecha_limite: string;
  avance_porcentaje: number;
  estado: EstadoObjetivo;
  responsable_uid: string;
  clausula_iso14001: string;
};

const defaultForm: FormData = {
  descripcion: '',
  meta: '',
  indicador: '',
  fecha_limite: '',
  avance_porcentaje: 0,
  estado: 'pendiente',
  responsable_uid: '',
  clausula_iso14001: '',
};

// ─── Badge helpers ────────────────────────────────────────────────────────────

function badgeEstado(e: EstadoObjetivo) {
  const map: Record<EstadoObjetivo, string> = {
    pendiente: 'bg-slate-800 text-slate-300 border-slate-700',
    en_curso: 'bg-blue-900/40 text-blue-300 border-blue-700/50',
    completado: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50',
    cancelado: 'bg-rose-900/40 text-rose-300 border-rose-700/50',
  };
  const labels: Record<EstadoObjetivo, string> = {
    pendiente: 'Pendiente',
    en_curso: 'En curso',
    completado: 'Completado',
    cancelado: 'Cancelado',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${map[e]}`}
    >
      {labels[e]}
    </span>
  );
}

function progressColor(pct: number): string {
  if (pct >= 80) return 'bg-emerald-500';
  if (pct >= 40) return 'bg-blue-500';
  return 'bg-amber-500';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ObjetivosAmbientalesPage() {
  const { user } = useAuth();
  const orgId = user?.organization_id;

  const [objetivos, setObjetivos] = useState<ObjetivoAmbiental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadObjetivos = async () => {
    if (!orgId) return;
    try {
      setLoading(true);
      setError(null);
      const idToken = await user?.getIdToken?.();
      const res = await fetch(
        `/api/hse/objetivos-ambientales?organization_id=${encodeURIComponent(orgId)}`,
        {
          headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
          cache: 'no-store',
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Error al cargar');
      setObjetivos(json.data as ObjetivoAmbiental[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar los objetivos ambientales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadObjetivos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  // ── Dialog helpers ────────────────────────────────────────────────────────

  const openNew = () => {
    setEditingId(null);
    setForm(defaultForm);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (o: ObjetivoAmbiental) => {
    setEditingId(o.id);
    setForm({
      descripcion: o.descripcion,
      meta: o.meta,
      indicador: o.indicador,
      fecha_limite: o.fecha_limite,
      avance_porcentaje: o.avance_porcentaje,
      estado: o.estado,
      responsable_uid: o.responsable_uid ?? '',
      clausula_iso14001: o.clausula_iso14001 ?? '',
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(defaultForm);
    setFormError(null);
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!orgId) return;
    if (!form.descripcion.trim() || !form.meta.trim() || !form.indicador.trim()) {
      setFormError('Descripción, meta e indicador son obligatorios.');
      return;
    }
    if (!form.fecha_limite) {
      setFormError('La fecha límite es obligatoria.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const idToken = await user?.getIdToken?.();
      const payload = {
        descripcion: form.descripcion.trim(),
        meta: form.meta.trim(),
        indicador: form.indicador.trim(),
        fecha_limite: form.fecha_limite,
        avance_porcentaje: form.avance_porcentaje,
        estado: form.estado,
        responsable_uid: form.responsable_uid.trim() || undefined,
        clausula_iso14001: form.clausula_iso14001.trim() || undefined,
      };

      let res: Response;
      if (editingId) {
        res = await fetch(
          `/api/hse/objetivos-ambientales/${editingId}?organization_id=${encodeURIComponent(orgId)}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
            },
            body: JSON.stringify(payload),
          }
        );
      } else {
        res = await fetch(
          `/api/hse/objetivos-ambientales?organization_id=${encodeURIComponent(orgId)}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
            },
            body: JSON.stringify(payload),
          }
        );
      }
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Error al guardar');
      closeDialog();
      await loadObjetivos();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este objetivo ambiental?')) return;
    if (!orgId) return;
    setDeletingId(id);
    try {
      const idToken = await user?.getIdToken?.();
      const res = await fetch(
        `/api/hse/objetivos-ambientales/${id}?organization_id=${encodeURIComponent(orgId)}`,
        {
          method: 'DELETE',
          headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
      await loadObjetivos();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo eliminar');
    } finally {
      setDeletingId(null);
    }
  };

  const canManage =
    user?.rol === 'admin' || user?.rol === 'gerente' || user?.rol === 'jefe' || user?.rol === 'super_admin';

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-900/40">
              <Target className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-100">Objetivos Ambientales y de SST</h1>
              <p className="text-sm text-slate-400">ISO 14001 · ISO 45001 · Cláusula 6.2</p>
            </div>
          </div>
          {canManage && (
            <Button onClick={openNew} className="bg-emerald-600 text-white hover:bg-emerald-500">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Objetivo
            </Button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-2xl border border-rose-900/60 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 animate-pulse rounded-xl border border-slate-800 bg-slate-900/50" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && objetivos.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <Target className="h-12 w-12 text-slate-700" />
            <p className="text-slate-400">No hay objetivos ambientales registrados aún.</p>
            {canManage && (
              <Button
                onClick={openNew}
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                <Plus className="mr-2 h-4 w-4" />
                Crear primer objetivo
              </Button>
            )}
          </div>
        )}

        {/* Table */}
        {!loading && objetivos.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Descripción</th>
                    <th className="px-4 py-3">Meta</th>
                    <th className="px-4 py-3">Indicador</th>
                    <th className="px-4 py-3">Fecha límite</th>
                    <th className="px-4 py-3 min-w-[120px]">Avance</th>
                    <th className="px-4 py-3">Estado</th>
                    {canManage && <th className="px-4 py-3 text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {objetivos.map(o => (
                    <tr key={o.id} className="transition hover:bg-slate-800/30">
                      <td className="max-w-xs px-4 py-3">
                        <div className="truncate text-slate-200">{o.descripcion}</div>
                      </td>
                      <td className="max-w-xs px-4 py-3 text-slate-300">
                        <div className="truncate">{o.meta}</div>
                      </td>
                      <td className="max-w-xs px-4 py-3 text-slate-400">
                        <div className="truncate">{o.indicador}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                        {o.fecha_limite
                          ? new Date(o.fecha_limite).toLocaleDateString('es-AR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-full rounded-full bg-slate-700" style={{ height: '6px' }}>
                            <div
                              className={`rounded-full ${progressColor(o.avance_porcentaje)}`}
                              style={{ width: `${Math.min(100, o.avance_porcentaje)}%`, height: '6px' }}
                            />
                          </div>
                          <span className="shrink-0 text-xs text-slate-400">{o.avance_porcentaje}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{badgeEstado(o.estado)}</td>
                      {canManage && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit(o)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => void handleDelete(o.id)}
                              disabled={deletingId === o.id}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-950 hover:text-rose-300 disabled:opacity-40"
                              title="Eliminar"
                            >
                              {deletingId === o.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
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
        )}
      </div>

      {/* Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
            {/* Dialog header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-100">
                {editingId ? 'Editar Objetivo' : 'Nuevo Objetivo Ambiental'}
              </h2>
              <button
                onClick={closeDialog}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Dialog body */}
            <div className="max-h-[calc(100vh-12rem)] overflow-y-auto px-6 py-5">
              <div className="space-y-4">
                {/* Descripcion */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    Descripción <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.descripcion}
                    onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                    placeholder="Ej: Reducir generación de residuos peligrosos en 20%"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Meta */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    Meta <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.meta}
                    onChange={e => setForm(f => ({ ...f, meta: e.target.value }))}
                    placeholder="Ej: Reducción del 20% respecto al año anterior"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Indicador */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    Indicador <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.indicador}
                    onChange={e => setForm(f => ({ ...f, indicador: e.target.value }))}
                    placeholder="Ej: Kg de residuos peligrosos / mes"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Fecha limite + Estado */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-300">
                      Fecha límite <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.fecha_limite}
                      onChange={e => setForm(f => ({ ...f, fecha_limite: e.target.value }))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-300">Estado</label>
                    <select
                      value={form.estado}
                      onChange={e => setForm(f => ({ ...f, estado: e.target.value as EstadoObjetivo }))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="en_curso">En curso</option>
                      <option value="completado">Completado</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </div>
                </div>

                {/* Avance porcentaje */}
                <div>
                  <label className="mb-1 flex items-center justify-between text-sm font-medium text-slate-300">
                    <span>Avance</span>
                    <span className="font-mono text-emerald-400">{form.avance_porcentaje}%</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={form.avance_porcentaje}
                    onChange={e =>
                      setForm(f => ({ ...f, avance_porcentaje: parseInt(e.target.value, 10) }))
                    }
                    className="w-full accent-emerald-500"
                  />
                  <div className="mt-1 flex justify-between text-xs text-slate-600">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Responsable UID */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    Responsable <span className="text-slate-500">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={form.responsable_uid}
                    onChange={e => setForm(f => ({ ...f, responsable_uid: e.target.value }))}
                    placeholder="UID del responsable"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Clausula ISO */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    Cláusula ISO 14001 <span className="text-slate-500">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={form.clausula_iso14001}
                    onChange={e => setForm(f => ({ ...f, clausula_iso14001: e.target.value }))}
                    placeholder="6.2"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Form error */}
                {formError && (
                  <div className="rounded-lg border border-rose-900/60 bg-rose-950/40 px-3 py-2 text-sm text-rose-300">
                    {formError}
                  </div>
                )}
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
                disabled={saving}
                className="bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando…
                  </>
                ) : editingId ? (
                  'Guardar cambios'
                ) : (
                  'Crear objetivo'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
