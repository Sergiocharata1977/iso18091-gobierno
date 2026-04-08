'use client';

import { BaseCard } from '@/components/design-system/primitives/BaseCard';
import { typography } from '@/components/design-system/tokens';
import { GlobalMaturityDonut } from '@/components/maturity/GlobalMaturityDonut';
import { LevelDetailCharts } from '@/components/maturity/LevelDetailCharts';
import { MaturityRadar } from '@/components/maturity/MaturityRadar';
import { NextSteps } from '@/components/maturity/NextSteps';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/firebase/config';
import { DEMO_MATURITY_DATA } from '@/lib/maturity/demoData';
import { getBlankMaturityData } from '@/lib/maturity/init';
import { ImplementationMaturity } from '@/types/maturity';
import { doc, onSnapshot } from 'firebase/firestore';
import { AlertTriangle, Info, Loader2, Play } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export default function MaturityTab() {
  const { user } = useAuth();
  const [maturityData, setMaturityData] =
    useState<ImplementationMaturity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDemo, setShowDemo] = useState(false);

  useEffect(() => {
    if (!user?.organization_id) {
      setLoading(false);
      setError('No se encontro organizacion del usuario.');
      return;
    }

    const maturityRef = doc(
      db,
      'organizations',
      user.organization_id,
      'maturity',
      'current'
    );

    const unsubscribe = onSnapshot(
      maturityRef,
      docSnap => {
        if (docSnap.exists()) {
          setMaturityData(docSnap.data() as ImplementationMaturity);
          setShowDemo(false);
        } else {
          setMaturityData(null);
          setShowDemo(true);
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

  const displayData = useMemo(() => {
    if (showDemo) return DEMO_MATURITY_DATA;
    if (maturityData) return maturityData;
    return getBlankMaturityData(user?.organization_id || 'new', 'small');
  }, [showDemo, maturityData, user?.organization_id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">
          Analizando madurez organizacional...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center text-center p-6">
        <div>
          <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-4" />
          <p className="text-destructive font-medium">{error}</p>
        </div>
      </div>
    );
  }

  const isRealZero =
    !showDemo && (!maturityData || maturityData.globalScore === 0);

  return (
    <div className="space-y-8">
      {showDemo ? (
        <BaseCard className="border-amber-200/70 bg-amber-50/80 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Info className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-800">Modo Ejemplo (Demo)</p>
              <p className="text-xs text-amber-700">
                Datos de ejemplo. Tus datos reales estan en 0%.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowDemo(false)}
            className="whitespace-nowrap bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 transition"
          >
            Ver mi medicion real
          </button>
        </BaseCard>
      ) : (
        isRealZero && (
          <BaseCard className="border-blue-200/70 bg-blue-50/80 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Play className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-800">Medicion Real Activada</p>
                <p className="text-xs text-blue-700">Tu sistema de gestion esta comenzando.</p>
              </div>
            </div>
            <button
              onClick={() => setShowDemo(true)}
              className="whitespace-nowrap border border-blue-600 text-blue-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-50 transition"
            >
              Ver ejemplo
            </button>
          </BaseCard>
        )
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className={typography.h2}>Madurez Organizacional</h2>
          <p className={`${typography.p} mt-1`}>
            Diagnostico dinamico basado en evidencias ISO 9001
          </p>
        </div>
        <div className="text-right">
          <div className={typography.p}>Nivel Actual {showDemo && '(Demo)'}</div>
          <div
            className={`text-2xl font-bold px-3 py-1 rounded-full ${
              displayData.globalScore > 80
                ? 'bg-green-100 text-green-700'
                : displayData.globalScore > 60
                  ? 'bg-blue-100 text-blue-700'
                  : displayData.globalScore > 40
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-700'
            }`}
          >
            {displayData.globalLevel} ({displayData.globalScore}%)
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <GlobalMaturityDonut
            levels={displayData.levels}
            companySize={displayData.companySize || 'small'}
            className="h-full"
          />
        </div>
        <div className="lg:col-span-1">
          <MaturityRadar levels={displayData.levels} className="h-full" />
        </div>
        <div className="lg:col-span-2">
          <NextSteps recommendations={displayData.nextSteps} />
        </div>
      </div>

      <div>
        <h3 className={`${typography.h3} mb-4`}>Estado de los Procesos</h3>
        <LevelDetailCharts levels={displayData.levels} />
      </div>

      <BaseCard className="bg-muted/40 border-border/60">
        <h4 className={`${typography.small} mb-3 flex items-center gap-2 text-foreground`}>
          <Info className="h-4 w-4 text-muted-foreground" />
          Como se calcula este puntaje?
        </h4>
        <div className="text-xs text-muted-foreground space-y-2">
          <p>
            El puntaje mide la <strong>robustez</strong> de tu sistema:
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li>
              <strong>Existencia:</strong> Proceso definido (30 pts)
            </li>
            <li>
              <strong>Evidencia:</strong> Registros y auditorias (50 pts)
            </li>
            <li>
              <strong>Vigencia:</strong> Actividad reciente (20 pts)
            </li>
          </ul>
        </div>
      </BaseCard>
    </div>
  );
}
