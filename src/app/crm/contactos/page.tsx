/**
 * Página de listado de Contactos CRM
 */

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import type { ClienteCRM } from '@/types/crm';
import type { ContactoCRM } from '@/types/crm-contacto';
import {
  Building2,
  Eye,
  Loader2,
  Mail,
  Phone,
  Plus,
  Search,
  UserCircle,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ContactosPage() {
  const { user, loading: authLoading } = useAuth();
  const [contactos, setContactos] = useState<ContactoCRM[]>([]);
  const [clientes, setClientes] = useState<ClienteCRM[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCliente, setFilterCliente] = useState<string>('all');
  const [showNuevoContactoDialog, setShowNuevoContactoDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedContacto, setSelectedContacto] = useState<ContactoCRM | null>(
    null
  );

  // Form state
  const [formNombre, setFormNombre] = useState('');
  const [formApellido, setFormApellido] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formTelefono, setFormTelefono] = useState('');
  const [formCargo, setFormCargo] = useState('');
  const [formClienteId, setFormClienteId] = useState('');
  const [formNotas, setFormNotas] = useState('');

  const organizationId = user?.organization_id;

  const loadData = async () => {
    if (!organizationId) {
      setError('No se encontró la organización');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Cargar contactos
      const contactosRes = await fetch(
        `/api/crm/contactos?organization_id=${organizationId}`
      );
      const contactosData = await contactosRes.json();
      if (contactosData.success) {
        setContactos(contactosData.data || []);
      }

      // Cargar clientes para el filtro y form
      const clientesRes = await fetch(
        `/api/crm/clientes?organization_id=${organizationId}`
      );
      const clientesData = await clientesRes.json();
      if (clientesData.success) {
        setClientes(clientesData.data || []);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (organizationId) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [authLoading, organizationId]);

  // Crear nuevo contacto
  const handleCrearContacto = async () => {
    if (!formNombre || !formTelefono) {
      alert('Nombre y teléfono son requeridos');
      return;
    }

    setSaving(true);
    try {
      const cliente = clientes.find(c => c.id === formClienteId);

      const res = await fetch('/api/crm/contactos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: organizationId,
          nombre: formNombre,
          apellido: formApellido,
          email: formEmail,
          telefono: formTelefono,
          cargo: formCargo,
          crm_organizacion_id: formClienteId || undefined,
          empresa: cliente?.razon_social || undefined,
          notas: formNotas,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setShowNuevoContactoDialog(false);
        resetForm();
        loadData();
      } else {
        alert(data.error || 'Error al crear contacto');
      }
    } catch (error) {
      console.error('Error creating contact:', error);
      alert('Error al crear contacto');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormNombre('');
    setFormApellido('');
    setFormEmail('');
    setFormTelefono('');
    setFormCargo('');
    setFormClienteId('');
    setFormNotas('');
  };

  // Filtrar contactos
  const filteredContactos = contactos.filter(contacto => {
    const fullName =
      `${contacto.nombre} ${contacto.apellido || ''}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchTerm.toLowerCase()) ||
      contacto.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contacto.telefono?.includes(searchTerm);

    const matchesCliente =
      filterCliente === 'all' || contacto.crm_organizacion_id === filterCliente;

    return matchesSearch && matchesCliente;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            Contactos
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Personas de contacto de las organizaciones
          </p>
        </div>
        <Button
          onClick={() => setShowNuevoContactoDialog(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Contacto
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre, email o teléfono..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterCliente} onValueChange={setFilterCliente}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Filtrar por organización" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las organizaciones</SelectItem>
            {clientes.map(cliente => (
              <SelectItem key={cliente.id} value={cliente.id}>
                {cliente.razon_social}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Contador */}
      <p className="text-sm text-gray-500">
        Mostrando {filteredContactos.length} de {contactos.length} contactos
      </p>

      {/* Tabla */}
      {error ? (
        <div className="text-center py-8 text-red-600">{error}</div>
      ) : filteredContactos.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border">
          <UserCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay contactos
          </h3>
          <p className="text-gray-500 mb-4">
            {searchTerm
              ? 'No se encontraron resultados para tu búsqueda'
              : 'Comienza agregando tu primer contacto'}
          </p>
          {!searchTerm && (
            <Button onClick={() => setShowNuevoContactoDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Contacto
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Organización</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContactos.map(contacto => (
                <TableRow key={contacto.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <UserCircle className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-semibold">
                          {contacto.nombre} {contacto.apellido}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Building2 className="h-3 w-3" />
                      <span>{contacto.empresa || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell>{contacto.cargo || '-'}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {contacto.email && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Mail className="h-3 w-3" />
                          <span className="truncate max-w-32">
                            {contacto.email}
                          </span>
                        </div>
                      )}
                      {contacto.telefono && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Phone className="h-3 w-3" />
                          <span>{contacto.telefono}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        contacto.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {contacto.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedContacto(contacto)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog Nuevo Contacto */}
      <Dialog
        open={showNuevoContactoDialog}
        onOpenChange={setShowNuevoContactoDialog}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-blue-700 flex items-center gap-2">
              <UserCircle className="h-5 w-5" />
              Nuevo Contacto
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nombre *</Label>
                <Input
                  value={formNombre}
                  onChange={e => setFormNombre(e.target.value)}
                  placeholder="Juan"
                />
              </div>
              <div>
                <Label>Apellido</Label>
                <Input
                  value={formApellido}
                  onChange={e => setFormApellido(e.target.value)}
                  placeholder="Pérez"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  placeholder="juan@empresa.com"
                />
              </div>
              <div>
                <Label>Teléfono *</Label>
                <Input
                  value={formTelefono}
                  onChange={e => setFormTelefono(e.target.value)}
                  placeholder="+54 9 11 1234-5678"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cargo</Label>
                <Input
                  value={formCargo}
                  onChange={e => setFormCargo(e.target.value)}
                  placeholder="Gerente Comercial"
                />
              </div>
              <div>
                <Label>Organización</Label>
                <Select value={formClienteId} onValueChange={setFormClienteId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map(cliente => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.razon_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Notas</Label>
              <Textarea
                value={formNotas}
                onChange={e => setFormNotas(e.target.value)}
                placeholder="Notas adicionales..."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowNuevoContactoDialog(false);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCrearContacto}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Crear Contacto
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Detalle Contacto */}
      <Dialog
        open={!!selectedContacto}
        onOpenChange={open => {
          if (!open) setSelectedContacto(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-purple-700 flex items-center gap-2">
              <UserCircle className="h-5 w-5" />
              {selectedContacto?.nombre} {selectedContacto?.apellido}
            </DialogTitle>
          </DialogHeader>

          {selectedContacto && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 font-medium">
                    Organización
                  </p>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Building2 className="h-3 w-3 text-blue-500" />
                    {selectedContacto.empresa || 'Sin asignar'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Cargo</p>
                  <p className="text-sm font-medium">
                    {selectedContacto.cargo || '-'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Email</p>
                  <p className="text-sm flex items-center gap-1">
                    <Mail className="h-3 w-3 text-gray-400" />
                    {selectedContacto.email || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Teléfono</p>
                  <p className="text-sm flex items-center gap-1">
                    <Phone className="h-3 w-3 text-gray-400" />
                    {selectedContacto.telefono || '-'}
                  </p>
                </div>
              </div>

              {selectedContacto.whatsapp && (
                <div>
                  <p className="text-xs text-gray-500 font-medium">WhatsApp</p>
                  <p className="text-sm">{selectedContacto.whatsapp}</p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-500 font-medium">Estado:</p>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    selectedContacto.isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {selectedContacto.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              {selectedContacto.notas && (
                <div>
                  <p className="text-xs text-gray-500 font-medium">Notas</p>
                  <p className="text-sm bg-gray-50 rounded p-3">
                    {selectedContacto.notas}
                  </p>
                </div>
              )}

              {selectedContacto.created_at && (
                <p className="text-xs text-gray-400">
                  Creado:{' '}
                  {new Date(selectedContacto.created_at).toLocaleDateString(
                    'es-AR'
                  )}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
