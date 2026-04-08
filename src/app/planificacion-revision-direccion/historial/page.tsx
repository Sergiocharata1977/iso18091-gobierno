/**
 * Página de Historial de Planificación
 * Muestra historial de TODAS las colecciones plan_*
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import {
  PLAN_COLLECTIONS,
  PLAN_TITULOS,
  PlanBase,
  PlanCollectionType,
} from '@/types/planificacion';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import {
  BookOpen,
  Eye,
  FileText,
  Globe,
  History,
  Loader2,
  Target,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';

const ICONS: Record<PlanCollectionType, React.ElementType> = {
  identidad: BookOpen,
  alcance: Target,
  contexto: Globe,
  estructura: Users,
  politicas: FileText,
};

export default function HistorialPage() {
  const { user, loading: authLoading } = useAuth();
  const organizationId = user?.organization_id;

  const [activeTab, setActiveTab] = useState<PlanCollectionType>('identidad');
  const [registros, setRegistros] = useState<
    Record<PlanCollectionType, PlanBase[]>
  >({
    identidad: [],
    alcance: [],
    contexto: [],
    estructura: [],
    politicas: [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedRegistro, setSelectedRegistro] = useState<PlanBase | null>(
    null
  );

  useEffect(() => {
    if (organizationId) {
      loadAllHistorial();
    }
  }, [organizationId]);

  const loadAllHistorial = async () => {
    if (!organizationId) return;

    setLoading(true);
    try {
      const newRegistros: Record<PlanCollectionType, PlanBase[]> = {
        identidad: [],
        alcance: [],
        contexto: [],
        estructura: [],
        politicas: [],
      };

      for (const [key, collectionName] of Object.entries(PLAN_COLLECTIONS)) {
        const tipo = key as PlanCollectionType;
        const q = query(
          collection(db, collectionName),
          where('organization_id', '==', organizationId),
          orderBy('version_numero', 'desc')
        );

        const snapshot = await getDocs(q);
        newRegistros[tipo] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as PlanBase[];
      }

      setRegistros(newRegistros);
    } catch (error) {
      console.error('Error cargando historial:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'vigente':
        return <Badge className="bg-green-100 text-green-800">Vigente</Badge>;
      case 'borrador':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">Borrador</Badge>
        );
      case 'historico':
        return <Badge className="bg-gray-100 text-gray-600">Histórico</Badge>;
      default:
        return <Badge>{estado}</Badge>;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <History className="w-6 h-6 text-purple-600" />
          Historial de Versiones
        </h1>
        <p className="text-gray-600">
          Todas las versiones de cada componente de Planificación
        </p>
      </div>

      {/* Tabs por tipo */}
      <Tabs
        value={activeTab}
        onValueChange={v => setActiveTab(v as PlanCollectionType)}
      >
        <TabsList className="grid w-full grid-cols-5">
          {Object.keys(PLAN_COLLECTIONS).map(key => {
            const tipo = key as PlanCollectionType;
            const Icon = ICONS[tipo];
            const count = registros[tipo].length;

            return (
              <TabsTrigger key={tipo} value={tipo} className="text-xs">
                <Icon className="w-3 h-3 mr-1" />
                {PLAN_TITULOS[tipo].split(' ')[0]}
                {count > 0 && (
                  <span className="ml-1 text-xs bg-gray-200 rounded-full px-1.5">
                    {count}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {Object.keys(PLAN_COLLECTIONS).map(key => {
          const tipo = key as PlanCollectionType;
          const Icon = ICONS[tipo];
          const data = registros[tipo];

          return (
            <TabsContent key={tipo} value={tipo}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="w-5 h-5 text-emerald-600" />
                    {PLAN_TITULOS[tipo]}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {data.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <Icon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No hay versiones registradas.</p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-gray-50 text-left text-sm text-gray-600">
                          <th className="p-4">Versión</th>
                          <th className="p-4">Estado</th>
                          <th className="p-4">Fecha Creación</th>
                          <th className="p-4">Creado Por</th>
                          <th className="p-4 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.map(reg => (
                          <tr
                            key={reg.id}
                            className="border-b hover:bg-gray-50"
                          >
                            <td className="p-4 font-medium">
                              v{reg.version_numero}
                            </td>
                            <td className="p-4">
                              {getEstadoBadge(reg.estado)}
                            </td>
                            <td className="p-4 text-gray-600">
                              {new Date(reg.created_at).toLocaleDateString()}
                            </td>
                            <td className="p-4 text-gray-600">
                              {reg.created_by}
                            </td>
                            <td className="p-4 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedRegistro(reg)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Ver
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Modal de detalle */}
      <Dialog
        open={!!selectedRegistro}
        onOpenChange={() => setSelectedRegistro(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Versión {selectedRegistro?.version_numero}
              {selectedRegistro && getEstadoBadge(selectedRegistro.estado)}
            </DialogTitle>
          </DialogHeader>
          {selectedRegistro && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Creado:</span>{' '}
                  {new Date(selectedRegistro.created_at).toLocaleString()}
                </div>
                <div>
                  <span className="font-medium">Por:</span>{' '}
                  {selectedRegistro.created_by}
                </div>
              </div>
              <div className="border-t pt-4">
                <pre className="text-sm bg-gray-50 p-4 rounded overflow-auto max-h-96">
                  {JSON.stringify(selectedRegistro, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
