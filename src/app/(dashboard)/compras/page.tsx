'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { Plus, Settings2, ShoppingCart, User, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/firebase/config';
import { DEFAULT_ESTADOS_COMPRAS } from '@/lib/compras/defaultEstados';
import type {
  Compra,
  CompraItem,
  CompraPrioridad,
  CompraType,
  EstadoKanban,
} from '@/types/compras';

const COLOR_MAP: Record<string, { header: string; dot: string }> = {
  slate: { header: 'bg-slate-800/60 border-slate-700', dot: 'bg-slate-400' },
  blue: { header: 'bg-blue-900/30 border-blue-700/50', dot: 'bg-blue-500' },
  indigo: {
    header: 'bg-indigo-900/30 border-indigo-700/50',
    dot: 'bg-indigo-500',
  },
  amber: { header: 'bg-amber-900/30 border-amber-700/50', dot: 'bg-amber-500' },
  emerald: {
    header: 'bg-emerald-900/30 border-emerald-700/50',
    dot: 'bg-emerald-500',
  },
  green: { header: 'bg-green-900/30 border-green-700/50', dot: 'bg-green-600' },
  rose: { header: 'bg-rose-900/30 border-rose-700/50', dot: 'bg-rose-400' },
  cyan: { header: 'bg-cyan-900/30 border-cyan-700/50', dot: 'bg-cyan-500' },
  violet: {
    header: 'bg-violet-900/30 border-violet-700/50',
    dot: 'bg-violet-500',
  },
};

const TYPE_LABELS: Record<CompraType, string> = {
  repuesto: 'Repuesto',
  insumo: 'Insumo',
  servicio_externo: 'Servicio externo',
  herramienta: 'Herramienta',
  consumible: 'Consumible',
  logistica: 'Logistica',
  otro: 'Otro',
};

const PRIORITY_LABELS: Record<CompraPrioridad, string> = {
  normal: 'Normal',
  urgente: 'Urgente',
  critica: 'Critica',
};

const PRIORITY_BADGES: Record<CompraPrioridad, string> = {
  normal: 'bg-slate-800 text-slate-300 border-slate-700',
  urgente: 'bg-amber-900/40 text-amber-300 border-amber-700/50',
  critica: 'bg-rose-900/40 text-rose-300 border-rose-700/50',
};

type CompraFormState = {
  tipo: CompraType;
  motivo: string;
  prioridad: CompraPrioridad;
  area: string;
  proveedor_nombre: string;
  fecha_requerida: string;
  notas: string;
  items: CompraItem[];
};

function createEmptyItem(): CompraItem {
  return {
    id: crypto.randomUUID(),
    descripcion: '',
    cantidad: 1,
    unidad: 'unidad',
    precio_unitario_estimado: 0,
  };
}

function createInitialForm(): CompraFormState {
  return {
    tipo: 'repuesto',
    motivo: '',
    prioridad: 'normal',
    area: '',
    proveedor_nombre: '',
    fecha_requerida: '',
    notas: '',
    items: [createEmptyItem()],
  };
}

function toMillis(value: unknown): number {
  if (!value) return 0;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value === 'object') {
    const candidate = value as {
      toDate?: () => Date;
      toMillis?: () => number;
      seconds?: number;
      _seconds?: number;
    };
    if (typeof candidate.toMillis === 'function') return candidate.toMillis();
    if (typeof candidate.toDate === 'function') {
      return candidate.toDate().getTime();
    }
    const seconds = candidate.seconds ?? candidate._seconds;
    if (typeof seconds === 'number') return seconds * 1000;
  }
  return 0;
}

function formatCurrency(value?: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value: unknown): string {
  const millis = toMillis(value);
  if (!millis) return 'No informada';
  return new Date(millis).toLocaleDateString('es-AR');
}

