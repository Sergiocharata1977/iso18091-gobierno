'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ProcessDefinitionFormData,
  processDefinitionSchema,
} from '@/lib/validations/procesos';
import { ProcessDefinition } from '@/types/procesos';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';

interface ProcessDefinitionProps {
  initialData?: ProcessDefinition | null;
  onSubmit: (data: ProcessDefinitionFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ProcessDefinitionForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: ProcessDefinitionProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    general: true,
    entradas: false,
    salidas: false,
    controles: false,
    indicadores: false,
    documentos: false,
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<ProcessDefinitionFormData>({
    resolver: zodResolver(processDefinitionSchema),
    defaultValues: initialData
      ? {
          codigo: initialData.codigo,
          nombre: initialData.nombre,
          objetivo: initialData.objetivo,
          alcance: initialData.alcance,
          responsable: initialData.responsable,
          entradas: (initialData.entradas || []).map(e => ({ value: e })),
          salidas: (initialData.salidas || []).map(s => ({ value: s })),
          controles: (initialData.controles || []).map(c => ({ value: c })),
          indicadores: (initialData.indicadores || []).map(i => ({ value: i })),
          documentos: (initialData.documentos || []).map(d => ({ value: d })),
          estado: initialData.estado,
        }
      : {
          codigo: '',
          nombre: '',
          objetivo: '',
          alcance: '',
          responsable: '',
          entradas: [],
          salidas: [],
          controles: [],
          indicadores: [],
          documentos: [],
          estado: 'activo',
        },
  });

  const {
    fields: entradasFields,
    append: appendEntrada,
    remove: removeEntrada,
  } = useFieldArray({
    control,
    name: 'entradas' as const,
  });

  const {
    fields: salidasFields,
    append: appendSalida,
    remove: removeSalida,
  } = useFieldArray({
    control,
    name: 'salidas' as const,
  });

  const {
    fields: controlesFields,
    append: appendControl,
    remove: removeControl,
  } = useFieldArray({
    control,
    name: 'controles' as const,
  });

  const {
    fields: indicadoresFields,
    append: appendIndicador,
    remove: removeIndicador,
  } = useFieldArray({
    control,
    name: 'indicadores' as const,
  });

  const {
    fields: documentosFields,
    append: appendDocumento,
    remove: removeDocumento,
  } = useFieldArray({
    control,
    name: 'documentos' as const,
  });

  const handleFormSubmit = async (data: ProcessDefinitionFormData) => {
    try {
      await onSubmit(data);
      reset();
    } catch (error) {
      console.error('Error al enviar formulario:', error);
    }
  };

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const addItem = (
    field: 'entradas' | 'salidas' | 'controles' | 'indicadores' | 'documentos'
  ) => {
    switch (field) {
      case 'entradas':
        appendEntrada({ value: '' });
        break;
      case 'salidas':
        appendSalida({ value: '' });
        break;
      case 'controles':
        appendControl({ value: '' });
        break;
      case 'indicadores':
        appendIndicador({ value: '' });
        break;
      case 'documentos':
        appendDocumento({ value: '' });
        break;
    }
  };

  const removeItem = (
    field: 'entradas' | 'salidas' | 'controles' | 'indicadores' | 'documentos',
    index: number
  ) => {
    switch (field) {
      case 'entradas':
        removeEntrada(index);
        break;
      case 'salidas':
        removeSalida(index);
        break;
      case 'controles':
        removeControl(index);
        break;
      case 'indicadores':
        removeIndicador(index);
        break;
      case 'documentos':
        removeDocumento(index);
        break;
    }
  };

  const renderArrayField = (
    title: string,
    section: string,
    fields: any[],
    fieldName:
      | 'entradas'
      | 'salidas'
      | 'controles'
      | 'indicadores'
      | 'documentos',
    placeholder: string
  ) => (
    <Collapsible
      open={openSections[section]}
      onOpenChange={() => toggleSection(section)}
    >
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between p-4 h-auto">
          <span className="font-medium">
            {title} ({fields.length})
          </span>
          {openSections[section] ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4">
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-center space-x-2">
              <Input
                {...register(`${fieldName}.${index}.value` as any)}
                placeholder={placeholder}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeItem(fieldName, index)}
                className="text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addItem(fieldName)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar {title.toLowerCase().slice(0, -1)}
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>
          {initialData
            ? 'Editar Definición de Proceso'
            : 'Nueva Definición de Proceso'}
        </CardTitle>
        {initialData && (
          <div className="flex items-center gap-2">
            <Badge
              className={
                initialData.estado === 'activo'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }
            >
              {initialData.estado === 'activo' ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Información General */}
          <Collapsible
            open={openSections.general}
            onOpenChange={() => toggleSection('general')}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-4 h-auto"
              >
                <span className="font-medium">Información General</span>
                {openSections.general ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="codigo">Código *</Label>
                  <Input
                    id="codigo"
                    {...register('codigo')}
                    placeholder="Código del proceso"
                    className={errors.codigo ? 'border-red-500' : ''}
                  />
                  {errors.codigo && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.codigo.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    {...register('nombre')}
                    placeholder="Nombre del proceso"
                    className={errors.nombre ? 'border-red-500' : ''}
                  />
                  {errors.nombre && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.nombre.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <Label htmlFor="responsable">Responsable *</Label>
                <Input
                  id="responsable"
                  {...register('responsable')}
                  placeholder="Persona responsable del proceso"
                  className={errors.responsable ? 'border-red-500' : ''}
                />
                {errors.responsable && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.responsable.message}
                  </p>
                )}
              </div>

              <div className="mt-4">
                <Label htmlFor="objetivo">Objetivo *</Label>
                <Textarea
                  id="objetivo"
                  {...register('objetivo')}
                  placeholder="Objetivo del proceso"
                  rows={3}
                  className={errors.objetivo ? 'border-red-500' : ''}
                />
                {errors.objetivo && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.objetivo.message}
                  </p>
                )}
              </div>

              <div className="mt-4">
                <Label htmlFor="alcance">Alcance *</Label>
                <Textarea
                  id="alcance"
                  {...register('alcance')}
                  placeholder="Alcance del proceso"
                  rows={3}
                  className={errors.alcance ? 'border-red-500' : ''}
                />
                {errors.alcance && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.alcance.message}
                  </p>
                )}
              </div>

              <div className="mt-4 flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="estado"
                  {...register('estado')}
                  value="activo"
                  defaultChecked={initialData?.estado === 'activo' || true}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="estado">Proceso activo</Label>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Entradas */}
          {renderArrayField(
            'Entradas',
            'entradas',
            entradasFields,
            'entradas',
            'Descripción de la entrada'
          )}

          {/* Salidas */}
          {renderArrayField(
            'Salidas',
            'salidas',
            salidasFields,
            'salidas',
            'Descripción de la salida'
          )}

          {/* Controles */}
          {renderArrayField(
            'Controles',
            'controles',
            controlesFields,
            'controles',
            'Descripción del control'
          )}

          {/* Indicadores */}
          {renderArrayField(
            'Indicadores',
            'indicadores',
            indicadoresFields,
            'indicadores',
            'Descripción del indicador'
          )}

          {/* Documentos */}
          {renderArrayField(
            'Documentos',
            'documentos',
            documentosFields,
            'documentos',
            'Nombre del documento'
          )}

          <div className="flex justify-end space-x-2 pt-4 border-t">
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
