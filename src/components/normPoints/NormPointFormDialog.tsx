'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { NormCategory, NormPoint, NormType } from '@/types/normPoints';
import { useEffect, useState } from 'react';

interface NormPointFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  normPoint?: NormPoint | null;
  onSuccess: () => void;
}

type FormData = {
  code: string;
  title: string;
  description: string;
  requirement: string;
  tipo_norma: NormType;
  nombre_norma?: string;
  chapter?: number;
  category?: NormCategory;
  jurisdiccion?: string;
  is_mandatory: boolean;
  priority: 'alta' | 'media' | 'baja';
  created_by: string;
  updated_by: string;
};

function getDefaultFormData(): FormData {
  return {
    code: '',
    title: '',
    description: '',
    requirement: '',
    tipo_norma: 'iso_9001',
    nombre_norma: '',
    chapter: 4,
    category: 'contexto',
    jurisdiccion: '',
    is_mandatory: false,
    priority: 'media',
    created_by: 'current-user',
    updated_by: 'current-user',
  };
}

export function NormPointFormDialog({
  open,
  onOpenChange,
  normPoint,
  onSuccess,
}: NormPointFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>(getDefaultFormData());

  useEffect(() => {
    if (normPoint) {
      setFormData({
        code: normPoint.code,
        title: normPoint.title,
        description: normPoint.description,
        requirement: normPoint.requirement,
        tipo_norma: normPoint.tipo_norma,
        nombre_norma: normPoint.nombre_norma || '',
        chapter: normPoint.chapter,
        category: normPoint.category,
        jurisdiccion: normPoint.jurisdiccion || '',
        is_mandatory: normPoint.is_mandatory,
        priority: normPoint.priority,
        created_by: normPoint.created_by,
        updated_by: 'current-user',
      });
      return;
    }

    setFormData(getDefaultFormData());
  }, [normPoint, open]);

  const handleNormTypeChange = (value: string) => {
    const nextType = value as NormType;

    setFormData(prev => ({
      ...prev,
      tipo_norma: nextType,
      chapter: nextType.startsWith('iso_') ? prev.chapter || 4 : undefined,
      category: nextType.startsWith('iso_')
        ? (prev.category ?? 'contexto')
        : undefined,
      nombre_norma:
        nextType === 'otra' || nextType === 'legal'
          ? prev.nombre_norma || ''
          : '',
      jurisdiccion: nextType === 'legal' ? prev.jurisdiccion || '' : '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (
        (formData.tipo_norma === 'otra' || formData.tipo_norma === 'legal') &&
        !formData.nombre_norma?.trim()
      ) {
        alert('El nombre de la norma es obligatorio para este tipo.');
        return;
      }

      if (formData.tipo_norma === 'legal' && !formData.jurisdiccion?.trim()) {
        alert('La jurisdiccion es obligatoria para norma legal.');
        return;
      }

      const url = normPoint
        ? `/api/norm-points/${normPoint.id}`
        : '/api/norm-points';
      const method = normPoint ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error saving norm point:', error);
      alert('Error al guardar el punto de norma');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {normPoint ? 'Editar Punto de Norma' : 'Nuevo Punto de Norma'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          <div className="space-y-4">
            <SectionHeader
              title="Informacion Basica"
              description="Datos principales del punto de norma"
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Codigo *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={e =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  placeholder="4.1"
                  required
                  className="bg-slate-50 border-slate-200 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <Label htmlFor="title">Titulo *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={e =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                  className="bg-slate-50 border-slate-200 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Descripcion *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                required
                className="bg-slate-50 border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
              />
            </div>

            <div>
              <Label htmlFor="requirement">Requisito *</Label>
              <Textarea
                id="requirement"
                value={formData.requirement}
                onChange={e =>
                  setFormData({ ...formData, requirement: e.target.value })
                }
                rows={3}
                required
                className="bg-slate-50 border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
              />
            </div>
          </div>

          <div className="space-y-4">
            <SectionHeader title="Clasificacion" description="Tipo de norma" />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tipo_norma">Tipo de Norma *</Label>
                <Select
                  value={formData.tipo_norma}
                  onValueChange={handleNormTypeChange}
                >
                  <SelectTrigger className="bg-slate-50 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="iso_9001">ISO 9001</SelectItem>
                    <SelectItem value="iso_14001">ISO 14001</SelectItem>
                    <SelectItem value="iso_45001">ISO 45001</SelectItem>
                    <SelectItem value="legal">Legal</SelectItem>
                    <SelectItem value="otra">Otra</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.tipo_norma.startsWith('iso_') && (
                <div>
                  <Label htmlFor="chapter">Capitulo</Label>
                  <Select
                    value={formData.chapter?.toString() || ''}
                    onValueChange={value =>
                      setFormData({ ...formData, chapter: parseInt(value, 10) })
                    }
                  >
                    <SelectTrigger className="bg-slate-50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="6">6</SelectItem>
                      <SelectItem value="7">7</SelectItem>
                      <SelectItem value="8">8</SelectItem>
                      <SelectItem value="9">9</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.tipo_norma.startsWith('iso_') && (
                <div>
                  <Label htmlFor="category">Categoria</Label>
                  <Select
                    value={formData.category || 'contexto'}
                    onValueChange={value =>
                      setFormData({
                        ...formData,
                        category: value as NormCategory,
                      })
                    }
                  >
                    <SelectTrigger className="bg-slate-50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contexto">Contexto</SelectItem>
                      <SelectItem value="liderazgo">Liderazgo</SelectItem>
                      <SelectItem value="planificacion">
                        Planificacion
                      </SelectItem>
                      <SelectItem value="soporte">Soporte</SelectItem>
                      <SelectItem value="operacion">Operacion</SelectItem>
                      <SelectItem value="evaluacion">Evaluacion</SelectItem>
                      <SelectItem value="mejora">Mejora</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {(formData.tipo_norma === 'otra' ||
              formData.tipo_norma === 'legal') && (
              <div>
                <Label htmlFor="nombre_norma">Nombre de Norma *</Label>
                <Input
                  id="nombre_norma"
                  value={formData.nombre_norma || ''}
                  onChange={e =>
                    setFormData({ ...formData, nombre_norma: e.target.value })
                  }
                  placeholder="Ej: NICC 1, NIA 200, RT 37, BCRA A6940"
                  required
                  className="bg-slate-50 border-slate-200 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            )}

            {formData.tipo_norma === 'legal' && (
              <div>
                <Label htmlFor="jurisdiccion">Jurisdiccion *</Label>
                <Input
                  id="jurisdiccion"
                  value={formData.jurisdiccion || ''}
                  onChange={e =>
                    setFormData({ ...formData, jurisdiccion: e.target.value })
                  }
                  placeholder="Nacional, Provincial, Municipal, etc."
                  required
                  className="bg-slate-50 border-slate-200 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <SectionHeader
              title="Configuracion"
              description="Prioridad y opciones"
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Prioridad *</Label>
                <Select
                  value={formData.priority}
                  onValueChange={value =>
                    setFormData({
                      ...formData,
                      priority: value as typeof formData.priority,
                    })
                  }
                >
                  <SelectTrigger className="bg-slate-50 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="baja">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2 pt-8">
                <Checkbox
                  id="is_mandatory"
                  checked={formData.is_mandatory}
                  onCheckedChange={checked =>
                    setFormData({
                      ...formData,
                      is_mandatory: checked as boolean,
                    })
                  }
                />
                <Label htmlFor="is_mandatory" className="cursor-pointer">
                  Obligatorio
                </Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              {loading ? 'Guardando...' : normPoint ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
