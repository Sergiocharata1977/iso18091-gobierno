'use client';

import {
  ModulePageShell,
  PageHeader,
} from '@/components/design-system';
import { DocumentSelector } from '@/components/procesos/selectors/DocumentSelector';
import { NormPointSelector } from '@/components/procesos/selectors/NormPointSelector';
import { SIPOCEditor } from '@/components/procesos/SIPOCEditor';
import { AIAssistButton } from '@/components/ui/AIAssistButton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import {
  PROCESS_CATEGORIES,
  ProcessCategoryId,
  ProcessDefinition,
  createEmptySIPOC,
} from '@/types/processes-unified';
import { Timestamp } from 'firebase/firestore';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  Edit,
  FileText,
  Info,
  Layers,
  Link as LinkIcon,
  Maximize2,
  Plus,
  Scale,
  ShieldAlert,
  Target,
  User,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';

const formatDate = (date: Date | Timestamp | undefined | null) => {
  if (!date) return '-';
  if (date instanceof Timestamp) return date.toDate().toLocaleDateString();
  return new Date(date).toLocaleDateString();
};

const formatTipoRegistros = (tipo?: 'vincular' | 'crear' | 'ambos'): string => {
  if (tipo === 'vincular') return 'Registros exclusivos por módulo';
  if (tipo === 'ambos') return 'Híbrido (módulo + ABM de procesos)';
  return 'ABM de registros de procesos';
};

const formatModuloVinculado = (
  modulo?: 'mejoras' | 'auditorias' | 'nc' | null
): string => {
  if (!modulo) return 'No aplica';
  if (modulo === 'mejoras') return 'Mejoras / Acciones';
  if (modulo === 'auditorias') return 'Auditorías';
  return 'No conformidades / Hallazgos';
};

// Tipos para el estado de edición
type EditingSection =
  | 'info'
  | 'clasificacion_iso'
  | 'normas'
  | 'documentos'
  | 'objetivo'
  | 'alcance'
  | 'funciones'
  | 'descripcion_detallada'
  | 'sipoc'
  | 'departamento_responsable'
  | 'jefe_proceso'
  | null;

interface PersonnelOption {
  id: string;
  nombre_completo: string;
  puesto?: string;
}

interface DepartmentOption {
  id: string;
  nombre: string;
}

