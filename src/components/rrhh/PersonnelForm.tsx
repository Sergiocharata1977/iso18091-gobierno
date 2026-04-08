'use client';

import { BaseCard } from '@/components/design-system/primitives/BaseCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Textarea } from '@/components/ui/textarea';
import { normalizeTipoPersonal } from '@/lib/utils/personnel-role-mapping';
import { PersonnelFormData, personnelFormSchema } from '@/lib/validations/rrhh';
import { Personnel } from '@/types/rrhh';
import { zodResolver } from '@hookform/resolvers/zod';
import { Camera, ExternalLink } from 'lucide-react';
import { ChangeEvent, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

interface PersonnelFormProps {
  initialData?: Personnel | null;
  onSubmit: (data: PersonnelFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function PersonnelForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: PersonnelFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [tieneAccesoSistema, setTieneAccesoSistema] = useState(
    initialData?.tiene_acceso_sistema || false
  );

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
  } = useForm<PersonnelFormData>({
    resolver: zodResolver(personnelFormSchema) as any,
    defaultValues: initialData
      ? {
          nombres: initialData.nombres || '',
          apellidos: initialData.apellidos || '',
          email: initialData.email || '',
          telefono: initialData.telefono || '',
          direccion: initialData.direccion || '',
          puesto: initialData.puesto || '',
          departamento: initialData.departamento || '',
          supervisor: initialData.supervisor_nombre || '',
          estado: initialData.estado || ('Activo' as const),
          fecha_ingreso:
            initialData.fecha_ingreso instanceof Date
              ? initialData.fecha_ingreso
              : new Date(),
          salario: initialData.salario || '',
          foto: initialData.foto || '',
          certificaciones: initialData.certificaciones || [],
          meta_mensual: initialData.meta_mensual || 0,
          comision_porcentaje: initialData.comision_porcentaje || 0,
          tipo_personal: normalizeTipoPersonal(
            initialData.tipo_personal
          ) as any,
          tiene_acceso_sistema: initialData.tiene_acceso_sistema || false,
        }
      : {
          nombres: '',
          apellidos: '',
          email: '',
          telefono: '',
          direccion: '',
          puesto: '',
          departamento: '',
          supervisor: '',
          estado: 'Activo' as const,
          fecha_ingreso: new Date(),
          salario: '',
          foto: '',
          certificaciones: [],
          meta_mensual: 0,
          comision_porcentaje: 0,
          tipo_personal: 'administrativo' as const,
          tiene_acceso_sistema: false,
        },
  });

  const handleFormSubmit = async (data: PersonnelFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPhotoUrl = watch('foto');

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !initialData?.id) return;

    if (!file.type.startsWith('image/')) {
      alert('Selecciona una imagen valida');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen no debe superar 2MB');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('personnelId', initialData.id);

      const response = await fetch('/api/rrhh/personnel/photo', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error al subir la foto');
      }

      const result = await response.json();
      setValue('foto', result.photoUrl || '', {
        shouldDirty: true,
        shouldValidate: true,
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Error al subir la foto');
    } finally {
      setIsUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  return (
    <BaseCard
      title={initialData ? 'Editar Empleado' : 'Crear Empleado'}
      className="border-0 shadow-none"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
        <div className="space-y-4">
          <SectionHeader title="Informacion Personal" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="nombres">Nombres</Label>
              <Input
                id="nombres"
                {...register('nombres')}
                placeholder="Ej. Juan Carlos"
                className={`mt-1.5 focus:ring-emerald-500 focus:border-emerald-500 ${errors.nombres ? 'border-red-500' : ''}`}
              />
              {errors.nombres && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.nombres.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="apellidos">Apellidos</Label>
              <Input
                id="apellidos"
                {...register('apellidos')}
                placeholder="Ej. Perez Gonzalez"
                className={`mt-1.5 focus:ring-emerald-500 focus:border-emerald-500 ${errors.apellidos ? 'border-red-500' : ''}`}
              />
              {errors.apellidos && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.apellidos.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4 rounded-md border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="tiene_acceso_sistema"
                {...register('tiene_acceso_sistema')}
                checked={tieneAccesoSistema}
                onChange={e => {
                  const checked = e.target.checked;
                  setTieneAccesoSistema(checked);
                  setValue('tiene_acceso_sistema', checked);
                  if (!checked) {
                    setValue('email', '');
                  }
                }}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <div className="flex-1">
                <Label
                  htmlFor="tiene_acceso_sistema"
                  className="font-semibold text-emerald-900"
                >
                  Este empleado necesita acceso al sistema
                </Label>
                <p className="mt-1 text-sm text-emerald-700">
                  Si marcas esta opcion, se creara un usuario y se enviara una
                  invitacion por email.
                </p>
              </div>
            </div>

            {tieneAccesoSistema && (
              <div className="mt-4">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="juan.perez@empresa.com"
                  className={`mt-1.5 focus:ring-emerald-500 focus:border-emerald-500 ${errors.email ? 'border-red-500' : ''}`}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.email.message}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Se enviara una invitacion a este email para configurar la
                  contrasena.
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="telefono">Telefono</Label>
              <Input
                id="telefono"
                {...register('telefono')}
                placeholder="+54 11 1234-5678"
                className={`mt-1.5 focus:ring-emerald-500 focus:border-emerald-500 ${errors.telefono ? 'border-red-500' : ''}`}
              />
              {errors.telefono && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.telefono.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="documento_identidad">
                Documento de Identidad
              </Label>
              <Input
                id="documento_identidad"
                {...register('documento_identidad')}
                placeholder="DNI, Pasaporte, etc."
                className={`mt-1.5 focus:ring-emerald-500 focus:border-emerald-500 ${errors.documento_identidad ? 'border-red-500' : ''}`}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="direccion">Direccion</Label>
            <Textarea
              id="direccion"
              {...register('direccion')}
              placeholder="Direccion completa"
              className={`mt-1.5 focus:ring-emerald-500 focus:border-emerald-500 ${errors.direccion ? 'border-red-500' : ''}`}
            />
            {errors.direccion && (
              <p className="text-red-500 text-sm mt-1">
                {errors.direccion.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <SectionHeader title="Informacion Laboral" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="rrhh_relacion_organizacional">
                Puesto y departamento
              </Label>
              <div
                id="rrhh_relacion_organizacional"
                className="mt-1.5 space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
              >
                <p>
                  RRHH no reasigna puesto, departamento ni asignaciones ISO.
                </p>
                <p>
                  Puesto actual:{' '}
                  <strong>{initialData?.puesto || 'Sin puesto'}</strong>
                </p>
                <p>
                  Departamento actual:{' '}
                  <strong>
                    {initialData?.departamento || 'Sin departamento'}
                  </strong>
                </p>
                {initialData?.user_id ? (
                  <a
                    href={`/mi-panel?modo=supervisor&userId=${initialData.user_id}`}
                    className="inline-flex items-center gap-1 underline underline-offset-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Gestionar en Mi Panel
                  </a>
                ) : (
                  <p className="text-xs text-amber-800">
                    La relacion operativa se administra desde Mi Panel cuando el
                    empleado tiene usuario asociado.
                  </p>
                )}
              </div>
              <input type="hidden" {...register('puesto')} />
              <input type="hidden" {...register('departamento')} />
            </div>

            <div>
              <Label htmlFor="tipo_personal_info">
                Funcion y nivel (por asignaciones)
              </Label>
              <div
                id="tipo_personal_info"
                className="mt-1.5 min-h-10 rounded-md border border-input bg-muted/20 px-3 py-2 text-sm text-muted-foreground"
              >
                Se gestionan en las relaciones con procesos, objetivos e
                indicadores. En Personal solo se mantienen datos base.
              </div>
              <input type="hidden" {...register('tipo_personal')} />
              {errors.tipo_personal && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.tipo_personal.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="supervisor">Supervisor</Label>
              <Input
                id="supervisor"
                {...register('supervisor')}
                placeholder="Nombre del supervisor"
                className={`mt-1.5 focus:ring-emerald-500 focus:border-emerald-500 ${errors.supervisor ? 'border-red-500' : ''}`}
              />
            </div>
            <div>
              <Label htmlFor="estado">Estado</Label>
              <select
                id="estado"
                {...register('estado')}
                className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="Activo">Activo</option>
                <option value="Licencia">Licencia</option>
                <option value="Inactivo">Inactivo</option>
              </select>
              {errors.estado && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.estado.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="fecha_ingreso">Fecha de Ingreso</Label>
              <Input
                id="fecha_ingreso"
                type="date"
                {...register('fecha_ingreso', {
                  setValueAs: value => (value ? new Date(value) : new Date()),
                })}
                className={`mt-1.5 ${errors.fecha_ingreso ? 'border-red-500' : ''}`}
              />
              {errors.fecha_ingreso && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.fecha_ingreso.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="salario">Salario</Label>
              <Input
                id="salario"
                {...register('salario')}
                placeholder="Ej. $65,000"
                className={`mt-1.5 ${errors.salario ? 'border-red-500' : ''}`}
              />
              {errors.salario && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.salario.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="foto">Foto</Label>
              {initialData?.id && (
                <>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={isUploadingPhoto || isLoading || isSubmitting}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {isUploadingPhoto ? 'Subiendo...' : 'Subir foto'}
                  </Button>
                </>
              )}
            </div>
            {currentPhotoUrl ? (
              <div className="mt-2 flex items-center gap-3">
                <img
                  src={currentPhotoUrl}
                  alt="Foto del empleado"
                  className="h-14 w-14 rounded-full border object-cover"
                />
                <p className="text-xs text-muted-foreground">
                  {initialData?.id
                    ? 'Puedes reemplazarla subiendo otra imagen.'
                    : 'Se guardara la URL de foto al crear el registro.'}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                {initialData?.id
                  ? 'Sube una imagen (JPG/PNG, max. 2MB) o pega una URL.'
                  : 'Primero crea el empleado; luego podras subir una foto por archivo.'}
              </p>
            )}
            <Input
              id="foto"
              {...register('foto')}
              placeholder="https://ejemplo.com/foto.jpg"
              className={`mt-1.5 ${errors.foto ? 'border-red-500' : ''}`}
            />
            {errors.foto && (
              <p className="text-red-500 text-sm mt-1">{errors.foto.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <SectionHeader title="Certificaciones" />
          <div>
            <Label htmlFor="certificaciones">
              Certificaciones (separadas por comas)
            </Label>
            <Input
              id="certificaciones"
              {...register('certificaciones', {
                setValueAs: value => {
                  if (!value) return [];
                  if (typeof value === 'string') {
                    return value.split(',').map((cert: string) => cert.trim());
                  }
                  return Array.isArray(value) ? value : [];
                },
              })}
              placeholder="ISO 9001, Analisis de Datos, Six Sigma"
              className={`mt-1.5 ${errors.certificaciones ? 'border-red-500' : ''}`}
            />
            {errors.certificaciones && (
              <p className="text-red-500 text-sm mt-1">
                {errors.certificaciones.message}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3 border-t pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading || isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isLoading || isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 shadow-sm"
          >
            {isLoading || isSubmitting ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </form>
    </BaseCard>
  );
}
