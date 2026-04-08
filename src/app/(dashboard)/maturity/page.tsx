'use client';

import { LevelDetailCharts } from '@/components/maturity/LevelDetailCharts';
import { MaturityRadar } from '@/components/maturity/MaturityRadar';
import { NextSteps } from '@/components/maturity/NextSteps';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/firebase/config';
import { DEMO_MATURITY_DATA } from '@/lib/maturity/demoData';
import { getBlankMaturityData } from '@/lib/maturity/init';
import { ImplementationMaturity } from '@/types/maturity';
import { doc, onSnapshot } from 'firebase/firestore';
import { AlertTriangle, Info, Loader2, Play } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export default function MaturityPage() {
  const { user } = useAuth();
  const [maturityData, setMaturityData] =
    useState<ImplementationMaturity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDemo, setShowDemo] = useState(false);

  useEffect(() => {
    if (!user?.organization_id) {
      setLoading(false);
      setError('No se encontró organización del usuario.');
      return;
    }

    const maturityRef = doc(
      db,
      'organizations',
      user.organization_id,
      'maturity',
      'current'
    );

    // Suscripción en tiempo real
    const unsubscribe = onSnapshot(
      maturityRef,
      docSnap => {
        if (docSnap.exists()) {
          setMaturityData(docSnap.data() as ImplementationMaturity);
          setShowDemo(false); // Datos reales encontrados
        } else {
          // No existe el documento en Firestore
          setMaturityData(null);
          setShowDemo(true); // Activar demo si no hay nada
        }
        setLoading(false);
      },
      err => {
        console.error('Error fetching maturity data:', err);
        if ((err as { code?: string })?.code === 'permission-denied') {
          setMaturityData(null);
          setShowDemo(true);
          setError(null);
          setLoading(false);
          return;
        }
        setError('Error al cargar datos de madurez.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.organization_id]);

  // Selección de datos (Real, Demo o Blank)
  const displayData = useMemo(() => {
    if (showDemo) return DEMO_MATURITY_DATA;
    if (maturityData) return maturityData;
    return getBlankMaturityData(user?.organization_id || 'new', 'small');
  }, [showDemo, maturityData, user?.organization_id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">
          Analizando madurez organizacional...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center text-center p-6">
        <div>
          <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 font-medium">{error}</p>
          <p className="text-gray-500 text-sm mt-2">
            Por favor, recarga la página o contacta soporte.
          </p>
        </div>
      </div>
    );
  }

  const isRealZero =
    !showDemo && (!maturityData || maturityData.globalScore === 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Banner de Estado */}
      {showDemo ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Info className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                Modo Ejemplo (Demo)
              </p>
              <p className="text-xs text-amber-600">
                Estás viendo datos de ejemplo para visualizar cómo funciona el
                diagnóstico. Tus datos reales están en 0% porque aún no hay
                actividad en el sistema.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowDemo(false)}
            className="whitespace-nowrap bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 transition"
          >
            Ver mi medición real (0%)
          </button>
        </div>
      ) : (
        isRealZero && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Play className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-800">
                  Medición Real Activada
                </p>
                <p className="text-xs text-blue-600">
                  Tu sistema de gestión está comenzando. A medida que completes
                  tareas, audites procesos y cargues evidencias, este gráfico
                  crecerá automáticamente.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowDemo(true)}
              className="whitespace-nowrap border border-blue-600 text-blue-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-50 transition"
            >
              Ver ejemplo de cómo va a quedar
            </button>
          </div>
        )
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Madurez Organizacional
          </h1>
          <p className="text-gray-500 mt-1">
            Diagnóstico dinámico basado en evidencias del sistema ISO 9001.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-gray-500">
              Nivel Actual {showDemo && '(Demo)'}
            </div>
            <div
              className={`text-2xl font-bold px-3 py-1 rounded-full ${
                displayData.globalScore > 80
                  ? 'bg-green-100 text-green-700'
                  : displayData.globalScore > 60
                    ? 'bg-blue-100 text-blue-700'
                    : displayData.globalScore > 40
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-gray-100 text-gray-700'
              }`}
            >
              {displayData.globalLevel} ({displayData.globalScore}%)
            </div>
          </div>
        </div>
      </div>

      {/* Top Section: Radar & Next Steps */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <MaturityRadar levels={displayData.levels} className="h-full" />
        </div>
        <div className="lg:col-span-2">
          <NextSteps recommendations={displayData.nextSteps} />
        </div>
      </div>

      {/* Detail Section: Charts per Level */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          Estado de los Procesos (Tareas mCP)
        </h2>
        <LevelDetailCharts levels={displayData.levels} />
      </div>

      {/* Explicación Detallada */}
      <Card className="bg-gray-50 border-none">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4 text-gray-500" />
            ¿Cómo se calcula este puntaje?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-gray-600 space-y-2">
            <p>
              El puntaje no es una nota estática, sino una medición de la{' '}
              <strong>robustez</strong> de tu sistema:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <strong>Existencia:</strong> Haber definido el proceso u
                organigrama (30 puntos).
              </li>
              <li>
                <strong>Evidencia:</strong> Registros reales, auditorías o
                tareas completadas por el mCP (hasta 50 puntos).
              </li>
              <li>
                <strong>Vigencia:</strong> Si no hay actividad reciente, el
                puntaje baja automáticamente (Mantenimiento).
              </li>
            </ul>
            <p className="mt-2 text-gray-400 italic">
              * El peso de cada nivel se ajusta al tamaño de tu empresa (
              {displayData.companySize}).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Footer Info */}
      <div className="text-center text-xs text-gray-400 pt-8 pb-12">
        {showDemo ? (
          'Estos son datos de demostración para ilustrar el funcionamiento.'
        ) : (
          <>
            Evaluación basada en evidencias objetivas y registros del sistema.
            Última actualización:{' '}
            {displayData.updatedAt?.toLocaleString() || 'Reciente'}
          </>
        )}
      </div>
    </div>
  );
}
