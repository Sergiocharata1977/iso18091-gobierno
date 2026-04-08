'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import type { ChangeEvent } from 'react';
import type {
  FieldArrayWithId,
  UseFieldArrayReturn,
  FieldError,
  UseFormRegister,
  UseFormSetValue,
} from 'react-hook-form';

export interface CriterioFormValues {
  nombre: string;
  slug?: string;
  tipo: 'select' | 'multiselect';
  aplica_a_clientes: boolean;
  aplica_a_oportunidades: boolean;
  opciones: {
    id: string;
    label: string;
    slug: string;
    color?: string;
    orden: number;
  }[];
}

interface OpcionesEditorProps {
  fields: FieldArrayWithId<CriterioFormValues, 'opciones', 'fieldId'>[];
  register: UseFormRegister<CriterioFormValues>;
  setValue: UseFormSetValue<CriterioFormValues>;
  append: UseFieldArrayReturn<CriterioFormValues, 'opciones', 'fieldId'>['append'];
  remove: UseFieldArrayReturn<CriterioFormValues, 'opciones', 'fieldId'>['remove'];
  move: UseFieldArrayReturn<CriterioFormValues, 'opciones', 'fieldId'>['move'];
  errors?: Array<{
    label?: FieldError;
    color?: FieldError;
  }>;
  disabled?: boolean;
}

const DEFAULT_COLOR = '#71717a';

function normalizeSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function createOption(index: number) {
  return {
    id: `tmp_${Date.now()}_${index}`,
    label: '',
    slug: '',
    color: DEFAULT_COLOR,
    orden: index,
  };
}

export function OpcionesEditor({
  fields,
  register,
  setValue,
  append,
  remove,
  move,
  errors,
  disabled = false,
}: OpcionesEditorProps) {
  const handleAdd = () => {
    append(createOption(fields.length));
  };

  const syncOrder = (from: number, to: number) => {
    move(from, to);

    const start = Math.min(from, to);
    const end = Math.max(from, to);
    for (let index = start; index <= end; index += 1) {
      setValue(`opciones.${index}.orden`, index, {
        shouldDirty: true,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium text-zinc-900">Opciones</Label>
          <p className="mt-1 text-xs text-zinc-500">
            Definí etiquetas, color y orden de visualización.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={disabled}
          className="border-zinc-300 text-zinc-700 hover:bg-zinc-50"
        >
          <Plus className="mr-2 h-4 w-4" />
          Agregar opción
        </Button>
      </div>

      <div className="space-y-3">
        {fields.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
            Agregá al menos una opción para este criterio.
          </div>
        )}

        {fields.map((field, index) => {
          const optionErrors = errors?.[index];
          const colorValue = field.color || DEFAULT_COLOR;

          return (
            <div
              key={field.fieldId}
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="mt-2 flex items-center text-zinc-400">
                  <GripVertical className="h-4 w-4" />
                </div>

                <div className="grid flex-1 gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)_auto_auto]">
                  <div className="space-y-2">
                    <Label htmlFor={`opcion_label_${index}`}>Etiqueta</Label>
                    <Input
                      id={`opcion_label_${index}`}
                      {...register(`opciones.${index}.label`, {
                        onChange: (event: ChangeEvent<HTMLInputElement>) => {
                          setValue(
                            `opciones.${index}.slug`,
                            normalizeSlug(event.target.value),
                            { shouldDirty: true }
                          );
                        },
                      })}
                      placeholder="Ej: Premium"
                      disabled={disabled}
                      className={cn(
                        'border-zinc-200',
                        optionErrors?.label && 'border-red-500'
                      )}
                    />
                    {optionErrors?.label && (
                      <p className="text-xs text-red-600">
                        {String(optionErrors.label.message)}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`opcion_color_${index}`}>Color</Label>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-10 w-10 rounded-md border border-zinc-200"
                        style={{ backgroundColor: colorValue }}
                      />
                      <Input
                        id={`opcion_color_${index}`}
                        {...register(`opciones.${index}.color`)}
                        placeholder="#71717a"
                        disabled={disabled}
                        className={cn(
                          'border-zinc-200 uppercase',
                          optionErrors?.color && 'border-red-500'
                        )}
                      />
                    </div>
                    {optionErrors?.color && (
                      <p className="text-xs text-red-600">
                        {String(optionErrors.color.message)}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => syncOrder(index, index - 1)}
                      disabled={disabled || index === 0}
                      className="mt-7 border-zinc-200 text-zinc-700"
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => syncOrder(index, index + 1)}
                      disabled={disabled || index === fields.length - 1}
                      className="mt-7 border-zinc-200 text-zinc-700"
                    >
                      ↓
                    </Button>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => remove(index)}
                      disabled={disabled}
                      className="mt-7 border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
