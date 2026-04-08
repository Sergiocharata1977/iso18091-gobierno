'use client';

/**
 * MaquinariaForm - Formulario para registrar maquinaria agrícola
 */

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  CreateMaquinariaData,
  EstadoConservacion,
  TipoMaquinaria,
} from '@/types/crm-fiscal';
import { Loader2, Tractor } from 'lucide-react';
import { useState } from 'react';

interface MaquinariaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateMaquinariaData) => Promise<void>;
}

const TIPOS_MAQUINARIA: { value: TipoMaquinaria; label: string }[] = [
  { value: 'tractor', label: 'Tractor' },
  { value: 'cosechadora', label: 'Cosechadora' },
  { value: 'sembradora', label: 'Sembradora' },
  { value: 'pulverizadora', label: 'Pulverizadora' },
  { value: 'tolva', label: 'Tolva' },
  { value: 'acoplado', label: 'Acoplado' },
  { value: 'implemento', label: 'Implemento' },
  { value: 'otro', label: 'Otro' },
];

const ESTADOS_CONSERVACION: {
  value: EstadoConservacion;
  label: string;
  color: string;
}[] = [
  { value: 'excelente', label: 'Excelente', color: 'text-green-600' },
  { value: 'bueno', label: 'Bueno', color: 'text-blue-600' },
  { value: 'regular', label: 'Regular', color: 'text-yellow-600' },
  { value: 'malo', label: 'Malo', color: 'text-red-600' },
];

const TIPOS_PROPIEDAD: {
  value: 'propia' | 'leasing' | 'comodato';
  label: string;
}[] = [
  { value: 'propia', label: 'Propia' },
  { value: 'leasing', label: 'Leasing' },
  { value: 'comodato', label: 'Comodato' },
];

const currentYear = new Date().getFullYear();
const AÑOS = Array.from({ length: 30 }, (_, i) => currentYear - i);

export function MaquinariaForm({
  open,
  onOpenChange,
  onSubmit,
}: MaquinariaFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<CreateMaquinariaData>>({
    tipo: 'tractor',
    estadoConservacion: 'bueno',
    propiedad: 'propia',
    año: currentYear - 5,
    valorActual: 0,
  });

  const handleChange = (field: keyof CreateMaquinariaData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.marca || !formData.modelo || !formData.valorActual) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData as CreateMaquinariaData);
      onOpenChange(false);
      setFormData({
        tipo: 'tractor',
        estadoConservacion: 'bueno',
        propiedad: 'propia',
        año: currentYear - 5,
        valorActual: 0,
      });
    } catch (error) {
      console.error('Error submitting maquinaria:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tractor className="h-5 w-5" />
            Nueva Maquinaria
          </DialogTitle>
          <DialogDescription>
            Registre los datos de la maquinaria agrícola
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo y Propiedad */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Maquinaria</Label>
              <Select
                value={formData.tipo}
                onValueChange={value =>
                  handleChange('tipo', value as TipoMaquinaria)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_MAQUINARIA.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Propiedad</Label>
              <Select
                value={formData.propiedad}
                onValueChange={value => handleChange('propiedad', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_PROPIEDAD.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Marca y Modelo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="marca">Marca *</Label>
              <Input
                id="marca"
                value={formData.marca || ''}
                onChange={e => handleChange('marca', e.target.value)}
                placeholder="Ej: John Deere"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="modelo">Modelo *</Label>
              <Input
                id="modelo"
                value={formData.modelo || ''}
                onChange={e => handleChange('modelo', e.target.value)}
                placeholder="Ej: 6150J"
                required
              />
            </div>
          </div>

          {/* Año y Estado */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Año</Label>
              <Select
                value={String(formData.año)}
                onValueChange={value => handleChange('año', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AÑOS.map(a => (
                    <SelectItem key={a} value={String(a)}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Estado de Conservación</Label>
              <Select
                value={formData.estadoConservacion}
                onValueChange={value =>
                  handleChange(
                    'estadoConservacion',
                    value as EstadoConservacion
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS_CONSERVACION.map(e => (
                    <SelectItem key={e.value} value={e.value}>
                      <span className={e.color}>{e.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Identificación */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="patente">Patente</Label>
              <Input
                id="patente"
                value={formData.patente || ''}
                onChange={e => handleChange('patente', e.target.value)}
                placeholder="AA 123 BB"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="horasUso">Horas de Uso</Label>
              <Input
                id="horasUso"
                type="number"
                min="0"
                value={formData.horasUso || ''}
                onChange={e =>
                  handleChange('horasUso', parseInt(e.target.value) || 0)
                }
                placeholder="0"
              />
            </div>
          </div>

          {/* Valor */}
          <div className="space-y-2">
            <Label htmlFor="valorActual">Valor Actual (USD) *</Label>
            <Input
              id="valorActual"
              type="number"
              min="0"
              step="100"
              value={formData.valorActual || ''}
              onChange={e =>
                handleChange('valorActual', parseFloat(e.target.value) || 0)
              }
              placeholder="0.00"
              required
            />
            <p className="text-xs text-gray-500">
              Valor de tasación o mercado actual en dólares
            </p>
          </div>

          {/* Gravamen */}
          <div className="space-y-2">
            <Label htmlFor="gravamen">Gravamen/Prenda</Label>
            <Input
              id="gravamen"
              value={formData.gravamen || ''}
              onChange={e => handleChange('gravamen', e.target.value)}
              placeholder="Ej: Banco Nación - $50.000"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Maquinaria
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
