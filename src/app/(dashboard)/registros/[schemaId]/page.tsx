'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Plus, Tag, LayoutGrid, List, ChevronLeft, FileText,
  Eye, Pencil, X, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { RegisterKanban } from '../_components/RegisterKanban';
import { DynamicRegisterForm } from '../_components/DynamicRegisterForm';
import { AuditTrailPanel } from '../_components/AuditTrailPanel';
import type {
  CustomRegisterSchema,
  CustomRegisterEntry,
  RegisterFieldSchema,
  NormaISOReg,
} from '@/types/registers';

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

type ViewMode = 'list' | 'kanban';

function formatFieldValue(field: RegisterFieldSchema, value: unknown): string {
  if (value === undefined || value === null || value === '') return '—';
  if (field.type === 'boolean') return value ? 'Sí' : 'No';
  if (field.type === 'multiselect' && Array.isArray(value)) return value.join(', ');
  if (field.type === 'date' && typeof value === 'string') {
    return new Date(value + 'T00:00:00').toLocaleDateString('es-AR');
  }
  if (field.type === 'datetime' && typeof value === 'string') {
    return new Date(value).toLocaleString('es-AR');
  }
  return String(value);
}

export default function RegisterEntriesPage() {
  const params = useParams<{ schemaId: string }>();
  const schemaId = params.schemaId;
  const { user } = useAuth();
  const orgId = user?.organization_id;

  const [schema, setSchema] = useState<CustomRegisterSchema | null>(null);
  const [entries, setEntries] = useState<CustomRegisterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // New entry dialog
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Entry detail panel
  const [selectedEntry, setSelectedEntry] = useState<CustomRegisterEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!orgId || !schemaId) return;
    try {
      setLoading(true);
      setError(null);
      const [schemaRes, entriesRes] = await Promise.all([
        fetch(`/api/registers/schemas/${schemaId}?organization_id=${encodeURIComponent(orgId)}`, { cache: 'no-store' }),
        fetch(`/api/registers/entries?schema_id=${schemaId}&organization_id=${encodeURIComponent(orgId)}`, { cache: 'no-store' }),
      ]);
      const schemaJson = await schemaRes.json() as { success: boolean; data: CustomRegisterSchema; error?: string };
      const entriesJson = await entriesRes.json() as { success: boolean; data: CustomRegisterEntry[]; error?: string };
      if (!schemaRes.ok || !schemaJson.success) throw new Error(schemaJson.error ?? 'Error al cargar schema');
      if (!entriesRes.ok || !entriesJson.success) throw new Error(entriesJson.error ?? 'Error al cargar entradas');
      setSchema(schemaJson.data);
      setEntries(entriesJson.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [orgId, schemaId]);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleCreateEntry = async (payload: { stage_id: string; title?: string; data: Record<string, unknown> }) => {
    setFormLoading(true);
    try {
      const res = await fetch(`/api/registers/entries?organization_id=${encodeURIComponent(orgId ?? '')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, schema_id: schemaId }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Error al crear');
      setFormOpen(false);
      await loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditEntry = async (payload: { stage_id: string; title?: string; data: Record<string, unknown> }) => {
    if (!selectedEntry) return;
    setEditLoading(true);
    try {
      const res = await fetch(
        `/api/registers/entries/${selectedEntry.id}?organization_id=${encodeURIComponent(orgId ?? '')}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: payload.title, data: payload.data }),
        }
      );
      const json = await res.json() as { success: boolean; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Error al actualizar');
      setEditingEntry(false);
      // Reload and refresh selected entry
      const updated = await fetch(
        `/api/registers/entries/${selectedEntry.id}?organization_id=${encodeURIComponent(orgId ?? '')}`,
        { cache: 'no-store' }
      );
      const updatedJson = await updated.json() as { success: boolean; data: CustomRegisterEntry };
      if (updatedJson.success) setSelectedEntry(updatedJson.data);
      await loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al actualizar');
    } finally {
      setEditLoading(false);
    }
  };

  const handleMoveEntry = async (entryId: string, stageId: string) => {
    const res = await fetch(
      `/api/registers/entries/${entryId}/stage?organization_id=${encodeURIComponent(orgId ?? '')}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage_id: stageId, schema_id: schemaId }),
      }
    );
    const json = await res.json() as { success: boolean; error?: string };
    if (!res.ok || !json.success) throw new Error(json.error ?? 'Error al mover');
    await loadData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 px-4 py-8 md:px-8">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-800" />
          <div className="h-6 w-72 animate-pulse rounded-lg bg-slate-800" />
          <div className="grid gap-4 md:grid-cols-3 mt-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/50" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !schema) {
    return (
      <div className="min-h-screen bg-slate-950 px-4 py-8 md:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-rose-900/60 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
            {error ?? 'No se encontró el schema'}
          </div>
        </div>
      </div>
    );
  }

  const listFields = [...schema.fields]
    .filter(f => f.visible_in_list !== false)
    .sort((a, b) => a.order - b.order)
    .slice(0, 5);

  const currentStage = (entry: CustomRegisterEntry) =>
    schema.stages.find(s => s.id === entry.stage_id);

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl">

        {/* Breadcrumb + Header */}
        <div className="mb-8">
          <Link
            href="/registros"
            className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Registros
          </Link>

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800">
                  <FileText className="h-5 w-5 text-slate-400" />
                </div>
                <h1 className="text-2xl font-semibold text-slate-100">{schema.name}</h1>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {schema.norma_referencia && (
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${NORMA_COLORS[schema.norma_referencia]}`}>
                    <Tag className="h-3 w-3" />
                    {NORMA_LABELS[schema.norma_referencia]}
                    {schema.clausula_referencia && ` · ${schema.clausula_referencia}`}
                  </span>
                )}
                {schema.description && (
                  <span className="text-xs text-slate-500">{schema.description}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* View toggle (only if has_kanban) */}
              {schema.has_kanban && (
                <div className="flex rounded-lg border border-slate-700 overflow-hidden">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition ${
                      viewMode === 'list'
                        ? 'bg-slate-700 text-slate-100'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <List className="h-3.5 w-3.5" />
                    Lista
                  </button>
                  <button
                    onClick={() => setViewMode('kanban')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition ${
                      viewMode === 'kanban'
                        ? 'bg-slate-700 text-slate-100'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    Kanban
                  </button>
                </div>
              )}

              <Button
                onClick={() => setFormOpen(true)}
                className="bg-emerald-600 text-white hover:bg-emerald-500"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nueva entrada
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        {viewMode === 'kanban' && schema.has_kanban ? (
          <RegisterKanban
            schema={schema}
            entries={entries}
            onMoveEntry={handleMoveEntry}
            onNewEntry={() => setFormOpen(true)}
            onEntryClick={entry => { setSelectedEntry(entry); setEditingEntry(false); }}
          />
        ) : (
          /* List view */
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
                <FileText className="h-10 w-10 text-slate-600" />
                <p className="text-slate-400">No hay entradas aún.</p>
                <Button
                  onClick={() => setFormOpen(true)}
                  variant="outline"
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Crear primera entrada
                </Button>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
                      Título / ID
                    </th>
                    {listFields.map(f => (
                      <th key={f.id} className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500 hidden md:table-cell">
                        {f.label}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
                      Etapa
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {entries.map(entry => {
                    const stage = currentStage(entry);
                    return (
                      <tr
                        key={entry.id}
                        className="group hover:bg-slate-800/40 transition-colors cursor-pointer"
                        onClick={() => { setSelectedEntry(entry); setEditingEntry(false); }}
                      >
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-200">
                            {entry.title ?? entry.id.slice(-8)}
                          </span>
                          <span className="ml-2 font-mono text-xs text-slate-600 hidden lg:inline">
                            #{entry.id.slice(-6)}
                          </span>
                        </td>
                        {listFields.map(f => (
                          <td key={f.id} className="px-4 py-3 text-slate-400 hidden md:table-cell max-w-[160px] truncate">
                            {formatFieldValue(f, entry.data[f.id])}
                          </td>
                        ))}
                        <td className="px-4 py-3">
                          {stage && (
                            <span
                              className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                              style={{
                                backgroundColor: stage.color + '26',
                                color: stage.color,
                                border: `1px solid ${stage.color}4d`,
                              }}
                            >
                              {stage.label}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={e => { e.stopPropagation(); setSelectedEntry(entry); setEditingEntry(false); }}
                            className="rounded-lg p-1 text-slate-500 opacity-0 group-hover:opacity-100 hover:text-slate-200 transition"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* New Entry Dialog */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">Nueva entrada</h2>
              <button
                onClick={() => setFormOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <DynamicRegisterForm
              schema={schema}
              onSubmit={handleCreateEntry}
              onCancel={() => setFormOpen(false)}
              loading={formLoading}
            />
          </div>
        </div>
      )}

      {/* Entry Detail Panel */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="w-full max-w-md border-l border-slate-700 bg-slate-900 flex flex-col h-full overflow-hidden shadow-2xl">
            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 shrink-0">
              <div>
                <p className="font-semibold text-slate-100">
                  {selectedEntry.title ?? `Entrada #${selectedEntry.id.slice(-6)}`}
                </p>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedEntry.id}</p>
              </div>
              <div className="flex items-center gap-1">
                {!editingEntry && (
                  <button
                    onClick={() => setEditingEntry(true)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => { setSelectedEntry(null); setEditingEntry(false); }}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {editingEntry ? (
                /* Edit form */
                <div className="p-5">
                  <DynamicRegisterForm
                    schema={schema}
                    initialData={selectedEntry.data}
                    initialTitle={selectedEntry.title ?? ''}
                    defaultStageId={selectedEntry.stage_id}
                    onSubmit={handleEditEntry}
                    onCancel={() => setEditingEntry(false)}
                    loading={editLoading}
                  />
                </div>
              ) : (
                /* View mode */
                <>
                  {/* Stage badge */}
                  <div className="px-5 pt-4 pb-2">
                    {(() => {
                      const stage = currentStage(selectedEntry);
                      return stage ? (
                        <span
                          className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                          style={{
                            backgroundColor: stage.color + '26',
                            color: stage.color,
                            border: `1px solid ${stage.color}4d`,
                          }}
                        >
                          {stage.label}
                        </span>
                      ) : null;
                    })()}
                  </div>

                  {/* Field values */}
                  <div className="px-5 pb-4 space-y-3">
                    {[...schema.fields].sort((a, b) => a.order - b.order).map(field => (
                      <div key={field.id}>
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-0.5">
                          {field.label}
                        </p>
                        <p className="text-sm text-slate-200">
                          {formatFieldValue(field, selectedEntry.data[field.id])}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Audit trail */}
                  <div className="border-t border-slate-800 px-5 pt-4 pb-6">
                    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
                      <Clock className="h-3.5 w-3.5" />
                      Historial
                    </div>
                    <AuditTrailPanel events={selectedEntry.audit_trail ?? []} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
