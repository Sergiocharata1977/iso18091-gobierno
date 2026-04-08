'use client';

/**
 * Página de Detalle de Documento
 * Con integración de Don Cándido y animaciones Lottie
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DonCandidoAvatar } from '@/components/ui/DonCandidoAvatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { Document, DocumentStatus } from '@/types/documents';
import {
  Archive,
  ArrowLeft,
  Calendar,
  Clock,
  Download,
  Edit,
  FileText,
  History,
  Tag,
  Trash2,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    if (params.id) {
      fetchDocument(params.id as string);
    }
  }, [params.id]);

  const fetchDocument = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/documents/${id}`);
      if (response.ok) {
        const data = await response.json();
        setDocument(data);
      } else {
        console.error('Error fetching document');
        router.push('/documentos');
      }
    } catch (error) {
      console.error('Error:', error);
      router.push('/documentos');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!document) return;
    try {
      const response = await fetch(
        `/api/documents/${document.id}/file?userId=${user?.id || 'current-user'}`
      );
      if (response.ok) {
        const data = await response.json();
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const handleDelete = async () => {
    if (!document) return;
    if (!confirm('¿Estás seguro de eliminar este documento?')) return;

    try {
      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/documentos');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const getStatusBadge = (status: DocumentStatus) => {
    const config: Record<
      DocumentStatus,
      {
        variant: 'default' | 'secondary' | 'destructive' | 'outline';
        label: string;
        className?: string;
      }
    > = {
      borrador: { variant: 'secondary', label: '✏️ Borrador' },
      en_revision: {
        variant: 'outline',
        label: '👀 En Revisión',
        className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      },
      aprobado: {
        variant: 'default',
        label: '✅ Aprobado',
        className: 'bg-green-100 text-green-800',
      },
      publicado: {
        variant: 'default',
        label: '🌐 Publicado',
        className: 'bg-blue-100 text-blue-800',
      },
      obsoleto: { variant: 'destructive', label: '🗑️ Obsoleto' },
    };

    const { variant, label, className } = config[status];
    return (
      <Badge variant={variant} className={className}>
        {label}
      </Badge>
    );
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      manual: '📘 Manual',
      procedimiento: '📋 Procedimiento',
      instruccion: '📝 Instrucción',
      formato: '📄 Formato',
      registro: '📊 Registro',
      politica: '⚖️ Política',
      otro: '📁 Otro',
    };
    return types[type] || type;
  };

  // 🎬 Loading con Don Cándido animado
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-emerald-50 to-white">
        <div className="text-center">
          <div className="relative w-48 h-48 mx-auto mb-6">
            <DonCandidoAvatar mood="saludo" className="w-full h-full" />
          </div>
          <div className="space-y-2">
            <p className="text-xl font-semibold text-gray-800 animate-pulse">
              ¡Hola! Cargando documento...
            </p>
            <p className="text-sm text-gray-500">
              Don Cándido está buscando tu documento 📄
            </p>
          </div>
          <div className="mt-4 flex justify-center gap-1">
            <span
              className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"
              style={{ animationDelay: '0ms' }}
            ></span>
            <span
              className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"
              style={{ animationDelay: '150ms' }}
            ></span>
            <span
              className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"
              style={{ animationDelay: '300ms' }}
            ></span>
          </div>
        </div>
      </div>
    );
  }

  // Estado de documento no encontrado con Don Cándido
  if (!document) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-white">
        <div className="text-center">
          <div className="relative w-40 h-40 mx-auto mb-6">
            <DonCandidoAvatar mood="señalando" className="w-full h-full" />
          </div>
          <p className="text-xl font-semibold text-gray-800 mb-2">
            ¡Ups! Documento no encontrado
          </p>
          <p className="text-gray-600 mb-6">
            Parece que este documento no existe o fue eliminado.
          </p>
          <Button
            onClick={() => router.push('/documentos')}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Documentos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/documentos')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Documentos
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <FileText className="h-8 w-8 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {document.title}
                </h1>
                <p className="text-sm text-gray-500">{document.code}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {getStatusBadge(document.status)}
              <Badge variant="outline">{getTypeLabel(document.type)}</Badge>
              <Badge variant="outline" className="bg-gray-100">
                v{document.version}
              </Badge>
            </div>
          </div>

          <div className="flex gap-2">
            {document.file_path && (
              <Button
                onClick={handleDownload}
                variant="outline"
                className="hover:bg-emerald-50 hover:border-emerald-300"
              >
                <Download className="mr-2 h-4 w-4" />
                Descargar
              </Button>
            )}
            <Button
              onClick={() => router.push(`/documentos/${document.id}/edit`)}
              variant="outline"
            >
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Button>
            <Button onClick={handleDelete} variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs de Contenido */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Información General
          </TabsTrigger>
          <TabsTrigger value="fechas" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Fechas y Control
          </TabsTrigger>
          <TabsTrigger value="archivo" className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Archivo
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Estadísticas
          </TabsTrigger>
        </TabsList>

        {/* Tab: Información General */}
        <TabsContent value="general">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 shadow-sm border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-emerald-600" />
                  Datos del Documento
                </CardTitle>
                <CardDescription>
                  Información general y clasificación
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Código</p>
                    <p className="font-medium text-lg">{document.code}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Tipo</p>
                    <p className="font-medium">{getTypeLabel(document.type)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Estado</p>
                    <div className="mt-1">
                      {getStatusBadge(document.status)}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Versión</p>
                    <p className="font-medium">v{document.version}</p>
                  </div>
                </div>

                {document.category && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-500 mb-2">Categoría</p>
                    <Badge variant="outline" className="bg-emerald-50">
                      {document.category}
                    </Badge>
                  </div>
                )}

                {document.description && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-500 mb-2">Descripción</p>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                      {document.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Don Cándido explicando */}
            <Card className="shadow-sm border-0 bg-gradient-to-br from-emerald-50 to-white">
              <CardHeader>
                <CardTitle className="text-center text-emerald-700">
                  🤖 Don Cándido
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="w-32 h-32 mb-4">
                  <DonCandidoAvatar
                    mood="explicando"
                    className="w-full h-full"
                  />
                </div>
                <p className="text-sm text-gray-600 text-center">
                  Este documento está{' '}
                  {document.status === 'publicado'
                    ? '✅ publicado y disponible'
                    : document.status === 'aprobado'
                      ? '✅ aprobado'
                      : document.status === 'en_revision'
                        ? '👀 en revisión'
                        : document.status === 'borrador'
                          ? '✏️ en borrador'
                          : '🗑️ obsoleto'}
                  .
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Keywords */}
          {document.keywords && document.keywords.length > 0 && (
            <Card className="mt-6 shadow-sm border-0">
              <CardHeader>
                <CardTitle>🏷️ Palabras Clave</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {document.keywords.map((keyword, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="bg-blue-50 hover:bg-blue-100 transition-colors"
                    >
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Fechas y Control */}
        <TabsContent value="fechas">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-emerald-600" />
                  Fechas Importantes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">
                      📅 Fecha de Creación
                    </p>
                    <p className="font-medium text-lg">
                      {new Date(document.created_at).toLocaleDateString(
                        'es-ES',
                        {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        }
                      )}
                    </p>
                  </div>

                  {document.effective_date && (
                    <div className="p-3 bg-emerald-50 rounded-lg">
                      <p className="text-sm text-emerald-700">
                        ✅ Fecha Efectiva
                      </p>
                      <p className="font-medium text-lg">
                        {new Date(document.effective_date).toLocaleDateString(
                          'es-ES',
                          {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          }
                        )}
                      </p>
                    </div>
                  )}

                  {document.review_date && (
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-yellow-700">
                        🔄 Próxima Revisión
                      </p>
                      <p className="font-medium text-lg">
                        {new Date(document.review_date).toLocaleDateString(
                          'es-ES',
                          {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          }
                        )}
                      </p>
                    </div>
                  )}

                  {document.approved_at && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-700">
                        👍 Fecha de Aprobación
                      </p>
                      <p className="font-medium text-lg">
                        {new Date(document.approved_at).toLocaleDateString(
                          'es-ES',
                          {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          }
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-emerald-600" />
                  Control de Versiones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-500">Versión Actual</p>
                      <p className="text-3xl font-bold text-emerald-600">
                        v{document.version}
                      </p>
                    </div>
                    <FileText className="h-12 w-12 text-gray-300" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-2">
                      Última Actualización
                    </p>
                    <p className="font-medium">
                      {new Date(document.updated_at).toLocaleDateString(
                        'es-ES',
                        {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Archivo */}
        <TabsContent value="archivo">
          <Card className="shadow-sm border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Archive className="h-5 w-5 text-emerald-600" />
                Archivo Adjunto
              </CardTitle>
              <CardDescription>
                Información del archivo asociado al documento
              </CardDescription>
            </CardHeader>
            <CardContent>
              {document.file_path ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">
                        Tipo de Archivo
                      </p>
                      <p className="font-medium text-lg">
                        {document.mime_type || 'No especificado'}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">Tamaño</p>
                      <p className="font-medium text-lg">
                        {document.file_size
                          ? `${(document.file_size / 1024 / 1024).toFixed(2)} MB`
                          : 'No especificado'}
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={handleDownload}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    size="lg"
                  >
                    <Download className="mr-2 h-5 w-5" />
                    Descargar Archivo
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-24 h-24 mx-auto mb-4">
                    <DonCandidoAvatar
                      mood="señalando"
                      className="w-full h-full"
                    />
                  </div>
                  <p className="text-gray-500 text-lg">
                    Este documento no tiene archivo adjunto
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    Puedes subir un archivo editando el documento
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Estadísticas */}
        <TabsContent value="stats">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-emerald-600" />
                  Estadísticas de Uso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg">
                  <p className="text-6xl font-bold text-emerald-600">
                    {document.download_count}
                  </p>
                  <p className="text-gray-600 mt-2">Descargas totales</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-emerald-600" />
                  Actividad Reciente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">Documento creado</p>
                      <p className="text-sm text-gray-500">
                        {new Date(document.created_at).toLocaleDateString(
                          'es-ES'
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="p-2 bg-emerald-100 rounded-full">
                      <Edit className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium">Última modificación</p>
                      <p className="text-sm text-gray-500">
                        {new Date(document.updated_at).toLocaleDateString(
                          'es-ES'
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
