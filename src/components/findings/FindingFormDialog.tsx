'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SectionHeader } from '@/components/ui/SectionHeader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { FindingFormSchema } from '@/lib/validations/findings';
import type { FindingFormData, FindingSourceType } from '@/types/findings';
import { FINDING_SOURCE_TYPE_LABELS } from '@/types/findings';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

interface FindingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialData?: Partial<FindingFormData>;
  id?: string; // Add ID for editing
}

export function FindingFormDialog({
  open,
  onOpenChange,
  onSuccess,
  initialData,
  id,
}: FindingFormDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<FindingFormData>({
    resolver: zodResolver(FindingFormSchema),
    defaultValues: {
      sourceType: initialData?.sourceType || 'auditoria',
      normPoints: initialData?.normPoints || [],
      organization_id: initialData?.organization_id || '',
      name: initialData?.name || '',
      description: initialData?.description || '',
      processId: initialData?.processId || '',
      processName: initialData?.processName || '',
      sourceName: initialData?.sourceName || '',
      sourceId: initialData?.sourceId || '',
    },
  });

  const sourceType = watch('sourceType');

  const onSubmit = async (data: FindingFormData) => {
    try {
      setIsSubmitting(true);

      const url = id ? `/api/findings/${id}` : '/api/findings';
      const method = id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          userName: 'Usuario',
        }),
      });

      if (!response.ok) {
        throw new Error(`Error al ${id ? 'actualizar' : 'crear'} hallazgo`);
      }

      const result = await response.json();

      toast({
        title: `Hallazgo ${id ? 'actualizado' : 'creado'}`,
        description: `El hallazgo se ha ${id ? 'actualizado' : 'creado'} exitosamente`,
      });
      reset();
      onOpenChange(false);

      if (onSuccess) {
        onSuccess();
      }

      if (!id && result.id) {
        router.push(`/hallazgos/${result.id}`);
      }
    } catch (error) {
      console.error(`Error ${id ? 'updating' : 'creating'} finding:`, error);
      toast({
        title: 'Error',
        description: `Error al ${id ? 'actualizar' : 'crear'} el hallazgo`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{id ? 'Editar Hallazgo' : 'Nuevo Hallazgo'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6">
          {/* Información General */}
          <div className="space-y-4">
            <SectionHeader
              title="Información General"
              description="Detalles básicos del hallazgo"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sourceType">Fuente *</Label>
                <Select
                  value={sourceType}
                  onValueChange={value =>
                    setValue('sourceType', value as FindingSourceType)
                  }
                >
                  <SelectTrigger className="bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Seleccionar fuente" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FINDING_SOURCE_TYPE_LABELS).map(
                      ([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sourceName">Nombre de la Fuente</Label>
                <Input
                  id="sourceName"
                  {...register('sourceName')}
                  placeholder="Ej: AUD-2025-00001"
                  className="bg-slate-50 border-slate-200 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Nombre del hallazgo"
                className="bg-slate-50 border-slate-200 focus:ring-emerald-500 focus:border-emerald-500"
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción *</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Descripción detallada del hallazgo"
                rows={4}
                className="bg-slate-50 border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
              />
              {errors.description && (
                <p className="text-sm text-red-600">
                  {errors.description.message}
                </p>
              )}
            </div>
          </div>

          {/* Contexto */}
          <div className="space-y-4">
            <SectionHeader
              title="Contexto del Proceso"
              description="Información del proceso relacionado"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="processId">ID Proceso *</Label>
                <Input
                  id="processId"
                  {...register('processId')}
                  placeholder="ID del proceso"
                  className="bg-slate-50 border-slate-200 focus:ring-emerald-500 focus:border-emerald-500"
                />
                {errors.processId && (
                  <p className="text-sm text-red-600">
                    {errors.processId.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="processName">Nombre del Proceso *</Label>
                <Input
                  id="processName"
                  {...register('processName')}
                  placeholder="Nombre del proceso"
                  className="bg-slate-50 border-slate-200 focus:ring-emerald-500 focus:border-emerald-500"
                />
                {errors.processName && (
                  <p className="text-sm text-red-600">
                    {errors.processName.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              {isSubmitting
                ? id
                  ? 'Actualizando...'
                  : 'Creando...'
                : id
                  ? 'Actualizar Hallazgo'
                  : 'Crear Hallazgo'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
