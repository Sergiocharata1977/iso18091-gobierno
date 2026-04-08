'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AuditFormData } from '@/types/audits';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface AuditWizardProps {
  onSubmit: (data: AuditFormData) => Promise<void>;
  isLoading?: boolean;
}

type WizardStep = 1 | 2 | 3 | 4;

const NORM_POINTS = [
  '4.1',
  '4.2',
  '4.3',
  '4.4',
  '5.1',
  '5.2',
  '5.3',
  '6.1',
  '6.2',
  '6.3',
  '7.1',
  '7.2',
  '7.3',
  '7.4',
  '7.5',
  '8.1',
  '8.2',
  '8.3',
  '8.4',
  '8.5',
  '8.6',
  '8.7',
  '9.1',
  '9.2',
  '9.3',
  '10.1',
  '10.2',
  '10.3',
];

export function AuditWizard({ onSubmit, isLoading = false }: AuditWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [formData, setFormData] = useState<AuditFormData>({
    title: '',
    auditType: 'complete',
    scope: '',
    plannedDate: new Date(),
    leadAuditor: '',
    selectedNormPoints: [],
  });
  const [selectedPoints, setSelectedPoints] = useState<string[]>([]);
  const [error, setError] = useState<string>('');

  const handleInputChange = (field: keyof AuditFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleNormPointToggle = (point: string) => {
    setSelectedPoints(prev =>
      prev.includes(point) ? prev.filter(p => p !== point) : [...prev, point]
    );
  };

  const validateStep = (step: WizardStep): boolean => {
    switch (step) {
      case 1:
        if (!formData.title.trim()) {
          setError('El título es requerido');
          return false;
        }
        if (!formData.scope.trim()) {
          setError('El alcance es requerido');
          return false;
        }
        return true;
      case 2:
        if (formData.auditType === 'partial' && selectedPoints.length === 0) {
          setError(
            'Debe seleccionar al menos un punto de norma para auditoría parcial'
          );
          return false;
        }
        return true;
      case 3:
        if (!formData.leadAuditor.trim()) {
          setError('El auditor líder es requerido');
          return false;
        }
        if (!formData.plannedDate) {
          setError('La fecha planificada es requerida');
          return false;
        }
        return true;
      case 4:
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep((currentStep + 1) as WizardStep);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as WizardStep);
    }
  };

  const handleSubmit = async () => {
    if (validateStep(currentStep)) {
      try {
        const dataToSubmit = {
          ...formData,
          selectedNormPoints:
            formData.auditType === 'partial' ? selectedPoints : [],
        };
        await onSubmit(dataToSubmit);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Error al crear la auditoría'
        );
      }
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {[1, 2, 3, 4].map(step => (
            <div
              key={step}
              className={`flex-1 h-2 mx-1 rounded-full transition-colors ${
                step <= currentStep ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        <p className="text-sm text-gray-600 text-center">
          Paso {currentStep} de 4
        </p>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow p-8 min-h-96">
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Información Básica
              </h2>
              <p className="text-gray-600 mb-6">
                Ingrese los detalles principales de la auditoría
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título de la Auditoría *
              </label>
              <Input
                value={formData.title}
                onChange={e => handleInputChange('title', e.target.value)}
                placeholder="Ej: Auditoría de Procesos de Calidad"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alcance *
              </label>
              <textarea
                value={formData.scope}
                onChange={e => handleInputChange('scope', e.target.value)}
                placeholder="Describa el alcance de la auditoría"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                rows={4}
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Auditoría
              </label>
              <div className="flex gap-4">
                {['complete', 'partial'].map(type => (
                  <label
                    key={type}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="auditType"
                      value={type}
                      checked={formData.auditType === type}
                      onChange={e =>
                        handleInputChange('auditType', e.target.value)
                      }
                      disabled={isLoading}
                    />
                    <span className="text-sm text-gray-700">
                      {type === 'complete' ? 'Completa' : 'Parcial'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Puntos de Norma
              </h2>
              <p className="text-gray-600 mb-6">
                {formData.auditType === 'complete'
                  ? 'Se auditarán todos los puntos de norma ISO 9001'
                  : 'Seleccione los puntos de norma a auditar'}
              </p>
            </div>

            {formData.auditType === 'partial' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Puntos de Norma Seleccionados ({selectedPoints.length})
                </label>
                <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto p-3 border border-gray-300 rounded-lg">
                  {NORM_POINTS.map(point => (
                    <button
                      key={point}
                      onClick={() => handleNormPointToggle(point)}
                      disabled={isLoading}
                      className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                        selectedPoints.includes(point)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {point}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {formData.auditType === 'complete' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  Se auditarán todos los {NORM_POINTS.length} puntos de norma
                  ISO 9001
                </p>
              </div>
            )}
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Detalles de Ejecución
              </h2>
              <p className="text-gray-600 mb-6">
                Asigne el auditor líder y la fecha de ejecución
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auditor Líder *
              </label>
              <Input
                value={formData.leadAuditor}
                onChange={e => handleInputChange('leadAuditor', e.target.value)}
                placeholder="Nombre del auditor líder"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha Planificada *
              </label>
              <input
                type="date"
                value={
                  formData.plannedDate instanceof Date
                    ? formData.plannedDate.toISOString().split('T')[0]
                    : ''
                }
                onChange={e =>
                  handleInputChange('plannedDate', new Date(e.target.value))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                disabled={isLoading}
              />
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Revisión y Confirmación
              </h2>
              <p className="text-gray-600 mb-6">
                Verifique los detalles antes de crear la auditoría
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600">Título</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formData.title}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Alcance</p>
                <p className="text-gray-900">{formData.scope}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Tipo</p>
                  <p className="text-gray-900">
                    {formData.auditType === 'complete' ? 'Completa' : 'Parcial'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Auditor Líder</p>
                  <p className="text-gray-900">{formData.leadAuditor}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Fecha Planificada</p>
                  <p className="text-gray-900">
                    {formData.plannedDate instanceof Date
                      ? formData.plannedDate.toLocaleDateString('es-ES')
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Puntos de Norma</p>
                  <p className="text-gray-900">
                    {formData.auditType === 'complete'
                      ? 'Todos (27 puntos)'
                      : `${selectedPoints.length} seleccionados`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        <Button
          onClick={handlePrevious}
          disabled={currentStep === 1 || isLoading}
          variant="outline"
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Anterior
        </Button>

        <div className="flex gap-2">
          {currentStep < 4 ? (
            <Button onClick={handleNext} disabled={isLoading} className="gap-2">
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isLoading ? 'Creando...' : 'Crear Auditoría'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
