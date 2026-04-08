'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { CustomRegisterSchema, RegisterFieldSchema } from '@/types/registers';

interface DynamicRegisterFormProps {
  schema: CustomRegisterSchema;
  initialData?: Record<string, unknown>;
  initialTitle?: string;
  defaultStageId?: string;
  onSubmit: (payload: { stage_id: string; title?: string; data: Record<string, unknown> }) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function DynamicRegisterForm({
  schema,
  initialData = {},
  initialTitle = '',
  defaultStageId,
  onSubmit,
  onCancel,
  loading = false,
}: DynamicRegisterFormProps) {
  const firstStage = [...schema.stages].sort((a, b) => a.order - b.order)[0];
  const [stageId, setStageId] = useState<string>(defaultStageId ?? firstStage?.id ?? '');
  const [title, setTitle] = useState<string>(initialTitle);
  const [data, setData] = useState<Record<string, unknown>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setField = (id: string, value: unknown) => {
    setData(prev => ({ ...prev, [id]: value }));
    if (errors[id]) setErrors(prev => { const next = { ...prev }; delete next[id]; return next; });
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    for (const field of schema.fields) {
      if (field.required) {
        const val = data[field.id];
        if (val === undefined || val === null || val === '') {
          errs[field.id] = `${field.label} es requerido`;
        }
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({ stage_id: stageId, title: title || undefined, data });
  };

  const renderField = (field: RegisterFieldSchema) => {
    const value = data[field.id];
    const err = errors[field.id];

    switch (field.type) {
      case 'text':
        return (
          <Input
            value={String(value ?? '')}
            placeholder={field.placeholder}
            onChange={e => setField(field.id, e.target.value)}
            className="border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-600"
          />
        );
      case 'textarea':
        return (
          <Textarea
            value={String(value ?? '')}
            placeholder={field.placeholder}
            onChange={e => setField(field.id, e.target.value)}
            rows={3}
            className="border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-600 resize-none"
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={String(value ?? '')}
            onChange={e => setField(field.id, e.target.valueAsNumber)}
            className="border-slate-700 bg-slate-900 text-slate-100"
          />
        );
      case 'date':
        return (
          <Input
            type="date"
            value={String(value ?? '')}
            onChange={e => setField(field.id, e.target.value)}
            className="border-slate-700 bg-slate-900 text-slate-100"
          />
        );
      case 'datetime':
        return (
          <Input
            type="datetime-local"
            value={String(value ?? '')}
            onChange={e => setField(field.id, e.target.value)}
            className="border-slate-700 bg-slate-900 text-slate-100"
          />
        );
      case 'boolean':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={e => setField(field.id, e.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-900 accent-emerald-500"
            />
            <span className="text-sm text-slate-300">{field.label}</span>
          </label>
        );
      case 'select':
        return (
          <select
            value={String(value ?? '')}
            onChange={e => setField(field.id, e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">Seleccionar…</option>
            {(field.options ?? []).map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      case 'multiselect': {
        const selected = Array.isArray(value) ? (value as string[]) : [];
        return (
          <div className="flex flex-wrap gap-2">
            {(field.options ?? []).map(opt => {
              const isSelected = selected.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    const next = isSelected
                      ? selected.filter(s => s !== opt)
                      : [...selected, opt];
                    setField(field.id, next);
                  }}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-900/40 text-emerald-300'
                      : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        );
      }
      default:
        return (
          <Input
            value={String(value ?? '')}
            onChange={e => setField(field.id, e.target.value)}
            className="border-slate-700 bg-slate-900 text-slate-100"
          />
        );
    }
  };

  const sortedFields = [...schema.fields].sort((a, b) => a.order - b.order);

  return (
    <form onSubmit={e => void handleSubmit(e)} className="space-y-5">
      {/* Título (opcional) */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Título (opcional)
        </Label>
        <Input
          value={title}
          placeholder="Título descriptivo de la entrada…"
          onChange={e => setTitle(e.target.value)}
          className="border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-600"
        />
      </div>

      {/* Etapa */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Etapa inicial
        </Label>
        <select
          value={stageId}
          onChange={e => setStageId(e.target.value)}
          className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
        >
          {[...schema.stages]
            .sort((a, b) => a.order - b.order)
            .filter(s => !s.locked)
            .map(s => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
        </select>
      </div>

      {/* Campos dinámicos */}
      {sortedFields.map(field => (
        <div key={field.id} className="space-y-1.5">
          {field.type !== 'boolean' && (
            <Label className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              {field.label}
              {field.required && <span className="ml-1 text-rose-400">*</span>}
            </Label>
          )}
          {renderField(field)}
          {errors[field.id] && (
            <p className="text-xs text-rose-400">{errors[field.id]}</p>
          )}
        </div>
      ))}

      {/* Acciones */}
      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="border-slate-700 text-slate-300 hover:bg-slate-800"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="bg-emerald-600 text-white hover:bg-emerald-500"
        >
          {loading ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </form>
  );
}
