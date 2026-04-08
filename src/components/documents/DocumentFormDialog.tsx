'use client';

import { AIAssistButton } from '@/components/ui/AIAssistButton';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SectionHeader } from '@/components/ui/SectionHeader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Document, DocumentStatus, DocumentType } from '@/types/documents';
import { FileText, Loader2, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';

interface DocumentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document?: Document | null;
  onSuccess: () => void;
}

export function DocumentFormDialog({
  open,
  onOpenChange,
  document,
  onSuccess,
}: DocumentFormDialogProps) {
  const { usuario } = useCurrentUser();
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    type: DocumentType;
    status: DocumentStatus;
    version: string;
    responsible_user_id: string;
    organization_id: string;
    created_by: string;
    updated_by: string;
  }>({
    title: '',
    description: '',
    type: 'procedimiento',
    status: 'borrador',
    version: '1.0',
    responsible_user_id: 'current-user',
    organization_id: '',
    created_by: 'current-user',
    updated_by: 'current-user',
  });

  useEffect(() => {
    if (document) {
      setFormData({
        title: document.title,
        description: document.description || '',
        type: document.type,
        status: document.status,
        version: document.version,
        responsible_user_id: document.responsible_user_id,
        organization_id:
          document.organization_id || usuario?.organization_id || '',
        created_by: document.created_by,
        updated_by: 'current-user',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        type: 'procedimiento',
        status: 'borrador',
        version: '1.0',
        responsible_user_id: 'current-user',
        organization_id: usuario?.organization_id || '',
        created_by: 'current-user',
        updated_by: 'current-user',
      });
    }
  }, [document, open, usuario?.organization_id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('Solo se permiten archivos PDF');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert('El archivo no debe superar 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = document ? `/api/documents/${document.id}` : '/api/documents';
      const method = document ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Error: ${error.error}`);
        return;
      }

      const savedDocument = await response.json();
      const documentId = savedDocument.id || document?.id;

      if (!documentId) {
        alert('Error: No se pudo obtener el ID del documento');
        return;
      }

      if (selectedFile) {
        setUploadingFile(true);
        const fileFormData = new FormData();
        fileFormData.append('file', selectedFile);
        fileFormData.append('userId', 'current-user');

        const fileResponse = await fetch(`/api/documents/${documentId}/file`, {
          method: 'POST',
          body: fileFormData,
        });

        if (!fileResponse.ok) {
          const errorData = await fileResponse.json();
          alert(
            `Documento guardado pero error al subir archivo: ${errorData.error || 'Error desconocido'}`
          );
        }
      }

      setSelectedFile(null);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error saving document:', error);
      alert('Error al guardar el documento');
    } finally {
      setLoading(false);
      setUploadingFile(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {document ? 'Editar Documento' : 'Nuevo Documento'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Información General */}
          <div className="space-y-4">
            <SectionHeader
              title="Información General"
              description="Detalles básicos del documento"
            />

            <div>
              <Label htmlFor="title">
                Título <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={e =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
                placeholder="Ej: Manual de Calidad ISO 9001"
                className="mt-1.5 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="description">Descripción</Label>
                <AIAssistButton
                  context={{
                    modulo: 'documentos',
                    tipo: 'procedimiento',
                    campo: 'descripcion',
                    datos: {
                      titulo: formData.title,
                      tipo_documento: formData.type,
                    },
                  }}
                  onGenerate={texto =>
                    setFormData({ ...formData, description: texto })
                  }
                  label="Sugerir con IA"
                  disabled={!formData.title}
                />
              </div>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                placeholder="Describe el contenido y propósito del documento..."
                className="mt-1.5 resize-none focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="type">
                  Tipo <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={value =>
                    setFormData({
                      ...formData,
                      type: value as typeof formData.type,
                    })
                  }
                >
                  <SelectTrigger className="mt-1.5 focus:ring-emerald-500 focus:border-emerald-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">📘 Manual</SelectItem>
                    <SelectItem value="procedimiento">
                      📋 Procedimiento
                    </SelectItem>
                    <SelectItem value="instruccion">📝 Instrucción</SelectItem>
                    <SelectItem value="formato">📄 Formato</SelectItem>
                    <SelectItem value="registro">📊 Registro</SelectItem>
                    <SelectItem value="politica">⚖️ Política</SelectItem>
                    <SelectItem value="otro">📁 Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">
                  Estado <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={value =>
                    setFormData({
                      ...formData,
                      status: value as typeof formData.status,
                    })
                  }
                >
                  <SelectTrigger className="mt-1.5 focus:ring-emerald-500 focus:border-emerald-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="borrador">✏️ Borrador</SelectItem>
                    <SelectItem value="en_revision">👀 En Revisión</SelectItem>
                    <SelectItem value="aprobado">✅ Aprobado</SelectItem>
                    <SelectItem value="publicado">🌐 Publicado</SelectItem>
                    <SelectItem value="obsoleto">🗑️ Obsoleto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="version">
                Versión <span className="text-red-500">*</span>
              </Label>
              <Input
                id="version"
                value={formData.version}
                onChange={e =>
                  setFormData({ ...formData, version: e.target.value })
                }
                placeholder="1.0"
                required
                className="mt-1.5 w-full md:w-1/3 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Archivo Adjunto */}
          <div className="space-y-4">
            <SectionHeader
              title="Archivo Adjunto"
              description="Sube el documento en formato PDF"
            />

            <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 bg-slate-50 hover:bg-slate-100 transition-colors">
              <Label
                htmlFor="file"
                className="block mb-2 text-sm font-medium text-slate-900"
              >
                Archivo PDF {!document && '(Opcional)'}
              </Label>
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <label
                  htmlFor="file"
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 cursor-pointer transition-colors shadow-sm text-sm font-medium"
                >
                  <Upload className="h-4 w-4" />
                  Seleccionar PDF
                </label>
                <input
                  id="file"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="flex items-center gap-2 text-sm text-slate-600 bg-white px-3 py-1.5 rounded border border-slate-200">
                    <FileText className="h-4 w-4 text-emerald-600" />
                    <span className="font-medium truncate max-w-[200px]">
                      {selectedFile.name}
                    </span>
                    <span className="text-xs text-slate-400">
                      ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                ) : document?.file_path ? (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded border border-emerald-100">
                    <FileText className="h-4 w-4" />
                    <span>Archivo actual disponible</span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-500">
                    Ningún archivo seleccionado
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Solo archivos PDF. Tamaño máximo: 10MB
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading || uploadingFile}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || uploadingFile}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {loading || uploadingFile ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploadingFile ? 'Subiendo...' : 'Guardando...'}
                </>
              ) : document ? (
                'Actualizar'
              ) : (
                'Crear Documento'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
