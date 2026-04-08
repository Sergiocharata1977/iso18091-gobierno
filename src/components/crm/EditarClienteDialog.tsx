// src/components/crm/EditarClienteDialog.tsx
// Dialog para editar cliente del CRM

'use client';

import { ClasificacionesSection } from '@/components/crm/clasificaciones/ClasificacionesSection';
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
import { Textarea } from '@/components/ui/textarea';
import type { ClienteCRM } from '@/types/crm';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface EditarClienteDialogProps {
  cliente: ClienteCRM;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

export function EditarClienteDialog({
  cliente,
  open,
  onOpenChange,
  onSave,
}: EditarClienteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [classifications, setClassifications] = useState(
    cliente.classifications || {}
  );

  const [formData, setFormData] = useState({
    razon_social: cliente.razon_social || '',
    nombre_comercial: cliente.nombre_comercial || '',
    cuit_cuil: cliente.cuit_cuil || '',
    email: cliente.email || '',
    telefono: cliente.telefono || '',
    direccion: cliente.direccion || '',
    localidad: cliente.localidad || '',
    provincia: cliente.provincia || '',
    monto_estimado_compra: cliente.monto_estimado_compra || 0,
    probabilidad_conversion: cliente.probabilidad_conversion || 50,
    notas: cliente.notas || '',
  });

  useEffect(() => {
    setClassifications(cliente.classifications || {});
    setFormData({
      razon_social: cliente.razon_social || '',
      nombre_comercial: cliente.nombre_comercial || '',
      cuit_cuil: cliente.cuit_cuil || '',
      email: cliente.email || '',
      telefono: cliente.telefono || '',
      direccion: cliente.direccion || '',
      localidad: cliente.localidad || '',
      provincia: cliente.provincia || '',
      monto_estimado_compra: cliente.monto_estimado_compra || 0,
      probabilidad_conversion: cliente.probabilidad_conversion || 50,
      notas: cliente.notas || '',
    });
  }, [cliente]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]:
        name === 'monto_estimado_compra' || name === 'probabilidad_conversion'
          ? Number(value)
          : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/crm/clientes/${cliente.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al actualizar');
      }

      onSave();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
          <DialogDescription>
            Modifica la información del cliente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="razon_social">Razón Social *</Label>
              <Input
                id="razon_social"
                name="razon_social"
                value={formData.razon_social}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre_comercial">Nombre Comercial</Label>
              <Input
                id="nombre_comercial"
                name="nombre_comercial"
                value={formData.nombre_comercial}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cuit_cuil">CUIT/CUIL *</Label>
              <Input
                id="cuit_cuil"
                name="cuit_cuil"
                value={formData.cuit_cuil}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input
                id="direccion"
                name="direccion"
                value={formData.direccion}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="localidad">Localidad</Label>
              <Input
                id="localidad"
                name="localidad"
                value={formData.localidad}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="provincia">Provincia</Label>
              <Input
                id="provincia"
                name="provincia"
                value={formData.provincia}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="monto_estimado_compra">
                Monto Estimado de Compra ($)
              </Label>
              <Input
                id="monto_estimado_compra"
                name="monto_estimado_compra"
                type="number"
                value={formData.monto_estimado_compra}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="probabilidad_conversion">
                Probabilidad Conversión (%)
              </Label>
              <Input
                id="probabilidad_conversion"
                name="probabilidad_conversion"
                type="number"
                min="0"
                max="100"
                value={formData.probabilidad_conversion}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              name="notas"
              value={formData.notas}
              onChange={handleChange}
              rows={3}
            />
          </div>

          <ClasificacionesSection
            entidadId={cliente.id}
            entidadTipo="cliente"
            classificationsActuales={classifications}
            modoEdicion={true}
            onUpdate={newClassifications => {
              setClassifications(newClassifications);
              onSave();
            }}
          />

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
