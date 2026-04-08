/**
 * Página de Reuniones de Trabajo
 * Muestra las reuniones existentes de la organización
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { Calendar, Eye, Loader2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

interface Reunion {
  id: string;
  titulo: string;
  nombre?: string;
  fecha: string;
  estado?: string;
  tipo?: string;
}

function ReunionesContent() {
  const { user } = useAuth();
  const organizationId = user?.organization_id;
  const router = useRouter();

  const [reuniones, setReuniones] = useState<Reunion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organizationId) {
      loadReuniones();
    }
  }, [organizationId]);

  const loadReuniones = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'reuniones'),
        where('organization_id', '==', organizationId),
        orderBy('fecha', 'desc')
      );

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        titulo: doc.data().titulo || doc.data().nombre || 'Reunión',
        ...doc.data(),
      })) as Reunion[];

      setReuniones(data);
    } catch (error) {
      console.error('Error cargando reuniones:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            Reuniones de Trabajo
          </h1>
          <p className="text-gray-600">
            Actas y reuniones de revisión por la dirección
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/calendar')}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Reunión
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {reuniones.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No hay reuniones registradas.</p>
              <p className="text-sm">
                Las reuniones se crean desde el módulo de Calendario.
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-sm text-gray-600">
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Título</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reuniones.map(r => (
                  <tr key={r.id} className="border-b hover:bg-gray-50">
                    <td className="p-4 text-gray-600">
                      {new Date(r.fecha).toLocaleDateString()}
                    </td>
                    <td className="p-4 font-medium">{r.titulo || r.nombre}</td>
                    <td className="p-4">
                      <Badge variant="outline">{r.tipo || 'General'}</Badge>
                    </td>
                    <td className="p-4">
                      <Badge
                        className={
                          r.estado === 'completada'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }
                      >
                        {r.estado || 'Pendiente'}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/calendar`)}
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
    </div>
  );
}

export default function ReunionesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      }
    >
      <ReunionesContent />
    </Suspense>
  );
}
