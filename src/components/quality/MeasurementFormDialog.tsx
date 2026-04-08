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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

interface MeasurementFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  indicatorId?: string;
}

export function MeasurementFormDialog({
  open,
  onOpenChange,
  onSuccess,
  indicatorId,
}: MeasurementFormDialogProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [indicators, setIndicators] = useState<any[]>([]);
  const [selectedIndicator, setSelectedIndicator] = useState<any>(null);
  const [generatedCode, setGeneratedCode] = useState('');
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    indicator_id: indicatorId || '',
    value: 0,
    measurement_date: new Date().toISOString().split('T')[0],
    observations: '',
  });

  useEffect(() => {
    if (open) {
      loadIndicators();
    }
  }, [open]);

  useEffect(() => {
    if (indicatorId && indicators.length > 0) {
      const indicator = indicators.find(i => i.id === indicatorId);
      if (indicator) {
        setSelectedIndicator(indicator);
        setFormData(prev => ({ ...prev, indicator_id: indicatorId }));
        generateCode(indicator, formData.measurement_date);
      }
    }
  }, [indicatorId, indicators]);

  useEffect(() => {
    if (selectedIndicator && formData.measurement_date) {
      generateCode(selectedIndicator, formData.measurement_date);
    }
  }, [formData.measurement_date]);

  const loadIndicators = async () => {
    try {
      const response = await fetch('/api/quality/indicators');
      if (response.ok) {
        const data = await response.json();
        setIndicators(data || []);
      }
    } catch (error) {
      console.error('Error loading indicators:', error);
    }
  };

  const generateCode = async (indicator: any, date: string) => {
    if (!indicator || !date) return;

    setIsGeneratingCode(true);
    try {
      const response = await fetch(
        `/api/quality/measurements/next-code?indicator_id=${indicator.id}&measurement_date=${date}`
      );

      if (response.ok) {
        const { code } = await response.json();
        setGeneratedCode(code);
        setFormData(prev => ({ ...prev, code }));
      } else {
        const dateStr = date.replace(/-/g, '');
        const code = `MED-${indicator.code}-${dateStr}`;
        setGeneratedCode(code);
        setFormData(prev => ({ ...prev, code }));
      }
    } catch (error) {
      console.error('Error generating code:', error);
      const dateStr = date.replace(/-/g, '');
      const code = `MED-${indicator.code}-${dateStr}`;
      setGeneratedCode(code);
      setFormData(prev => ({ ...prev, code }));
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleIndicatorChange = (indicatorId: string) => {
    const indicator = indicators.find(i => i.id === indicatorId);
    setSelectedIndicator(indicator);
    setFormData(prev => ({ ...prev, indicator_id: indicatorId }));
    if (indicator && formData.measurement_date) {
      generateCode(indicator, formData.measurement_date);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        organization_id: user?.organization_id,
        objective_id: selectedIndicator?.objective_id || '',
        process_definition_id: selectedIndicator?.process_definition_id || '',
        measured_by: (user as any)?.uid || '',
        measurement_method: '',
        evidence_url: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const response = await fetch('/api/quality/measurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear medición');
      }

      // Reset form
      setFormData({
        code: '',
        indicator_id: indicatorId || '',
        value: 0,
        measurement_date: new Date().toISOString().split('T')[0],
        observations: '',
      });
      setSelectedIndicator(null);
      setGeneratedCode('');

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating measurement:', error);
      alert(error.message || 'Error al crear la medición');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva Medición</DialogTitle>
          <DialogDescription>
            Los detalles se completarán en la vista de la medición
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Indicador */}
          <div className="space-y-2">
            <Label htmlFor="indicator">Indicador *</Label>
            <Select
              value={formData.indicator_id}
              onValueChange={handleIndicatorChange}
              disabled={!!indicatorId}
            >
              <SelectTrigger className="focus:ring-emerald-500 focus:border-emerald-500">
                <SelectValue placeholder="Seleccionar indicador..." />
              </SelectTrigger>
              <SelectContent>
                {indicators.map(ind => (
                  <SelectItem key={ind.id} value={ind.id}>
                    {ind.code} - {ind.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fecha de Medición */}
          <div className="space-y-2">
            <Label htmlFor="measurement_date">Fecha de Medición *</Label>
            <Input
              id="measurement_date"
              type="date"
              value={formData.measurement_date}
              onChange={e => handleChange('measurement_date', e.target.value)}
              required
              max={new Date().toISOString().split('T')[0]}
              className="focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Código Automático */}
          <div className="space-y-2">
            <Label htmlFor="code">Código (Automático)</Label>
            <Input
              id="code"
              value={formData.code}
              disabled
              className="bg-gray-50 text-gray-700 font-mono"
            />
            {isGeneratingCode && (
              <p className="text-xs text-blue-600">Generando código...</p>
            )}
            {generatedCode && !isGeneratingCode && (
              <p className="text-xs text-green-600">
                ✓ Código generado automáticamente
              </p>
            )}
          </div>

          {/* Valor Medido */}
          <div className="space-y-2">
            <Label htmlFor="value">
              Valor Medido *{' '}
              {selectedIndicator && `(${selectedIndicator.unit})`}
            </Label>
            <Input
              id="value"
              type="number"
              step="0.01"
              value={formData.value}
              onChange={e =>
                handleChange('value', parseFloat(e.target.value) || 0)
              }
              required
              className="focus:ring-emerald-500 focus:border-emerald-500"
            />
            {selectedIndicator && (
              <p className="text-xs text-gray-500">
                Rango esperado: {selectedIndicator.target_min} -{' '}
                {selectedIndicator.target_max}
              </p>
            )}
          </div>

          {/* Observaciones */}
          <div className="space-y-2">
            <Label htmlFor="observations">Observaciones</Label>
            <Textarea
              id="observations"
              placeholder="Observaciones sobre esta medición..."
              value={formData.observations}
              onChange={e => handleChange('observations', e.target.value)}
              rows={3}
              className="focus:ring-emerald-500 focus:border-emerald-500"
            />
            <p className="text-xs text-gray-500">
              Los detalles (método, evidencias) se configurarán después
            </p>
          </div>

          <DialogFooter>
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
              disabled={isSubmitting || !formData.code || !selectedIndicator}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              {isSubmitting ? 'Creando...' : 'Crear Medición'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
