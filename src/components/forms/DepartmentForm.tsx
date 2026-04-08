'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import {
  DepartmentFormData,
  departmentFormSchema,
} from '@/lib/validations/rrhh';
import { Department } from '@/types/rrhh';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

interface DepartmentFormProps {
  initialData?: DepartmentFormData & { id?: string };
  onSubmit: (data: DepartmentFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function DepartmentForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: DepartmentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: initialData || {
      nombre: '',
      descripcion: '',
      parent_id: '',
      is_active: true,
    },
  });

  const isActive = watch('is_active');

  // Cargar departamentos para el dropdown de padre
  useEffect(() => {
    const loadDepartments = async () => {
      if (!user?.organization_id) return;

      try {
        setLoadingDepts(true);
        const res = await fetch(
          `/api/rrhh/departments?organization_id=${user.organization_id}&limit=100`
        );
        if (res.ok) {
          const data = await res.json();
          // Filtrar el departamento actual si está editando (evitar que sea su propio padre)
          const depts = (data.data || data).filter(
            (d: Department) => d.id !== initialData?.id
          );
          setDepartments(depts);
        }
      } catch (error) {
        console.error('Error loading departments:', error);
      } finally {
        setLoadingDepts(false);
      }
    };
    loadDepartments();
  }, [user?.organization_id, initialData?.id]);

  const handleFormSubmit = async (data: DepartmentFormData) => {
    setIsSubmitting(true);
    try {
      // Si parent_id está vacío, no lo enviamos
      const cleanData = {
        ...data,
        parent_id: data.parent_id || undefined,
      };
      await onSubmit(cleanData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre del Departamento *</Label>
        <Input
          id="nombre"
          {...register('nombre')}
          placeholder="Ingrese el nombre del departamento"
          className={errors.nombre ? 'border-red-500' : ''}
        />
        {errors.nombre && (
          <p className="text-sm text-red-500">{errors.nombre.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="descripcion">Descripción</Label>
        <Textarea
          id="descripcion"
          {...register('descripcion')}
          placeholder="Ingrese una descripción del departamento"
          rows={3}
          className={errors.descripcion ? 'border-red-500' : ''}
        />
        {errors.descripcion && (
          <p className="text-sm text-red-500">{errors.descripcion.message}</p>
        )}
      </div>

      {/* Departamento Padre (opcional) */}
      <div className="space-y-2">
        <Label htmlFor="parent_id">Depende de (opcional)</Label>
        <select
          id="parent_id"
          {...register('parent_id')}
          disabled={loadingDepts}
          className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-emerald-500 focus:border-emerald-500 bg-white"
        >
          <option value="">
            {loadingDepts ? 'Cargando...' : 'No depende de ningún departamento'}
          </option>
          {departments.map(dept => (
            <option key={dept.id} value={dept.id}>
              {dept.nombre}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-500">
          Si este departamento es un sub-departamento, seleccione el
          departamento padre
        </p>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="is_active"
          checked={isActive}
          onCheckedChange={checked => setValue('is_active', checked as boolean)}
        />
        <Label htmlFor="is_active">Departamento activo</Label>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting || isLoading}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
        >
          {isSubmitting || isLoading ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </form>
  );
}
