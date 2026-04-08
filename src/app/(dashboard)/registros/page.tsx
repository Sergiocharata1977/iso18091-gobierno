'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Database, FileText, LayoutGrid, Tag, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import type { CustomRegisterSchema, NormaISOReg } from '@/types/registers';
import { SchemaBuilder } from './_components/SchemaBuilder';

const NORMA_COLORS: Record<NormaISOReg, string> = {
  ISO_9001:  'bg-blue-900/30 text-blue-300 border-blue-700/50',
  ISO_14001: 'bg-emerald-900/30 text-emerald-300 border-emerald-700/50',
  ISO_45001: 'bg-amber-900/30 text-amber-300 border-amber-700/50',
  ISO_27001: 'bg-violet-900/30 text-violet-300 border-violet-700/50',
  ISO_18091: 'bg-cyan-900/30 text-cyan-300 border-cyan-700/50',
  CUSTOM:    'bg-slate-800 text-slate-300 border-slate-700',
};

const NORMA_LABELS: Record<NormaISOReg, string> = {
  ISO_9001:  'ISO 9001',
  ISO_14001: 'ISO 14001',
  ISO_45001: 'ISO 45001',
  ISO_27001: 'ISO 27001',
  ISO_18091: 'ISO 18091',
  CUSTOM:    'Personalizado',
};

export default function RegistrosPage() {
  const { user } = useAuth();
  const orgId = user?.organization_id;

  const [schemas, setSchemas] = useState<CustomRegisterSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingSchema, setEditingSchema] = useState<CustomRegisterSchema | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadSchemas = async () => {
    if (!orgId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/registers/schemas?organization_id=${encodeURIComponent(orgId)}`, {
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Error al cargar');
      setSchemas(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar los registros');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSchemas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este registro? Solo es posible si no tiene entradas.')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/registers/schemas/${id}?organization_id=${encodeURIComponent(orgId ?? '')}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
      await loadSchemas();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo eliminar');
    } finally {
      setDeletingId(null);
    }
  };

  const canManage = user?.rol === 'admin' || user?.rol === 'gerente' || user?.rol === 'super_admin';

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-100">Registros</h1>
            <p className="mt-1 text-sm text-slate-400">
              ABM configurable de registros operativos con trazabilidad de compliance
            </p>
          </div>
          {canManage && (
            <Button
              onClick={() => { setEditingSchema(null); setBuilderOpen(true); }}
              className="bg-emerald-600 text-white hover:bg-emerald-500"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Registro
            </Button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-2xl border border-rose-900/60 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/50" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && schemas.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <Database className="h-12 w-12 text-slate-600" />
            <p className="text-slate-400">No hay registros configurados aún.</p>
            {canManage && (
              <Button
                onClick={() => { setEditingSchema(null); setBuilderOpen(true); }}
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                <Plus className="mr-2 h-4 w-4" />
                Crear primer registro
              </Button>
            )}
          </div>
        )}

        {/* Grid de schemas */}
        {!loading && schemas.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {schemas.map(schema => (
              <div
                key={schema.id}
                className="group relative flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 transition hover:border-slate-700"
              >
                {/* Acciones hover */}
                {canManage && (
                  <div className="absolute right-4 top-4 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      onClick={() => { setEditingSchema(schema); setBuilderOpen(true); }}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => void handleDelete(schema.id)}
                      disabled={deletingId === schema.id}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-950 hover:text-rose-300 disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800">
                    <FileText className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/registros/${schema.id}`}
                      className="font-semibold text-slate-100 hover:text-emerald-400 transition-colors"
                    >
                      {schema.name}
                    </Link>
                    {schema.description && (
                      <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{schema.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {schema.norma_referencia && (
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${NORMA_COLORS[schema.norma_referencia]}`}>
                      <Tag className="h-3 w-3" />
                      {NORMA_LABELS[schema.norma_referencia]}
                      {schema.clausula_referencia && ` · ${schema.clausula_referencia}`}
                    </span>
                  )}
                  {schema.has_kanban && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-indigo-700/50 bg-indigo-900/30 px-2 py-0.5 text-xs text-indigo-300">
                      <LayoutGrid className="h-3 w-3" />
                      Kanban
                    </span>
                  )}
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-slate-800 pt-3 text-xs text-slate-500">
                  <span>{schema.fields?.length ?? 0} campos · {schema.stages?.length ?? 0} etapas</span>
                  <span className={schema.audit_level === 'full' ? 'text-amber-500' : ''}>
                    {schema.audit_level === 'full' ? 'Auditoría completa' : 'Auditoría básica'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Schema Builder Dialog */}
      <SchemaBuilder
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        onSaved={() => { setBuilderOpen(false); void loadSchemas(); }}
        schema={editingSchema}
        organizationId={orgId ?? ''}
      />
    </div>
  );
}
