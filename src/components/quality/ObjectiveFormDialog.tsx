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

interface ObjectiveFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  processId?: string; // Pre-llenar proceso
}

export function ObjectiveFormDialog({
  open,
  onOpenChange,
  onSuccess,
  processId,
}: ObjectiveFormDialogProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processes, setProcesses] = useState<any[]>([]);
  const [selectedProcess, setSelectedProcess] = useState<any>(null);
  const [generatedCode, setGeneratedCode] = useState('');
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    process_definition_id: processId || '',
  });

  useEffect(() => {
    if (open) {
      loadProcesses();
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

  const loadProcesses = async () => {
    try {
      const response = await fetch('/api/process-definitions');
      if (response.ok) {
        const data = await response.json();
        setProcesses(data || []);
      }
    } catch (error) {
      console.error('Error loading processes:', error);
    }
  };

  const generateCode = async (process: any) => {
    if (!process) return;

    setIsGeneratingCode(true);
    try {
      // Obtener el código del proceso (ej: "COMER" de "Comercialización")
      const processCode =
        process.codigo || process.nombre.substring(0, 5).toUpperCase();

      // Obtener el siguiente número correlativo para este proceso
      const response = await fetch(
        `/api/quality/objectives/next-code?process_id=${process.id}`
      );

      if (response.ok) {
        const { nextNumber } = await response.json();
        const code = `OBJ-${processCode}-${String(nextNumber).padStart(4, '0')}`;
        setGeneratedCode(code);
        setFormData(prev => ({ ...prev, code }));
      } else {
        // Fallback: usar 0001 si no hay API
        const code = `OBJ-${processCode}-0001`;
        setGeneratedCode(code);
        setFormData(prev => ({ ...prev, code }));
      }
    } catch (error) {
      console.error('Error generating code:', error);
      // Fallback
      const processCode =
        process.codigo || process.nombre.substring(0, 5).toUpperCase();
      const code = `OBJ-${processCode}-0001`;
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
        type: 'operativo',
        target_value: 0,
        current_value: 0,
        unit: '%',
        baseline_value: 0,
        start_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0], // +90 días
        responsible_user_id: '',
        department_id: '',
        team_members: [],
        alert_threshold: 80,
        is_active: true,
        status: 'activo',
        progress_percentage: 0,
        created_by: (user as any)?.uid,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const response = await fetch('/api/quality/objectives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear objetivo');
      }

      // Reset form
      setFormData({
        code: '',
        title: '',
        description: '',
        process_definition_id: processId || '',
      });
      setSelectedProcess(null);
      setGeneratedCode('');

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating objective:', error);
      alert(error.message || 'Error al crear el objetivo');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo Objetivo de Calidad</DialogTitle>
          <DialogDescription>
            Los detalles se completarán en la vista del objetivo
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
              <SelectContent className="z-[9999] bg-white">
                {processes.map(proc => (
                  <SelectItem key={proc.id} value={proc.id}>
                    {proc.codigo ? `${proc.codigo} - ` : ''}
                    {proc.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProcess && (
              <p className="text-xs text-gray-500">
                Proceso seleccionado: <strong>{selectedProcess.nombre}</strong>
              </p>
            )}
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
            {!selectedProcess && (
              <p className="text-xs text-gray-500">
                Selecciona un proceso para generar el código
              </p>
            )}
          </div>

          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="title">Nombre del Objetivo *</Label>
            <Input
              id="title"
              placeholder="Ej: Aumentar un 20% las ventas"
              value={formData.title}
              onChange={e => handleChange('title', e.target.value)}
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
              placeholder="Descripción breve del objetivo..."
              value={formData.description}
              onChange={e => handleChange('description', e.target.value)}
              rows={3}
              className="focus:ring-emerald-500 focus:border-emerald-500"
            />
            <p className="text-xs text-gray-500">
              Los detalles (metas, fechas, responsables) se configurarán después
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
              {isSubmitting ? 'Creando...' : 'Crear Objetivo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
