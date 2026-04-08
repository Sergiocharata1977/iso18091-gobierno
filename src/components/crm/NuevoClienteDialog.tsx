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
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface NuevoClienteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function NuevoClienteDialog({
  open,
  onOpenChange,
  onSuccess,
}: NuevoClienteDialogProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    razon_social: '',
    nombre_comercial: '',
    cuit_cuil: '',
    tipo_cliente: 'posible_cliente',
    email: '',
    telefono: '',
    direccion: '',
    localidad: '',
    provincia: '',
    monto_estimado_compra: 0,
    probabilidad_conversion: 50,
    notas: '',
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    if (!user?.organization_id) {
      alert('No se encontró la organización del usuario');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/crm/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          organization_id: user.organization_id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear cliente');
      }

      // Reset form
      setFormData({
        razon_social: '',
        nombre_comercial: '',
        cuit_cuil: '',
        tipo_cliente: 'posible_cliente',
        email: '',
        telefono: '',
        direccion: '',
        localidad: '',
        provincia: '',
        monto_estimado_compra: 0,
        probabilidad_conversion: 50,
        notas: '',
      });

      onOpenChange(false);
      onSuccess?.();
      router.refresh();
    } catch (error: any) {
      console.error('Error creating client:', error);
      alert(error.message || 'Error al crear el cliente');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Cliente</DialogTitle>
          <DialogDescription>
            Registra un nuevo cliente potencial o existente en el CRM
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Información Básica */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Información Básica</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="razon_social">Razón Social *</Label>
                <Input
                  id="razon_social"
                  placeholder="Ej: Agropecuaria San Martín S.A."
                  value={formData.razon_social}
                  onChange={e => handleChange('razon_social', e.target.value)}
                  required
                  className="focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nombre_comercial">Nombre Comercial</Label>
                <Input
                  id="nombre_comercial"
                  placeholder="Ej: San Martín Agro"
                  value={formData.nombre_comercial}
                  onChange={e =>
                    handleChange('nombre_comercial', e.target.value)
                  }
                  className="focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cuit_cuil">CUIT/CUIL *</Label>
                <Input
                  id="cuit_cuil"
                  placeholder="20-12345678-9"
                  value={formData.cuit_cuil}
                  onChange={e => handleChange('cuit_cuil', e.target.value)}
                  required
                  className="focus:ring-emerald-500 focus:border-emerald-500"
                />
                <p className="text-xs text-gray-500">Formato: XX-XXXXXXXX-X</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo_cliente">Tipo de Cliente *</Label>
                <Select
                  value={formData.tipo_cliente}
                  onValueChange={value => handleChange('tipo_cliente', value)}
                >
                  <SelectTrigger className="focus:ring-emerald-500 focus:border-emerald-500">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="posible_cliente">
                      🔍 Posible Cliente
                    </SelectItem>
                    <SelectItem value="cliente_frecuente">
                      ⭐ Cliente Frecuente
                    </SelectItem>
                    <SelectItem value="cliente_antiguo">
                      📅 Cliente Antiguo
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Contacto */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Contacto</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contacto@ejemplo.com"
                  value={formData.email}
                  onChange={e => handleChange('email', e.target.value)}
                  className="focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  placeholder="+54 9 11 1234-5678"
                  value={formData.telefono}
                  onChange={e => handleChange('telefono', e.target.value)}
                  className="focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Ubicación */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Ubicación</h3>

            <div className="space-y-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input
                id="direccion"
                placeholder="Ruta 5 Km 120"
                value={formData.direccion}
                onChange={e => handleChange('direccion', e.target.value)}
                className="focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="localidad">Localidad</Label>
                <Input
                  id="localidad"
                  placeholder="San Martín"
                  value={formData.localidad}
                  onChange={e => handleChange('localidad', e.target.value)}
                  className="focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="provincia">Provincia</Label>
                <Input
                  id="provincia"
                  placeholder="Buenos Aires"
                  value={formData.provincia}
                  onChange={e => handleChange('provincia', e.target.value)}
                  className="focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Información Comercial */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Información Comercial</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monto_estimado">
                  Monto Estimado de Compra ($)
                </Label>
                <Input
                  id="monto_estimado"
                  type="number"
                  placeholder="500000"
                  value={formData.monto_estimado_compra}
                  onChange={e =>
                    handleChange(
                      'monto_estimado_compra',
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className="focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="probabilidad">
                  Probabilidad de Conversión (%)
                </Label>
                <Input
                  id="probabilidad"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="50"
                  value={formData.probabilidad_conversion}
                  onChange={e =>
                    handleChange(
                      'probabilidad_conversion',
                      parseInt(e.target.value) || 0
                    )
                  }
                  className="focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              placeholder="Información adicional sobre el cliente..."
              className="resize-none focus:ring-emerald-500 focus:border-emerald-500"
              rows={3}
              value={formData.notas}
              onChange={e => handleChange('notas', e.target.value)}
            />
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
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              {isSubmitting ? 'Creando...' : 'Crear Cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
