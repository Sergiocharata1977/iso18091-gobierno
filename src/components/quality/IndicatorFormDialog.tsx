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

interface IndicatorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  processId?: string;
  objectiveId?: string;
}

export function IndicatorFormDialog({
  open,
  onOpenChange,
  onSuccess,
  processId,
  objectiveId,
}: IndicatorFormDialogProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processes, setProcesses] = useState<any[]>([]);
  const [objectives, setObjectives] = useState<any[]>([]);
  const [selectedProcess, setSelectedProcess] = useState<any>(null);
  const [generatedCode, setGeneratedCode] = useState('');
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    process_definition_id: processId || '',
    objective_id: objectiveId || '',
  });

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  useEffect(() => {
    if (processId && processes.length > 0) {
      const process = processes.find(p => p.id === processId);
      if (process) {
        setSelectedProcess(process);
        setFormData(prev => ({ ...prev, process_definition_id: processId }));
        generateCode(process);
      }
    }
  }, [processId, processes]);

  const loadData = async () => {
    try {
      const [procResponse, objResponse] = await Promise.all([
        fetch('/api/process-definitions'),
        fetch('/api/quality/objectives'),
      ]);

      if (procResponse.ok) {
        const procData = await procResponse.json();
        setProcesses(procData || []);
      }

      if (objResponse.ok) {
        const objData = await objResponse.json();
        setObjectives(objData || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const generateCode = async (process: any) => {
    if (!process) return;

    setIsGeneratingCode(true);
    try {
      const processCode =
        process.codigo || process.nombre.substring(0, 5).toUpperCase();

      const response = await fetch(
        `/api/quality/indicators/next-code?process_id=${process.id}`
      );

      if (response.ok) {
        const { nextNumber } = await response.json();
        const code = `IND-${processCode}-${String(nextNumber).padStart(4, '0')}`;
        setGeneratedCode(code);
        setFormData(prev => ({ ...prev, code }));
      } else {
        const code = `IND-${processCode}-0001`;
        setGeneratedCode(code);
        setFormData(prev => ({ ...prev, code }));
      }
    } catch (error) {
      console.error('Error generating code:', error);
      const processCode =
        process.codigo || process.nombre.substring(0, 5).toUpperCase();
      const code = `IND-${processCode}-0001`;
      setGeneratedCode(code);
      setFormData(prev => ({ ...prev, code }));
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleProcessChange = (processId: string) => {
    const process = processes.find(p => p.id === processId);
    setSelectedProcess(process);
    setFormData(prev => ({ ...prev, process_definition_id: processId }));
    if (process) {
      generateCode(process);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        organization_id: user?.organization_id,
        // Valores por defecto para campos que se editarán en el Single
        type: 'eficacia',
        formula: '',
        unit: '%',
        measurement_frequency: 'mensual',
        target_min: 0,
        target_max: 100,
        data_source: '',
        calculation_method: '',
        responsible_user_id: '',
        department_id: '',
        is_active: true,
        status: 'activo',
        trend: 'estable',
        created_by: (user as any)?.uid,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const response = await fetch('/api/quality/indicators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear indicador');
      }

      // Reset form
      setFormData({
        code: '',
        name: '',
        description: '',
        process_definition_id: processId || '',
        objective_id: objectiveId || '',
      });
      setSelectedProcess(null);
      setGeneratedCode('');

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating indicator:', error);
      alert(error.message || 'Error al crear el indicador');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo Indicador de Calidad</DialogTitle>
          <DialogDescription>
            Los detalles se completarán en la vista del indicador
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Proceso */}
          <div className="space-y-2">
            <Label htmlFor="process">Proceso *</Label>
            <Select
              value={formData.process_definition_id}
              onValueChange={handleProcessChange}
              disabled={!!processId}
            >
              <SelectTrigger className="focus:ring-emerald-500 focus:border-emerald-500">
                <SelectValue placeholder="Seleccionar proceso..." />
              </SelectTrigger>
              <SelectContent>
                {processes.map(proc => (
                  <SelectItem key={proc.id} value={proc.id}>
                    {proc.codigo ? `${proc.codigo} - ` : ''}
                    {proc.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Objetivo (Opcional) */}
          <div className="space-y-2">
            <Label htmlFor="objective">Objetivo (Opcional)</Label>
            <Select
              value={formData.objective_id}
              onValueChange={value => handleChange('objective_id', value)}
              disabled={!!objectiveId}
            >
              <SelectTrigger className="focus:ring-emerald-500 focus:border-emerald-500">
                <SelectValue placeholder="Sin objetivo vinculado" />
              </SelectTrigger>
              <SelectContent>
                {objectives
                  .filter(
                    obj =>
                      !formData.process_definition_id ||
                      obj.process_definition_id ===
                        formData.process_definition_id
                  )
                  .map(obj => (
                    <SelectItem key={obj.id} value={obj.id}>
                      {obj.code} - {obj.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
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

          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del Indicador *</Label>
            <Input
              id="name"
              placeholder="Ej: Tasa de conversión de leads"
              value={formData.name}
              onChange={e => handleChange('name', e.target.value)}
              required
              className="focus:ring-emerald-500 focus:border-emerald-500"
              autoFocus={!!processId}
            />
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              placeholder="Descripción breve del indicador..."
              value={formData.description}
              onChange={e => handleChange('description', e.target.value)}
              rows={3}
              className="focus:ring-emerald-500 focus:border-emerald-500"
            />
            <p className="text-xs text-gray-500">
              Los detalles (fórmula, metas, frecuencia) se configurarán después
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
              disabled={isSubmitting || !formData.code || !selectedProcess}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              {isSubmitting ? 'Creando...' : 'Crear Indicador'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
