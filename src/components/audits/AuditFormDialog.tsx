'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Textarea } from '@/components/ui/textarea';
import type { AuditFormData } from '@/types/audits';
import type { NormaISO } from '@/types/sig-core';
import { Loader2, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AuditFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AuditFormData) => Promise<void>;
  initialData?: Partial<AuditFormData>;
  mode?: 'create' | 'edit';
}

export function AuditFormDialog({
  open,
  onClose,
  onSubmit,
  initialData,
  mode = 'create',
}: AuditFormDialogProps) {
  const [formData, setFormData] = useState<Partial<AuditFormData>>(
    initialData || {
      title: '',
      auditType: 'complete',
      scope: '',
      plannedDate: new Date(),
      leadAuditor: '',
      selectedNormPoints: [],
    }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [normPoints, setNormPoints] = useState<any[]>([]);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Cargar puntos de norma si es auditoría parcial
  useEffect(() => {
    if (formData.auditType === 'partial' && normPoints.length === 0) {
      loadNormPoints();
    }
  }, [formData.auditType]);

  const loadNormPoints = async () => {
    setLoadingPoints(true);
    try {
      const response = await fetch('/api/sdk/norm-points?limit=500');
      const result = await response.json();
      if (result.success) {
        setNormPoints(result.data);
      }
    } catch (err) {
      console.error('Error loading norm points:', err);
    } finally {
      setLoadingPoints(false);
    }
  };

  const filteredPoints = normPoints.filter(
    p =>
      p.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.requirement?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const NORMA_OPTIONS: { value: NormaISO; label: string }[] = [
    { value: 'ISO_9001', label: 'ISO 9001 — Calidad' },
    { value: 'ISO_14001', label: 'ISO 14001 — Medio Ambiente' },
    { value: 'ISO_45001', label: 'ISO 45001 — Seguridad y Salud' },
    { value: 'ISO_27001', label: 'ISO 27001 — Seguridad de la Información' },
    { value: 'ISO_31000', label: 'ISO 31000 — Gestión de Riesgos' },
  ];

  const toggleNorma = (norma: NormaISO) => {
    const current = formData.normas || [];
    if (current.includes(norma)) {
      setFormData({ ...formData, normas: current.filter(n => n !== norma) });
    } else {
      setFormData({ ...formData, normas: [...current, norma] });
    }
  };

  const togglePoint = (pointId: string) => {
    const current = formData.selectedNormPoints || [];
    if (current.includes(pointId)) {
      setFormData({
        ...formData,
        selectedNormPoints: current.filter(id => id !== pointId),
      });
    } else {
      setFormData({
        ...formData,
        selectedNormPoints: [...current, pointId],
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSubmit(formData as AuditFormData);
      onClose();
      // Reset form
      setFormData({
        title: '',
        auditType: 'complete',
        scope: '',
        plannedDate: new Date(),
        leadAuditor: '',
        selectedNormPoints: [],
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al guardar la auditoría'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        aria-describedby="audit-form-description"
      >
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Nueva Auditoría' : 'Editar Auditoría'}
          </DialogTitle>
        </DialogHeader>
        <p id="audit-form-description" className="sr-only">
          Formulario para {mode === 'create' ? 'crear' : 'editar'} una auditoría
          interna ISO 9001
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información Básica */}
          <div className="space-y-4">
            <SectionHeader
              title="Información Básica"
              description="Detalles generales de la auditoría"
            />

            <div>
              <Label htmlFor="title">
                Título <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title || ''}
                onChange={e =>
                  setFormData({ ...formData, title: e.target.value })
                }
                maxLength={200}
                placeholder="Ej: Auditoría Interna 2025"
                required
                className="mt-1.5 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="auditType">
                  Tipo de Auditoría <span className="text-red-500">*</span>
                </Label>
                <select
                  id="auditType"
                  value={formData.auditType}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      auditType: e.target.value as 'complete' | 'partial',
                    })
                  }
                  className="w-full h-10 mt-1.5 px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="complete">Auditoría Completa</option>
                  <option value="partial">Auditoría Parcial</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {formData.auditType === 'complete'
                    ? 'Se verificarán todos los puntos de la norma ISO 9001:2015'
                    : 'Seleccione los puntos específicos a auditar'}
                </p>
              </div>

              <div>
                <Label htmlFor="leadAuditor">
                  Auditor Líder <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="leadAuditor"
                  value={formData.leadAuditor || ''}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      leadAuditor: e.target.value,
                    })
                  }
                  placeholder="Nombre del auditor líder"
                  required
                  className="focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="scope">
                Alcance <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="scope"
                value={formData.scope || ''}
                onChange={e =>
                  setFormData({ ...formData, scope: e.target.value })
                }
                rows={3}
                maxLength={500}
                placeholder="Describe el alcance de la auditoría..."
                required
                className="mt-1.5 resize-none focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <Label htmlFor="plannedDate">
                Fecha Planificada <span className="text-red-500">*</span>
              </Label>
              <Input
                id="plannedDate"
                type="date"
                value={
                  formData.plannedDate
                    ? new Date(formData.plannedDate).toISOString().split('T')[0]
                    : ''
                }
                onChange={e =>
                  setFormData({
                    ...formData,
                    plannedDate: new Date(e.target.value),
                  })
                }
                required
                className="mt-1.5 w-full md:w-1/2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Normas que cubre esta auditoría — multi-norma SIG */}
          <div className="space-y-3 border-t pt-4">
            <SectionHeader
              title="Normas que cubre esta auditoría"
              description="Opcional. Permite registrar auditorías que abarcan múltiples normas ISO."
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {NORMA_OPTIONS.map(({ value, label }) => (
                <div
                  key={value}
                  className="flex items-center space-x-3 rounded-md border border-input px-3 py-2 hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => toggleNorma(value)}
                >
                  <Checkbox
                    id={`norma-${value}`}
                    checked={(formData.normas || []).includes(value)}
                    onCheckedChange={() => toggleNorma(value)}
                  />
                  <Label htmlFor={`norma-${value}`} className="text-sm cursor-pointer font-normal">
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {formData.auditType === 'partial' && (
            <div className="space-y-4 border-t pt-4">
              <SectionHeader
                title="Puntos de Norma"
                description="Seleccione los puntos específicos a auditar"
              />

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar punto de norma..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {loadingPoints ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1 border rounded-md">
                  {filteredPoints.map(point => (
                    <div
                      key={point.id}
                      className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded-md transition-colors cursor-pointer"
                      onClick={() => togglePoint(point.id)}
                    >
                      <Checkbox
                        id={`point-${point.id}`}
                        checked={formData.selectedNormPoints?.includes(
                          point.id
                        )}
                        onCheckedChange={() => togglePoint(point.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor={`point-${point.id}`}
                          className="text-sm font-medium leading-none cursor-pointer"
                        >
                          {point.code || point.chapter}{' '}
                          <span className="font-normal text-muted-foreground">
                            - {point.requirement || point.title}
                          </span>
                        </Label>
                      </div>
                    </div>
                  ))}
                  {filteredPoints.length === 0 && (
                    <div className="col-span-2 text-center py-4 text-gray-500 text-sm">
                      No se encontraron puntos de norma.
                    </div>
                  )}
                </div>
              )}
              {formData.selectedNormPoints &&
                formData.selectedNormPoints.length === 0 && (
                  <p className="text-xs text-red-500">
                    Debe seleccionar al menos un punto para auditorías
                    parciales.
                  </p>
                )}
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : mode === 'create' ? (
                'Crear Auditoría'
              ) : (
                'Guardar Cambios'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
