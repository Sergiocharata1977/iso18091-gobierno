'use client';

import { useState } from 'react';
import { Document } from '@/lib/sdk/modules/documents/types';
import { FileText, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DocumentListWithActionsProps {
  documents: Document[];
  onEdit: (document: Document) => void;
  onDelete: (documentId: string) => Promise<void>;
  loading?: boolean;
}

export function DocumentListWithActions({
  documents,
  onEdit,
  onDelete,
  loading = false,
}: DocumentListWithActionsProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = async (documentId: string) => {
    setDeletingId(documentId);
    try {
      await onDelete(documentId);
      setConfirmDeleteId(null);
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Error al eliminar el documento');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">No hay documentos para mostrar</p>
        <p className="text-gray-400 text-sm mt-2">
          Crea tu primer documento para comenzar
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map(doc => (
        <div
          key={doc.id}
          className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow bg-white"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <h4 className="font-semibold text-gray-900 truncate">
                  {doc.title}
                </h4>
              </div>

              {doc.description && (
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {doc.description}
                </p>
              )}

              <div className="flex gap-2 mt-3 flex-wrap">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-medium">
                  {doc.status}
                </span>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                  {doc.category || 'Documento'}
                </span>
                {doc.tags?.slice(0, 2).map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex gap-4 mt-3 text-xs text-gray-500 flex-wrap">
                <span>Versión: {doc.currentVersion || 1}</span>
                <span>Accesos: {doc.accessCount || 0}</span>
                {doc.createdAt && (
                  <span>
                    Creado:{' '}
                    {new Date(doc.createdAt as any).toLocaleDateString('es-ES')}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(doc)}
                className="flex items-center gap-1"
              >
                <Edit2 className="h-4 w-4" />
                <span className="hidden sm:inline">Editar</span>
              </Button>

              {confirmDeleteId === doc.id ? (
                <div className="flex gap-1">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(doc.id)}
                    disabled={deletingId === doc.id}
                    className="flex items-center gap-1"
                  >
                    {deletingId === doc.id ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                        <span className="hidden sm:inline">Eliminando...</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4" />
                        <span className="hidden sm:inline">Confirmar</span>
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmDeleteId(null)}
                    disabled={deletingId === doc.id}
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDeleteId(doc.id)}
                  className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Eliminar</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
