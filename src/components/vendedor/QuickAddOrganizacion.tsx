// src/components/vendedor/QuickAddOrganizacion.tsx
// Modal rápido para agregar una nueva organización

'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface QuickAddOrganizacionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (organizacion: { id: string; razon_social: string }) => void;
  organizationId: string;
}

export function QuickAddOrganizacion({
  open,
  onOpenChange,
  onSuccess,
  organizationId,
}: QuickAddOrganizacionProps) {
  const [saving, setSaving] = useState(false);
  const [razonSocial, setRazonSocial] = useState('');
  const [cuit, setCuit] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!razonSocial.trim()) return;

    setSaving(true);
    try {
      const res = await fetch('/api/crm/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: organizationId,
          razon_social: razonSocial,
          cuit_cuil: cuit,
          telefono,
          email,
          tipo: 'prospecto',
        }),
      });

      const data = await res.json();
      if (data.success) {
        onSuccess({ id: data.data.id, razon_social: razonSocial });
        // Reset form
        setRazonSocial('');
        setCuit('');
        setTelefono('');
        setEmail('');
        onOpenChange(false);
      } else {
        alert('Error al crear organización: ' + data.error);
      }
    } catch (error) {
      console.error('Error creating organization:', error);
      alert('Error al crear organización');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-blue-700">
            <Building2 className="h-5 w-5" />
            Nueva Organización
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="razon-social">
              Razón Social <span className="text-red-500">*</span>
            </Label>
            <Input
              id="razon-social"
              value={razonSocial}
              onChange={e => setRazonSocial(e.target.value)}
              placeholder="Ej: Agro Norte S.A."
              required
              autoFocus
              className="touch-target"
            />
          </div>

          <div>
            <Label htmlFor="cuit">CUIT/CUIL</Label>
            <Input
              id="cuit"
              value={cuit}
              onChange={e => setCuit(e.target.value)}
              placeholder="20-12345678-9"
              className="touch-target"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                type="tel"
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
                placeholder="+54 9 11 1234-5678"
                className="touch-target"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="contacto@empresa.com"
                className="touch-target"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 touch-target"
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 touch-target"
              disabled={saving || !razonSocial.trim()}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Crear Organización'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
