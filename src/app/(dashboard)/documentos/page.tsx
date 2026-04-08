'use client';

import { ContextHelpButton } from '@/components/docs/ContextHelpButton';
import { DocumentFormDialog } from '@/components/documents/DocumentFormDialog';
import { DocumentListWithActions } from '@/components/documents/DocumentListWithActions';
import { DocumentSearch } from '@/components/documents/DocumentSearch';
import { DocumentStats } from '@/components/documents/DocumentStats';
import { ModuleMaturityButton } from '@/components/shared/ModuleMaturityButton';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import type { Document } from '@/lib/sdk/modules/documents/types';
import type { Document as LegacyDocument } from '@/types/documents';
import {
  BarChart3,
  FileText,
  Mic,
  MicOff,
  Plus,
  Search,
  Share2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type TabType = 'all' | 'search' | 'stats' | 'shared' | 'recent' | 'accessed';

export default function DocumentosPage() {
  const router = useRouter();
  const { usuario } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [allDocuments, setAllDocuments] = useState<Document[]>([]);
  const [searchResults, setSearchResults] = useState<Document[]>([]);
  const [sharedDocuments, setSharedDocuments] = useState<Document[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<Document[]>([]);
  const [accessedDocuments, setAccessedDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] =
    useState<LegacyDocument | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  // Redirect super admins - they shouldn't access organization-specific pages
  useEffect(() => {
    if (usuario?.rol === 'super_admin') {
      router.push('/super-admin/organizaciones');
    }
  }, [usuario?.rol, router]);

  // Cargar todos los documentos al iniciar
  useEffect(() => {
    if (usuario?.organization_id) {
      loadAllDocuments();
    }
  }, [usuario?.organization_id]);

  const loadAllDocuments = async () => {
    if (!usuario?.organization_id) return;

    setLoading(true);
    try {
      console.log('[DocumentosPage] Cargando documentos...');
      const params = new URLSearchParams();
      params.append('organization_id', usuario.organization_id);
      const response = await fetch(`/api/documents?${params.toString()}`);
      console.log('[DocumentosPage] Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('[DocumentosPage] Data recibida:', data);
        console.log('[DocumentosPage] Documentos:', data.data);
        console.log('[DocumentosPage] Cantidad:', data.data?.length);
        setAllDocuments(data.data || []);
      } else {
        console.error(
          '[DocumentosPage] Error en response:',
          response.statusText
        );
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadShared = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sdk/documents/shared');
      if (response.ok) {
        const data = await response.json();
        setSharedDocuments(data.data || []);
      }
    } catch (error) {
      console.error('Error loading shared documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadRecent = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sdk/documents/recent?limit=10');
      if (response.ok) {
        const data = await response.json();
        setRecentDocuments(data.data || []);
      }
    } catch (error) {
      console.error('Error loading recent documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadAccessed = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sdk/documents/accessed?limit=10');
      if (response.ok) {
        const data = await response.json();
        setAccessedDocuments(data.data || []);
      }
    } catch (error) {
      console.error('Error loading accessed documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = () => {
    setSelectedDocument(null);
    setDialogOpen(true);
  };

  const handleEditDocument = (document: Document) => {
    // Convertir Document SDK a LegacyDocument para el formulario
    const convertTimestamp = (value: any): Date => {
      if (!value) return new Date();
      if (typeof value === 'object' && 'toDate' in value) {
        return value.toDate();
      }
      return new Date(value);
    };

    const legacyDoc: LegacyDocument = {
      id: document.id,
      organization_id:
        (document as any).organizationId ||
        (document as any).organization_id ||
        '',
      code: `DOC-${document.id.substring(0, 8)}`,
      title: document.title,
      description: document.description,
      type: 'manual',
      category: document.category,
      status: 'aprobado',
      version: `${document.currentVersion}`,
      responsible_user_id: document.createdBy || '',
      file_path: '',
      file_size: 0,
      mime_type: 'text/plain',
      effective_date: convertTimestamp(document.createdAt),
      review_date: convertTimestamp(document.updatedAt),
      approved_at: document.approvedAt
        ? convertTimestamp(document.approvedAt)
        : undefined,
      approved_by: document.approvedBy,
      download_count: document.accessCount || 0,
      is_archived: false,
      reference_count: 0,
      is_orphan: false,
      created_at: convertTimestamp(document.createdAt),
      updated_at: convertTimestamp(document.updatedAt),
      created_by: document.createdBy || '',
      updated_by: document.updatedBy || '',
      keywords: document.tags,
    };
    setSelectedDocument(legacyDoc);
    setDialogOpen(true);
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar documento');
      }

      // Recargar documentos
      await loadAllDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  };

  const handleFormSuccess = () => {
    setDialogOpen(false);
    setSelectedDocument(null);
    loadAllDocuments();
  };

  // Integrar comandos de voz
  useVoiceCommands({
    enabled: voiceEnabled,
    commands: [
      {
        command: 'crear-documento',
        keywords: ['crear', 'nuevo', 'documento'],
        action: handleCreateDocument,
      },
      {
        command: 'escuchar-tarea',
        keywords: ['escuchar', 'tarea', 'leer'],
        action: () => {
          console.log('Comando de escucha activado');
        },
      },
      {
        command: 'buscar',
        keywords: ['buscar', 'search'],
        action: () => {
          setActiveTab('search');
        },
      },
    ],
    language: 'es-ES',
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-600" />
              Gestión de Documentos
            </h1>
            <p className="text-gray-600 mt-2">
              Busca, comparte y gestiona tus documentos con features avanzadas
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <ContextHelpButton route="/documentos" />
            <ModuleMaturityButton moduleKey="documentos" />
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                voiceEnabled
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              title="Activar/Desactivar comandos de voz"
            >
              {voiceEnabled ? (
                <>
                  <Mic className="h-4 w-4" />
                  Escuchando...
                </>
              ) : (
                <>
                  <MicOff className="h-4 w-4" />
                  Voz
                </>
              )}
            </button>
            <button
              onClick={handleCreateDocument}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Crear Documento
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <FileText className="h-4 w-4" />
            Todos
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              activeTab === 'search'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Search className="h-4 w-4" />
            Buscar
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              activeTab === 'stats'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Estadísticas
          </button>
          <button
            onClick={() => {
              setActiveTab('shared');
              handleLoadShared();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              activeTab === 'shared'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Share2 className="h-4 w-4" />
            Compartidos
          </button>
          <button
            onClick={() => {
              setActiveTab('recent');
              handleLoadRecent();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              activeTab === 'recent'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <FileText className="h-4 w-4" />
            Recientes
          </button>
          <button
            onClick={() => {
              setActiveTab('accessed');
              handleLoadAccessed();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              activeTab === 'accessed'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Más Accedidos
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {activeTab === 'all' && (
            <DocumentListWithActions
              documents={allDocuments}
              onEdit={handleEditDocument}
              onDelete={handleDeleteDocument}
              loading={loading}
            />
          )}

          {activeTab === 'search' && (
            <div className="space-y-6">
              <DocumentSearch
                onSearch={setSearchResults}
                onLoading={setLoading}
              />
              {searchResults.length > 0 && (
                <DocumentListWithActions
                  documents={searchResults}
                  onEdit={handleEditDocument}
                  onDelete={handleDeleteDocument}
                  loading={loading}
                />
              )}
            </div>
          )}

          {activeTab === 'stats' && <DocumentStats />}

          {activeTab === 'shared' && (
            <DocumentListWithActions
              documents={sharedDocuments}
              onEdit={handleEditDocument}
              onDelete={handleDeleteDocument}
              loading={loading}
            />
          )}

          {activeTab === 'recent' && (
            <DocumentListWithActions
              documents={recentDocuments}
              onEdit={handleEditDocument}
              onDelete={handleDeleteDocument}
              loading={loading}
            />
          )}

          {activeTab === 'accessed' && (
            <DocumentListWithActions
              documents={accessedDocuments}
              onEdit={handleEditDocument}
              onDelete={handleDeleteDocument}
              loading={loading}
            />
          )}
        </div>
      </div>

      {/* Formulario de creación/edición */}
      <DocumentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        document={selectedDocument}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
