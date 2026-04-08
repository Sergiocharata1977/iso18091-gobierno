'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/firebase/config';
import {
  COLORES_DISPONIBLES,
  DEFAULT_ESTADOS_COMPRAS,
} from '@/lib/compras/defaultEstados';
import type { Compra, EstadoKanban } from '@/types/compras';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeEstados(estados: EstadoKanban[]): EstadoKanban[] {
  return [...estados]
    .sort((a, b) => a.orden - b.orden)
    .map((estado, index) => ({ ...estado, orden: index + 1 }));
}

function normalizeCompra(raw: Record<string, unknown>): Compra {
  return {
    id: String(raw.id || ''),
    numero: Number(raw.numero || 0),
    tipo: (raw.tipo as Compra['tipo']) || 'otro',
    estado: String(raw.estado || ''),
    prioridad: (raw.prioridad as Compra['prioridad']) || 'normal',
    solicitante_nombre: String(raw.solicitante_nombre || ''),
    area: String(raw.area || ''),
    motivo: String(raw.motivo || ''),
    items: Array.isArray(raw.items) ? (raw.items as Compra['items']) : [],
    organization_id: String(raw.organization_id || ''),
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    created_by: String(raw.created_by || ''),
  };
}

export default function ConfiguracionKanbanComprasPage() {
  const { user } = useAuth();
  const orgId = (user as any)?.organization_id as string | undefined;

  const [estados, setEstados] = useState<EstadoKanban[]>(
    structuredClone(DEFAULT_ESTADOS_COMPRAS)
  );
  const [compras, setCompras] = useState<Compra[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeCounts = useMemo(() => {
    return compras.reduce<Record<string, number>>((acc, compra) => {
      acc[compra.estado] = (acc[compra.estado] || 0) + 1;
      return acc;
    }, {});
  }, [compras]);

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
            ? normalizeEstados(data.estados)
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
      setCompras([]);
      return;
    }

    async function loadCompras() {
      try {
        const response = await fetch('/api/compras', { cache: 'no-store' });
        const json = await response.json();
        if (!response.ok || !json.success) {
          throw new Error(json.error || 'No se pudieron leer las compras');
        }
        setCompras(
          Array.isArray(json.data)
            ? json.data.map((item: Record<string, unknown>) => normalizeCompra(item))
            : []
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'No se pudieron cargar compras'
        );
      }
    }

    void loadCompras();
  }, [orgId]);

  function setDefaultEstado(id: string) {
    setEstados(prev =>
      prev.map(estado => ({ ...estado, es_default: estado.id === id }))
    );
    setSaved(false);
  }

  function moveEstado(index: number, direction: -1 | 1) {
    setEstados(prev => {
      const next = [...prev];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return normalizeEstados(next);
    });
    setSaved(false);
  }

  function removeEstado(id: string) {
    setEstados(prev => normalizeEstados(prev.filter(estado => estado.id !== id)));
    setSaved(false);
  }

  function addEstado() {
    setEstados(prev => {
      const nextIndex = prev.length + 1;
      const baseName = `Nueva etapa ${nextIndex}`;
      let candidateId = slugify(baseName);
      while (prev.some(estado => estado.id === candidateId)) {
        candidateId = `${candidateId}_${nextIndex}`;
      }

      return [
        ...prev,
        {
          id: candidateId,
          nombre: baseName,
          color: 'slate',
          orden: nextIndex,
          tipo: 'activo',
          es_default: false,
          bloqueado: false,
        },
      ];
    });
    setSaved(false);
  }

  async function handleSave() {
    try {
      setSaving(true);
      const normalized = normalizeEstados(
        estados.map(estado => ({
          ...estado,
          id: slugify(estado.nombre) || estado.id,
        }))
      );

      const hasDefault = normalized.some(estado => estado.es_default);
      const payload = hasDefault
        ? normalized
        : normalized.map((estado, index) => ({
            ...estado,
            es_default: index === 0,
          }));

      const response = await fetch('/api/compras/estados', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estados: payload }),
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'No se pudieron guardar los estados');
      }

      setEstados(payload);
      setSaved(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/compras"
              className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-slate-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a Compras
            </Link>
            <h1 className="mt-3 text-3xl font-semibold text-slate-100">
              Etapas del Kanban de Compras
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Configuracion por tenant de etapas, colores y estado inicial.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEstados(structuredClone(DEFAULT_ESTADOS_COMPRAS));
                setSaved(false);
              }}
              className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Restaurar default
            </Button>
            <Button
              variant="outline"
              onClick={addEstado}
              className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
            >
              <Plus className="mr-2 h-4 w-4" />
              Agregar etapa
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={saving}
              className="bg-emerald-600 text-white hover:bg-emerald-500"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-rose-900/60 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {normalizeEstados(estados).map((estado, index) => {
            const activeItems = activeCounts[estado.id] || 0;
            const deleteBlocked = estado.bloqueado || activeItems > 0;
            return (
              <div
                key={estado.id}
                className="grid gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-5 md:grid-cols-[minmax(0,1fr)_260px_140px_130px]"
              >
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Nombre
                  </label>
                  <Input
                    value={estado.nombre}
                    onChange={event => {
                      const nombre = event.target.value;
                      setEstados(prev =>
                        prev.map(item =>
                          item.id === estado.id ? { ...item, nombre } : item
                        )
                      );
                      setSaved(false);
                    }}
                    className="border-slate-700 bg-slate-950 text-slate-100"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    ID tecnico: {slugify(estado.nombre) || estado.id}
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COLORES_DISPONIBLES.map(color => (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => {
                          setEstados(prev =>
                            prev.map(item =>
                              item.id === estado.id
                                ? { ...item, color: color.id }
                                : item
                            )
                          );
                          setSaved(false);
                        }}
                        className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs transition ${
                          estado.color === color.id
                            ? 'border-slate-200 bg-slate-800 text-slate-100'
                            : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <span className={`h-3 w-3 rounded-full ${color.bg}`} />
                        {color.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Default
                  </label>
                  <button
                    type="button"
                    onClick={() => setDefaultEstado(estado.id)}
                    className={`inline-flex h-10 w-full items-center justify-center rounded-md border text-sm transition ${
                      estado.es_default
                        ? 'border-emerald-600 bg-emerald-900/30 text-emerald-200'
                        : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {estado.es_default ? 'Etapa inicial' : 'Marcar default'}
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => moveEstado(index, -1)}
                      disabled={index === 0}
                      className="flex h-10 flex-1 items-center justify-center rounded-md border border-slate-700 bg-slate-950 text-slate-300 transition hover:border-slate-600 disabled:opacity-40"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveEstado(index, 1)}
                      disabled={index === estados.length - 1}
                      className="flex h-10 flex-1 items-center justify-center rounded-md border border-slate-700 bg-slate-950 text-slate-300 transition hover:border-slate-600 disabled:opacity-40"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeEstado(estado.id)}
                    disabled={deleteBlocked}
                    className="flex h-10 items-center justify-center gap-2 rounded-md border border-rose-900/50 bg-rose-950/20 text-sm text-rose-200 transition hover:bg-rose-950/40 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                  </button>
                </div>

                <div className="md:col-span-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span>Orden: {estado.orden}</span>
                  <span>Tipo: {estado.tipo}</span>
                  <span>{estado.bloqueado ? 'Bloqueado' : 'Editable'}</span>
                  <span>Items activos: {activeItems}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
