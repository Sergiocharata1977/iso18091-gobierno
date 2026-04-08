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
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { CompetenceCategory } from '@/types/rrhh';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface CompetenceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CompetenceFormDialog({
  open,
  onOpenChange,
  onSuccess,
}: CompetenceFormDialogProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    nombre: '',
    categoria: 'tecnica' as CompetenceCategory,
    descripcion: '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // DEBUG: Ver datos del usuario
      console.log('🔍 DEBUG - User data:', {
        user: user,
        organization_id: user?.organization_id,
      });

      // Validar que el usuario tenga organization_id
      if (!user?.organization_id) {
        console.error('❌ ERROR: Usuario sin organization_id', user);
        throw new Error('No se pudo obtener la organización del usuario');
      }

      const payload = {
        ...formData,
        organization_id: user.organization_id,
        // Valores por defecto que se editarán en el Single View
        fuente: 'interna',
        referenciaNorma: '',
        activo: true,
      };

      // DEBUG: Ver payload completo
      console.log('📦 DEBUG - Payload a enviar:', payload);

      const response = await fetch('/api/rrhh/competencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log('📡 DEBUG - Response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ ERROR - Response:', error);
        throw new Error(error.error || 'Error al crear competencia');
      }

      const newCompetence = await response.json();
      console.log('✅ SUCCESS - Competencia creada:', newCompetence);

      // Show success toast
      toast({
        title: '✅ Competencia creada',
        description: `"${newCompetence.nombre}" fue creada exitosamente`,
      });

      // Reset form
      setFormData({
        nombre: '',
        categoria: 'tecnica',
        descripcion: '',
      });

      onOpenChange(false);
      onSuccess?.();

      // Navegar al single view
      router.push(`/dashboard/rrhh/competencias/${newCompetence.id}`);
    } catch (error: any) {
      console.error('❌ Error creating competence:', error);
      toast({
        title: '❌ Error',
        description: error.message || 'No se pudo crear la competencia',
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
          <DialogTitle>Nueva Competencia</DialogTitle>
          <DialogDescription>
            Los detalles se completarán en la vista de la competencia
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre de la Competencia *</Label>
            <Input
              id="nombre"
              placeholder="Ej: Soldadura TIG, Trabajo en equipo"
              value={formData.nombre}
              onChange={e => handleChange('nombre', e.target.value)}
              required
              className="focus:ring-emerald-500 focus:border-emerald-500"
              autoFocus
            />
          </div>

          {/* Categoría */}
          <div className="space-y-2">
            <Label htmlFor="categoria">Categoría *</Label>
            <Select
              value={formData.categoria}
              onValueChange={value =>
                handleChange('categoria', value as CompetenceCategory)
              }
            >
              <SelectTrigger className="focus:ring-emerald-500 focus:border-emerald-500">
                <SelectValue placeholder="Seleccionar categoría..." />
              </SelectTrigger>
              <SelectContent className="z-[9999] bg-white">
                <SelectItem value="tecnica">Técnica</SelectItem>
                <SelectItem value="blanda">Blanda</SelectItem>
                <SelectItem value="seguridad">Seguridad</SelectItem>
                <SelectItem value="iso_9001">ISO 9001</SelectItem>
                <SelectItem value="otra">Otra</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              placeholder="Descripción breve de la competencia..."
              value={formData.descripcion}
              onChange={e => handleChange('descripcion', e.target.value)}
              rows={3}
              className="focus:ring-emerald-500 focus:border-emerald-500"
            />
            <p className="text-xs text-gray-500">
              El origen y normativa se configurarán después
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
              disabled={isSubmitting || !formData.nombre}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              {isSubmitting ? 'Creando...' : 'Crear Competencia'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