function normalizeCompra(raw: Record<string, unknown>): Compra {
  return {
    id: String(raw.id || ''),
    numero: Number(raw.numero || 0),
    tipo: (raw.tipo as CompraType) || 'otro',
    estado: String(raw.estado || ''),
    prioridad: (raw.prioridad as CompraPrioridad) || 'normal',
    solicitante_id: raw.solicitante_id as string | undefined,
    solicitante_nombre: String(raw.solicitante_nombre || 'Sin asignar'),
    area: String(raw.area || ''),
    motivo: String(raw.motivo || ''),
    justificacion: raw.justificacion as string | undefined,
    fecha_requerida: raw.fecha_requerida,
    fecha_aprobacion: raw.fecha_aprobacion,
    fecha_orden: raw.fecha_orden,
    fecha_recepcion: raw.fecha_recepcion,
    fecha_cierre: raw.fecha_cierre,
    proveedor_nombre: raw.proveedor_nombre as string | undefined,
    proveedor_cuit: raw.proveedor_cuit as string | undefined,
    proveedor_contacto: raw.proveedor_contacto as string | undefined,
    items: Array.isArray(raw.items) ? (raw.items as CompraItem[]) : [],
    monto_estimado: Number(raw.monto_estimado || 0),
    monto_real: raw.monto_real ? Number(raw.monto_real) : undefined,
    moneda: (raw.moneda as string | undefined) || 'ARS',
    orden_servicio_id: raw.orden_servicio_id as string | undefined,
    oportunidad_crm_id: raw.oportunidad_crm_id as string | undefined,
    hallazgo_id: raw.hallazgo_id as string | undefined,
    impacto_ambiental: raw.impacto_ambiental as boolean | undefined,
    criterio_ambiental: raw.criterio_ambiental as string | undefined,
    recepcion_tipo: raw.recepcion_tipo as Compra['recepcion_tipo'],
    recepcion_observaciones: raw.recepcion_observaciones as string | undefined,
    notas: raw.notas as string | undefined,
    organization_id: String(raw.organization_id || ''),
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    created_by: String(raw.created_by || ''),
  };
}