export default function ProcessDefinitionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const definitionId = params.id as string;

  const [definition, setDefinition] = useState<ProcessDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<EditingSection>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Estados de edición temporal
  const [editValues, setEditValues] = useState<Partial<ProcessDefinition>>({});
  const [personnel, setPersonnel] = useState<PersonnelOption[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [newFuncion, setNewFuncion] = useState('');
  const [newEtapa, setNewEtapa] = useState(''); // Added for recovering functionality

  // Validación de código duplicado
  const [codeValidation, _setCodeValidation] = useState<{
    checking: boolean;
    available: boolean | null;
    existingName?: string;
  }>({ checking: false, available: null });
  const _codeCheckTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const loadDefinition = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/process-definitions/${definitionId}`);
      if (response.ok) {
        const data = await response.json();
        setDefinition(data);
      }
    } catch (error) {
      console.error('Error loading definition:', error);
    } finally {
      setLoading(false);
    }
  }, [definitionId]);

  const loadPersonnel = async () => {
    try {
      // Using Admin SDK endpoint
      const response = await fetch(
        `/api/personnel-list?organization_id=${user?.organization_id}`
      );
      if (response.ok) {
        const data = await response.json();
        setPersonnel(data || []);
      }
    } catch (error) {
      console.error('Error loading personnel:', error);
    }
  };

  const loadDepartments = async () => {
    if (!user?.organization_id) return;

    try {
      setLoadingDepartments(true);
      const response = await fetch(
        `/api/rrhh/departments?organization_id=${user.organization_id}&limit=200`
      );
      if (!response.ok) {
        throw new Error('Error loading departments');
      }
      const data = await response.json();
      setDepartments(Array.isArray(data?.data) ? data.data : []);
    } catch (error) {
      console.error('Error loading departments:', error);
      setDepartments([]);
    } finally {
      setLoadingDepartments(false);
    }
  };

  useEffect(() => {
    loadDefinition();
  }, [loadDefinition]);

  // Cálculo de completitud
  const calculateCompleteness = () => {
    if (!definition) return 0;
    let score = 0;
    let total = 0;

    // Checks básicos (20% c/u)
    const checks = [
      !!definition.nombre,
      !!definition.objetivo,
      !!definition.alcance,
      (definition.funciones_involucradas?.length || 0) > 0,
      !!definition.jefe_proceso_id || !!definition.owner_position_id,
    ];

    // SIPOC Check (30%)
    const hasSIPOC = (definition.sipoc?.activities?.length || 0) > 0;

    // Normas Check (10%) - opcional pero suma
    const hasNorms = (definition.related_norm_points?.length || 0) > 0;

    // Documentos Check (10%) - opcional pero suma
    const hasDocs = (definition.documentos_ids?.length || 0) > 0;

    // Calcular
    total += 50; // 5 checks * 10 puntos básicos
    checks.forEach(c => {
      if (c) score += 10;
    });

    total += 30; // SIPOC vale 30
    if (hasSIPOC) score += 30;

    total += 10; // Normas vale 10
    if (hasNorms) score += 10;

    total += 10; // Docs vale 10
    if (hasDocs) score += 10;

    return Math.round((score / total) * 100);
  };

  const completeness = calculateCompleteness();

  const handlePublishVersion = async () => {
    if (!definition) return;

    if (
      !confirm(
        '¿Estás seguro de publicar una nueva versión? La versión actual pasará a histórico.'
      )
    )
      return;

    setPublishing(true);
    try {
      const response = await fetch(
        `/api/process-definitions/${definition.id}/publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ changes: {} }), // Podríamos pedir un comentario de cambios
        }
      );

      if (response.ok) {
        const data = await response.json();
        alert('Nueva versión publicada exitosamente.');
        // Redirigir a la nueva versión
        if (data.new_id) {
          router.push(`/procesos/definiciones/${data.new_id}`);
        } else {
          loadDefinition();
        }
      } else {
        const err = await response.json();
        alert(`Error al publicar: ${err.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error publishing:', error);
      alert('Error al publicar nueva versión.');
    } finally {
      setPublishing(false);
    }
  };

  const handleStartEdit = (section: EditingSection) => {
    if (!definition) return;
    setEditingSection(section);

    // Cargar personal si es necesario
    if (section === 'jefe_proceso' && personnel.length === 0) {
      loadPersonnel();
    }
    if (section === 'departamento_responsable' && departments.length === 0) {
      loadDepartments();
    }

    // Inicializar valores de edición
    switch (section) {
      case 'info':
        setEditValues({
          // codigo: definition.codigo, // Deprecated
          nombre: definition.nombre,
          descripcion: definition.descripcion,
          // categoria: definition.categoria, // Deprecated
        });
        break;
      case 'clasificacion_iso':
        setEditValues({
          category_id: definition.category_id,
          process_code: definition.process_code,
        });
        break;
      case 'normas':
        setEditValues({
          related_norm_points: definition.related_norm_points || [],
        });
        break;
      case 'documentos':
        setEditValues({
          documentos_ids: definition.documentos_ids || [],
        });
        break;
      case 'objetivo':
        setEditValues({ objetivo: definition.objetivo });
        break;
      case 'alcance':
        setEditValues({ alcance: definition.alcance });
        break;
      case 'funciones':
        setEditValues({
          funciones_involucradas: [
            ...(definition.funciones_involucradas || []),
          ],
        });
        break;
      case 'descripcion_detallada':
        setEditValues({
          etapas_default: [...(definition.etapas_default || [])],
        });
        break;
      case 'jefe_proceso':
        setEditValues({
          jefe_proceso_id: definition.jefe_proceso_id,
          jefe_proceso_nombre: definition.jefe_proceso_nombre,
        });
        break;
      case 'departamento_responsable':
        setEditValues({
          departamento_responsable_id: definition.departamento_responsable_id,
          departamento_responsable_nombre:
            definition.departamento_responsable_nombre,
        });
        break;
      case 'sipoc':
        setEditValues({
          sipoc: definition.sipoc || createEmptySIPOC(),
        });
        break;
    }
  };

  const handleCancelEdit = () => {
    setEditingSection(null);
    setEditValues({});
    setNewFuncion('');
    setNewEtapa('');
  };

  const handleSaveSection = async () => {
    if (!definition || !editingSection) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/process-definitions/${definitionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editValues),
      });

      if (response.ok) {
        // Actualizar estado local
        setDefinition({ ...definition, ...editValues });
        setEditingSection(null);
        setEditValues({});
      } else {
        alert('Error al guardar los cambios');
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const handleAddFuncion = () => {
    if (!newFuncion.trim()) return;
    const current = editValues.funciones_involucradas || [];
    if (!current.includes(newFuncion.trim())) {
      setEditValues({
        ...editValues,
        funciones_involucradas: [...current, newFuncion.trim()],
      });
    }
    setNewFuncion('');
  };

  const handleRemoveFuncion = (func: string) => {
    const current = editValues.funciones_involucradas || [];
    setEditValues({
      ...editValues,
      funciones_involucradas: current.filter(f => f !== func),
    });
  };

  // Recovered functions for Etapas
  const _handleAddEtapa = () => {
    if (!newEtapa.trim()) return;
    const current = editValues.etapas_default || [];
    setEditValues({
      ...editValues,
      etapas_default: [...current, newEtapa.trim()],
    });
    setNewEtapa('');
  };

  const _handleRemoveEtapa = (index: number) => {
    const current = editValues.etapas_default || [];
    setEditValues({
      ...editValues,
      etapas_default: current.filter((_, i) => i !== index),
    });
  };

  const _handleJefeProcesoChange = (personnelId: string) => {
    const selectedPerson = personnel.find(p => p.id === personnelId);
    setEditValues({
      ...editValues,
      jefe_proceso_id: personnelId,
      jefe_proceso_nombre: selectedPerson?.nombre_completo || '',
    });
  };

  const handleDepartamentoResponsableChange = (departmentId: string) => {
    if (departmentId === 'none') {
      setEditValues({
        ...editValues,
        departamento_responsable_id: null,
        departamento_responsable_nombre: '',
      });
      return;
    }

    const selectedDepartment = departments.find(d => d.id === departmentId);
    setEditValues({
      ...editValues,
      departamento_responsable_id: departmentId,
      departamento_responsable_nombre: selectedDepartment?.nombre || '',
    });
  };

  const _getCategoryColor = (categoryId: number) => {
    // Map ID to color key or direct color
    // 1: Estratégico, 2: Misional, 3: De Apoyo, 4: Evaluación
    const colors: Record<number, string> = {
      1: 'bg-blue-100 text-blue-800', // Estratégico
      2: 'bg-green-100 text-green-800', // Misional
      3: 'bg-gray-100 text-gray-800', // Apoyo
      4: 'bg-purple-100 text-purple-800', // Evaluación
    };
    return colors[categoryId] || 'bg-gray-100 text-gray-800';
  };

  // Componente para botón de editar sección
  const EditButton = ({
    section,
    className = '',
  }: {
    section: EditingSection;
    className?: string;
  }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleStartEdit(section)}
      className={`h-10 w-10 p-0 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 ${className}`}
    >
      <Edit className="h-5 w-5" />
    </Button>
  );

  // Componente para botones de guardar/cancelar
  const SaveCancelButtons = () => (
    <div className="flex gap-2 mt-4">
      <Button
        onClick={handleSaveSection}
        disabled={saving}
        size="sm"
        className="bg-emerald-600 hover:bg-emerald-700"
      >
        <Check className="h-4 w-4 mr-1" />
        {saving ? 'Guardando...' : 'Guardar'}
      </Button>
      <Button onClick={handleCancelEdit} variant="outline" size="sm">
        <X className="h-4 w-4 mr-1" />
        Cancelar
      </Button>
    </div>
  );

  if (loading) {
    return (
      <ModulePageShell maxWidthClassName="max-w-6xl">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </ModulePageShell>
    );
  }

  if (!definition) {
    return (
      <ModulePageShell maxWidthClassName="max-w-5xl">
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Definición no encontrada
          </h3>
          <p className="text-gray-500 mb-4">
            La definición de proceso que buscas no existe
          </p>
          <Button onClick={() => router.push('/procesos/definiciones')}>
            Volver a Procesos
          </Button>
        </div>
      </ModulePageShell>
    );
  }

  return (
    <ModulePageShell>
      <PageHeader
        eyebrow="Procesos"
        title={definition.nombre}
        description="Definicion ampliada del proceso, alcance, SIPOC, documentos y versionado."
        breadcrumbs={[
          { label: 'Procesos', href: '/procesos' },
          { label: 'Definiciones', href: '/procesos/definiciones' },
          { label: definition.nombre },
        ]}
      />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">
                {definition.nombre}
              </h1>
              {definition.category_id && (
                <Badge
                  className={
                    PROCESS_CATEGORIES[definition.category_id]?.color ||
                    'bg-gray-100'
                  }
                >
                  {PROCESS_CATEGORIES[definition.category_id]?.label}
                </Badge>
              )}
              <Badge className="bg-purple-100 text-purple-800">
                v{definition.version || 1}
              </Badge>
              {definition.vigente !== false ? (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Vigente
                </Badge>
              ) : (
                <Badge className="bg-gray-100 text-gray-800">
                  <XCircle className="h-3 w-3 mr-1" />
                  Histórico
                </Badge>
              )}
            </div>
            <p className="text-gray-600 mt-1 font-mono">
              Código:{' '}
              {definition.category_id && definition.process_code
                ? `${definition.category_id}-${definition.process_code}`
                : definition.process_code || 'Sin asignar'}
            </p>
          </div>
        </div>
      </div>

      {/* Layout 70/30 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 70% - Contenido Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Información General */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Información General
              </CardTitle>
              {editingSection !== 'info' && <EditButton section="info" />}
            </CardHeader>
            <CardContent>
              {editingSection === 'info' ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Nombre
                    </label>
                    <Input
                      value={editValues.nombre || ''}
                      onChange={e =>
                        setEditValues({ ...editValues, nombre: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-gray-600">
                        Descripción
                      </label>
                      <AIAssistButton
                        context={{
                          modulo: 'procesos',
                          tipo: 'proceso',
                          datos: {
                            nombre: editValues.nombre || definition.nombre,
                          },
                        }}
                        onGenerate={texto =>
                          setEditValues({ ...editValues, descripcion: texto })
                        }
                        label="✨ Sugerir con IA"
                        className="bg-purple-600 hover:bg-purple-700 text-white border-0"
                      />
                    </div>
                    <Textarea
                      value={editValues.descripcion || ''}
                      onChange={e =>
                        setEditValues({
                          ...editValues,
                          descripcion: e.target.value,
                        })
                      }
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  {/* Categoría eliminada: usar Clasificación ISO 9001 */}
                  <SaveCancelButtons />
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-gray-600">
                      Nombre
                    </div>
                    <div className="text-gray-900 mt-1">
                      {definition.nombre}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-600">
                      Descripción
                    </div>
                    <div className="text-gray-900 mt-1">
                      {definition.descripcion || '—'}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Clasificación ISO 9001 */}
          <Card className="border-l-4 border-l-indigo-500">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-indigo-600" />
                Clasificación ISO 9001
              </CardTitle>
              {editingSection !== 'clasificacion_iso' && (
                <EditButton section="clasificacion_iso" />
              )}
            </CardHeader>
            <CardContent>
              {editingSection === 'clasificacion_iso' ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Nivel / Categoría
                    </label>
                    <select
                      value={editValues.category_id || ''}
                      onChange={e =>
                        setEditValues({
                          ...editValues,
                          category_id: parseInt(
                            e.target.value
                          ) as ProcessCategoryId,
                        })
                      }
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Seleccionar nivel...</option>
                      <option value="1">1 - Estrategia</option>
                      <option value="2">2 - Soporte</option>
                      <option value="3">3 - Operativo (Core)</option>
                      <option value="4">4 - Evaluación</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Código del Proceso (2-4 letras)
                    </label>
                    <Input
                      value={editValues.process_code || ''}
                      onChange={e =>
                        setEditValues({
                          ...editValues,
                          process_code: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="Ej: CO, COM, DES, PLAN"
                      maxLength={4}
                      className={`mt-1 uppercase ${
                        codeValidation.available === false
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                          : codeValidation.available === true
                            ? 'border-green-500 focus:border-green-500'
                            : ''
                      }`}
                    />
                  </div>
                  <SaveCancelButtons />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-600">
                      Nivel
                    </div>
                    <div className="mt-1">
                      {definition.category_id ? (
                        <Badge
                          className={
                            PROCESS_CATEGORIES[definition.category_id]?.color ||
                            'bg-gray-100'
                          }
                        >
                          {definition.category_id} -{' '}
                          {PROCESS_CATEGORIES[definition.category_id]?.label}
                        </Badge>
                      ) : (
                        <span className="text-gray-400 italic">
                          Sin clasificar
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-600">
                      Código
                    </div>
                    <div className="text-gray-900 mt-1 font-mono text-lg">
                      {definition.process_code || (
                        <span className="text-gray-400 italic text-base">
                          Sin código
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Normas Relacionadas */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-blue-600" />
                Normas ISO 9001 Relacionadas
              </CardTitle>
              {editingSection !== 'normas' && <EditButton section="normas" />}
            </CardHeader>
            <CardContent>
              {editingSection === 'normas' ? (
                <div className="space-y-4">
                  <Alert className="bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-800">
                      Vinculación Normativa
                    </AlertTitle>
                    <AlertDescription className="text-blue-700 text-xs">
                      Selecciona los puntos de la norma ISO 9001:2015 que este
                      proceso satisface.
                    </AlertDescription>
                  </Alert>
                  <NormPointSelector
                    selectedIds={editValues.related_norm_points || []}
                    suggestionContext={{
                      nombre:
                        (editValues.nombre as string) || definition.nombre,
                      descripcion:
                        (editValues.descripcion as string) ||
                        definition.descripcion,
                      categoria: String(definition.category_id || ''),
                    }}
                    onChange={ids =>
                      setEditValues({ ...editValues, related_norm_points: ids })
                    }
                  />
                  <SaveCancelButtons />
                </div>
              ) : (
                <NormPointSelector
                  selectedIds={definition.related_norm_points || []}
                  onChange={() => {}}
                  readOnly={true}
                />
              )}
            </CardContent>
          </Card>

          {/* Documentos Relacionados */}
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-amber-600" />
                Documentos Relacionados
              </CardTitle>
              {editingSection !== 'documentos' && (
                <EditButton section="documentos" />
              )}
            </CardHeader>
            <CardContent>
              {editingSection === 'documentos' ? (
                <div className="space-y-4">
                  <div className="text-sm text-gray-500 mb-2">
                    Vincula procedimientos, instructivos o leyes aplicables
                    (PDF).
                  </div>
                  <DocumentSelector
                    selectedIds={editValues.documentos_ids || []}
                    onChange={ids =>
                      setEditValues({ ...editValues, documentos_ids: ids })
                    }
                  />
                  <SaveCancelButtons />
                </div>
              ) : (
                <DocumentSelector
                  selectedIds={definition.documentos_ids || []}
                  onChange={() => {}}
                  readOnly={true}
                />
              )}
            </CardContent>
          </Card>

          {/* Modelo de Registros */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Modelo de Registros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Tipo:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {formatTipoRegistros(definition.tipo_registros)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Módulo vinculado:</span>
                <span className="ml-2 text-gray-900">
                  {formatModuloVinculado(definition.modulo_vinculado)}
                </span>
              </div>
              {definition.tipo_registros === 'vincular' && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  Este proceso no usa ABM de Registros de Procesos. Se gestiona
                  directamente en su módulo exclusivo.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Objetivo */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Objetivo del Proceso
              </CardTitle>
              {editingSection !== 'objetivo' && (
                <EditButton section="objetivo" />
              )}
            </CardHeader>
            <CardContent>
              {editingSection === 'objetivo' ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">
                      Redacta el objetivo del proceso
                    </span>
                    <AIAssistButton
                      context={{
                        modulo: 'procesos',
                        tipo: 'proceso',
                        campo: 'objetivo',
                        datos: { nombre: definition.nombre },
                      }}
                      onGenerate={texto =>
                        setEditValues({ ...editValues, objetivo: texto })
                      }
                      label="✨ Sugerir objetivo"
                      className="bg-purple-600 hover:bg-purple-700 text-white border-0"
                    />
                  </div>
                  <Textarea
                    value={editValues.objetivo || ''}
                    onChange={e =>
                      setEditValues({ ...editValues, objetivo: e.target.value })
                    }
                    rows={4}
                    placeholder="Describe el objetivo del proceso..."
                  />
                  <SaveCancelButtons />
                </div>
              ) : (
                <div className="text-gray-900 whitespace-pre-wrap">
                  {definition.objetivo || (
                    <span className="text-gray-400 italic">
                      Sin objetivo definido
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alcance */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2">
                <Maximize2 className="h-5 w-5" />
                Alcance
              </CardTitle>
              {editingSection !== 'alcance' && <EditButton section="alcance" />}
            </CardHeader>
            <CardContent>
              {editingSection === 'alcance' ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">
                      Define el alcance del proceso
                    </span>
                    <AIAssistButton
                      context={{
                        modulo: 'procesos',
                        tipo: 'proceso',
                        campo: 'alcance',
                        datos: { nombre: definition.nombre },
                      }}
                      onGenerate={texto =>
                        setEditValues({ ...editValues, alcance: texto })
                      }
                      label="✨ Sugerir alcance"
                      className="bg-purple-600 hover:bg-purple-700 text-white border-0"
                    />
                  </div>
                  <Textarea
                    value={editValues.alcance || ''}
                    onChange={e =>
                      setEditValues({ ...editValues, alcance: e.target.value })
                    }
                    rows={4}
                    placeholder="Describe el alcance del proceso..."
                  />
                  <SaveCancelButtons />
                </div>
              ) : (
                <div className="text-gray-900 whitespace-pre-wrap">
                  {definition.alcance || (
                    <span className="text-gray-400 italic">
                      Sin alcance definido
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Funciones Involucradas */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Funciones Involucradas
              </CardTitle>
              {editingSection !== 'funciones' && (
                <EditButton section="funciones" />
              )}
            </CardHeader>
            <CardContent>
              {editingSection === 'funciones' ? (
                <div>
                  <div className="flex gap-2 mb-3">
                    <Input
                      value={newFuncion}
                      onChange={e => setNewFuncion(e.target.value)}
                      placeholder="Agregar función..."
                      onKeyPress={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddFuncion();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={handleAddFuncion}
                      variant="outline"
                      size="sm"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(editValues.funciones_involucradas || []).map(
                      (func, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-sm py-1 px-3 flex items-center gap-1"
                        >
                          {func}
                          <button
                            type="button"
                            onClick={() => handleRemoveFuncion(func)}
                            className="hover:text-red-600 ml-1"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )
                    )}
                  </div>
                  <SaveCancelButtons />
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {definition.funciones_involucradas &&
                  definition.funciones_involucradas.length > 0 ? (
                    definition.funciones_involucradas.map((func, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-sm py-1 px-3"
                      >
                        {func}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-gray-400 italic text-sm">
                      No hay funciones asignadas
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Descripción Detallada del Proceso (antes Etapas) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Descripción Detallada del Proceso
              </CardTitle>
              {editingSection !== 'descripcion_detallada' && (
                <EditButton section="descripcion_detallada" />
              )}
            </CardHeader>
            <CardContent>
              {editingSection === 'descripcion_detallada' ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">
                      Describe los pasos, entradas, salidas y controles del
                      proceso
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setEditValues({
                            ...editValues,
                            descripcion_detallada: `ENTRADAS:
- [Entrada 1]
- [Entrada 2]

ACTIVIDADES PUNTUALES:
1. [Paso 1]
2. [Paso 2]
3. [Paso 3]

SALIDAS:
- [Salida 1]
- [Salida 2]

CONTROLES / KPIs:
- [Control 1]

RIESGOS:
- [Riesgo 1]`,
                          })
                        }
                        className="text-purple-600 border-purple-200 hover:bg-purple-50"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Usar Plantilla
                      </Button>
                      <AIAssistButton
                        context={{
                          modulo: 'procesos',
                          tipo: 'proceso',
                          campo: 'descripcion_detallada',
                          datos: {
                            nombre: definition.nombre,
                            objetivo: definition.objetivo,
                            alcance: definition.alcance,
                          },
                        }}
                        onGenerate={texto =>
                          setEditValues({
                            ...editValues,
                            descripcion_detallada: texto,
                          })
                        }
                        label="✨ Sugerir PASOS"
                        className="bg-purple-600 hover:bg-purple-700 text-white border-0"
                      />
                    </div>
                  </div>
                  <Textarea
                    value={editValues.descripcion_detallada || ''}
                    onChange={e =>
                      setEditValues({
                        ...editValues,
                        descripcion_detallada: e.target.value,
                      })
                    }
                    rows={12}
                    placeholder="Describe detalladamente el proceso..."
                    className="font-mono text-sm"
                  />
                  <SaveCancelButtons />
                </div>
              ) : (
                <div className="space-y-4">
                  {definition.descripcion_detallada ? (
                    <div className="whitespace-pre-wrap text-sm text-gray-700 font-normal leading-relaxed p-4 bg-gray-50 rounded-lg border border-gray-100">
                      {definition.descripcion_detallada}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-400 italic">
                      Sin descripción detallada.
                      {definition.etapas_default &&
                        definition.etapas_default.length > 0 && (
                          <div className="mt-2 text-xs">
                            (Existen {definition.etapas_default.length} etapas
                            legacy no migradas)
                          </div>
                        )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* SIPOC Structure */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Estructura SIPOC (Entradas, Salidas, Riesgos)
              </CardTitle>
              {editingSection !== 'sipoc' && <EditButton section="sipoc" />}
            </CardHeader>
            <CardContent>
              {editingSection === 'sipoc' ? (
                <div>
                  <SIPOCEditor
                    initialData={
                      editValues.sipoc || definition.sipoc || createEmptySIPOC()
                    }
                    onChange={newData =>
                      setEditValues({ ...editValues, sipoc: newData })
                    }
                    processName={editValues.nombre || definition.nombre}
                    category={editValues.category_id || definition.category_id}
                  />
                  <SaveCancelButtons />
                </div>
              ) : (
                <SIPOCEditor
                  initialData={definition.sipoc || createEmptySIPOC()}
                  readOnly={true}
                  onChange={() => {}}
                  processName={definition.nombre}
                  category={definition.category_id}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Departamento Responsable
              </CardTitle>
              {editingSection !== 'departamento_responsable' && (
                <EditButton section="departamento_responsable" />
              )}
            </CardHeader>
            <CardContent>
              {editingSection === 'departamento_responsable' ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Departamento Responsable
                    </label>
                    <Select
                      value={editValues.departamento_responsable_id || 'none'}
                      onValueChange={handleDepartamentoResponsableChange}
                      disabled={loadingDepartments}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Seleccionar departamento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin asignar</SelectItem>
                        {departments.map(department => (
                          <SelectItem key={department.id} value={department.id}>
                            {department.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-2 text-xs text-gray-500">
                      Campo opcional. Permite identificar el area responsable del proceso.
                    </p>
                  </div>
                  <SaveCancelButtons />
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-gray-600">
                      Departamento Actual
                    </div>
                    <div className="text-gray-900 mt-1">
                      {definition.departamento_responsable_nombre || 'Sin asignar'}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Jefe de Proceso */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Jefe de Proceso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-gray-600">
                    Responsable Actual
                  </div>
                  <div className="text-gray-900 mt-1 flex items-center gap-2">
                    <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-medium">
                      {definition.jefe_proceso_nombre
                        ? definition.jefe_proceso_nombre.charAt(0)
                        : '?'}
                    </div>
                    <span>
                      {definition.jefe_proceso_nombre || 'Sin asignar'}
                    </span>
                  </div>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  La asignacion de responsables, puesto y departamento se
                  administra desde Mi Panel. Esta vista queda solo como
                  referencia.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Columna Derecha */}
        <div className="space-y-6">
          {/* Panel de Estado y Publicación */}
          <Card className="border-t-4 border-t-purple-600 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-600" />
                Estado del Proceso
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">Completitud</span>
                  <span
                    className={`font-bold ${completeness === 100 ? 'text-green-600' : 'text-gray-900'}`}
                  >
                    {completeness}%
                  </span>
                </div>
                <Progress value={completeness} className="h-2" />
              </div>

              {completeness < 100 && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="text-sm font-medium">
                    Faltan datos clave
                  </AlertTitle>
                  <AlertDescription className="text-xs mt-1">
                    Revisar:
                    <ul className="list-disc list-inside mt-1">
                      {!definition.sipoc?.activities?.length && (
                        <li>Actividades SIPOC</li>
                      )}
                      {!definition.jefe_proceso_id &&
                        !definition.owner_position_id && <li>Responsable</li>}
                      {!definition.objetivo && <li>Objetivo</li>}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {definition.vigente !== false ? (
                <div className="pt-4 border-t">
                  <h4 className="font-medium text-sm text-gray-900 mb-2">
                    Versión Actual: {definition.version}
                  </h4>
                  <p className="text-xs text-gray-500 mb-3">
                    Publicar una nueva versión archivará la actual y creará una
                    copia editable v{(definition.version_number || 1) + 1}.0
                  </p>
                  <Button
                    onClick={handlePublishVersion}
                    disabled={publishing}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {publishing ? 'Publicando...' : 'Publicar Nueva Versión'}
                  </Button>
                </div>
              ) : (
                <div className="pt-4 border-t bg-gray-50 -mx-6 -mb-6 p-6 text-center">
                  <ShieldAlert className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <h4 className="font-medium text-gray-900">
                    Versión Histórica
                  </h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Esta versión no es editable porque existe una versión
                    posterior.
                  </p>
                  <Button
                    variant="link"
                    className="mt-2 text-purple-600"
                    onClick={() => router.push(`/procesos/definiciones`)} // Idealmente ir a la versión vigente si tuviéramos el ID
                  >
                    Ver listado de procesos
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Información del Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm">
                <span className="text-gray-500">ID:</span>
                <span className="ml-2 font-mono text-xs">{definition.id}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Creado:</span>
                <span className="ml-2">
                  {formatDate(definition.created_at)}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Versión Actual:</span>
                <span className="ml-2">{definition.version}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ModulePageShell>
  );
}
