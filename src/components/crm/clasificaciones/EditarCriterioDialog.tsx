'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import {
  type FieldError,
  useFieldArray,
  useForm,
} from 'react-hook-form';
import { z } from 'zod';

import type { CriterioClasificacion } from '@/types/crm-clasificacion';
import {
  CriterioFormValues,
  OpcionesEditor,
} from './OpcionesEditor';

interface EditarCriterioDialogProps {
  open: boolean;
  criterio: CriterioClasificacion | null;
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CriterioFormValues) => Promise<void>;
}

const formSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio').max(100),
  tipo: z.enum(['select', 'multiselect']),
  aplica_a_clientes: z.boolean(),
  aplica_a_oportunidades: z.boolean(),
  opciones: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1, 'La etiqueta es obligatoria'),
        slug: z.string(),
        color: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/, 'Usá un color hexadecimal válido')
          .optional(),
        orden: z.number().int().min(0),
      })
    )
    .min(1, 'Agregá al menos una opción'),
}).refine(
  values => values.aplica_a_clientes || values.aplica_a_oportunidades,
  {
    message: 'Seleccioná al menos un destino',
    path: ['aplica_a_clientes'],
  }
);

function normalizeSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function buildDefaultValues(
  criterio: CriterioClasificacion | null
): CriterioFormValues {
  if (!criterio) {
      return {
        nombre: '',
        slug: '',
        tipo: 'select',
        aplica_a_clientes: true,
        aplica_a_oportunidades: false,
      opciones: [
        {
          id: `tmp_${Date.now()}_0`,
          label: '',
          slug: '',
          color: '#71717a',
          orden: 0,
        },
      ],
    };
  }

  return {
    nombre: criterio.nombre,
    slug: criterio.slug,
    tipo: criterio.tipo,
    aplica_a_clientes: criterio.aplica_a_clientes,
    aplica_a_oportunidades: criterio.aplica_a_oportunidades,
    opciones: criterio.opciones.map((opcion, index) => ({
      id: opcion.id,
      label: opcion.label,
      slug: opcion.slug,
      color: opcion.color || '#71717a',
      orden: typeof opcion.orden === 'number' ? opcion.orden : index,
    })),
  };
}

export function EditarCriterioDialog({
  open,
  criterio,
  loading = false,
  onOpenChange,
  onSubmit,
}: EditarCriterioDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CriterioFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: buildDefaultValues(criterio),
  });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'opciones',
    keyName: 'fieldId',
  });

  useEffect(() => {
    if (open) {
      reset(buildDefaultValues(criterio));
    }
  }, [criterio, open, reset]);

  const aplicaClientes = watch('aplica_a_clientes');
  const aplicaOportunidades = watch('aplica_a_oportunidades');
  const tipo = watch('tipo');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto border-zinc-200">
        <DialogHeader>
          <DialogTitle className="text-xl text-zinc-900">
            {criterio ? 'Editar criterio' : 'Nuevo criterio'}
          </DialogTitle>
          <DialogDescription className="text-zinc-500">
            Configurá cómo se clasificarán clientes y oportunidades.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(async values => {
            const normalized = {
              ...values,
              slug: normalizeSlug(values.nombre),
              opciones: values.opciones.map((opcion: CriterioFormValues['opciones'][number], index: number) => ({
                ...opcion,
                slug: normalizeSlug(opcion.label),
                orden: index,
                color: opcion.color || '#71717a',
              })),
            };

            await onSubmit(normalized as CriterioFormValues);
          })}
          className="space-y-6"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="criterio_nombre">Nombre</Label>
              <Input
                id="criterio_nombre"
                {...register('nombre')}
                placeholder="Ej: Zona comercial"
                className={errors.nombre ? 'border-red-500' : 'border-zinc-200'}
              />
              {errors.nombre && (
                <p className="text-sm text-red-600">
                  {errors.nombre.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={tipo}
                onValueChange={value =>
                  setValue('tipo', value as CriterioFormValues['tipo'], {
                    shouldDirty: true,
                  })
                }
                disabled={Boolean(criterio)}
              >
                <SelectTrigger className="border-zinc-200">
                  <SelectValue placeholder="Seleccioná un tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="select">Selección única</SelectItem>
                  <SelectItem value="multiselect">Selección múltiple</SelectItem>
                </SelectContent>
              </Select>
              {criterio && (
                <p className="text-xs text-zinc-500">
                  El tipo no se modifica en edición para respetar la API actual.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Aplica a</Label>
            <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 md:flex-row md:items-center md:gap-6">
              <label className="flex items-center gap-3 text-sm font-medium text-zinc-800">
                <Checkbox
                  checked={aplicaClientes}
                  onCheckedChange={checked =>
                    setValue('aplica_a_clientes', Boolean(checked), {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                />
                Clientes
              </label>
              <label className="flex items-center gap-3 text-sm font-medium text-zinc-800">
                <Checkbox
                  checked={aplicaOportunidades}
                  onCheckedChange={checked =>
                    setValue('aplica_a_oportunidades', Boolean(checked), {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                />
                Oportunidades
              </label>
            </div>
            {(errors.aplica_a_clientes || errors.aplica_a_oportunidades) && (
              <p className="text-sm text-red-600">
                {errors.aplica_a_clientes?.message ||
                  errors.aplica_a_oportunidades?.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <OpcionesEditor
              fields={fields}
              register={register}
              setValue={setValue}
              append={append}
              remove={remove}
              move={move}
              errors={
                errors.opciones as
                  | Array<{
                      label?: FieldError;
                      color?: FieldError;
                    }>
                  | undefined
              }
              disabled={loading}
            />
            {typeof errors.opciones?.message === 'string' && (
              <p className="text-sm text-red-600">{errors.opciones.message}</p>
            )}
          </div>

          <DialogFooter className="gap-2 border-t border-zinc-100 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="border-zinc-300 text-zinc-700 hover:bg-zinc-50"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
