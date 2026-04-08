'use client';

/**
 * BalanceForm - Formulario para cargar balances anuales
 * Multi-tenant: usa organizationId del contexto
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
import type { CreateBalanceData, FuenteDatos } from '@/types/crm-fiscal';
import { Calculator, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface BalanceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateBalanceData) => Promise<void>;
  ejerciciosPrevios?: string[];
}

const FUENTES_DATOS: { value: FuenteDatos; label: string }[] = [
  { value: 'declaracion_jurada', label: 'Declaración Jurada' },
  { value: 'balance_auditado', label: 'Balance Auditado' },
  { value: 'balance_compilado', label: 'Balance Compilado' },
  { value: 'estimacion_interna', label: 'Estimación Interna' },
];

const currentYear = new Date().getFullYear();
const EJERCICIOS = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

export function BalanceForm({
  open,
  onOpenChange,
  onSubmit,
  ejerciciosPrevios = [],
}: BalanceFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<CreateBalanceData>>({
    ejercicio: String(currentYear - 1),
    fuenteDatos: 'declaracion_jurada',
    activoCorriente: 0,
    activoNoCorriente: 0,
    pasivoCorriente: 0,
    pasivoNoCorriente: 0,
    capital: 0,
    resultadosAcumulados: 0,
  });

  // Ratios calculados
  const totalActivo =
    (formData.activoCorriente || 0) + (formData.activoNoCorriente || 0);
  const totalPasivo =
    (formData.pasivoCorriente || 0) + (formData.pasivoNoCorriente || 0);
  const patrimonioNeto = totalActivo - totalPasivo;
  const liquidezCorriente =
    formData.pasivoCorriente && formData.pasivoCorriente > 0
      ? ((formData.activoCorriente || 0) / formData.pasivoCorriente).toFixed(2)
      : '-';
  const solvencia =
    totalActivo > 0 ? ((patrimonioNeto / totalActivo) * 100).toFixed(1) : '-';

  const handleChange = (
    field: keyof CreateBalanceData,
    value: string | number
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNumberChange = (
    field: keyof CreateBalanceData,
    value: string
  ) => {
    const numValue = parseFloat(value) || 0;
    handleChange(field, numValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ejercicio || !formData.fechaCierre || !formData.fuenteDatos) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData as CreateBalanceData);
      onOpenChange(false);
      // Reset form
      setFormData({
        ejercicio: String(currentYear - 1),
        fuenteDatos: 'declaracion_jurada',
        activoCorriente: 0,
        activoNoCorriente: 0,
        pasivoCorriente: 0,
        pasivoNoCorriente: 0,
        capital: 0,
        resultadosAcumulados: 0,
      });
    } catch (error) {
      console.error('Error submitting balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const ejerciciosDisponibles = EJERCICIOS.filter(
    e => !ejerciciosPrevios.includes(e)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Nuevo Balance Anual
          </DialogTitle>
          <DialogDescription>
            Ingrese los datos del balance general del ejercicio
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Período y Fuente */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ejercicio">Ejercicio</Label>
              <Select
                value={formData.ejercicio}
                onValueChange={value => handleChange('ejercicio', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {ejerciciosDisponibles.map(e => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fechaCierre">Fecha de Cierre</Label>
              <Input
                id="fechaCierre"
                type="date"
                value={formData.fechaCierre || ''}
                onChange={e => handleChange('fechaCierre', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fuenteDatos">Fuente de Datos</Label>
              <Select
                value={formData.fuenteDatos}
                onValueChange={value =>
                  handleChange('fuenteDatos', value as FuenteDatos)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FUENTES_DATOS.map(f => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Activo */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-gray-700 border-b pb-1">
              ACTIVO
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="activoCorriente">Activo Corriente ($)</Label>
                <Input
                  id="activoCorriente"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.activoCorriente || ''}
                  onChange={e =>
                    handleNumberChange('activoCorriente', e.target.value)
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="activoNoCorriente">
                  Activo No Corriente ($)
                </Label>
                <Input
                  id="activoNoCorriente"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.activoNoCorriente || ''}
                  onChange={e =>
                    handleNumberChange('activoNoCorriente', e.target.value)
                  }
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="text-right text-sm font-medium text-gray-600">
              Total Activo: ${totalActivo.toLocaleString('es-AR')}
            </div>
          </div>

          {/* Pasivo */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-gray-700 border-b pb-1">
              PASIVO
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pasivoCorriente">Pasivo Corriente ($)</Label>
                <Input
                  id="pasivoCorriente"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.pasivoCorriente || ''}
                  onChange={e =>
                    handleNumberChange('pasivoCorriente', e.target.value)
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pasivoNoCorriente">
                  Pasivo No Corriente ($)
                </Label>
                <Input
                  id="pasivoNoCorriente"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.pasivoNoCorriente || ''}
                  onChange={e =>
                    handleNumberChange('pasivoNoCorriente', e.target.value)
                  }
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="text-right text-sm font-medium text-gray-600">
              Total Pasivo: ${totalPasivo.toLocaleString('es-AR')}
            </div>
          </div>

          {/* Patrimonio Neto */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-gray-700 border-b pb-1">
              PATRIMONIO NETO
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capital">Capital ($)</Label>
                <Input
                  id="capital"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.capital || ''}
                  onChange={e => handleNumberChange('capital', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="resultadosAcumulados">
                  Resultados Acumulados ($)
                </Label>
                <Input
                  id="resultadosAcumulados"
                  type="number"
                  step="0.01"
                  value={formData.resultadosAcumulados || ''}
                  onChange={e =>
                    handleNumberChange('resultadosAcumulados', e.target.value)
                  }
                  placeholder="0.00"
                />
              </div>
            </div>
            <div
              className={`text-right text-sm font-bold ${patrimonioNeto >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              Patrimonio Neto: ${patrimonioNeto.toLocaleString('es-AR')}
            </div>
          </div>

          {/* Ratios Calculados */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-sm text-gray-700">
              Ratios Calculados
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Liquidez Corriente:</span>
                <span className="font-medium">{liquidezCorriente}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Solvencia:</span>
                <span className="font-medium">{solvencia}%</span>
              </div>
            </div>
          </div>

          {/* Auditor (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="auditor">Auditor/Contador (opcional)</Label>
            <Input
              id="auditor"
              value={formData.auditor || ''}
              onChange={e => handleChange('auditor', e.target.value)}
              placeholder="Nombre del profesional certificante"
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
              Guardar Balance
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
