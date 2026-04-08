'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ProcessRecordFormData,
  processRecordSchema,
} from '@/lib/validations/procesos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProcessRecord } from '@/types/procesos';

interface ProcessRecordFormProps {
  processId: string;
  initialData?: ProcessRecord | null;
  onSubmit: (data: ProcessRecordFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ProcessRecordForm({
  processId,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: ProcessRecordFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ProcessRecordFormData>({
    resolver: zodResolver(processRecordSchema),
    defaultValues: initialData
      ? {
          processId: initialData.processId,
          titulo: initialData.titulo,
          descripcion: initialData.descripcion,
          estado: initialData.estado,
          responsable: initialData.responsable,
          fecha_vencimiento: initialData.fecha_vencimiento,
          prioridad: initialData.prioridad,
        }
      : {
          processId: processId,
          titulo: '',
          descripcion: '',
          estado: 'pendiente' as const,
          responsable: '',
          fecha_vencimiento: new Date(),
          prioridad: 'media' as const,
        },
  });

  const handleFormSubmit = async (data: ProcessRecordFormData) => {
    try {
      await onSubmit(data);
      reset();
    } catch (error) {
      console.error('Error al enviar formulario:', error);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {initialData
            ? 'Editar Registro de Proceso'
            : 'Nuevo Registro de Proceso'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              {...register('titulo')}
              placeholder="Título del registro"
              className={errors.titulo ? 'border-red-500' : ''}
            />
            {errors.titulo && (
              <p className="text-red-500 text-sm mt-1">
                {errors.titulo.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="descripcion">Descripción *</Label>
            <Textarea
              id="descripcion"
              {...register('descripcion')}
              placeholder="Descripción detallada del registro"
              rows={4}
              className={errors.descripcion ? 'border-red-500' : ''}
            />
            {errors.descripcion && (
              <p className="text-red-500 text-sm mt-1">
                {errors.descripcion.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="responsable">Responsable *</Label>
              <Input
                id="responsable"
                {...register('responsable')}
                placeholder="Persona responsable"
                className={errors.responsable ? 'border-red-500' : ''}
              />
              {errors.responsable && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.responsable.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="prioridad">Prioridad</Label>
              <select
                id="prioridad"
                {...register('prioridad')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="estado">Estado</Label>
              <select
                id="estado"
                {...register('estado')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pendiente">Pendiente</option>
                <option value="en-progreso">En Progreso</option>
                <option value="completado">Completado</option>
              </select>
            </div>

            <div>
              <Label htmlFor="fecha_vencimiento">Fecha de Vencimiento *</Label>
              <Input
                id="fecha_vencimiento"
                type="date"
                {...register('fecha_vencimiento', {
                  valueAsDate: true,
                })}
                className={errors.fecha_vencimiento ? 'border-red-500' : ''}
              />
              {errors.fecha_vencimiento && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.fecha_vencimiento.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? 'Guardando...'
                : initialData
                  ? 'Actualizar'
                  : 'Crear'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
