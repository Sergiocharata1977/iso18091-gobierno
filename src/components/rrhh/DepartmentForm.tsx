'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DepartmentFormData,
  departmentFormSchema,
} from '@/lib/validations/rrhh';
import { Department } from '@/types/rrhh';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

interface DepartmentFormProps {
  initialData?: Department | null;
  onSubmit: (data: DepartmentFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function DepartmentForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: DepartmentFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: initialData
      ? {
          nombre: initialData.nombre,
          descripcion: initialData.descripcion || '',
          is_active: initialData.is_active,
        }
      : {
          nombre: '',
          descripcion: '',
          is_active: true,
        },
  });

  const handleFormSubmit = async (data: DepartmentFormData) => {
    try {
      await onSubmit(data);
      reset();
    } catch (error) {
      console.error('Error al enviar formulario:', error);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto border-0 shadow-none sm:shadow-sm">
      <CardHeader>
        <CardTitle>
          {initialData ? 'Editar Departamento' : 'Nuevo Departamento'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre"
              {...register('nombre')}
              placeholder="Nombre del departamento"
              className={
                errors.nombre
                  ? 'border-red-500 focus:ring-red-500'
                  : 'focus:ring-emerald-500 focus:border-emerald-500'
              }
            />
            {errors.nombre && (
              <p className="text-red-500 text-sm mt-1">
                {errors.nombre.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              {...register('descripcion')}
              placeholder="Descripción del departamento"
              rows={5}
              className="resize-none focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_active"
              {...register('is_active')}
              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <Label htmlFor="is_active">Departamento activo</Label>
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
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-emerald-600 hover:bg-emerald-700 shadow-sm"
            >
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
