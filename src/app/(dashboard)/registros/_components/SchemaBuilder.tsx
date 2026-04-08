'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import type {
  CustomRegisterSchema, RegisterFieldSchema, RegisterStage, RegisterFieldType, NormaISOReg,
} from '@/types/registers';
import { COLORES_DISPONIBLES } from '@/lib/compras/defaultEstados';

// Etapas por defecto para un registro nuevo
const DEFAULT_STAGES: RegisterStage[] = [
  { id: 'pendiente',    label: 'Pendiente',    color: '#6b7280', order: 1 },
  { id: 'en_proceso',   label: 'En proceso',   color: '#3b82f6', order: 2 },
  { id: 'completado',   label: 'Completado',   color: '#22c55e', order: 3, locked: true },
  { id: 'cancelado',    label: 'Cancelado',    color: '#ef4444', order: 4, locked: true },
];

const FIELD_TYPE_LABELS: Record<RegisterFieldType, string> = {
  text:        'Texto',
  textarea:    'Texto largo',
  number:      'Número',
  date:        'Fecha',
  datetime:    'Fecha y hora',
  boolean:     'Sí / No',
  select:      'Selección única',
  multiselect: 'Selección múltiple',
  user:        'Usuario',
  file:        'Archivo',
  relation:    'Relación',
};

const NORMA_OPTIONS: { value: NormaISOReg; label: string }[] = [
  { value: 'ISO_9001',  label: 'ISO 9001 — Calidad' },
  { value: 'ISO_14001', label: 'ISO 14001 — Ambiente' },
  { value: 'ISO_45001', label: 'ISO 45001 — SST' },
  { value: 'ISO_27001', label: 'ISO 27001 — SGSI' },
  { value: 'ISO_18091', label: 'ISO 18091 — Gobierno' },
  { value: 'CUSTOM',    label: 'Personalizado' },
];

// Map colores tailwind → hex para preview
const COLOR_HEX: Record<string, string> = {
  slate: '#6b7280', blue: '#3b82f6', indigo: '#6366f1', violet: '#8b5cf6',
  amber: '#f59e0b', emerald: '#10b981', green: '#22c55e', cyan: '#06b6d4', rose: '#ef4444',
};

type Step = 'info' | 'fields' | 'stages';

function makeField(order: number): RegisterFieldSchema {
  return { id: crypto.randomUUID(), label: '', type: 'text', required: false, order, visible_in_list: true, visible_in_kanban: true };
}

function makeStage(order: number): RegisterStage {
  return { id: crypto.randomUUID(), label: '', color: '#6b7280', order };
}

interface SchemaBuilderProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  schema: CustomRegisterSchema | null;
  organizationId: string;
}

