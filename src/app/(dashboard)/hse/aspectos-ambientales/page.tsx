'use client';

import { useEffect, useState } from 'react';
import {
  Plus,
  Leaf,
  Pencil,
  Trash2,
  X,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

// ─── Types ──────────────────────────────────────────────────────────────────

type TipoAspecto = 'directo' | 'indirecto';
type CondicionOperacion = 'normal' | 'anormal' | 'emergencia';

interface AspectoAmbiental {
  id: string;
  organization_id: string;
  actividad: string;
  aspecto: string;
  impacto: string;
  tipo: TipoAspecto;
  situacion: CondicionOperacion;
  probabilidad: number;
  severidad: number;
  significativo: boolean;
  requiere_control: boolean;
  clausula_iso14001?: string;
  created_at: unknown;
  updated_at: unknown;
}

type FormData = {
  actividad: string;
  aspecto: string;
  impacto: string;
  tipo: TipoAspecto;
  situacion: CondicionOperacion;
  probabilidad: string;
  severidad: string;
  requiere_control: boolean;
  clausula_iso14001: string;
};

const defaultForm: FormData = {
  actividad: '',
  aspecto: '',
  impacto: '',
  tipo: 'directo',
  situacion: 'normal',
  probabilidad: '1',
  severidad: '1',
  requiere_control: false,
  clausula_iso14001: '',
};

// ─── Badge helpers ───────────────────────────────────────────────────────────

function badgeSituacion(s: CondicionOperacion) {
  const map: Record<CondicionOperacion, string> = {
    normal: 'bg-slate-800 text-slate-300 border-slate-700',
    anormal: 'bg-amber-900/40 text-amber-300 border-amber-700/50',
    emergencia: 'bg-rose-900/40 text-rose-300 border-rose-700/50',
  };
  const labels: Record<CondicionOperacion, string> = {
    normal: 'Normal',
    anormal: 'Anormal',
    emergencia: 'Emergencia',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${map[s]}`}
    >
      {labels[s]}
    </span>
  );
}

function badgeTipo(t: TipoAspecto) {
  const map: Record<TipoAspecto, string> = {
    directo: 'bg-blue-900/40 text-blue-300 border-blue-700/50',
    indirecto: 'bg-violet-900/40 text-violet-300 border-violet-700/50',
  };
  const labels: Record<TipoAspecto, string> = {
    directo: 'Directo',
    indirecto: 'Indirecto',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${map[t]}`}
    >
      {labels[t]}
    </span>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AspectosAmbientalesPage() {
  const { user } = useAuth();
  const orgId = user?.organization_id;

  const [aspectos, setAspectos] = useState<AspectoAmbiental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterSituacion, setFilterSituacion] = useState<'todos' | CondicionOperacion>('todos');
  const [filterTipo, setFilterTipo] = useState<'todos' | TipoAspecto>('todos');
  const [soloSignificativos, setSoloSignificativos] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadAspectos = async () => {
    if (!orgId) return;
    try {
      setLoading(true);
      setError(null);
      const idToken = await user?.getIdToken?.();
      const res = await fetch(
        `/api/hse/aspectos-ambientales?organization_id=${encodeURIComponent(orgId)}`,
        {
          headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
          cache: 'no-store',
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Error al cargar');
      setAspectos(json.data as AspectoAmbiental[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar los aspectos ambientales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAspectos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  // ── Filtered data ─────────────────────────────────────────────────────────

  const filtered = aspectos.filter(a => {
    if (filterSituacion !== 'todos' && a.situacion !== filterSituacion) return false;
    if (filterTipo !== 'todos' && a.tipo !== filterTipo) return false;
    if (soloSignificativos && !a.significativo) return false;
    return true;
  });

  // ── Dialog helpers ────────────────────────────────────────────────────────

  const openNew = () => {
    setEditingId(null);
    setForm(defaultForm);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (a: AspectoAmbiental) => {
    setEditingId(a.id);
    setForm({
      actividad: a.actividad,
      aspecto: a.aspecto,
      impacto: a.impacto,
      tipo: a.tipo,
      situacion: a.situacion,
      probabilidad: String(a.probabilidad),
      severidad: String(a.severidad),
      requiere_control: a.requiere_control,
      clausula_iso14001: a.clausula_iso14001 ?? '',
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
    const prob = parseInt(form.probabilidad, 10);
    const sev = parseInt(form.severidad, 10);
    if (!form.actividad.trim() || !form.aspecto.trim() || !form.impacto.trim()) {
      setFormError('Actividad, aspecto e impacto son obligatorios.');
      return;
    }
    if (isNaN(prob) || prob < 1 || prob > 5 || isNaN(sev) || sev < 1 || sev > 5) {
      setFormError('Probabilidad y severidad deben ser entre 1 y 5.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const idToken = await user?.getIdToken?.();
      const payload = {
        actividad: form.actividad.trim(),
        aspecto: form.aspecto.trim(),
        impacto: form.impacto.trim(),
        tipo: form.tipo,
        situacion: form.situacion,
        probabilidad: prob,
        severidad: sev,
        requiere_control: form.requiere_control,
        clausula_iso14001: form.clausula_iso14001.trim() || undefined,
      };

      let res: Response;
      if (editingId) {
        res = await fetch(
          `/api/hse/aspectos-ambientales/${editingId}?organization_id=${encodeURIComponent(orgId)}`,
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
          `/api/hse/aspectos-ambientales?organization_id=${encodeURIComponent(orgId)}`,
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
      await loadAspectos();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este aspecto ambiental?')) return;
    if (!orgId) return;
    setDeletingId(id);
    try {
      const idToken = await user?.getIdToken?.();
      const res = await fetch(
        `/api/hse/aspectos-ambientales/${id}?organization_id=${encodeURIComponent(orgId)}`,
        {
          method: 'DELETE',
          headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
      await loadAspectos();
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-900/40">
              <Leaf className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-100">Aspectos Ambientales</h1>
              <p className="text-sm text-slate-400">ISO 14001 · Cláusula 6.1.2</p>
            </div>
          </div>
          {canManage && (
            <Button onClick={openNew} className="bg-emerald-600 text-white hover:bg-emerald-500">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Aspecto
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          {/* Situacion */}
          <select
            value={filterSituacion}
            onChange={e => setFilterSituacion(e.target.value as typeof filterSituacion)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="todos">Todas las situaciones</option>
            <option value="normal">Normal</option>
            <option value="anormal">Anormal</option>
            <option value="emergencia">Emergencia</option>
          </select>

          {/* Tipo */}
          <select
            value={filterTipo}
            onChange={e => setFilterTipo(e.target.value as typeof filterTipo)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="todos">Todos los tipos</option>
            <option value="directo">Directo</option>
            <option value="indirecto">Indirecto</option>
          </select>

          {/* Solo significativos */}
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={soloSignificativos}
              onChange={e => setSoloSignificativos(e.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-emerald-500"
            />
            Solo significativos
          </label>

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
            <Leaf className="h-12 w-12 text-slate-700" />
            <p className="text-slate-400">No hay aspectos ambientales que coincidan con los filtros.</p>
            {canManage && aspectos.length === 0 && (
              <Button
                onClick={openNew}
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                <Plus className="mr-2 h-4 w-4" />
                Crear primer aspecto
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
                    <th className="px-4 py-3">Actividad</th>
                    <th className="px-4 py-3">Aspecto</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Situación</th>
                    <th className="px-4 py-3 text-center">P×S</th>
                    <th className="px-4 py-3">Significatividad</th>
                    {canManage && <th className="px-4 py-3 text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filtered.map(a => (
                    <tr key={a.id} className="transition hover:bg-slate-800/30">
                      <td className="px-4 py-3 text-slate-200">{a.actividad}</td>
                      <td className="max-w-xs px-4 py-3 text-slate-300">
                        <div className="truncate">{a.aspecto}</div>
                        <div className="truncate text-xs text-slate-500">{a.impacto}</div>
                      </td>
                      <td className="px-4 py-3">{badgeTipo(a.tipo)}</td>
                      <td className="px-4 py-3">{badgeSituacion(a.situacion)}</td>
                      <td className="px-4 py-3 text-center font-mono text-slate-300">
                        {a.probabilidad}×{a.severidad}={a.probabilidad * a.severidad}
                      </td>
                      <td className="px-4 py-3">
                        {a.significativo ? (
                          <span className="inline-flex items-center rounded-full border border-rose-700/50 bg-rose-900/40 px-2 py-0.5 text-xs font-medium text-rose-300">
                            Significativo
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      {canManage && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit(a)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => void handleDelete(a.id)}
                              disabled={deletingId === a.id}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-950 hover:text-rose-300 disabled:opacity-40"
                              title="Eliminar"
                            >
                              {deletingId === a.id ? (
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
                {editingId ? 'Editar Aspecto Ambiental' : 'Nuevo Aspecto Ambiental'}
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
                {/* Actividad */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    Actividad <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.actividad}
                    onChange={e => setForm(f => ({ ...f, actividad: e.target.value }))}
                    placeholder="Ej: Uso de solventes en pintura"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Aspecto */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    Aspecto <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.aspecto}
                    onChange={e => setForm(f => ({ ...f, aspecto: e.target.value }))}
                    placeholder="Ej: Generación de residuos peligrosos"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Impacto */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    Impacto <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.impacto}
                    onChange={e => setForm(f => ({ ...f, impacto: e.target.value }))}
                    placeholder="Ej: Contaminación del suelo"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Tipo + Situacion */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-300">Tipo</label>
                    <select
                      value={form.tipo}
                      onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoAspecto }))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="directo">Directo</option>
                      <option value="indirecto">Indirecto</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-300">Situación</label>
                    <select
                      value={form.situacion}
                      onChange={e => setForm(f => ({ ...f, situacion: e.target.value as CondicionOperacion }))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="normal">Normal</option>
                      <option value="anormal">Anormal</option>
                      <option value="emergencia">Emergencia</option>
                    </select>
                  </div>
                </div>

                {/* Probabilidad + Severidad */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-300">
                      Probabilidad (1-5)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={form.probabilidad}
                      onChange={e => setForm(f => ({ ...f, probabilidad: e.target.value }))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-300">
                      Severidad (1-5)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={form.severidad}
                      onChange={e => setForm(f => ({ ...f, severidad: e.target.value }))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* P×S preview */}
                <div className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-xs text-slate-400">
                  P×S ={' '}
                  <span className="font-mono font-semibold text-slate-200">
                    {(parseInt(form.probabilidad, 10) || 0) * (parseInt(form.severidad, 10) || 0)}
                  </span>
                  {' — '}
                  <span
                    className={
                      (parseInt(form.probabilidad, 10) || 0) * (parseInt(form.severidad, 10) || 0) >= 12
                        ? 'text-rose-400 font-medium'
                        : 'text-slate-400'
                    }
                  >
                    {(parseInt(form.probabilidad, 10) || 0) * (parseInt(form.severidad, 10) || 0) >= 12
                      ? 'SIGNIFICATIVO'
                      : 'No significativo'}
                  </span>
                  {' (umbral: P×S ≥ 12)'}
                </div>

                {/* Requiere control */}
                <div>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={form.requiere_control}
                      onChange={e => setForm(f => ({ ...f, requiere_control: e.target.checked }))}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-emerald-500"
                    />
                    Requiere control operacional
                  </label>
                </div>

                {/* Clausula ISO 14001 */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    Cláusula ISO 14001 <span className="text-slate-500">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={form.clausula_iso14001}
                    onChange={e => setForm(f => ({ ...f, clausula_iso14001: e.target.value }))}
                    placeholder="6.1.2"
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
                  'Crear aspecto'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
