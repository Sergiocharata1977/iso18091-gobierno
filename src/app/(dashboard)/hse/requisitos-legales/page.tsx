'use client';

import { useEffect, useState } from 'react';
import {
  Plus,
  Scale,
  Pencil,
  Trash2,
  X,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

// ─── Types ───────────────────────────────────────────────────────────────────

type TipoRequisito = 'ley' | 'decreto' | 'resolucion' | 'norma' | 'permiso' | 'otro';
type EstadoCumplimiento = 'cumple' | 'parcial' | 'no_cumple' | 'no_aplica';

interface RequisitoLegal {
  id: string;
  organization_id: string;
  tipo: TipoRequisito;
  numero: string;
  descripcion: string;
  fecha_vigencia?: string;
  aplica_a: string[];
  estado_cumplimiento: EstadoCumplimiento;
  responsable_uid?: string;
  observaciones?: string;
  created_at: unknown;
  updated_at: unknown;
}

type FormData = {
  tipo: TipoRequisito;
  numero: string;
  descripcion: string;
  fecha_vigencia: string;
  aplica_a_raw: string;
  estado_cumplimiento: EstadoCumplimiento;
  observaciones: string;
};

const defaultForm: FormData = {
  tipo: 'ley',
  numero: '',
  descripcion: '',
  fecha_vigencia: '',
  aplica_a_raw: '',
  estado_cumplimiento: 'no_aplica',
  observaciones: '',
};

// ─── Badge helpers ────────────────────────────────────────────────────────────

function badgeCumplimiento(e: EstadoCumplimiento) {
  const map: Record<EstadoCumplimiento, string> = {
    cumple: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50',
    parcial: 'bg-amber-900/40 text-amber-300 border-amber-700/50',
    no_cumple: 'bg-rose-900/40 text-rose-300 border-rose-700/50',
    no_aplica: 'bg-slate-800 text-slate-400 border-slate-700',
  };
  const labels: Record<EstadoCumplimiento, string> = {
    cumple: 'Cumple',
    parcial: 'Parcial',
    no_cumple: 'No cumple',
    no_aplica: 'No aplica',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${map[e]}`}
    >
      {labels[e]}
    </span>
  );
}

function badgeTipo(t: TipoRequisito) {
  const map: Record<TipoRequisito, string> = {
    ley: 'bg-blue-900/40 text-blue-300 border-blue-700/50',
    decreto: 'bg-violet-900/40 text-violet-300 border-violet-700/50',
    resolucion: 'bg-indigo-900/40 text-indigo-300 border-indigo-700/50',
    norma: 'bg-cyan-900/40 text-cyan-300 border-cyan-700/50',
    permiso: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50',
    otro: 'bg-slate-800 text-slate-400 border-slate-700',
  };
  const labels: Record<TipoRequisito, string> = {
    ley: 'Ley',
    decreto: 'Decreto',
    resolucion: 'Resolución',
    norma: 'Norma',
    permiso: 'Permiso',
    otro: 'Otro',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${map[t]}`}
    >
      {labels[t]}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RequisitosLegalesPage() {
  const { user } = useAuth();
  const orgId = user?.organization_id;

  const [requisitos, setRequisitos] = useState<RequisitoLegal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterTipo, setFilterTipo] = useState<'todos' | TipoRequisito>('todos');
  const [filterCumplimiento, setFilterCumplimiento] = useState<'todos' | EstadoCumplimiento>('todos');

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadRequisitos = async () => {
    if (!orgId) return;
    try {
      setLoading(true);
      setError(null);
      const idToken = await user?.getIdToken?.();
      const res = await fetch(
        `/api/hse/requisitos-legales?organization_id=${encodeURIComponent(orgId)}`,
        {
          headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
          cache: 'no-store',
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Error al cargar');
      setRequisitos(json.data as RequisitoLegal[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar los requisitos legales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRequisitos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  // ── Filtered data ─────────────────────────────────────────────────────────

  const filtered = requisitos.filter(r => {
    if (filterTipo !== 'todos' && r.tipo !== filterTipo) return false;
    if (filterCumplimiento !== 'todos' && r.estado_cumplimiento !== filterCumplimiento) return false;
    return true;
  });

  // ── Dialog helpers ────────────────────────────────────────────────────────

  const openNew = () => {
    setEditingId(null);
    setForm(defaultForm);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (r: RequisitoLegal) => {
    setEditingId(r.id);
    setForm({
      tipo: r.tipo,
      numero: r.numero,
      descripcion: r.descripcion,
      fecha_vigencia: r.fecha_vigencia ?? '',
      aplica_a_raw: (r.aplica_a ?? []).join(', '),
      estado_cumplimiento: r.estado_cumplimiento,
      observaciones: r.observaciones ?? '',
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
    if (!form.numero.trim()) {
      setFormError('El número es obligatorio.');
      return;
    }
    if (!form.descripcion.trim()) {
      setFormError('La descripción es obligatoria.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const idToken = await user?.getIdToken?.();
      const aplica_a = form.aplica_a_raw
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const payload = {
        tipo: form.tipo,
        numero: form.numero.trim(),
        descripcion: form.descripcion.trim(),
        fecha_vigencia: form.fecha_vigencia || undefined,
        aplica_a,
        estado_cumplimiento: form.estado_cumplimiento,
        observaciones: form.observaciones.trim() || undefined,
      };

      let res: Response;
      if (editingId) {
        res = await fetch(
          `/api/hse/requisitos-legales/${editingId}?organization_id=${encodeURIComponent(orgId)}`,
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
          `/api/hse/requisitos-legales?organization_id=${encodeURIComponent(orgId)}`,
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
      await loadRequisitos();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este requisito legal?')) return;
    if (!orgId) return;
    setDeletingId(id);
    try {
      const idToken = await user?.getIdToken?.();
      const res = await fetch(
        `/api/hse/requisitos-legales/${id}?organization_id=${encodeURIComponent(orgId)}`,
        {
          method: 'DELETE',
          headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
      await loadRequisitos();
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-900/40">
              <Scale className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-100">Requisitos Legales Aplicables</h1>
              <p className="text-sm text-slate-400">ISO 14001 · ISO 45001 · Cláusula 6.1.3</p>
            </div>
          </div>
          {canManage && (
            <Button onClick={openNew} className="bg-emerald-600 text-white hover:bg-emerald-500">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Requisito
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          {/* Tipo */}
          <select
            value={filterTipo}
            onChange={e => setFilterTipo(e.target.value as typeof filterTipo)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="todos">Todos los tipos</option>
            <option value="ley">Ley</option>
            <option value="decreto">Decreto</option>
            <option value="resolucion">Resolución</option>
            <option value="norma">Norma</option>
            <option value="permiso">Permiso</option>
            <option value="otro">Otro</option>
          </select>

          {/* Estado cumplimiento */}
          <select
            value={filterCumplimiento}
            onChange={e => setFilterCumplimiento(e.target.value as typeof filterCumplimiento)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="todos">Todos los estados</option>
            <option value="cumple">Cumple</option>
            <option value="parcial">Parcial</option>
            <option value="no_cumple">No cumple</option>
            <option value="no_aplica">No aplica</option>
          </select>

          <span className="ml-auto text-xs text-slate-500">
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </span>
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
        {!loading && filtered.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <Scale className="h-12 w-12 text-slate-700" />
            <p className="text-slate-400">No hay requisitos legales que coincidan con los filtros.</p>
            {canManage && requisitos.length === 0 && (
              <Button
                onClick={openNew}
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                <Plus className="mr-2 h-4 w-4" />
                Registrar primer requisito
              </Button>
            )}
          </div>
        )}

        {/* Table */}
        {!loading && filtered.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Número</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Descripción</th>
                    <th className="px-4 py-3">Vigencia</th>
                    <th className="px-4 py-3">Cumplimiento</th>
                    {canManage && <th className="px-4 py-3 text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filtered.map(r => (
                    <tr key={r.id} className="transition hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-mono text-sm text-slate-200 whitespace-nowrap">
                        {r.numero}
                      </td>
                      <td className="px-4 py-3">{badgeTipo(r.tipo)}</td>
                      <td className="max-w-sm px-4 py-3">
                        <div className="truncate text-slate-300">{r.descripcion}</div>
                        {r.aplica_a && r.aplica_a.length > 0 && (
                          <div className="mt-0.5 truncate text-xs text-slate-500">
                            Aplica a: {r.aplica_a.join(', ')}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                        {r.fecha_vigencia
                          ? new Date(r.fecha_vigencia).toLocaleDateString('es-AR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="px-4 py-3">{badgeCumplimiento(r.estado_cumplimiento)}</td>
                      {canManage && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit(r)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => void handleDelete(r.id)}
                              disabled={deletingId === r.id}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-950 hover:text-rose-300 disabled:opacity-40"
                              title="Eliminar"
                            >
                              {deletingId === r.id ? (
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
                {editingId ? 'Editar Requisito Legal' : 'Nuevo Requisito Legal'}
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
                {/* Tipo + Numero */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-300">Tipo</label>
                    <select
                      value={form.tipo}
                      onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoRequisito }))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="ley">Ley</option>
                      <option value="decreto">Decreto</option>
                      <option value="resolucion">Resolución</option>
                      <option value="norma">Norma</option>
                      <option value="permiso">Permiso</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-300">
                      Número <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.numero}
                      onChange={e => setForm(f => ({ ...f, numero: e.target.value }))}
                      placeholder="Ej: Ley 24.051"
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Descripcion */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    Descripción <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    value={form.descripcion}
                    onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                    placeholder="Descripción del requisito legal aplicable"
                    rows={3}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none resize-none"
                  />
                </div>

                {/* Fecha vigencia + Estado cumplimiento */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-300">
                      Fecha de vigencia <span className="text-slate-500">(opcional)</span>
                    </label>
                    <input
                      type="date"
                      value={form.fecha_vigencia}
                      onChange={e => setForm(f => ({ ...f, fecha_vigencia: e.target.value }))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-300">
                      Estado de cumplimiento
                    </label>
                    <select
                      value={form.estado_cumplimiento}
                      onChange={e =>
                        setForm(f => ({ ...f, estado_cumplimiento: e.target.value as EstadoCumplimiento }))
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="cumple">Cumple</option>
                      <option value="parcial">Parcial</option>
                      <option value="no_cumple">No cumple</option>
                      <option value="no_aplica">No aplica</option>
                    </select>
                  </div>
                </div>

                {/* Aplica a */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    Aplica a <span className="text-slate-500">(opcional)</span>
                  </label>
                  <textarea
                    value={form.aplica_a_raw}
                    onChange={e => setForm(f => ({ ...f, aplica_a_raw: e.target.value }))}
                    placeholder="Aspectos o procesos separados por coma"
                    rows={2}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none resize-none"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Ej: Gestión de residuos, Proceso de pintura, Almacén
                  </p>
                </div>

                {/* Observaciones */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    Observaciones <span className="text-slate-500">(opcional)</span>
                  </label>
                  <textarea
                    value={form.observaciones}
                    onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
                    placeholder="Notas adicionales sobre este requisito"
                    rows={2}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none resize-none"
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
                  'Registrar requisito'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
