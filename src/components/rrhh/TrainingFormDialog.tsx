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
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface TrainingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TrainingFormDialog({
  open,
  onOpenChange,
  onSuccess,
}: TrainingFormDialogProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    tema: '',
    modalidad: 'presencial' as 'presencial' | 'virtual' | 'mixta',
    fecha_inicio: '',
    fecha_fin: '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!user?.organization_id) {
        throw new Error('No se pudo obtener la organizacion del usuario');
      }

      const payload = {
        tema: formData.tema,
        modalidad: formData.modalidad,
        fecha_inicio: new Date(formData.fecha_inicio),
        fecha_fin: new Date(formData.fecha_fin),
        organization_id: user.organization_id,
        descripcion: '',
        horas: 0,
        proveedor: '',
        costo: 0,
        estado: 'planificada',
        certificado_url: '',
        participantes: [],
        competenciasDesarrolladas: [],
        evaluacionPosterior: false,
      };

      const response = await fetch('/api/rrhh/trainings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear capacitacion');
      }

      const newTraining = await response.json();

      toast({
        title: 'Capacitacion creada',
        description: `"${newTraining.tema}" fue creada exitosamente`,
      });

      setFormData({
        tema: '',
        modalidad: 'presencial',
        fecha_inicio: '',
        fecha_fin: '',
      });

      onOpenChange(false);
      onSuccess?.();
      router.push(`/dashboard/rrhh/trainings/${newTraining.id}`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo crear la capacitacion';
      console.error('Error creating training:', error);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva Capacitacion</DialogTitle>
          <DialogDescription>
            La asignacion estructural de responsables se administra desde Mi
            Panel. Esta alta crea la capacitacion y luego permite cargar
            participantes, costos y evidencias.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tema">Tema de la capacitacion *</Label>
            <Input
              id="tema"
              placeholder="Ej: Soldadura TIG Avanzada"
              value={formData.tema}
              onChange={e => handleChange('tema', e.target.value)}
              required
              className="focus:border-emerald-500 focus:ring-emerald-500"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="modalidad">Modalidad *</Label>
            <Select
              value={formData.modalidad}
              onValueChange={value => handleChange('modalidad', value)}
            >
              <SelectTrigger className="focus:border-emerald-500 focus:ring-emerald-500">
                <SelectValue placeholder="Seleccionar modalidad..." />
              </SelectTrigger>
              <SelectContent className="z-[9999] bg-white">
                <SelectItem value="presencial">Presencial</SelectItem>
                <SelectItem value="virtual">Virtual</SelectItem>
                <SelectItem value="mixta">Mixta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha_inicio">Fecha de inicio *</Label>
              <Input
                id="fecha_inicio"
                type="date"
                value={formData.fecha_inicio}
                onChange={e => handleChange('fecha_inicio', e.target.value)}
                required
                className="focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha_fin">Fecha de fin *</Label>
              <Input
                id="fecha_fin"
                type="date"
                value={formData.fecha_fin}
                onChange={e => handleChange('fecha_fin', e.target.value)}
                required
                min={formData.fecha_inicio}
                className="focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            El responsable organizacional, el puesto y las vinculaciones ISO se
            gestionan desde Mi Panel.
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
              disabled={
                isSubmitting ||
                !formData.tema ||
                !formData.fecha_inicio ||
                !formData.fecha_fin
              }
              className="bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
            >
              {isSubmitting ? 'Creando...' : 'Crear capacitacion'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
