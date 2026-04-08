// src/components/vendedor/QuickAddContacto.tsx
// Modal rápido para agregar un nuevo contacto

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
import { Loader2, User } from 'lucide-react';
import { useState } from 'react';

interface QuickAddContactoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (contacto: {
    id: string;
    nombre: string;
    apellido: string;
  }) => void;
  organizationId: string;
  clienteId: string;
}

export function QuickAddContacto({
  open,
  onOpenChange,
  onSuccess,
  organizationId,
  clienteId,
}: QuickAddContactoProps) {
  const [saving, setSaving] = useState(false);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [cargo, setCargo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !apellido.trim()) return;

    setSaving(true);
    try {
      const res = await fetch('/api/crm/contactos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: organizationId,
          cliente_id: clienteId,
          nombre,
          apellido,
          cargo,
          telefono,
          email,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onSuccess({ id: data.data.id, nombre, apellido });
        // Reset form
        setNombre('');
        setApellido('');
        setCargo('');
        setTelefono('');
        setEmail('');
        onOpenChange(false);
      } else {
        alert('Error al crear contacto: ' + data.error);
      }
    } catch (error) {
      console.error('Error creating contact:', error);
      alert('Error al crear contacto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-700">
            <User className="h-5 w-5" />
            Nuevo Contacto
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="nombre">
                Nombre <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nombre"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Juan"
                required
                autoFocus
                className="touch-target"
              />
            </div>
            <div>
              <Label htmlFor="apellido">
                Apellido <span className="text-red-500">*</span>
              </Label>
              <Input
                id="apellido"
                value={apellido}
                onChange={e => setApellido(e.target.value)}
                placeholder="Pérez"
                required
                className="touch-target"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="cargo">Cargo</Label>
            <Input
              id="cargo"
              value={cargo}
              onChange={e => setCargo(e.target.value)}
              placeholder="Gerente de Compras"
              className="touch-target"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="telefono-contacto">Teléfono</Label>
              <Input
                id="telefono-contacto"
                type="tel"
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
                placeholder="+54 9 11 1234-5678"
                className="touch-target"
              />
            </div>
            <div>
              <Label htmlFor="email-contacto">Email</Label>
              <Input
                id="email-contacto"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="juan@empresa.com"
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
              className="flex-1 bg-green-600 hover:bg-green-700 touch-target"
              disabled={saving || !nombre.trim() || !apellido.trim()}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Crear Contacto'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
