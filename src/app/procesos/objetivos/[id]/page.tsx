'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { QualityIndicator, QualityObjective } from '@/types/quality';
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  Check,
  Edit,
  Eye,
  Target,
  TrendingUp,
  User,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

type EditingSection = 'info' | 'metas' | 'fechas' | 'responsables' | null;

export default function ObjectiveDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const objectiveId = params.id as string;

  const [objective, setObjective] = useState<QualityObjective | null>(null);
  const [indicators, setIndicators] = useState<QualityIndicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingIndicators, setLoadingIndicators] = useState(false);
  const [editingSection, setEditingSection] = useState<EditingSection>(null);
  const [saving, setSaving] = useState(false);
  const [editValues, setEditValues] = useState<Partial<QualityObjective>>({});
  const [personnel, setPersonnel] = useState<any[]>([]);

  const loadObjective = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/quality/objectives/${objectiveId}`);
      if (response.ok) {
        const data = await response.json();
        setObjective(data);
      }
    } catch (error) {
      console.error('Error loading objective:', error);
    } finally {
      setLoading(false);
    }
  }, [objectiveId]);

  const loadPersonnel = async () => {
    try {
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

  useEffect(() => {
    loadObjective();
    loadPersonnel();
    loadIndicators();
  }, [loadObjective]);

  const loadIndicators = async () => {
    try {
      setLoadingIndicators(true);
      const response = await fetch(
        `/api/quality/indicators?objective_id=${objectiveId}`
      );
      if (response.ok) {
        const data = await response.json();
        setIndicators(data || []);
      }
    } catch (error) {
      console.error('Error loading indicators:', error);
    } finally {
      setLoadingIndicators(false);
    }
  };

  const startEditing = (section: EditingSection) => {
    setEditingSection(section);
    setEditValues(objective || {});
  };

  const cancelEditing = () => {
    setEditingSection(null);
    setEditValues({});
  };

  const saveSection = async () => {
    if (!objective) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/quality/objectives/${objectiveId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editValues,
          updated_at: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        await loadObjective();
        setEditingSection(null);
        setEditValues({});
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'activo':
        return 'bg-blue-100 text-blue-800';
      case 'completado':
        return 'bg-green-100 text-green-800';
      case 'atrasado':
        return 'bg-red-100 text-red-800';
      case 'cancelado':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando objetivo...</p>
        </div>
      </div>
    );
  }

  if (!objective) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Objetivo no encontrado</p>
          <Button onClick={() => router.back()} className="mt-4">
            Volver
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {objective.title}
              </h1>
              <Badge className={getStatusColor(objective.status)}>
                {objective.status}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Código: <span className="font-mono">{objective.code}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Información General */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Información General
          </CardTitle>
          {editingSection !== 'info' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => startEditing('info')}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              Editar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editingSection === 'info' ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nombre</label>
                <Input
                  value={editValues.title || ''}
                  onChange={e =>
                    setEditValues({ ...editValues, title: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Descripción</label>
                <Textarea
                  value={editValues.description || ''}
                  onChange={e =>
                    setEditValues({
                      ...editValues,
                      description: e.target.value,
                    })
                  }
                  rows={4}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={saveSection}
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                >
                  <Check className="h-4 w-4" />
                  {saving ? 'Guardando...' : 'Guardar'}
                </Button>
                <Button
                  variant="outline"
                  onClick={cancelEditing}
                  disabled={saving}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Nombre</p>
                <p className="text-base font-medium">{objective.title}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Descripción</p>
                <p className="text-base">
                  {objective.description || 'Sin descripción'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metas y Valores */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Metas y Valores
          </CardTitle>
          {editingSection !== 'metas' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => startEditing('metas')}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              Editar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editingSection === 'metas' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Valor Meta</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editValues.target_value || 0}
                    onChange={e =>
                      setEditValues({
                        ...editValues,
                        target_value: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Valor Actual</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editValues.current_value || 0}
                    onChange={e =>
                      setEditValues({
                        ...editValues,
                        current_value: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Unidad</label>
                  <Input
                    value={editValues.unit || ''}
                    onChange={e =>
                      setEditValues({ ...editValues, unit: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Línea Base</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editValues.baseline_value || 0}
                    onChange={e =>
                      setEditValues({
                        ...editValues,
                        baseline_value: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    Umbral de Alerta (%)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={editValues.alert_threshold || 80}
                    onChange={e =>
                      setEditValues({
                        ...editValues,
                        alert_threshold: parseInt(e.target.value) || 80,
                      })
                    }
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={saveSection}
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                >
                  <Check className="h-4 w-4" />
                  {saving ? 'Guardando...' : 'Guardar'}
                </Button>
                <Button
                  variant="outline"
                  onClick={cancelEditing}
                  disabled={saving}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Valor Meta</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {objective.target_value} {objective.unit}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Valor Actual</p>
                <p className="text-2xl font-bold">
                  {objective.current_value} {objective.unit}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Línea Base</p>
                <p className="text-lg font-medium">
                  {objective.baseline_value} {objective.unit}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Umbral de Alerta</p>
                <p className="text-lg font-medium">
                  {objective.alert_threshold}%
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fechas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Fechas
          </CardTitle>
          {editingSection !== 'fechas' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => startEditing('fechas')}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              Editar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editingSection === 'fechas' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Fecha de Inicio</label>
                  <Input
                    type="date"
                    value={editValues.start_date || ''}
                    onChange={e =>
                      setEditValues({
                        ...editValues,
                        start_date: e.target.value,
                      })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    Fecha de Vencimiento
                  </label>
                  <Input
                    type="date"
                    value={editValues.due_date || ''}
                    onChange={e =>
                      setEditValues({ ...editValues, due_date: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={saveSection}
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                >
                  <Check className="h-4 w-4" />
                  {saving ? 'Guardando...' : 'Guardar'}
                </Button>
                <Button
                  variant="outline"
                  onClick={cancelEditing}
                  disabled={saving}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Fecha de Inicio</p>
                <p className="text-base font-medium">
                  {new Date(objective.start_date).toLocaleDateString('es-ES')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Fecha de Vencimiento</p>
                <p className="text-base font-medium">
                  {new Date(objective.due_date).toLocaleDateString('es-ES')}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Responsables */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Responsables
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Responsable Principal</p>
              <p className="text-base font-medium">
                {personnel.find(p => p.id === objective.responsible_user_id)
                  ?.nombre_completo || 'No asignado'}
              </p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              La asignacion a personal se administra desde Mi Panel. Este
              objetivo muestra la referencia actual.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Indicadores Vinculados */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Indicadores de Calidad
          </CardTitle>
          <Button
            size="sm"
            onClick={() =>
              window.open(
                `/procesos/indicadores?objective_id=${objectiveId}`,
                '_blank'
              )
            }
            className="gap-2"
          >
            Ver Todos
          </Button>
        </CardHeader>
        <CardContent>
          {loadingIndicators ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando indicadores...</p>
            </div>
          ) : indicators.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-4">
                No hay indicadores vinculados a este objetivo
              </p>
              <Button
                onClick={() =>
                  router.push(
                    `/procesos/indicadores?objective_id=${objectiveId}`
                  )
                }
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Crear Primer Indicador
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {indicators.map(indicator => (
                <Card
                  key={indicator.id}
                  className="border-l-4 border-l-blue-500"
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-gray-900">
                            {indicator.code}
                          </h4>
                          <Badge className="bg-blue-100 text-blue-800">
                            {indicator.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {indicator.name}
                        </p>
                        {indicator.description && (
                          <p className="text-xs text-gray-500 mb-3">
                            {indicator.description}
                          </p>
                        )}
                        <div className="grid grid-cols-3 gap-4 text-xs text-gray-500">
                          <div>
                            <span className="font-medium">Meta Mín:</span>{' '}
                            {indicator.target_min} {indicator.unit}
                          </div>
                          <div>
                            <span className="font-medium">Meta Máx:</span>{' '}
                            {indicator.target_max} {indicator.unit}
                          </div>
                          <div>
                            <span className="font-medium">Frecuencia:</span>{' '}
                            {indicator.measurement_frequency}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/procesos/indicadores/${indicator.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link
                            href={`/procesos/mediciones?indicator_id=${indicator.id}`}
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button
                variant="outline"
                onClick={() =>
                  router.push(
                    `/procesos/indicadores?objective_id=${objectiveId}`
                  )
                }
                className="w-full"
              >
                Crear Nuevo Indicador
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
