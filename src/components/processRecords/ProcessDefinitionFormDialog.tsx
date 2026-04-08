'use client';

import { ProcessAISuggestionDialog } from '@/components/procesos/ProcessAISuggestionDialog';
import { ProcessISOTemplateDialog } from '@/components/procesos/ProcessISOTemplateDialog';
import { AIAssistButton } from '@/components/ui/AIAssistButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { processDefinitionSchema } from '@/lib/validations/processRecords';
import {
  detectClassicProcess,
  ISOClassicProcess,
} from '@/types/isoClassicProcesses';
import {
  ProcessDefinition,
  ProcessDefinitionFormData,
} from '@/types/processRecords';
import { Plus, Sparkles, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface ProcessDefinitionFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: ProcessDefinition | null;
}

interface PersonnelOption {
  id: string;
  nombre_completo: string;
  puesto?: string;
}

export function ProcessDefinitionFormDialog({
  open,
  onClose,
  onSuccess,
  editData,
}: ProcessDefinitionFormDialogProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [documents, setDocuments] = useState<
    Array<{
      id: string;
      title?: string;
      nombre?: string;
      code?: string;
      codigo?: string;
    }>
  >([]);
  const [positions, setPositions] = useState<
    Array<{ id: string; title: string; department?: string }>
  >([]);
  const [personnel, setPersonnel] = useState<PersonnelOption[]>([]);
  const [formData, setFormData] = useState<ProcessDefinitionFormData>({
    nombre: '',
  });
  const [stageInput, setStageInput] = useState('');
  const [functionInput, setFunctionInput] = useState('');
  const [showAISuggestDialog, setShowAISuggestDialog] = useState(false);

  // Estado para detección de procesos ISO 9001
  const [detectedISOProcess, setDetectedISOProcess] = useState<{
    process: ISOClassicProcess;
    score: number;
    matchedAlias?: string;
  } | null>(null);
  const [showISOTemplateDialog, setShowISOTemplateDialog] = useState(false);

  const isEditing = !!editData;

  // Load documents, positions and personnel for selectors (only when editing)
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load documents
        const docsResponse = await fetch('/api/documents');
        if (docsResponse.ok) {
          const docs = await docsResponse.json();
          const docsArray = Array.isArray(docs)
            ? docs
            : Array.isArray(docs?.data)
              ? docs.data
              : [];
          setDocuments(docsArray);
        }

        // Load positions
        const positionsResponse = await fetch('/api/positions');
        if (positionsResponse.ok) {
          const pos = await positionsResponse.json();
          setPositions(Array.isArray(pos) ? pos : []);
        }

        // Load personnel for "Jefe de Proceso" selector
        const personnelResponse = await fetch('/api/personnel?limit=100');
        if (personnelResponse.ok) {
          const personnelData = await personnelResponse.json();
          const personnelArray = Array.isArray(personnelData)
            ? personnelData
            : Array.isArray(personnelData?.data)
              ? personnelData.data
              : [];
          setPersonnel(personnelArray);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    // Only load full data when editing
    if (open && isEditing) {
      loadData();
    }
  }, [open, isEditing]);

  // Load edit data
  useEffect(() => {
    if (editData && open) {
      setFormData({
        codigo: editData.codigo || '',
        nombre: editData.nombre || '',
        descripcion: editData.descripcion || '',
        objetivo: editData.objetivo || '',
        alcance: editData.alcance || '',
        funciones_involucradas: editData.funciones_involucradas || [],
        categoria: editData.categoria || 'calidad',
        documento_origen_id: editData.documento_origen_id || '',
        puesto_responsable_id: editData.puesto_responsable_id || '',
        jefe_proceso_id: editData.jefe_proceso_id || '',
        jefe_proceso_nombre: editData.jefe_proceso_nombre || '',
        etapas_default: editData.etapas_default || [
          'Planificación',
          'Ejecución',
          'Verificación',
          'Cierre',
        ],
        tipo_registros: editData.tipo_registros || 'crear',
        modulo_vinculado: editData.modulo_vinculado || null,
        activo: editData.activo ?? true,
      });
    } else if (!editData && open) {
      // Reset form for new creation - only nombre is needed
      setFormData({
        nombre: '',
      });
    }
  }, [editData, open]);

  // Función para detectar procesos ISO cuando cambia el nombre
  const handleNameChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, nombre: value }));

    // Detectar si coincide con un proceso clásico ISO 9001
    if (value.length >= 3) {
      const detection = detectClassicProcess(value);
      if (detection.process && detection.score >= 50) {
        setDetectedISOProcess({
          process: detection.process,
          score: detection.score,
          matchedAlias: detection.matchedAlias,
        });
      } else {
        setDetectedISOProcess(null);
      }
    } else {
      setDetectedISOProcess(null);
    }
  }, []);

  // Función para aplicar toda la plantilla ISO al formulario
  const handleApplyISOTemplate = useCallback((template: any) => {
    setFormData(prev => ({
      ...prev,
      nombre: template.title || prev.nombre,
      objetivo: template.objective || prev.objetivo,
      alcance: template.scope || prev.alcance,
      descripcion:
        template.description || `Proceso ${template.title} según ISO 9001:2015`,
      funciones_involucradas:
        template.involvedRoles || prev.funciones_involucradas,
    }));
    setDetectedISOProcess(null);
    setShowISOTemplateDialog(false);
  }, []);

  // Función para aplicar una sección específica
  const handleApplyISOSection = useCallback((section: string, value: any) => {
    const fieldMap: Record<string, string> = {
      objetivo: 'objetivo',
      alcance: 'alcance',
      responsable: 'jefe_proceso_nombre',
      funciones: 'funciones_involucradas',
    };

    const field = fieldMap[section];
    if (field) {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate form data
      const validatedData = processDefinitionSchema.parse(formData);

      if (
        validatedData.tipo_registros === 'vincular' &&
        !validatedData.modulo_vinculado
      ) {
        alert(
          'Seleccioná el módulo vinculado (mejoras, auditorías o no conformidades) para procesos con registros exclusivos.'
        );
        setIsSubmitting(false);
        return;
      }

      if (validatedData.tipo_registros === 'crear') {
        validatedData.modulo_vinculado = null;
      }

      const url = isEditing
        ? `/api/process-definitions/${editData!.id}`
        : '/api/process-definitions';

      const method = isEditing ? 'PATCH' : 'POST';

      const body = isEditing
        ? validatedData
        : {
            ...validatedData,
            action: 'create',
            organization_id: user?.organization_id,
          };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(
          `Error al ${isEditing ? 'actualizar' : 'crear'} definición`
        );
      }

      // Reset form
      setFormData({ nombre: '' });
      setStageInput('');
      setFunctionInput('');
      onSuccess();
      onClose();
    } catch (error) {
      console.error(
        `Error ${isEditing ? 'updating' : 'creating'} process definition:`,
        error
      );
      alert(
        `Error al ${isEditing ? 'actualizar' : 'crear'} la definición de proceso`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddStage = () => {
    const currentStages = formData.etapas_default || [];
    if (stageInput.trim() && !currentStages.includes(stageInput.trim())) {
      setFormData({
        ...formData,
        etapas_default: [...currentStages, stageInput.trim()],
      });
      setStageInput('');
    }
  };

  const handleRemoveStage = (stage: string) => {
    setFormData({
      ...formData,
      etapas_default: (formData.etapas_default || []).filter(s => s !== stage),
    });
  };

  const handleAddFunction = () => {
    const currentFunctions = formData.funciones_involucradas || [];
    if (
      functionInput.trim() &&
      !currentFunctions.includes(functionInput.trim())
    ) {
      setFormData({
        ...formData,
        funciones_involucradas: [...currentFunctions, functionInput.trim()],
      });
      setFunctionInput('');
    }
  };

  const handleRemoveFunction = (func: string) => {
    setFormData({
      ...formData,
      funciones_involucradas: (formData.funciones_involucradas || []).filter(
        f => f !== func
      ),
    });
  };

  const handleJefeProcesoChange = (personnelId: string) => {
    const selectedPerson = personnel.find(p => p.id === personnelId);
    setFormData({
      ...formData,
      jefe_proceso_id: personnelId,
      jefe_proceso_nombre: selectedPerson?.nombre_completo || '',
    });
  };

  // Simplified form for creation - only name
  if (!isEditing) {
    return (
      <>
        <Dialog open={open} onOpenChange={onClose}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nueva Definición de Proceso</DialogTitle>
              <DialogDescription>
                Ingresa el nombre del proceso. Podrás agregar más detalles
                después en la vista del proceso.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="nombre">Nombre del Proceso *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAISuggestDialog(true)}
                    className="text-purple-600 border-purple-300 hover:bg-purple-50"
                  >
                    <Sparkles className="h-4 w-4 mr-1" />
                    Sugerir nombre
                  </Button>
                </div>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="Ej. Gestión de Calidad, Auditoría Interna..."
                  required
                  autoFocus
                />
              </div>

              {/* Banner de detección ISO 9001 */}
              {detectedISOProcess && (
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-l-4 border-purple-500 p-4 rounded-r-lg animate-in slide-in-from-top-2 duration-300">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        ¡Detecté un proceso ISO 9001! 🎯
                      </p>
                      <p className="text-sm text-gray-600 mt-0.5">
                        <strong>{detectedISOProcess.process.name}</strong>{' '}
                        (Cláusula{' '}
                        {detectedISOProcess.process.isoClause.join(', ')})
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {detectedISOProcess.process.description}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setShowISOTemplateDialog(true)}
                        className="mt-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Usar plantilla ISO 9001 completa
                      </Button>
                    </div>
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      {detectedISOProcess.score}% match
                    </Badge>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !formData.nombre.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {isSubmitting ? 'Creando...' : 'Crear Proceso'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Diálogo de sugerencias IA general */}
        <ProcessAISuggestionDialog
          open={showAISuggestDialog}
          onClose={() => setShowAISuggestDialog(false)}
          mode="name"
          onApply={data => {
            // data es un NameOption { title, reason }
            if (typeof data === 'object' && 'title' in data) {
              handleNameChange(data.title);
            }
            setShowAISuggestDialog(false);
          }}
        />

        {/* Diálogo de plantilla ISO 9001 */}
        {detectedISOProcess && (
          <ProcessISOTemplateDialog
            open={showISOTemplateDialog}
            onClose={() => setShowISOTemplateDialog(false)}
            process={detectedISOProcess.process}
            matchScore={detectedISOProcess.score}
            onApplyAll={handleApplyISOTemplate}
            onApplySection={handleApplyISOSection}
          />
        )}
      </>
    );
  }

  // Full form for editing
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Editar Definición de Proceso</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Código */}
          <div>
            <Label htmlFor="codigo">Código</Label>
            <Input
              id="codigo"
              value={formData.codigo || ''}
              onChange={e =>
                setFormData({ ...formData, codigo: e.target.value })
              }
              placeholder="Ej. PROC-001 (opcional, se genera automáticamente)"
            />
          </div>

          {/* Nombre */}
          <div>
            <Label htmlFor="nombre">Nombre del Proceso *</Label>
            <Input
              id="nombre"
              value={formData.nombre}
              onChange={e =>
                setFormData({ ...formData, nombre: e.target.value })
              }
              placeholder="Ej. Gestión de Calidad"
              required
            />
          </div>

          {/* Descripción */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="descripcion">Descripción</Label>
              <AIAssistButton
                context={{
                  modulo: 'procesos',
                  tipo: 'proceso',
                  datos: {
                    nombre: formData.nombre,
                    descripcion: formData.descripcion,
                  },
                }}
                onGenerate={texto =>
                  setFormData({ ...formData, descripcion: texto })
                }
                label="Generar con IA"
                size="sm"
              />
            </div>
            <Textarea
              id="descripcion"
              value={formData.descripcion || ''}
              onChange={e =>
                setFormData({ ...formData, descripcion: e.target.value })
              }
              placeholder="Describe el proceso..."
              rows={3}
            />
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
            La asignacion de jefe de proceso, puesto responsable y demas
            vinculaciones a personal se administra desde Mi Panel.
          </div>

          {/* Jefe de Proceso - referencia */}
          <div>
            <Label htmlFor="jefe_proceso">Jefe de Proceso (referencia)</Label>
            <p className="text-sm text-gray-500 mb-2">
              Persona responsable del proceso (del módulo de Personal)
            </p>
            <select
              id="jefe_proceso"
              value={formData.jefe_proceso_id || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Sin jefe asignado</option>
              {personnel.map(person => (
                <option key={person.id} value={person.id}>
                  {person.nombre_completo}
                  {person.puesto && ` - ${person.puesto}`}
                </option>
              ))}
            </select>
          </div>

          {/* Puesto Responsable */}
          <div>
            <Label htmlFor="puesto_responsable">
              Puesto Responsable (referencia)
            </Label>
            <p className="text-sm text-gray-500 mb-2">
              El puesto responsable del proceso (incluye departamento y
              personal)
            </p>
            <select
              id="puesto_responsable"
              value={formData.puesto_responsable_id || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Sin puesto asignado</option>
              {positions.map(pos => (
                <option key={pos.id} value={pos.id}>
                  {pos.title}
                  {pos.department && ` - ${pos.department}`}
                </option>
              ))}
            </select>
          </div>

          {/* Objetivo */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="objetivo">Objetivo</Label>
              <AIAssistButton
                context={{
                  modulo: 'procesos',
                  tipo: 'proceso',
                  campo: 'objetivo',
                  datos: { nombre: formData.nombre },
                }}
                onGenerate={texto =>
                  setFormData({ ...formData, objetivo: texto })
                }
                label="Sugerir objetivo"
                size="sm"
              />
            </div>
            <Textarea
              id="objetivo"
              value={formData.objetivo || ''}
              onChange={e =>
                setFormData({ ...formData, objetivo: e.target.value })
              }
              placeholder="Objetivo del proceso..."
              rows={3}
            />
          </div>

          {/* Alcance */}
          <div>
            <Label htmlFor="alcance">Alcance</Label>
            <Textarea
              id="alcance"
              value={formData.alcance || ''}
              onChange={e =>
                setFormData({ ...formData, alcance: e.target.value })
              }
              placeholder="Alcance del proceso..."
              rows={3}
            />
          </div>

          {/* Funciones Involucradas */}
          <div>
            <Label htmlFor="funciones">Funciones Involucradas</Label>
            <p className="text-sm text-gray-500 mb-2">
              Funciones o áreas involucradas en el proceso
            </p>
            <div className="flex gap-2 mb-2">
              <Input
                id="funciones"
                value={functionInput}
                onChange={e => setFunctionInput(e.target.value)}
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddFunction();
                  }
                }}
                placeholder="Agregar función"
              />
              <Button
                type="button"
                onClick={handleAddFunction}
                variant="outline"
                size="sm"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {(formData.funciones_involucradas || []).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {(formData.funciones_involucradas || []).map((func, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {func}
                    <button
                      type="button"
                      onClick={() => handleRemoveFunction(func)}
                      className="hover:text-red-600 ml-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Categoría */}
          <div>
            <Label htmlFor="categoria">Categoría</Label>
            <select
              id="categoria"
              value={formData.categoria || 'calidad'}
              onChange={e =>
                setFormData({ ...formData, categoria: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="calidad">Calidad</option>
              <option value="auditoria">Auditoría</option>
              <option value="mejora">Mejora</option>
              <option value="rrhh">RRHH</option>
              <option value="produccion">Producción</option>
              <option value="ventas">Ventas</option>
              <option value="logistica">Logística</option>
              <option value="compras">Compras</option>
            </select>
          </div>

          {/* Tipo de gestión de registros */}
          <div>
            <Label htmlFor="tipo_registros">Tipo de Registros</Label>
            <p className="text-sm text-gray-500 mb-2">
              Define si este proceso usa registros de su módulo exclusivo o el
              ABM general de Registros de Procesos.
            </p>
            <select
              id="tipo_registros"
              value={formData.tipo_registros || 'crear'}
              onChange={e =>
                setFormData({
                  ...formData,
                  tipo_registros: e.target.value as
                    | 'vincular'
                    | 'crear'
                    | 'ambos',
                  modulo_vinculado:
                    e.target.value === 'crear'
                      ? null
                      : formData.modulo_vinculado || null,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="crear">
                Crear registros en ABM de Procesos (default)
              </option>
              <option value="vincular">
                Usar registros exclusivos de otro módulo
              </option>
              <option value="ambos">
                Ambos (módulo exclusivo + ABM de Procesos)
              </option>
            </select>
          </div>

          {(formData.tipo_registros === 'vincular' ||
            formData.tipo_registros === 'ambos') && (
            <div>
              <Label htmlFor="modulo_vinculado">Módulo Vinculado</Label>
              <p className="text-sm text-gray-500 mb-2">
                Usar para procesos como auditorías, hallazgos/NC, acciones o
                mejoras que ya tienen registros dentro del sistema.
              </p>
              <select
                id="modulo_vinculado"
                value={formData.modulo_vinculado || ''}
                onChange={e =>
                  setFormData({
                    ...formData,
                    modulo_vinculado:
                      (e.target.value as 'mejoras' | 'auditorias' | 'nc') ||
                      null,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Seleccionar módulo...</option>
                <option value="mejoras">Mejoras / Acciones</option>
                <option value="auditorias">Auditorías</option>
                <option value="nc">No Conformidades / Hallazgos</option>
              </select>
            </div>
          )}

          {/* Documento Origen */}
          <div>
            <Label htmlFor="documento_origen">
              Documento de Origen (Opcional)
            </Label>
            <select
              id="documento_origen"
              value={formData.documento_origen_id || ''}
              onChange={e =>
                setFormData({
                  ...formData,
                  documento_origen_id: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Sin documento</option>
              {documents.map(doc => (
                <option key={doc.id} value={doc.id}>
                  {doc.title || doc.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Etapas por defecto */}
          <div>
            <Label htmlFor="etapas">Etapas por Defecto</Label>
            <p className="text-sm text-gray-500 mb-2">
              Estas etapas se crearán automáticamente en cada nuevo registro
            </p>
            <div className="flex gap-2 mb-2">
              <Input
                id="etapas"
                value={stageInput}
                onChange={e => setStageInput(e.target.value)}
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddStage();
                  }
                }}
                placeholder="Agregar etapa"
              />
              <Button type="button" onClick={handleAddStage} variant="outline">
                Agregar
              </Button>
            </div>
            {(formData.etapas_default || []).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {(formData.etapas_default || []).map((stage, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded text-sm"
                  >
                    {stage}
                    <button
                      type="button"
                      onClick={() => handleRemoveStage(stage)}
                      className="hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Estado */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="activo"
              checked={formData.activo ?? true}
              onChange={e =>
                setFormData({ ...formData, activo: e.target.checked })
              }
              className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
            />
            <Label htmlFor="activo" className="cursor-pointer">
              Proceso activo
            </Label>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSubmitting ? 'Actualizando...' : 'Actualizar Definición'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
