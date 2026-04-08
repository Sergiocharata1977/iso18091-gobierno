'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { db, storage } from '@/lib/firebase';
import { PlanEstructura } from '@/types/planificacion';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import {
  BrainCircuit,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  Upload,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface EstructuraFormProps {
  initialData: Partial<PlanEstructura>;
  organizationId: string;
  readOnly?: boolean;
  onChange: (data: Partial<PlanEstructura>) => void;
}

interface Process {
  id: string;
  nombre: string;
  codigo?: string;
}

export function EstructuraForm({
  initialData,
  organizationId,
  readOnly = false,
  onChange,
}: EstructuraFormProps) {
  const [data, setData] = useState<Partial<PlanEstructura>>(initialData);
  const [uploadingOrg, setUploadingOrg] = useState(false);
  const [generatingOrg, setGeneratingOrg] = useState(false);
  const [uploadingProc, setUploadingProc] = useState(false);
  const [generatingProc, setGeneratingProc] = useState(false);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loadingProcesses, setLoadingProcesses] = useState(false);

  useEffect(() => {
    loadProcesses();
  }, [organizationId]);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const loadProcesses = async () => {
    if (!organizationId) return;
    setLoadingProcesses(true);
    try {
      const q = query(
        collection(db, 'processes'),
        where('organization_id', '==', organizationId)
      );
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Process);
      setProcesses(docs);
    } catch (error) {
      console.error('Error loading processes:', error);
    } finally {
      setLoadingProcesses(false);
    }
  };

  const handleFieldChange = (key: keyof PlanEstructura, value: any) => {
    const newData = { ...data, [key]: value };
    setData(newData);
    onChange(newData);
  };

  // ==================== ORGANIGRAMA ====================

  const handleOrgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingOrg(true);
    try {
      const storageRef = ref(
        storage,
        `organizations/${organizationId}/estructura/org_${Date.now()}_${file.name}`
      );
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      handleFieldChange('organigrama_upload_url', url);
      // Si no hay fuente activa, seleccionar automáticamente
      if (!data.organigrama_active_source) {
        handleFieldChange('organigrama_active_source', 'upload');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setUploadingOrg(false);
    }
  };

  const handleOrgGenerateAI = async () => {
    if (!data.descripcion_breve) {
      alert('Por favor complete la descripción breve primero.');
      return;
    }

    setGeneratingOrg(true);
    try {
      // TODO: Integrar con endpoint real que use datos de RRHH
      // Por ahora es mock - en producción llamar a /api/ai/generate-organigrama
      await new Promise(resolve => setTimeout(resolve, 2000));

      const mockUrl =
        'https://firebasestorage.googleapis.com/v0/b/app-9001-firebase.firebasestorage.app/o/placeholders%2Fstructure-mock.png?alt=media';

      handleFieldChange('organigrama_ia_url', mockUrl);
      // Si no hay fuente activa, seleccionar automáticamente
      if (!data.organigrama_active_source) {
        handleFieldChange('organigrama_active_source', 'ia');
      }
    } catch (error) {
      console.error('Error generating AI image:', error);
    } finally {
      setGeneratingOrg(false);
    }
  };

  const handleOrgSourceChange = (source: 'upload' | 'ia') => {
    handleFieldChange('organigrama_active_source', source);
  };

  // ==================== PROCESOS ====================

  const handleProcUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingProc(true);
    try {
      const storageRef = ref(
        storage,
        `organizations/${organizationId}/estructura/proc_${Date.now()}_${file.name}`
      );
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      handleFieldChange('procesos_imagen_upload_url', url);
      if (!data.procesos_imagen_active_source) {
        handleFieldChange('procesos_imagen_active_source', 'upload');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setUploadingProc(false);
    }
  };

  const handleProcGenerateAI = async () => {
    const selectedProcesses = data.procesos_relacionados || [];
    if (selectedProcesses.length === 0) {
      alert('Por favor seleccione al menos un proceso primero.');
      return;
    }

    setGeneratingProc(true);
    try {
      // TODO: Integrar con endpoint real
      await new Promise(resolve => setTimeout(resolve, 2000));

      const mockUrl =
        'https://firebasestorage.googleapis.com/v0/b/app-9001-firebase.firebasestorage.app/o/placeholders%2Fprocess-map-mock.png?alt=media';

      handleFieldChange('procesos_imagen_ia_url', mockUrl);
      if (!data.procesos_imagen_active_source) {
        handleFieldChange('procesos_imagen_active_source', 'ia');
      }
    } catch (error) {
      console.error('Error generating AI image:', error);
    } finally {
      setGeneratingProc(false);
    }
  };

  const handleProcSourceChange = (source: 'upload' | 'ia') => {
    handleFieldChange('procesos_imagen_active_source', source);
  };

  const toggleProcess = (processId: string) => {
    const current = data.procesos_relacionados || [];
    const updated = current.includes(processId)
      ? current.filter(id => id !== processId)
      : [...current, processId];
    handleFieldChange('procesos_relacionados', updated);
  };

  // ==================== RENDER HELPERS ====================

  const renderImageSelector = (
    uploadUrl: string | undefined,
    iaUrl: string | undefined,
    activeSource: 'upload' | 'ia' | undefined,
    onSourceChange: (source: 'upload' | 'ia') => void,
    emptyText: string
  ) => {
    const hasUpload = !!uploadUrl;
    const hasIA = !!iaUrl;
    const hasAny = hasUpload || hasIA;

    if (!hasAny) {
      return (
        <div className="border-2 border-dashed rounded-lg h-32 flex flex-col items-center justify-center text-gray-400 bg-slate-50">
          <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
          <span className="text-sm">{emptyText}</span>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Imagen Upload */}
        {hasUpload && (
          <div
            className={`relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
              activeSource === 'upload'
                ? 'border-green-500 ring-2 ring-green-200'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => !readOnly && onSourceChange('upload')}
          >
            <div className="h-48 bg-slate-100 flex items-center justify-center">
              <img
                src={uploadUrl}
                alt="Imagen subida"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="p-2 bg-white border-t flex items-center justify-between">
              <Badge variant="outline" className="text-xs">
                <Upload className="w-3 h-3 mr-1" />
                Subida
              </Badge>
              {activeSource === 'upload' && (
                <Badge className="bg-green-100 text-green-700 text-xs">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Vigente
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Imagen IA */}
        {hasIA && (
          <div
            className={`relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
              activeSource === 'ia'
                ? 'border-green-500 ring-2 ring-green-200'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => !readOnly && onSourceChange('ia')}
          >
            <div className="h-48 bg-purple-50 flex items-center justify-center">
              <img
                src={iaUrl}
                alt="Imagen generada por IA"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="p-2 bg-white border-t flex items-center justify-between">
              <Badge
                variant="outline"
                className="text-xs bg-purple-50 text-purple-700 border-purple-200"
              >
                <BrainCircuit className="w-3 h-3 mr-1" />
                Generada IA
              </Badge>
              {activeSource === 'ia' && (
                <Badge className="bg-green-100 text-green-700 text-xs">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Vigente
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Descripción */}
      <div className="space-y-2">
        <Label htmlFor="descripcion_breve">
          Descripción Breve de la Estructura
        </Label>
        <div className="text-xs text-muted-foreground mb-1 bg-blue-50 p-2 rounded border border-blue-100">
          ISO 9001:2015 – Cláusula 5.3 (Roles, responsabilidades y autoridades)
        </div>
        <Textarea
          id="descripcion_breve"
          value={data.descripcion_breve || ''}
          onChange={e => handleFieldChange('descripcion_breve', e.target.value)}
          placeholder="Describa brevemente la estructura jerárquica y áreas principales..."
          disabled={readOnly}
          rows={3}
        />
      </div>

      {/* ==================== ORGANIGRAMA ==================== */}
      <div className="space-y-3 p-4 border rounded-lg bg-slate-50/50">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Organigrama</Label>
          <div className="text-xs text-muted-foreground bg-blue-50 px-2 py-1 rounded border border-blue-100">
            Evidencia visual (Anexo A)
          </div>
        </div>

        {!readOnly && (
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[150px]">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                id="organigrama-upload"
                onChange={handleOrgUpload}
                disabled={uploadingOrg || generatingOrg}
              />
              <Button
                variant="outline"
                className="w-full h-10"
                asChild
                disabled={uploadingOrg || generatingOrg}
              >
                <label
                  htmlFor="organigrama-upload"
                  className="cursor-pointer flex items-center justify-center"
                >
                  {uploadingOrg ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Subir Imagen
                </label>
              </Button>
            </div>

            <div className="flex-1 min-w-[150px]">
              <Button
                variant="outline"
                className="w-full h-10 border-purple-200 hover:bg-purple-50 text-purple-700"
                onClick={handleOrgGenerateAI}
                disabled={
                  uploadingOrg || generatingOrg || !data.descripcion_breve
                }
              >
                {generatingOrg ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <BrainCircuit className="w-4 h-4 mr-2" />
                )}
                Generar con IA
              </Button>
            </div>
          </div>
        )}

        {(data.organigrama_upload_url || data.organigrama_ia_url) && (
          <p className="text-xs text-gray-500 italic">
            Haga clic en una imagen para seleccionarla como vigente
          </p>
        )}

        {renderImageSelector(
          data.organigrama_upload_url,
          data.organigrama_ia_url,
          data.organigrama_active_source,
          handleOrgSourceChange,
          'No hay organigrama cargado'
        )}
      </div>

      {/* ==================== PROCESOS RELACIONADOS ==================== */}
      <div className="space-y-3 p-4 border rounded-lg bg-slate-50/50">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">
            Procesos Relacionados
          </Label>
          <div className="text-xs text-muted-foreground bg-blue-50 px-2 py-1 rounded border border-blue-100">
            ISO 9001:2015 – Cláusula 4.4
          </div>
        </div>

        {loadingProcesses ? (
          <div className="p-4 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : (
          <ScrollArea className="h-40 border rounded-md p-3 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {processes.length > 0 ? (
                processes.map(process => (
                  <div key={process.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`p-${process.id}`}
                      checked={(data.procesos_relacionados || []).includes(
                        process.id
                      )}
                      onCheckedChange={() =>
                        !readOnly && toggleProcess(process.id)
                      }
                      disabled={readOnly}
                    />
                    <label
                      htmlFor={`p-${process.id}`}
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      {process.nombre}
                    </label>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center text-sm text-gray-500 py-4">
                  No hay procesos registrados en el sistema.
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Mapa de Procesos (imagen) */}
        <div className="pt-3 border-t">
          <Label className="text-sm font-medium mb-2 block">
            Mapa de Procesos (Imagen)
          </Label>

          {!readOnly && (
            <div className="flex flex-wrap gap-3 mb-3">
              <div className="flex-1 min-w-[150px]">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="procesos-upload"
                  onChange={handleProcUpload}
                  disabled={uploadingProc || generatingProc}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  asChild
                  disabled={uploadingProc || generatingProc}
                >
                  <label
                    htmlFor="procesos-upload"
                    className="cursor-pointer flex items-center justify-center"
                  >
                    {uploadingProc ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Subir Mapa
                  </label>
                </Button>
              </div>

              <div className="flex-1 min-w-[150px]">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-purple-200 hover:bg-purple-50 text-purple-700"
                  onClick={handleProcGenerateAI}
                  disabled={
                    uploadingProc ||
                    generatingProc ||
                    (data.procesos_relacionados || []).length === 0
                  }
                >
                  {generatingProc ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <BrainCircuit className="w-4 h-4 mr-2" />
                  )}
                  Generar con IA
                </Button>
              </div>
            </div>
          )}

          {renderImageSelector(
            data.procesos_imagen_upload_url,
            data.procesos_imagen_ia_url,
            data.procesos_imagen_active_source,
            handleProcSourceChange,
            'No hay mapa de procesos cargado'
          )}
        </div>
      </div>

      {/* Observaciones */}
      <div className="space-y-2">
        <Label htmlFor="observaciones">Observaciones Adicionales</Label>
        <Textarea
          id="observaciones"
          value={data.observaciones || ''}
          onChange={e => handleFieldChange('observaciones', e.target.value)}
          disabled={readOnly}
          rows={2}
        />
      </div>
    </div>
  );
}