export function SchemaBuilder({ open, onClose, onSaved, schema, organizationId }: SchemaBuilderProps) {
  const isEdit = Boolean(schema);
  const [step, setStep] = useState<Step>('info');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — Info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [norma, setNorma] = useState<NormaISOReg | ''>('');
  const [clausula, setClausula] = useState('');
  const [hasKanban, setHasKanban] = useState(false);

  // Step 2 — Fields
  const [fields, setFields] = useState<RegisterFieldSchema[]>([makeField(1)]);
  const [fieldOptions, setFieldOptions] = useState<Record<string, string>>({});

  // Step 3 — Stages
  const [stages, setStages] = useState<RegisterStage[]>(DEFAULT_STAGES);

  // Load existing schema when editing
  useEffect(() => {
    if (open && schema) {
      setName(schema.name);
      setDescription(schema.description ?? '');
      setNorma(schema.norma_referencia ?? '');
      setClausula(schema.clausula_referencia ?? '');
      setHasKanban(schema.has_kanban);
      setFields(schema.fields.length > 0 ? schema.fields : [makeField(1)]);
      setFieldOptions(
        schema.fields.reduce<Record<string, string>>((acc, f) => {
          if (f.options) acc[f.id] = f.options.join('\n');
          return acc;
        }, {})
      );
      setStages(schema.stages.length > 0 ? schema.stages : DEFAULT_STAGES);
    } else if (open && !schema) {
      setName(''); setDescription(''); setNorma(''); setClausula('');
      setHasKanban(false);
      setFields([makeField(1)]);
      setFieldOptions({});
      setStages(DEFAULT_STAGES.map(s => ({ ...s })));
    }
    setStep('info');
    setError(null);
  }, [open, schema]);

  // Fields helpers
  const addField = () => setFields(prev => [...prev, makeField(prev.length + 1)]);
  const removeField = (id: string) => setFields(prev => prev.filter(f => f.id !== id));
  const updateField = (id: string, patch: Partial<RegisterFieldSchema>) =>
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));
  const moveField = (index: number, dir: -1 | 1) =>
    setFields(prev => {
      const next = [...prev];
      const t = index + dir;
      if (t < 0 || t >= next.length) return prev;
      [next[index], next[t]] = [next[t], next[index]];
      return next.map((f, i) => ({ ...f, order: i + 1 }));
    });

  // Stages helpers
  const addStage = () => setStages(prev => [...prev, makeStage(prev.length + 1)]);
  const removeStage = (id: string) => setStages(prev => prev.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i + 1 })));
  const updateStage = (id: string, patch: Partial<RegisterStage>) =>
    setStages(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  const moveStage = (index: number, dir: -1 | 1) =>
    setStages(prev => {
      const next = [...prev];
      const t = index + dir;
      if (t < 0 || t >= next.length) return prev;
      [next[index], next[t]] = [next[t], next[index]];
      return next.map((s, i) => ({ ...s, order: i + 1 }));
    });

  const handleSave = async () => {
    if (!name.trim()) { setError('El nombre es requerido'); setStep('info'); return; }
    if (fields.length === 0) { setError('Agrega al menos un campo'); setStep('fields'); return; }
    if (stages.length === 0) { setError('Agrega al menos una etapa'); setStep('stages'); return; }

    setSaving(true);
    setError(null);

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      norma_referencia: norma || undefined,
      clausula_referencia: clausula.trim() || undefined,
      has_kanban: hasKanban,
      fields: fields.map(f => ({
        ...f,
        options: fieldOptions[f.id]
          ? fieldOptions[f.id].split('\n').map(s => s.trim()).filter(Boolean)
          : undefined,
      })),
      stages,
    };

    try {
      const url = isEdit
        ? `/api/registers/schemas/${schema!.id}?organization_id=${encodeURIComponent(organizationId)}`
        : `/api/registers/schemas?organization_id=${encodeURIComponent(organizationId)}`;
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Error al guardar');
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const STEPS: Step[] = ['info', 'fields', 'stages'];
  const stepLabels: Record<Step, string> = { info: '1. Info', fields: '2. Campos', stages: '3. Etapas' };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-700 text-slate-100 max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-slate-100">
            {isEdit ? 'Editar registro' : 'Nuevo registro'}
          </DialogTitle>
        </DialogHeader>

        {/* Step tabs */}
        <div className="flex gap-1 border-b border-slate-800 pb-3">
          {STEPS.map(s => (
            <button
              key={s}
              onClick={() => setStep(s)}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${
                step === s
                  ? 'bg-slate-700 text-slate-100 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {stepLabels[s]}
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-lg border border-rose-800 bg-rose-950/40 px-3 py-2 text-sm text-rose-300">
            {error}
          </div>
        )}

        <div className="overflow-y-auto flex-1 pr-1">

          {/* STEP 1 — Info */}
          {step === 'info' && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-widest text-slate-500">Nombre *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="ej: Control de Residuos" className="border-slate-700 bg-slate-800 text-slate-100" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-widest text-slate-500">Descripción</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="border-slate-700 bg-slate-800 text-slate-100 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-widest text-slate-500">Norma de referencia</Label>
                  <select value={norma} onChange={e => setNorma(e.target.value as NormaISOReg)} className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100">
                    <option value="">Sin norma</option>
                    {NORMA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-widest text-slate-500">Cláusula</Label>
                  <Input value={clausula} onChange={e => setClausula(e.target.value)} placeholder="ej: 8.1" className="border-slate-700 bg-slate-800 text-slate-100" />
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/40 p-4">
                <input type="checkbox" id="hasKanban" checked={hasKanban} onChange={e => setHasKanban(e.target.checked)} className="h-4 w-4 accent-emerald-500" />
                <label htmlFor="hasKanban" className="cursor-pointer">
                  <p className="text-sm font-medium text-slate-200">Habilitar vista Kanban</p>
                  <p className="text-xs text-slate-500">Permite arrastrar entradas entre etapas</p>
                </label>
              </div>
            </div>
          )}

          {/* STEP 2 — Campos */}
          {step === 'fields' && (
            <div className="space-y-3 py-2">
              {fields.map((field, index) => (
                <div key={field.id} className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-slate-600" />
                    <Input
                      value={field.label}
                      onChange={e => updateField(field.id, { label: e.target.value })}
                      placeholder="Nombre del campo"
                      className="flex-1 border-slate-700 bg-slate-900 text-slate-100 h-8 text-sm"
                    />
                    <select
                      value={field.type}
                      onChange={e => updateField(field.id, { type: e.target.value as RegisterFieldType })}
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200"
                    >
                      {Object.entries(FIELD_TYPE_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                    <div className="flex gap-1">
                      <button onClick={() => moveField(index, -1)} disabled={index === 0} className="rounded p-1 text-slate-500 hover:text-slate-200 disabled:opacity-30">
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => moveField(index, 1)} disabled={index === fields.length - 1} className="rounded p-1 text-slate-500 hover:text-slate-200 disabled:opacity-30">
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => removeField(field.id)} className="rounded p-1 text-slate-500 hover:text-rose-400">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {(field.type === 'select' || field.type === 'multiselect') && (
                    <Textarea
                      value={fieldOptions[field.id] ?? ''}
                      onChange={e => setFieldOptions(prev => ({ ...prev, [field.id]: e.target.value }))}
                      placeholder="Una opción por línea"
                      rows={3}
                      className="border-slate-700 bg-slate-900 text-slate-100 text-xs resize-none"
                    />
                  )}
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={field.required} onChange={e => updateField(field.id, { required: e.target.checked })} className="accent-emerald-500" />
                      Requerido
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={field.visible_in_kanban !== false} onChange={e => updateField(field.id, { visible_in_kanban: e.target.checked })} className="accent-emerald-500" />
                      Visible en kanban
                    </label>
                  </div>
                </div>
              ))}
              <Button onClick={addField} variant="outline" className="w-full border-dashed border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
                <Plus className="mr-2 h-4 w-4" /> Agregar campo
              </Button>
            </div>
          )}

          {/* STEP 3 — Etapas */}
          {step === 'stages' && (
            <div className="space-y-3 py-2">
              {stages.map((stage, index) => (
                <div key={stage.id} className="grid grid-cols-[1fr_200px_auto] gap-3 rounded-xl border border-slate-700 bg-slate-800/50 p-4 items-center">
                  <Input
                    value={stage.label}
                    onChange={e => updateStage(stage.id, { label: e.target.value })}
                    placeholder="Nombre de la etapa"
                    className="border-slate-700 bg-slate-900 text-slate-100"
                  />
                  {/* Color picker */}
                  <div className="flex flex-wrap gap-1.5">
                    {COLORES_DISPONIBLES.map(c => {
                      const hex = COLOR_HEX[c.id] ?? '#6b7280';
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => updateStage(stage.id, { color: hex })}
                          title={c.label}
                          className={`h-5 w-5 rounded-full border-2 transition ${stage.color === hex ? 'border-white scale-110' : 'border-transparent'}`}
                          style={{ background: hex }}
                        />
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-1">
                    <label className="flex items-center gap-1 cursor-pointer text-xs text-slate-400">
                      <input type="checkbox" checked={stage.locked ?? false} onChange={e => updateStage(stage.id, { locked: e.target.checked })} className="accent-amber-500" />
                      Bloqueado
                    </label>
                    <button onClick={() => moveStage(index, -1)} disabled={index === 0} className="rounded p-1 text-slate-500 hover:text-slate-200 disabled:opacity-30">
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => moveStage(index, 1)} disabled={index === stages.length - 1} className="rounded p-1 text-slate-500 hover:text-slate-200 disabled:opacity-30">
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => removeStage(stage.id)} disabled={stage.locked} className="rounded p-1 text-slate-500 hover:text-rose-400 disabled:opacity-30">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              <Button onClick={addStage} variant="outline" className="w-full border-dashed border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
                <Plus className="mr-2 h-4 w-4" /> Agregar etapa
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-slate-800 pt-4 flex items-center justify-between">
          <div className="flex gap-2">
            {step !== 'info' && (
              <Button variant="outline" onClick={() => setStep(step === 'stages' ? 'fields' : 'info')} className="border-slate-700 text-slate-300 hover:bg-slate-800">
                Anterior
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="border-slate-700 text-slate-300 hover:bg-slate-800">
              Cancelar
            </Button>
            {step !== 'stages' ? (
              <Button onClick={() => setStep(step === 'info' ? 'fields' : 'stages')} className="bg-slate-700 text-slate-100 hover:bg-slate-600">
                Siguiente
              </Button>
            ) : (
              <Button onClick={() => void handleSave()} disabled={saving} className="bg-emerald-600 text-white hover:bg-emerald-500">
                {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear registro'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
