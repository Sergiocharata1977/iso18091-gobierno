// src/components/crm/ContactosPanel.tsx
// Panel de ABM para Contactos de una organización

'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import type { ContactoCRM } from '@/types/crm-contacto';
import { Edit, Loader2, Mail, Phone, Plus, Trash2, User } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Props {
  clienteId: string;
  clienteNombre: string;
}

export function ContactosPanel({ clienteId, clienteNombre }: Props) {
  const { user } = useAuth();
  const organizationId = user?.organization_id || '';

  const [contactos, setContactos] = useState<ContactoCRM[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [cargo, setCargo] = useState('');
  const [notas, setNotas] = useState('');

  const loadContactos = async () => {
    if (!organizationId || !clienteId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/crm/contactos?organization_id=${organizationId}&crm_organizacion_id=${clienteId}`
      );
      const data = await res.json();
      if (data.success) {
        setContactos(data.data);
      }
    } catch (error) {
      console.error('Error loading contactos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContactos();
  }, [organizationId, clienteId]);

  const resetForm = () => {
    setNombre('');
    setApellido('');
    setEmail('');
    setTelefono('');
    setWhatsapp('');
    setCargo('');
    setNotas('');
    setEditingId(null);
  };

  const openNew = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (contacto: ContactoCRM) => {
    setNombre(contacto.nombre);
    setApellido(contacto.apellido || '');
    setEmail(contacto.email || '');
    setTelefono(contacto.telefono);
    setWhatsapp(contacto.whatsapp || '');
    setCargo(contacto.cargo || '');
    setNotas(contacto.notas || '');
    setEditingId(contacto.id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!nombre || !telefono) {
      alert('Nombre y teléfono son requeridos');
      return;
    }

    setSaving(true);
    try {
      const url = editingId
        ? `/api/crm/contactos/${editingId}`
        : '/api/crm/contactos';
      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: organizationId,
          crm_organizacion_id: clienteId,
          nombre,
          apellido,
          email,
          telefono,
          whatsapp: whatsapp || telefono,
          cargo,
          empresa: clienteNombre,
          notas,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        resetForm();
        loadContactos();
      } else {
        alert(data.error || 'Error al guardar');
      }
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este contacto?')) return;
    try {
      await fetch(`/api/crm/contactos/${id}`, { method: 'DELETE' });
      loadContactos();
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <Loader2 className="w-6 h-6 mx-auto animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-sm border-0">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-emerald-600" />
            Contactos de la Organización
          </CardTitle>
          <Button
            size="sm"
            onClick={openNew}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4 mr-1" />
            Nuevo Contacto
          </Button>
        </CardHeader>
        <CardContent>
          {contactos.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <User className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <p>No hay contactos registrados</p>
              <p className="text-sm">
                Agregue el primer contacto de esta organización
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {contactos.map(contacto => (
                <div
                  key={contacto.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-100 p-2 rounded-full">
                      <User className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {contacto.nombre} {contacto.apellido}
                        {contacto.cargo && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {contacto.cargo}
                          </Badge>
                        )}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        {contacto.telefono && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {contacto.telefono}
                          </span>
                        )}
                        {contacto.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {contacto.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(contacto)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(contacto.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-emerald-700">
              {editingId ? '✏️ Editar Contacto' : '➕ Nuevo Contacto'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nombre *</Label>
                <Input
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Juan"
                />
              </div>
              <div>
                <Label>Apellido</Label>
                <Input
                  value={apellido}
                  onChange={e => setApellido(e.target.value)}
                  placeholder="Pérez"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Teléfono *</Label>
                <Input
                  value={telefono}
                  onChange={e => setTelefono(e.target.value)}
                  placeholder="+54 3731..."
                />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input
                  value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value)}
                  placeholder="Igual al teléfono si vacío"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="contacto@empresa.com"
                />
              </div>
              <div>
                <Label>Cargo</Label>
                <Input
                  value={cargo}
                  onChange={e => setCargo(e.target.value)}
                  placeholder="Gerente, Contador..."
                />
              </div>
            </div>

            <div>
              <Label>Notas</Label>
              <Textarea
                value={notas}
                onChange={e => setNotas(e.target.value)}
                placeholder="Observaciones sobre este contacto..."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingId ? 'Guardar Cambios' : 'Crear Contacto'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