function KanbanCard({
  compra,
  selected,
  onClick,
}: {
  compra: Compra;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition ${
        selected
          ? 'border-amber-500 bg-slate-800 shadow-lg shadow-amber-950/20'
          : 'border-slate-800 bg-slate-900 hover:border-slate-700 hover:bg-slate-800/80'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-slate-400">
          #{compra.numero || 0}
        </span>
        <span className="rounded-full border border-slate-700 bg-slate-950 px-2 py-0.5 text-[11px] font-medium text-slate-300">
          {TYPE_LABELS[compra.tipo]}
        </span>
      </div>

      <p className="mt-3 line-clamp-2 text-sm font-medium leading-snug text-slate-100">
        {compra.motivo}
      </p>

      {compra.proveedor_nombre && (
        <p className="mt-2 truncate text-xs text-slate-400">
          {compra.proveedor_nombre}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="text-xs text-slate-300">
          {formatCurrency(compra.monto_estimado)}
        </span>
        {compra.prioridad !== 'normal' && (
          <span
            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase ${PRIORITY_BADGES[compra.prioridad]}`}
          >
            {PRIORITY_LABELS[compra.prioridad]}
          </span>
        )}
      </div>
    </button>
  );
}

export default function ComprasPage() {
  const { user } = useAuth();
  const orgId = (user as any)?.organization_id as string | undefined;
  const userName =
    ((user as any)?.nombre as string | undefined) ||
    ((user as any)?.email as string | undefined) ||
    'Usuario actual';

  const [compras, setCompras] = useState<Compra[]>([]);
  const [estados, setEstados] = useState<EstadoKanban[]>(DEFAULT_ESTADOS_COMPRAS);
  const [selected, setSelected] = useState<Compra | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CompraFormState>(createInitialForm());
  const [notesDraft, setNotesDraft] = useState('');

  const sortedEstados = useMemo(
    () => [...estados].sort((a, b) => a.orden - b.orden),
    [estados]
  );

  const defaultEstadoId = useMemo(
    () =>
      sortedEstados.find(estado => estado.es_default)?.id ||
      DEFAULT_ESTADOS_COMPRAS.find(estado => estado.es_default)?.id ||
      'borrador',
    [sortedEstados]
  );

  async function loadCompras() {
    try {
      setLoading(true);
      const response = await fetch('/api/compras', { cache: 'no-store' });
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'No se pudieron cargar las compras');
      }

      const nextCompras = Array.isArray(json.data)
        ? json.data.map((item: Record<string, unknown>) => normalizeCompra(item))
        : [];

      setCompras(nextCompras);
      setSelected(prev =>
        prev
          ? nextCompras.find((item: Compra) => item.id === prev.id) || null
          : null
      );
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al cargar compras';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!orgId) {
      setEstados(structuredClone(DEFAULT_ESTADOS_COMPRAS));
      return;
    }

    const ref = doc(db, 'organizations', orgId, 'kanban_configs', 'compras');
    const unsubscribe = onSnapshot(ref, snapshot => {
      if (snapshot.exists()) {
        const data = snapshot.data() as { estados?: EstadoKanban[] };
        setEstados(
          data?.estados?.length
            ? [...data.estados].sort((a, b) => a.orden - b.orden)
            : structuredClone(DEFAULT_ESTADOS_COMPRAS)
        );
      } else {
        setEstados(structuredClone(DEFAULT_ESTADOS_COMPRAS));
      }
    });

    return () => unsubscribe();
  }, [orgId]);

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      setCompras([]);
      return;
    }
    void loadCompras();
  }, [orgId]);

  useEffect(() => {
    setNotesDraft(selected?.notas || '');
  }, [selected]);

  async function patchCompra(id: string, payload: Record<string, unknown>) {
    const response = await fetch(`/api/compras/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.error || 'No se pudo actualizar la compra');
    }
  }

  async function handleEstadoChange(compraId: string, estado: string) {
    try {
      setSaving(true);
      await patchCompra(compraId, { estado });
      await loadCompras();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveNotes() {
    if (!selected?.id) return;
    try {
      setSavingNotes(true);
      await patchCompra(selected.id, { notas: notesDraft.trim() || null });
      await loadCompras();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSavingNotes(false);
    }
  }

  function updateForm<K extends keyof CompraFormState>(
    key: K,
    value: CompraFormState[K]
  ) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function updateItem(
    itemId: string,
    key: keyof CompraItem,
    value: string | number
  ) {
    setForm(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId ? { ...item, [key]: value } : item
      ),
    }));
  }

  async function handleCreateCompra() {
    try {
      setSaving(true);
      const payload = {
        tipo: form.tipo,
        motivo: form.motivo.trim(),
        prioridad: form.prioridad,
        area: form.area.trim(),
        proveedor_nombre: form.proveedor_nombre.trim() || undefined,
        fecha_requerida: form.fecha_requerida || undefined,
        notas: form.notas.trim() || undefined,
        estado: defaultEstadoId,
        items: form.items
          .filter(item => item.descripcion.trim())
          .map(item => ({
            ...item,
            descripcion: item.descripcion.trim(),
            cantidad: Number(item.cantidad) || 0,
            precio_unitario_estimado: Number(item.precio_unitario_estimado) || 0,
          })),
        solicitante_nombre: userName,
      };

      if (!payload.motivo || !payload.area || payload.items.length === 0) {
        throw new Error('Completa motivo, area y al menos un item valido');
      }

      const response = await fetch('/api/compras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'No se pudo crear la compra');
      }

      setShowForm(false);
      setForm(createInitialForm());
      await loadCompras();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 md:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl border border-emerald-800/40 bg-emerald-900/20 p-3">
                <ShoppingCart className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-3xl font-semibold text-slate-100">
                  Compras
                </h1>
                <p className="mt-2 text-sm text-slate-400">
                  Proceso de compras - repuestos, insumos y servicios
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link href="/configuracion/kanban/compras">
                <Button
                  variant="outline"
                  className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                >
                  <Settings2 className="mr-2 h-4 w-4" />
                  Etapas
                </Button>
              </Link>
              <Button
                onClick={() => {
                  setForm(createInitialForm());
                  setShowForm(true);
                }}
                className="bg-emerald-600 text-white hover:bg-emerald-500"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nueva Compra
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-900/60 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        {!orgId && (
          <div className="rounded-3xl border border-amber-800/40 bg-amber-950/30 px-5 py-4 text-sm text-amber-100">
            No hay organizacion activa en la sesion.
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 overflow-x-auto rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
            {loading ? (
              <div className="flex min-h-[420px] items-center justify-center text-sm text-slate-400">
                Cargando compras...
              </div>
            ) : (
              <div
                className="flex gap-4 pb-2"
                style={{ minWidth: `${Math.max(sortedEstados.length, 1) * 288}px` }}
              >
                {sortedEstados.map(estado => {
                  const color = COLOR_MAP[estado.color] || COLOR_MAP.slate;
                  const items = compras.filter(compra => compra.estado === estado.id);
                  return (
                    <div key={estado.id} className="w-72 flex-shrink-0">
                      <div className={`rounded-t-2xl border px-4 py-3 ${color.header}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${color.dot}`} />
                            <span className="text-sm font-semibold text-slate-100">
                              {estado.nombre}
                            </span>
                          </div>
                          <span className="rounded-full border border-slate-700 bg-slate-950/70 px-2 py-0.5 text-xs font-medium text-slate-300">
                            {items.length}
                          </span>
                        </div>
                      </div>
                      <div className="min-h-[540px] space-y-3 rounded-b-2xl border border-t-0 border-slate-800 bg-slate-950/50 p-3">
                        {items.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-slate-800 px-4 py-8 text-center text-xs text-slate-500">
                            Sin compras en esta etapa
                          </div>
                        ) : (
                          items.map(compra => (
                            <KanbanCard
                              key={compra.id}
                              compra={compra}
                              selected={selected?.id === compra.id}
                              onClick={() => setSelected(compra)}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-slate-950/30">
            {!selected ? (
              <div className="flex min-h-[420px] items-center justify-center text-center text-sm text-slate-500">
                Selecciona una compra para ver detalle, cambiar etapa o editar notas.
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Detalle
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-100">
                      #{selected.numero || 0}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="rounded-full border border-slate-700 p-2 text-slate-400 transition hover:border-slate-600 hover:text-slate-200"
                    aria-label="Cerrar detalle"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-medium text-slate-200">
                    {TYPE_LABELS[selected.tipo]}
                  </span>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${PRIORITY_BADGES[selected.prioridad]}`}
                  >
                    {PRIORITY_LABELS[selected.prioridad]}
                  </span>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Estado
                  </label>
                  <select
                    value={selected.estado}
                    onChange={event =>
                      void handleEstadoChange(selected.id || '', event.target.value)
                    }
                    disabled={saving}
                    className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-emerald-500"
                  >
                    {sortedEstados.map(estado => (
                      <option key={estado.id} value={estado.id}>
                        {estado.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-500" />
                    <span>{selected.solicitante_nombre || 'No informado'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-slate-100">Area:</span>{' '}
                    {selected.area || 'No informada'}
                  </div>
                  <div>
                    <span className="font-medium text-slate-100">Motivo:</span>{' '}
                    {selected.motivo}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Proveedor
                  </p>
                  <div className="mt-3 space-y-2">
                    <p>{selected.proveedor_nombre || 'No informado'}</p>
                    <p>CUIT: {selected.proveedor_cuit || 'No informado'}</p>
                    <p>Contacto: {selected.proveedor_contacto || 'No informado'}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Items
                  </p>
                  <div className="mt-3 space-y-3">
                    {selected.items.length === 0 ? (
                      <p className="text-sm text-slate-500">Sin items cargados.</p>
                    ) : (
                      selected.items.map(item => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-slate-800 bg-slate-900/70 p-3"
                        >
                          <p className="text-sm font-medium text-slate-100">
                            {item.descripcion}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {item.cantidad} {item.unidad} x{' '}
                            {formatCurrency(item.precio_unitario_estimado)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
                  <p>
                    <span className="font-medium text-slate-100">Monto estimado:</span>{' '}
                    {formatCurrency(selected.monto_estimado)}
                  </p>
                  <p className="mt-2">
                    <span className="font-medium text-slate-100">Fecha requerida:</span>{' '}
                    {formatDate(selected.fecha_requerida)}
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Notas
                  </label>
                  <Textarea
                    value={notesDraft}
                    onChange={event => setNotesDraft(event.target.value)}
                    className="min-h-[110px] border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500"
                    placeholder="Notas internas de seguimiento"
                  />
                  <Button
                    onClick={() => void handleSaveNotes()}
                    disabled={savingNotes}
                    className="mt-3 w-full bg-amber-600 text-white hover:bg-amber-500"
                  >
                    {savingNotes ? 'Guardando...' : 'Guardar'}
                  </Button>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-slate-800 bg-slate-950 text-slate-100">
          <DialogHeader>
            <DialogTitle>Nueva compra</DialogTitle>
            <DialogDescription className="text-slate-400">
              Registra una solicitud de compra para el Kanban operativo.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-slate-300">Tipo</label>
              <select
                value={form.tipo}
                onChange={event => updateForm('tipo', event.target.value as CompraType)}
                className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100"
              >
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Prioridad
              </label>
              <select
                value={form.prioridad}
                onChange={event =>
                  updateForm('prioridad', event.target.value as CompraPrioridad)
                }
                className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100"
              >
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm text-slate-300">
                Motivo
              </label>
              <Textarea
                value={form.motivo}
                onChange={event => updateForm('motivo', event.target.value)}
                className="border-slate-700 bg-slate-900 text-slate-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">Area</label>
              <Input
                value={form.area}
                onChange={event => updateForm('area', event.target.value)}
                className="border-slate-700 bg-slate-900 text-slate-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Proveedor
              </label>
              <Input
                value={form.proveedor_nombre}
                onChange={event =>
                  updateForm('proveedor_nombre', event.target.value)
                }
                className="border-slate-700 bg-slate-900 text-slate-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Fecha requerida
              </label>
              <Input
                type="date"
                value={form.fecha_requerida}
                onChange={event =>
                  updateForm('fecha_requerida', event.target.value)
                }
                className="border-slate-700 bg-slate-900 text-slate-100"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm text-slate-300">Notas</label>
              <Textarea
                value={form.notas}
                onChange={event => updateForm('notas', event.target.value)}
                className="border-slate-700 bg-slate-900 text-slate-100"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">Items</h3>
              <Button
                variant="outline"
                onClick={() =>
                  updateForm('items', [...form.items, createEmptyItem()])
                }
                className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
              >
                <Plus className="mr-2 h-4 w-4" />
                Agregar item
              </Button>
            </div>

            {form.items.map((item, index) => (
              <div
                key={item.id}
                className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 md:grid-cols-[minmax(0,1fr)_90px_110px_140px_44px]"
              >
                <Input
                  value={item.descripcion}
                  onChange={event =>
                    updateItem(item.id, 'descripcion', event.target.value)
                  }
                  placeholder={`Descripcion del item ${index + 1}`}
                  className="border-slate-700 bg-slate-950 text-slate-100"
                />
                <Input
                  type="number"
                  min="0"
                  value={item.cantidad}
                  onChange={event =>
                    updateItem(item.id, 'cantidad', Number(event.target.value))
                  }
                  className="border-slate-700 bg-slate-950 text-slate-100"
                />
                <Input
                  value={item.unidad}
                  onChange={event =>
                    updateItem(item.id, 'unidad', event.target.value)
                  }
                  className="border-slate-700 bg-slate-950 text-slate-100"
                />
                <Input
                  type="number"
                  min="0"
                  value={item.precio_unitario_estimado || 0}
                  onChange={event =>
                    updateItem(
                      item.id,
                      'precio_unitario_estimado',
                      Number(event.target.value)
                    )
                  }
                  className="border-slate-700 bg-slate-950 text-slate-100"
                />
                <button
                  type="button"
                  onClick={() =>
                    updateForm(
                      'items',
                      form.items.length === 1
                        ? [createEmptyItem()]
                        : form.items.filter(current => current.id !== item.id)
                    )
                  }
                  className="rounded-md border border-slate-700 text-slate-400 transition hover:border-rose-700 hover:text-rose-300"
                  aria-label="Eliminar item"
                >
                  <X className="mx-auto h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowForm(false)}
              className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => void handleCreateCompra()}
              disabled={saving}
              className="bg-emerald-600 text-white hover:bg-emerald-500"
            >
              {saving ? 'Guardando...' : 'Crear compra'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
