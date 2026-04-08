/**
 * Audit Evidence Manager Component
 * Gestión de evidencias de auditorías
 *
 * TODO: Este componente necesita las API routes que fueron removidas
 * porque usaban next-auth que no está instalado.
 */

'use client';

import { Button } from '@/components/ui/button';
import {
  FileText,
  Image,
  Loader2,
  Paperclip,
  Plus,
  Trash2,
  Upload,
  Video,
} from 'lucide-react';
import { useState } from 'react';

interface DocumentReference {
  id: string;
  document_id: string;
  is_locked?: boolean;
  lock_reason?: string;
  fixed_version?: string;
  snapshot: {
    title: string;
    mime_type: string;
    file_extension: string;
    download_url: string;
    size_bytes: number;
  };
}

interface AuditEvidenceManagerProps {
  auditId: string;
  auditStatus: 'planned' | 'in_progress' | 'completed';
  onEvidenceChange?: () => void;
}

export function AuditEvidenceManager({
  auditId,
  auditStatus,
  onEvidenceChange,
}: AuditEvidenceManagerProps) {
  const [evidences, setEvidences] = useState<DocumentReference[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Obtener icono según tipo de archivo
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="w-5 h-5 text-blue-500" />;
    }
    if (mimeType.startsWith('video/')) {
      return <Video className="w-5 h-5 text-purple-500" />;
    }
    if (mimeType.includes('pdf')) {
      return <FileText className="w-5 h-5 text-red-500" />;
    }
    return <Paperclip className="w-5 h-5 text-gray-500" />;
  };

  // Formatear tamaño de archivo
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const canUpload = auditStatus === 'planned' || auditStatus === 'in_progress';

  return (
    <div className="bg-white rounded-lg shadow-sm border-0 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Evidencias de Auditoría
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {evidences.length} evidencia{evidences.length !== 1 ? 's' : ''}{' '}
            adjunta{evidences.length !== 1 ? 's' : ''}
          </p>
        </div>

        {canUpload && (
          <div>
            <Button disabled className="bg-gray-400">
              <Plus className="w-4 h-4 mr-2" />
              API no disponible
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-2">
            Gestión de evidencias temporalmente deshabilitada
          </p>
          <p className="text-sm text-gray-500">
            Las API routes necesitan reconfiguración
          </p>
        </div>
      )}

      {auditStatus === 'completed' && evidences.some(e => e.is_locked) && (
        <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-sm text-orange-800">
            <strong>🔒 Evidencias Protegidas:</strong> Las evidencias de esta
            auditoría han sido bloqueadas según ISO 9001 para garantizar la
            trazabilidad histórica.
          </p>
        </div>
      )}
    </div>
  );
}
