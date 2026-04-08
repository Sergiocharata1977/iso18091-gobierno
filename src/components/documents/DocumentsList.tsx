'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Document, DocumentStatus } from '@/types/documents';
import { Download, Edit, Grid, List, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DocumentFormDialog } from './DocumentFormDialog';

export function DocumentsList() {
  const { usuario, loading: userLoading } = useCurrentUser();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');

  useEffect(() => {
    if (usuario?.organization_id) {
      fetchDocuments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, typeFilter, usuario?.organization_id]);

  const fetchDocuments = async () => {
    if (!usuario?.organization_id) return;

    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('organization_id', usuario.organization_id);

      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);

      const response = await fetch(`/api/documents?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este documento?')) return;

    try {
      console.log('[Component] Eliminando documento:', id);

      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
      });

      console.log(
        '[Component] Respuesta:',
        response.status,
        response.statusText
      );

      if (response.ok) {
        console.log('[Component] Documento eliminado, actualizando lista...');
        await fetchDocuments();
        console.log('[Component] Lista actualizada');
      } else {
        const errorData = await response.json();
        console.error('[Component] Error del servidor:', errorData);
        alert(`Error al eliminar: ${errorData.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('[Component] Error eliminando documento:', error);
      alert('Error al eliminar el documento');
    }
  };

  const handleDownload = async (id: string) => {
    try {
      const response = await fetch(
        `/api/documents/${id}/file?userId=current-user`
      );
      if (response.ok) {
        const data = await response.json();
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const filteredDocuments = documents.filter(
    doc =>
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: DocumentStatus) => {
    const variants: Record<
      DocumentStatus,
      'default' | 'secondary' | 'destructive' | 'outline'
    > = {
      borrador: 'secondary',
      en_revision: 'outline',
      aprobado: 'default',
      publicado: 'default',
      obsoleto: 'destructive',
    };

    return <Badge variant={variants[status]}>{status.replace('_', ' ')}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Gestión de Documentos"
        description="Administra la documentación del sistema de gestión"
        breadcrumbs={[
          { label: 'Inicio', href: '/dashboard' },
          { label: 'Documentos' },
        ]}
        actions={
          <Button
            onClick={() => {
              setEditingDocument(null);
              setIsFormOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 shadow-sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Documento
          </Button>
        }
      />

      {/* Barra de herramientas */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por código o título..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 h-10 bg-slate-50 border-slate-200 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] h-10 bg-slate-50 border-slate-200">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="borrador">Borrador</SelectItem>
            <SelectItem value="en_revision">En Revisión</SelectItem>
            <SelectItem value="aprobado">Aprobado</SelectItem>
            <SelectItem value="publicado">Publicado</SelectItem>
            <SelectItem value="obsoleto">Obsoleto</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px] h-10 bg-slate-50 border-slate-200">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="procedimiento">Procedimiento</SelectItem>
            <SelectItem value="instruccion">Instrucción</SelectItem>
            <SelectItem value="formato">Formato</SelectItem>
            <SelectItem value="registro">Registro</SelectItem>
            <SelectItem value="politica">Política</SelectItem>
            <SelectItem value="otro">Otro</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-1 border border-slate-200 rounded-md p-1 bg-slate-50">
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className={
              viewMode === 'list'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'cards' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('cards')}
            className={
              viewMode === 'cards'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }
          >
            <Grid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Vista Lista o Tarjetas */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-500">Cargando documentos...</p>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDocuments.length === 0 ? (
            <div className="col-span-full text-center py-12 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/50">
              <p className="text-slate-500">No se encontraron documentos</p>
            </div>
          ) : (
            filteredDocuments.map(doc => (
              <div
                key={doc.id}
                className="bg-white rounded-xl shadow-sm hover:shadow-md hover:border-emerald-200 border border-slate-200 cursor-pointer transition-all duration-200 p-5 group"
                onClick={() => {
                  window.location.href = `/documentos/${doc.id}`;
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-emerald-700 transition-colors line-clamp-1">
                      {doc.title}
                    </h3>
                    <p className="text-xs font-mono text-slate-500 bg-slate-100 inline-block px-2 py-0.5 rounded">
                      {doc.code}
                    </p>
                  </div>
                  <div onClick={e => e.stopPropagation()}>
                    {getStatusBadge(doc.status)}
                  </div>
                </div>

                <div className="space-y-2 text-sm text-slate-600 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="capitalize flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      {doc.type}
                    </span>
                    <span className="font-medium bg-slate-100 px-2 py-0.5 rounded text-xs">
                      v{doc.version}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span>{doc.download_count} descargas</span>
                  </div>
                </div>

                <div
                  className="flex gap-2 pt-4 border-t border-slate-100"
                  onClick={e => e.stopPropagation()}
                >
                  {doc.file_path && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(doc.id)}
                      title="Descargar"
                      className="flex-1 h-8 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingDocument(doc);
                      setIsFormOpen(true);
                    }}
                    title="Editar"
                    className="flex-1 h-8 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(doc.id)}
                    title="Eliminar"
                    className="flex-1 h-8 text-slate-600 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 shadow-sm overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200">
                <TableHead className="font-semibold text-slate-700">
                  Código
                </TableHead>
                <TableHead className="font-semibold text-slate-700">
                  Título
                </TableHead>
                <TableHead className="font-semibold text-slate-700">
                  Tipo
                </TableHead>
                <TableHead className="font-semibold text-slate-700">
                  Estado
                </TableHead>
                <TableHead className="font-semibold text-slate-700">
                  Versión
                </TableHead>
                <TableHead className="font-semibold text-slate-700">
                  Descargas
                </TableHead>
                <TableHead className="text-right font-semibold text-slate-700">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-12 text-slate-500"
                  >
                    No se encontraron documentos
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocuments.map(doc => (
                  <TableRow
                    key={doc.id}
                    className="hover:bg-slate-50/50 cursor-pointer transition-colors border-b border-slate-100 last:border-0"
                    onClick={() => {
                      window.location.href = `/documentos/${doc.id}`;
                    }}
                  >
                    <TableCell className="font-medium font-mono text-sm text-slate-600">
                      {doc.code}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">
                      {doc.title}
                    </TableCell>
                    <TableCell className="capitalize text-slate-600">
                      {doc.type}
                    </TableCell>
                    <TableCell>{getStatusBadge(doc.status)}</TableCell>
                    <TableCell className="text-slate-600">
                      v{doc.version}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {doc.download_count}
                    </TableCell>
                    <TableCell
                      className="text-right"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="flex justify-end gap-1">
                        {doc.file_path && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
                            onClick={() => handleDownload(doc.id)}
                            title="Descargar archivo"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                          onClick={() => {
                            setEditingDocument(doc);
                            setIsFormOpen(true);
                          }}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(doc.id)}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog de formulario */}
      <DocumentFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        document={editingDocument}
        onSuccess={() => {
          setIsFormOpen(false);
          setEditingDocument(null);
          fetchDocuments();
        }}
      />
    </div>
  );
}
