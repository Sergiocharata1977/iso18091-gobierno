/**
 * Componente ABM para registros de Planificación
 *
 * Muestra:
 * - Lista de TODOS los registros (vigente, borradores, históricos)
 * - Modal para crear nuevo registro
 * - Modal para editar (crea nueva versión)
 * - Acción para marcar vigente
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { getClauseLabel } from '@/lib/iso/clauses';
import {
  crearBorrador,
  getHistorial,
  guardarBorrador,
  marcarVigente,
} from '@/services/planificacionService';
import {
  PLAN_CAMPOS,
  PLAN_TITULOS,
  PlanBase,
  PlanCollectionType,
  PlanEstructura,
} from '@/types/planificacion';
import {
  BookOpen,
  CheckCircle,
  Clock,
  Edit,
  Eye,
  FileText,
  History,
  Loader2,
  Plus,
  Save,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { EstructuraForm } from './EstructuraForm';

interface PlanificacionListingProps {
  tipo: PlanCollectionType;
  organizationId: string;
  userEmail: string;
  icon?: React.ElementType;
  initialMode?: 'view' | 'create' | 'list'; // Modo inicial opcional
}

export function PlanificacionListing({
  tipo,
  organizationId,
  userEmail,
  icon: Icon = BookOpen,
  initialMode = 'list',
}: PlanificacionListingProps) {
  const { toast } = useToast();
  const titulo = PLAN_TITULOS[tipo];
  const campos = PLAN_CAMPOS[tipo];

  // Estados
  const [registros, setRegistros] = useState<PlanBase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>(
    'view'
  );
  const [selectedRegistro, setSelectedRegistro] = useState<PlanBase | null>(
    null
  );
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Estado para diálogo de confirmación post-guardado
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Obtener el registro vigente
  const registroVigente = registros.find(r => r.estado === 'vigente');

  // Cargar todos los registros
  const loadData = useCallback(async () => {
    if (!organizationId) return;
    setIsLoading(true);
    try {
      const data = await getHistorial<PlanBase>(tipo, organizationId);
      setRegistros(data);
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los registros',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, tipo, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Efecto para abrir modal inicial si se solicita
  useEffect(() => {
    if (initialMode === 'create' && !isLoading && !showModal && registros) {
      handleCreate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMode, isLoading]);

  // Abrir modal para ver
  const handleView = (registro: PlanBase) => {
    setSelectedRegistro(registro);
    // Para Estructura, pasamos todo el objeto. Para otros, campos clave.
    if (tipo === 'estructura') {
      setFormData(registro as any);
    } else {
      const fd: Record<string, string> = {};
      campos.forEach(c => {
        fd[c.key] =
          (registro as unknown as Record<string, string>)[c.key] || '';
      });
      setFormData(fd);
    }
    setModalMode('view');
    setShowModal(true);
  };

  // Abrir modal para editar (crear nueva versión)
  const handleEdit = (registro: PlanBase) => {
    setSelectedRegistro(registro);
    if (tipo === 'estructura') {
      setFormData(registro as any);
    } else {
      const fd: Record<string, string> = {};
      campos.forEach(c => {
        fd[c.key] =
          (registro as unknown as Record<string, string>)[c.key] || '';
      });
      setFormData(fd);
    }
    setModalMode('edit');
    setShowModal(true);
  };

  // Abrir modal para crear nuevo
  const handleCreate = () => {
    setSelectedRegistro(null);
    const fd: Record<string, any> = {};
    // Si hay vigente, copiar sus datos
    if (registroVigente) {
      if (tipo === 'estructura') {
        const vigente = registroVigente as unknown as PlanEstructura;
        // Copiamos datos relevantes, pero no IDs ni metadata
        fd.descripcion_breve = vigente.descripcion_breve;
        fd.organigrama_image_url = vigente.organigrama_image_url;
        fd.organigrama_image_source = vigente.organigrama_image_source;
        fd.procesos_relacionados = vigente.procesos_relacionados;
        fd.observaciones = vigente.observaciones;
      } else {
        campos.forEach(c => {
          fd[c.key] =
            (registroVigente as unknown as Record<string, string>)[c.key] || '';
        });
      }
    } else {
      if (tipo === 'estructura') {
        // Inicializar estructura vacía
        fd.procesos_relacionados = [];
      } else {
        campos.forEach(c => {
          fd[c.key] = '';
        });
      }
    }
    setFormData(fd);
    setModalMode('create');
    setShowModal(true);
  };

  // Guardar (crear o actualizar)
  const handleSave = async () => {
    setIsSaving(true);
    let nuevoVersion: number | null = null;

    try {
      if (modalMode === 'create') {
        // Crear nuevo borrador
        const nuevo = await crearBorrador<PlanBase>(
          tipo,
          organizationId,
          userEmail
        );
        nuevoVersion = nuevo.version_numero;
        // Actualizar con los datos del formulario
        const dataActualizada = { ...nuevo, ...formData } as PlanBase;
        await guardarBorrador(tipo, dataActualizada, userEmail);

        setSuccessMessage(
          `Registro guardado correctamente (versión ${nuevoVersion}).`
        );
        setShowSuccessDialog(true);
      } else if (modalMode === 'edit' && selectedRegistro) {
        if (selectedRegistro.estado === 'borrador') {
          // Si es borrador, actualizar directamente
          const dataActualizada = {
            ...selectedRegistro,
            ...formData,
          } as PlanBase;
          await guardarBorrador(tipo, dataActualizada, userEmail);
          setSuccessMessage(
            `Cambios guardados correctamente en borrador v${selectedRegistro.version_numero}.`
          );
          setShowSuccessDialog(true);
        } else {
          // Si es vigente, crear nueva versión
          const nuevo = await crearBorrador<PlanBase>(
            tipo,
            organizationId,
            userEmail
          );
          nuevoVersion = nuevo.version_numero;
          const dataActualizada = { ...nuevo, ...formData } as PlanBase;
          await guardarBorrador(tipo, dataActualizada, userEmail);
          setSuccessMessage(
            `Nueva versión ${nuevoVersion} creada correctamente desde v${selectedRegistro.version_numero}.`
          );
          setShowSuccessDialog(true);
        }
      }

      setShowModal(false);
      loadData();
    } catch (error) {
      console.error('Error guardando:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Marcar como vigente
  const handleMarcarVigente = async (registro: PlanBase) => {
    setIsSaving(true);
    try {
      await marcarVigente(tipo, registro, userEmail);
      toast({
        title: '¡Vigente!',
        description: 'El registro está vigente. El anterior pasó a histórico.',
      });
      loadData();
    } catch (error) {
      console.error('Error marcando vigente:', error);
      toast({
        title: 'Error',
        description: 'No se pudo marcar como vigente',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Badge de estado
  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'vigente':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Vigente
          </Badge>
        );
      case 'borrador':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Edit className="w-3 h-3 mr-1" />
            Borrador
          </Badge>
        );
      case 'historico':
        return (
          <Badge className="bg-gray-100 text-gray-600 border-gray-200">
            <History className="w-3 h-3 mr-1" />
            Histórico
          </Badge>
        );
      default:
        return <Badge>{estado}</Badge>;
    }
  };

  // Vista de carga
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader
          title={titulo}
          description="Cargando..."
          breadcrumbs={[
            {
              label: 'Planificación',
              href: '/planificacion-revision-direccion',
            },
            { label: titulo },
          ]}
        />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-0 md:p-6">
      <PageHeader
        title={titulo}
        description={`Gestiona las versiones de ${titulo.toLowerCase()}`}
        breadcrumbs={[
          { label: 'Planificación', href: '/planificacion-revision-direccion' },
          { label: titulo },
        ]}
        actions={
          <Button
            onClick={handleCreate}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Versión
          </Button>
        }
      />

      {/* Estado actual del componente */}
      {/* ... (código existente del Card de estado) ... */}
      <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Icon className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">
                  Estado del Componente
                </h3>
                <p className="text-sm text-gray-600">
                  {registroVigente
                    ? `Vigente: v${registroVigente.version_numero} - ${new Date(registroVigente.created_at).toLocaleDateString()}`
                    : 'Sin registro vigente'}
                </p>
              </div>
            </div>
            {registroVigente ? (
              <Badge className="bg-green-100 text-green-800 text-lg px-4 py-1">
                <CheckCircle className="w-4 h-4 mr-2" />
                100%
              </Badge>
            ) : registros.some(r => r.estado === 'borrador') ? (
              <Badge className="bg-yellow-100 text-yellow-800 text-lg px-4 py-1">
                <Clock className="w-4 h-4 mr-2" />
                50%
              </Badge>
            ) : (
              <Badge className="bg-gray-100 text-gray-600 text-lg px-4 py-1">
                0%
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de registros */}
      {registros.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay registros
            </h3>
            <p className="text-gray-600 mb-6">
              Creá el primer registro para documentar {titulo.toLowerCase()}.
            </p>
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Crear Primer Registro
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4" />
              Historial de Versiones ({registros.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 text-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Versión</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Creación</TableHead>
                  <TableHead>Creado Por</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registros.map(registro => (
                  <TableRow key={registro.id}>
                    <TableCell className="font-medium">
                      v{registro.version_numero}
                    </TableCell>
                    <TableCell>{getEstadoBadge(registro.estado)}</TableCell>
                    <TableCell>
                      {new Date(registro.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-gray-600 max-w-[200px] truncate">
                      {registro.created_by}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(registro)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(registro)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {registro.estado === 'borrador' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarcarVigente(registro)}
                            disabled={isSaving}
                            className="text-green-600 hover:text-green-700 border-green-200 hover:bg-green-50"
                          >
                            <CheckCircle className="w-3 h-3 md:mr-1" />
                            <span className="hidden md:inline">
                              Hacer Vigente
                            </span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Modal de Ver/Editar/Crear (AHORA AL 70% WIDTH) */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-[90vw] md:max-w-[70vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Icon className="w-6 h-6 text-emerald-600" />
              {modalMode === 'create' && `Nueva Versión: ${titulo}`}
              {modalMode === 'edit' && `Editar: ${titulo}`}
              {modalMode === 'view' && `Ver: ${titulo}`}
              {selectedRegistro && (
                <Badge variant="outline" className="ml-2">
                  v{selectedRegistro.version_numero || 'Nueva'}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {tipo === 'estructura' ? (
              <EstructuraForm
                initialData={formData}
                organizationId={organizationId}
                readOnly={modalMode === 'view'}
                onChange={newData =>
                  setFormData(prev => ({ ...prev, ...newData }))
                }
              />
            ) : (
              campos.map(campo => (
                <div key={campo.key} className="space-y-2">
                  <Label htmlFor={campo.key} className="text-base font-medium">
                    {campo.label}
                  </Label>
                  {/* NOTA ISO DINÁMICA */}
                  {campo.isoClauseKey && (
                    <div className="text-xs text-muted-foreground bg-blue-50 border border-blue-100 p-2 rounded-md flex items-center gap-2">
                      <BookOpen className="w-3 h-3 text-blue-500" />
                      <span className="font-medium text-blue-700">
                        Requisito:
                      </span>{' '}
                      {getClauseLabel(campo.isoClauseKey)}
                    </div>
                  )}
                  <Textarea
                    id={campo.key}
                    value={formData[campo.key] || ''}
                    onChange={e =>
                      setFormData({ ...formData, [campo.key]: e.target.value })
                    }
                    rows={campo.rows || 3}
                    className="mt-1"
                    disabled={modalMode === 'view'}
                    placeholder={`Ingrese ${campo.label.toLowerCase()}...`}
                  />
                </div>
              ))
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {modalMode === 'view' ? (
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Cerrar
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {modalMode === 'create'
                    ? 'Guardar Versión'
                    : 'Guardar Cambios'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Éxito al Guardar */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-green-600 gap-2">
              <CheckCircle className="w-6 h-6" />
              Operación Exitosa
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700 text-center text-lg">
              {successMessage}
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowSuccessDialog(false)}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Aceptar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
