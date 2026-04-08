/**
 * Página AMFE - Análisis de Riesgos y Oportunidades
 * Registros individuales agrupados por proceso
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import type {
  EstadoRegistroAMFE,
  NivelImpacto,
  NivelProbabilidad,
  RegistroAMFE,
  TipoRegistroAMFE,
} from '@/types/amfe';
import {
  getNivelRiesgo,
  IMPACTO_LABELS,
  PROBABILIDAD_LABELS,
} from '@/types/amfe';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  AlertTriangle,
  Edit2,
  Filter,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';

function AMFEContent() {
  const { user } = useAuth();
  const organizationId = user?.organization_id;
  const { toast } = useToast();

  const [registros, setRegistros] = useState<RegistroAMFE[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRegistro, setEditingRegistro] = useState<RegistroAMFE | null>(
    null
  );
  const [filterProceso, setFilterProceso] = useState<string>('todos');
  const [filterTipo, setFilterTipo] = useState<string>('todos');

  // Formulario
  const [formData, setFormData] = useState({
    tipo: 'riesgo' as TipoRegistroAMFE,
    proceso_nombre: '',
    titulo: '',
    descripcion: '',
    causa: '',
    efecto: '',
    probabilidad: 3 as NivelProbabilidad,
    impacto: 3 as NivelImpacto,
    acciones_planificadas: '',
    responsable_nombre: '',
    estado: 'identificado' as EstadoRegistroAMFE,
  });

  useEffect(() => {
    if (organizationId) {
      loadRegistros();
    }
  }, [organizationId]);

  const loadRegistros = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'amfe_registros'),
        where('organization_id', '==', organizationId),
        orderBy('fecha_identificacion', 'desc')
      );

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as RegistroAMFE[];

      setRegistros(data);
    } catch (error) {
      console.error('Error cargando registros:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los registros',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!organizationId || !user) return;

    const npr = formData.probabilidad * formData.impacto;

    try {
      if (editingRegistro) {
        // Actualizar
        await updateDoc(doc(db, 'amfe_registros', editingRegistro.id), {
          ...formData,
          npr,
          updated_at: new Date().toISOString(),
          updated_by: user.email,
        });
        toast({
          title: 'Actualizado',
          description: 'Registro actualizado correctamente',
        });
      } else {
        // Crear nuevo
        await addDoc(collection(db, 'amfe_registros'), {
          ...formData,
          organization_id: organizationId,
          npr,
          fecha_identificacion: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString(),
          created_by: user.email,
        });
        toast({
          title: 'Creado',
          description: 'Registro creado correctamente',
        });
      }

      setIsModalOpen(false);
      resetForm();
      loadRegistros();
    } catch (error) {
      console.error('Error guardando:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este registro?')) return;

    try {
      await deleteDoc(doc(db, 'amfe_registros', id));
      toast({ title: 'Eliminado', description: 'Registro eliminado' });
      loadRegistros();
    } catch (error) {
      console.error('Error eliminando:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (registro: RegistroAMFE) => {
    setEditingRegistro(registro);
    setFormData({
      tipo: registro.tipo,
      proceso_nombre: registro.proceso_nombre,
      titulo: registro.titulo,
      descripcion: registro.descripcion,
      causa: registro.causa || '',
      efecto: registro.efecto || '',
      probabilidad: registro.probabilidad,
      impacto: registro.impacto,
      acciones_planificadas: registro.acciones_planificadas || '',
      responsable_nombre: registro.responsable_nombre || '',
      estado: registro.estado,
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingRegistro(null);
    setFormData({
      tipo: 'riesgo',
      proceso_nombre: '',
      titulo: '',
      descripcion: '',
      causa: '',
      efecto: '',
      probabilidad: 3,
      impacto: 3,
      acciones_planificadas: '',
      responsable_nombre: '',
      estado: 'identificado',
    });
  };

  // Filtrar registros
  const registrosFiltrados = registros.filter(r => {
    if (filterProceso !== 'todos' && r.proceso_nombre !== filterProceso)
      return false;
    if (filterTipo !== 'todos' && r.tipo !== filterTipo) return false;
    return true;
  });

  // Obtener procesos únicos
  const procesosUnicos = [
    ...new Set(registros.map(r => r.proceso_nombre)),
  ].filter(Boolean);

  // Estadísticas
  const stats = {
    total: registros.length,
    riesgos: registros.filter(r => r.tipo === 'riesgo').length,
    oportunidades: registros.filter(r => r.tipo === 'oportunidad').length,
    criticos: registros.filter(r => r.npr >= 15).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-orange-500" />
            Análisis AMFE
          </h1>
          <p className="text-gray-600">
            Riesgos y Oportunidades - Análisis Modal de Fallos y Efectos
          </p>
        </div>

        <Dialog
          open={isModalOpen}
          onOpenChange={open => {
            setIsModalOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Registro
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRegistro ? 'Editar Registro' : 'Nuevo Registro AMFE'}
              </DialogTitle>
              <DialogDescription>
                Registra un riesgo u oportunidad para tu organización
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Tipo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo *</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={v =>
                      setFormData({ ...formData, tipo: v as TipoRegistroAMFE })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="riesgo">⚠️ Riesgo</SelectItem>
                      <SelectItem value="oportunidad">
                        ✨ Oportunidad
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Proceso *</Label>
                  <Input
                    value={formData.proceso_nombre}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        proceso_nombre: e.target.value,
                      })
                    }
                    placeholder="Ej: Producción, Ventas, RRHH..."
                  />
                </div>
              </div>

              {/* Título y Descripción */}
              <div>
                <Label>Título *</Label>
                <Input
                  value={formData.titulo}
                  onChange={e =>
                    setFormData({ ...formData, titulo: e.target.value })
                  }
                  placeholder="Título corto del riesgo/oportunidad"
                />
              </div>
              <div>
                <Label>Descripción</Label>
                <Textarea
                  value={formData.descripcion}
                  onChange={e =>
                    setFormData({ ...formData, descripcion: e.target.value })
                  }
                  rows={2}
                  placeholder="Descripción detallada"
                />
              </div>

              {/* Causa y Efecto */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Causa</Label>
                  <Textarea
                    value={formData.causa}
                    onChange={e =>
                      setFormData({ ...formData, causa: e.target.value })
                    }
                    rows={2}
                    placeholder="¿Por qué ocurre?"
                  />
                </div>
                <div>
                  <Label>Efecto</Label>
                  <Textarea
                    value={formData.efecto}
                    onChange={e =>
                      setFormData({ ...formData, efecto: e.target.value })
                    }
                    rows={2}
                    placeholder="¿Qué consecuencias tiene?"
                  />
                </div>
              </div>

              {/* Evaluación */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Probabilidad</Label>
                  <Select
                    value={String(formData.probabilidad)}
                    onValueChange={v =>
                      setFormData({
                        ...formData,
                        probabilidad: Number(v) as NivelProbabilidad,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map(n => (
                        <SelectItem key={n} value={String(n)}>
                          {n} - {PROBABILIDAD_LABELS[n as NivelProbabilidad]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Impacto</Label>
                  <Select
                    value={String(formData.impacto)}
                    onValueChange={v =>
                      setFormData({
                        ...formData,
                        impacto: Number(v) as NivelImpacto,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map(n => (
                        <SelectItem key={n} value={String(n)}>
                          {n} - {IMPACTO_LABELS[n as NivelImpacto]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>NPR (calculado)</Label>
                  <div
                    className={`h-10 flex items-center justify-center rounded-md text-white font-bold ${getNivelRiesgo(formData.probabilidad * formData.impacto).color}`}
                  >
                    {formData.probabilidad * formData.impacto}
                  </div>
                </div>
              </div>

              {/* Acciones y Responsable */}
              <div>
                <Label>Acciones Planificadas</Label>
                <Textarea
                  value={formData.acciones_planificadas}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      acciones_planificadas: e.target.value,
                    })
                  }
                  rows={2}
                  placeholder="¿Qué acciones se tomarán?"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Responsable</Label>
                  <Input
                    value={formData.responsable_nombre}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        responsable_nombre: e.target.value,
                      })
                    }
                    placeholder="Nombre del responsable"
                  />
                </div>
                <div>
                  <Label>Estado</Label>
                  <Select
                    value={formData.estado}
                    onValueChange={v =>
                      setFormData({
                        ...formData,
                        estado: v as EstadoRegistroAMFE,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="identificado">Identificado</SelectItem>
                      <SelectItem value="analizado">Analizado</SelectItem>
                      <SelectItem value="en_tratamiento">
                        En tratamiento
                      </SelectItem>
                      <SelectItem value="cerrado">Cerrado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleSubmit}
                className="w-full"
                disabled={!formData.titulo || !formData.proceso_nombre}
              >
                {editingRegistro ? 'Actualizar' : 'Crear Registro'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Total Registros</p>
            <p className="text-3xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Riesgos</p>
            <p className="text-3xl font-bold text-orange-600">
              {stats.riesgos}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Oportunidades</p>
            <p className="text-3xl font-bold text-emerald-600">
              {stats.oportunidades}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Críticos (NPR ≥15)</p>
            <p className="text-3xl font-bold text-red-600">{stats.criticos}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <Select value={filterProceso} onValueChange={setFilterProceso}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por proceso" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los procesos</SelectItem>
              {procesosUnicos.map(p => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            <SelectItem value="riesgo">⚠️ Riesgos</SelectItem>
            <SelectItem value="oportunidad">✨ Oportunidades</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla de registros */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-sm text-gray-600">
                <th className="p-3">Tipo</th>
                <th className="p-3">Proceso</th>
                <th className="p-3">Título</th>
                <th className="p-3 text-center">P</th>
                <th className="p-3 text-center">I</th>
                <th className="p-3 text-center">NPR</th>
                <th className="p-3">Estado</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {registrosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">
                    No hay registros. Crea el primero.
                  </td>
                </tr>
              ) : (
                registrosFiltrados.map(r => {
                  const nivel = getNivelRiesgo(r.npr);
                  return (
                    <tr key={r.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        {r.tipo === 'riesgo' ? (
                          <Badge className="bg-orange-100 text-orange-800">
                            ⚠️ Riesgo
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-800">
                            ✨ Oportunidad
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-sm">{r.proceso_nombre}</td>
                      <td className="p-3 font-medium">{r.titulo}</td>
                      <td className="p-3 text-center">{r.probabilidad}</td>
                      <td className="p-3 text-center">{r.impacto}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-sm ${nivel.color}`}
                        >
                          {r.npr}
                        </span>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">{r.estado}</Badge>
                      </td>
                      <td className="p-3 text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(r)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(r.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AMFEPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      }
    >
      <AMFEContent />
    </Suspense>
  );
}
