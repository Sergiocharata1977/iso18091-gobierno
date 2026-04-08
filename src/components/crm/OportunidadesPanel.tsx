// src/components/crm/OportunidadesPanel.tsx
// Panel de ABM para Oportunidades de una organización

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import type { EstadoClienteKanban } from '@/types/crm';
import type { ContactoCRM } from '@/types/crm-contacto';
import type { OportunidadCRM } from '@/types/crm-oportunidad';
import {
  Calendar,
  DollarSign,
  Edit,
  Loader2,
  Plus,
  Target,
  Trash2,
  TrendingUp,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface Props {
  clienteId: string;
  clienteNombre: string;
  clienteCuit?: string;
}

interface Personal {
  id: string;
  nombre: string;
  apellido: string;
  rol?: string;
}

export function OportunidadesPanel({
  clienteId,
  clienteNombre,
  clienteCuit,
}: Props) {
  const { user } = useAuth();
  const organizationId = user?.organization_id || '';

  const [oportunidades, setOportunidades] = useState<OportunidadCRM[]>([]);
  const [contactos, setContactos] = useState<ContactoCRM[]>([]);
  const [vendedores, setVendedores] = useState<Personal[]>([]);
  const [estados, setEstados] = useState<EstadoClienteKanban[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [contactoId, setContactoId] = useState('');
  const [vendedorId, setVendedorId] = useState('');
  const [estadoId, setEstadoId] = useState('');
  const [montoEstimado, setMontoEstimado] = useState('');
  const [probabilidad, setProbabilidad] = useState('50');
  const [fechaCierreEstimada, setFechaCierreEstimada] = useState('');

  const loadData = async () => {
    if (!organizationId || !clienteId) return;
    setLoading(true);
    try {
      // Cargar oportunidades
      const oportunidadesRes = await fetch(
        `/api/crm/oportunidades?organization_id=${organizationId}&crm_organizacion_id=${clienteId}`
      );
      const oportunidadesData = await oportunidadesRes.json();
      if (oportunidadesData.success) {
        setOportunidades(oportunidadesData.data);
      }

      // Cargar contactos de esta organización
      const contactosRes = await fetch(
        `/api/crm/contactos?organization_id=${organizationId}&crm_organizacion_id=${clienteId}`
      );
      const contactosData = await contactosRes.json();
      if (contactosData.success) {
        setContactos(contactosData.data);
      }

      // Cargar vendedores (personal)
      const vendedoresRes = await fetch(
        `/api/rrhh/personnel?organization_id=${organizationId}`
      );
      const vendedoresData = await vendedoresRes.json();
      if (vendedoresData.success) {
        setVendedores(vendedoresData.data || []);
      }

      // Cargar estados Kanban
      const estadosRes = await fetch(
        `/api/crm/kanban/estados?organization_id=${organizationId}`
      );
      const estadosData = await estadosRes.json();
      if (estadosData.success) {
        setEstados(estadosData.data);
        // Setear estado inicial por defecto
        if (estadosData.data.length > 0 && !estadoId) {
          setEstadoId(estadosData.data[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [organizationId, clienteId]);

  const resetForm = () => {
    setNombre('');
    setDescripcion('');
    setContactoId('');
    setVendedorId('');
    setEstadoId(estados.length > 0 ? estados[0].id : '');
    setMontoEstimado('');
    setProbabilidad('50');
    setFechaCierreEstimada('');
    setEditingId(null);
  };

  const openNew = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (oportunidad: OportunidadCRM) => {
    setNombre(oportunidad.nombre);
    setDescripcion(oportunidad.descripcion || '');
    setContactoId(oportunidad.contacto_id || '');
    setVendedorId(oportunidad.vendedor_id);
    setEstadoId(oportunidad.estado_kanban_id);
    setMontoEstimado(oportunidad.monto_estimado?.toString() || '');
    setProbabilidad(oportunidad.probabilidad?.toString() || '50');
    setFechaCierreEstimada(oportunidad.fecha_cierre_estimada || '');
    setEditingId(oportunidad.id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!nombre || !vendedorId || !estadoId) {
      alert('Nombre, Vendedor y Estado son requeridos');
      return;
    }

    setSaving(true);
    try {
      const selectedVendedor = vendedores.find(v => v.id === vendedorId);
      const selectedContacto = contactos.find(c => c.id === contactoId);
      const selectedEstado = estados.find(e => e.id === estadoId);

      const url = editingId
        ? `/api/crm/oportunidades/${editingId}`
        : '/api/crm/oportunidades';
      const method = editingId ? 'PATCH' : 'POST';

      const body = editingId
        ? {
            nombre,
            descripcion,
            contacto_id: contactoId || null,
            contacto_nombre: selectedContacto
              ? `${selectedContacto.nombre} ${selectedContacto.apellido || ''}`.trim()
              : null,
            vendedor_id: vendedorId,
            vendedor_nombre: selectedVendedor
              ? `${selectedVendedor.nombre} ${selectedVendedor.apellido}`.trim()
              : '',
            monto_estimado: parseFloat(montoEstimado) || 0,
            probabilidad: parseInt(probabilidad) || 50,
            fecha_cierre_estimada: fechaCierreEstimada || null,
          }
        : {
            organization_id: organizationId,
            user_id: user?.id || 'sistema',
            nombre,
            descripcion,
            crm_organizacion_id: clienteId,
            organizacion_nombre: clienteNombre,
            organizacion_cuit: clienteCuit || '',
            contacto_id: contactoId || null,
            contacto_nombre: selectedContacto
              ? `${selectedContacto.nombre} ${selectedContacto.apellido || ''}`.trim()
              : null,
            vendedor_id: vendedorId,
            vendedor_nombre: selectedVendedor
              ? `${selectedVendedor.nombre} ${selectedVendedor.apellido}`.trim()
              : '',
            estado_kanban_id: estadoId,
            estado_kanban_nombre: selectedEstado?.nombre || '',
            estado_kanban_color: selectedEstado?.color || '#6b7280',
            monto_estimado: parseFloat(montoEstimado) || 0,
            probabilidad: parseInt(probabilidad) || 50,
            fecha_cierre_estimada: fechaCierreEstimada || null,
          };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        resetForm();
        loadData();
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
    if (!confirm('¿Eliminar esta oportunidad?')) return;
    try {
      await fetch(`/api/crm/oportunidades/${id}`, { method: 'DELETE' });
      loadData();
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const getResultadoColor = (resultado?: string) => {
    switch (resultado) {
      case 'ganada':
        return 'bg-green-100 text-green-800';
      case 'perdida':
        return 'bg-red-100 text-red-800';
      case 'cancelada':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
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
            <Target className="h-5 w-5 text-purple-600" />
            Oportunidades de Negocio
          </CardTitle>
          <Button
            size="sm"
            onClick={openNew}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="h-4 w-4 mr-1" />
            Nueva Oportunidad
          </Button>
        </CardHeader>
        <CardContent>
          {oportunidades.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Target className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <p>No hay oportunidades registradas</p>
              <p className="text-sm">
                Agregue la primera oportunidad de negocio
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {oportunidades.map(oportunidad => (
                <div
                  key={oportunidad.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900">
                        {oportunidad.nombre}
                      </p>
                      <Badge
                        style={{
                          backgroundColor:
                            oportunidad.estado_kanban_color + '20',
                          color: oportunidad.estado_kanban_color,
                          borderColor: oportunidad.estado_kanban_color,
                        }}
                        variant="outline"
                      >
                        {oportunidad.estado_kanban_nombre}
                      </Badge>
                      {oportunidad.resultado && (
                        <Badge
                          className={getResultadoColor(oportunidad.resultado)}
                        >
                          {oportunidad.resultado.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {oportunidad.monto_estimado > 0 && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />$
                          {oportunidad.monto_estimado.toLocaleString('es-AR')}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {oportunidad.probabilidad}%
                      </span>
                      {oportunidad.vendedor_nombre && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {oportunidad.vendedor_nombre}
                        </span>
                      )}
                      {oportunidad.fecha_cierre_estimada && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(
                            oportunidad.fecha_cierre_estimada
                          ).toLocaleDateString('es-AR')}
                        </span>
                      )}
                    </div>
                    {oportunidad.contacto_nombre && (
                      <p className="text-xs text-gray-400 mt-1">
                        Contacto: {oportunidad.contacto_nombre}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(oportunidad)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(oportunidad.id)}
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
            <DialogTitle className="text-purple-700">
              {editingId ? '✏️ Editar Oportunidad' : '➕ Nueva Oportunidad'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nombre de la Oportunidad *</Label>
              <Input
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej: Venta de Semillas Campaña 2026"
              />
            </div>

            <div>
              <Label>Descripción</Label>
              <Textarea
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                placeholder="Detalle de la oportunidad..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Vendedor *</Label>
                <Select value={vendedorId} onValueChange={setVendedorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendedores.map(v => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.nombre} {v.apellido}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Contacto</Label>
                <Select value={contactoId} onValueChange={setContactoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar contacto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin contacto</SelectItem>
                    {contactos.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nombre} {c.apellido}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!editingId && (
              <div>
                <Label>Estado Inicial *</Label>
                <Select value={estadoId} onValueChange={setEstadoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estado" />
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
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Monto Estimado ($)</Label>
                <Input
                  type="number"
                  value={montoEstimado}
                  onChange={e => setMontoEstimado(e.target.value)}
                  placeholder="100000"
                />
              </div>
              <div>
                <Label>Probabilidad (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={probabilidad}
                  onChange={e => setProbabilidad(e.target.value)}
                  placeholder="50"
                />
              </div>
            </div>

            <div>
              <Label>Fecha Cierre Estimada</Label>
              <Input
                type="date"
                value={fechaCierreEstimada}
                onChange={e => setFechaCierreEstimada(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={saving}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingId ? 'Guardar Cambios' : 'Crear Oportunidad'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
