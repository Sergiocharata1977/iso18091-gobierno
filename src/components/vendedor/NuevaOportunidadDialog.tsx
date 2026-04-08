// src/components/vendedor/NuevaOportunidadDialog.tsx
// Formulario pantalla completa para crear nueva oportunidad

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { ClienteCRM, EstadoClienteKanban } from '@/types/crm';
import { Loader2, Plus, Target, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { QuickAddContacto } from './QuickAddContacto';
import { QuickAddOrganizacion } from './QuickAddOrganizacion';

interface NuevaOportunidadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  organizationId: string;
  vendedorId: string;
  vendedorNombre: string;
}

export function NuevaOportunidadDialog({
  open,
  onOpenChange,
  onSuccess,
  organizationId,
  vendedorId,
  vendedorNombre,
}: NuevaOportunidadDialogProps) {
  const [saving, setSaving] = useState(false);
  const [organizaciones, setOrganizaciones] = useState<ClienteCRM[]>([]);
  const [contactos, setContactos] = useState<any[]>([]);
  const [estados, setEstados] = useState<EstadoClienteKanban[]>([]);

  // Form state
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [organizacionId, setOrganizacionId] = useState('');
  const [contactoId, setContactoId] = useState('');
  const [estadoId, setEstadoId] = useState('');
  const [monto, setMonto] = useState('');

  // Quick-add dialogs
  const [showQuickAddOrg, setShowQuickAddOrg] = useState(false);
  const [showQuickAddContacto, setShowQuickAddContacto] = useState(false);

  useEffect(() => {
    if (!open) return;

    const loadData = async () => {
      try {
        // Cargar organizaciones
        const orgRes = await fetch(
          `/api/crm/clientes?organization_id=${organizationId}`
        );
        const orgData = await orgRes.json();
        if (orgData.success) {
          setOrganizaciones(orgData.data);
        }

        // Cargar estados
        const estadosRes = await fetch(
          `/api/crm/kanban/estados?organization_id=${organizationId}`
        );
        const estadosData = await estadosRes.json();
        if (estadosData.success) {
          setEstados(estadosData.data);
          if (estadosData.data.length > 0) {
            setEstadoId(estadosData.data[0].id);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, [open, organizationId]);

  // Cargar contactos cuando se selecciona una organización
  useEffect(() => {
    if (!organizacionId) {
      setContactos([]);
      setContactoId('');
      return;
    }

    const loadContactos = async () => {
      try {
        const res = await fetch(
          `/api/crm/contactos?organization_id=${organizationId}&cliente_id=${organizacionId}`
        );
        const data = await res.json();
        if (data.success) {
          setContactos(data.data || []);
        }
      } catch (error) {
        console.error('Error loading contacts:', error);
      }
    };

    loadContactos();
  }, [organizacionId, organizationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !organizacionId) return;

    setSaving(true);
    try {
      const org = organizaciones.find(o => o.id === organizacionId);
      const contacto = contactos.find(c => c.id === contactoId);
      const estado = estados.find(e => e.id === estadoId) || estados[0];

      const res = await fetch('/api/crm/oportunidades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: organizationId,
          user_id: vendedorId,
          nombre,
          descripcion,
          crm_organizacion_id: organizacionId,
          organizacion_nombre: org?.razon_social || '',
          organizacion_cuit: org?.cuit_cuil || '',
          contacto_id: contactoId || undefined,
          contacto_nombre: contacto
            ? `${contacto.nombre} ${contacto.apellido}`
            : undefined,
          vendedor_id: vendedorId,
          vendedor_nombre: vendedorNombre,
          estado_kanban_id: estado.id,
          estado_kanban_nombre: estado.nombre,
          estado_kanban_color: estado.color,
          monto_estimado: parseFloat(monto) || 0,
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Reset form
        setNombre('');
        setDescripcion('');
        setOrganizacionId('');
        setContactoId('');
        setMonto('');
        onOpenChange(false);
        onSuccess();
      } else {
        alert('Error al crear oportunidad: ' + data.error);
      }
    } catch (error) {
      console.error('Error creating opportunity:', error);
      alert('Error al crear oportunidad');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickAddOrgSuccess = (org: {
    id: string;
    razon_social: string;
  }) => {
    setOrganizaciones(prev => [
      ...prev,
      { id: org.id, razon_social: org.razon_social } as ClienteCRM,
    ]);
    setOrganizacionId(org.id);
  };

  const handleQuickAddContactoSuccess = (contacto: {
    id: string;
    nombre: string;
    apellido: string;
  }) => {
    setContactos(prev => [...prev, contacto]);
    setContactoId(contacto.id);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-full h-full m-0 p-0 rounded-none">
          {/* Header fijo */}
          <div className="sticky top-0 z-50 bg-white border-b px-4 py-3">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2 text-purple-700">
                  <Target className="h-5 w-5" />
                  Nueva Oportunidad
                </DialogTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                  className="touch-target"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </DialogHeader>
          </div>

          {/* Formulario scrolleable */}
          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Nombre */}
              <div>
                <Label htmlFor="nombre-op">
                  Nombre de la Oportunidad{' '}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nombre-op"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej: Venta de Semillas Campaña 2026"
                  required
                  autoFocus
                  className="touch-target"
                />
              </div>

              {/* Descripción */}
              <div>
                <Label htmlFor="descripcion-op">Descripción</Label>
                <Textarea
                  id="descripcion-op"
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  placeholder="Detalle de la oportunidad..."
                  rows={3}
                  className="touch-target resize-none"
                />
              </div>

              {/* Organización */}
              <div>
                <Label htmlFor="organizacion-op">
                  Organización <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <Select
                    value={organizacionId}
                    onValueChange={setOrganizacionId}
                  >
                    <SelectTrigger className="flex-1 touch-target">
                      <SelectValue placeholder="Seleccionar organización" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizaciones.map(org => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.razon_social}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowQuickAddOrg(true)}
                    className="flex-shrink-0 touch-target"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Contacto */}
              {organizacionId && (
                <div>
                  <Label htmlFor="contacto-op">Contacto (opcional)</Label>
                  <div className="flex gap-2">
                    <Select value={contactoId} onValueChange={setContactoId}>
                      <SelectTrigger className="flex-1 touch-target">
                        <SelectValue placeholder="Seleccionar contacto" />
                      </SelectTrigger>
                      <SelectContent>
                        {contactos.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nombre} {c.apellido}
                            {c.cargo && ` - ${c.cargo}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowQuickAddContacto(true)}
                      className="flex-shrink-0 touch-target"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Estado y Monto */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="estado-op">Estado Inicial</Label>
                  <Select value={estadoId} onValueChange={setEstadoId}>
                    <SelectTrigger className="touch-target">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {estados.map(e => (
                        <SelectItem key={e.id} value={e.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: e.color }}
                            />
                            {e.nombre}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="monto-op">Monto Estimado ($)</Label>
                  <Input
                    id="monto-op"
                    type="number"
                    value={monto}
                    onChange={e => setMonto(e.target.value)}
                    placeholder="100000"
                    className="touch-target"
                  />
                </div>
              </div>

              {/* Info del vendedor */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Vendedor asignado:</span>{' '}
                  {vendedorNombre}
                </p>
              </div>
            </div>

            {/* Footer fijo */}
            <div className="sticky bottom-0 bg-white border-t p-4 flex gap-3">
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
                className="flex-1 bg-purple-600 hover:bg-purple-700 touch-target"
                disabled={saving || !nombre.trim() || !organizacionId}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  'Crear Oportunidad'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick-add dialogs */}
      <QuickAddOrganizacion
        open={showQuickAddOrg}
        onOpenChange={setShowQuickAddOrg}
        onSuccess={handleQuickAddOrgSuccess}
        organizationId={organizationId}
      />

      {organizacionId && (
        <QuickAddContacto
          open={showQuickAddContacto}
          onOpenChange={setShowQuickAddContacto}
          onSuccess={handleQuickAddContactoSuccess}
          organizationId={organizationId}
          clienteId={organizacionId}
        />
      )}
    </>
  );
}
