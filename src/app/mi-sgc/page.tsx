'use client';

import { AgenticActivityCard } from '@/components/mi-sgc/AgenticActivityCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DonCandidoTour } from '@/components/onboarding/DonCandidoTour';
import { TourHelpButton } from '@/components/onboarding/TourHelpButton';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/firebase/config';
import { ImplementationMaturity } from '@/types/maturity';
import { doc, onSnapshot } from 'firebase/firestore';
import { Bot } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type ChapterSummary = {
  chapter: number;
  compliance: number;
};

type NormPointLite = {
  id: string;
  chapter?: number;
  title?: string;
  code?: string;
  priority?: 'alta' | 'media' | 'baja';
};

type CRMActionLite = {
  id: string;
  titulo?: string;
  tipo?: string;
  fecha_programada?: string;
  estado?: string;
};

function getTrafficLightColor(score: number): string {
  if (score >= 80) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (score >= 60) return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-rose-100 text-rose-700 border-rose-200';
}

export default function MiSGCExecutivePage() {
  const { user } = useAuth();
  const [maturity, setMaturity] = useState<ImplementationMaturity | null>(null);
  const [allNormPoints, setAllNormPoints] = useState<NormPointLite[]>([]);
  const [gapNormPoints, setGapNormPoints] = useState<NormPointLite[]>([]);
  const [upcomingActions, setUpcomingActions] = useState<CRMActionLite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.organization_id) return;
    const ref = doc(
      db,
      'organizations',
      user.organization_id,
      'maturity',
      'current'
    );
    const unsub = onSnapshot(
      ref,
      snap => {
        setMaturity(
          snap.exists() ? (snap.data() as ImplementationMaturity) : null
        );
      },
      error => {
        console.error('[mi-sgc] Error loading maturity snapshot:', error);
        setMaturity(null);
      }
    );
    return () => unsub();
  }, [user?.organization_id]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [normsRes, gapsRes, actionsRes] = await Promise.all([
          fetch('/api/norm-points?limit=200'),
          fetch('/api/norm-points/gaps'),
          fetch('/api/crm/acciones?limit=20'),
        ]);

        const normsPayload = await normsRes.json();
        const gapsPayload = await gapsRes.json();
        const actionsPayload = await actionsRes.json();

        if (!mounted) return;

        setAllNormPoints(
          Array.isArray(normsPayload?.data) ? normsPayload.data : []
        );
        setGapNormPoints(Array.isArray(gapsPayload) ? gapsPayload : []);

        const actions: CRMActionLite[] = Array.isArray(actionsPayload?.data)
          ? actionsPayload.data
          : [];
        setUpcomingActions(
          actions
            .filter(action => action.estado !== 'completada')
            .sort((a, b) =>
              (a.fecha_programada || '').localeCompare(b.fecha_programada || '')
            )
            .slice(0, 5)
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const globalProgress = maturity?.globalScore || 0;

  const chapterSummary: ChapterSummary[] = useMemo(() => {
    const chapters = [4, 5, 6, 7, 8, 9, 10];
    return chapters.map(chapter => {
      const total = allNormPoints.filter(
        item => item.chapter === chapter
      ).length;
      const gaps = gapNormPoints.filter(
        item => item.chapter === chapter
      ).length;
      const compliance =
        total > 0 ? Math.max(0, Math.round(((total - gaps) / total) * 100)) : 0;
      return { chapter, compliance };
    });
  }, [allNormPoints, gapNormPoints]);

  const topCriticalGaps = useMemo(
    () =>
      [...gapNormPoints]
        .sort((a, b) => {
          const weight = (priority?: string) =>
            priority === 'alta' ? 0 : priority === 'media' ? 1 : 2;
          return weight(a.priority) - weight(b.priority);
        })
        .slice(0, 5),
    [gapNormPoints]
  );

  return (
    <div className="space-y-6">
      <DonCandidoTour />
      <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
        <div>
          <h1 id="tour-start" className="text-2xl font-bold text-slate-900">
            Mi SGC - Centro de Gestion ISO
          </h1>
          <p className="text-slate-500 mt-1">
            Centro unico de gestion ISO 9001: estado, madurez, gaps, roadmap y
            accesos rapidos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TourHelpButton />
          <Button asChild variant="outline">
            <Link href="/mi-sgc/cumplimiento">Ver cumplimiento</Link>
          </Button>
          <Button asChild>
            <Link href="/mi-sgc/gaps">Ver gaps</Link>
          </Button>
        </div>
      </div>

      {/* Banner Don Candido */}
      <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-green-800">
            Don Candido activo
          </p>
          <p className="text-xs text-green-600">
            Tu asistente de gestion esta listo para ayudarte
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Completitud global ISO 9001</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
              <div
                className="h-4 bg-emerald-600 transition-all"
                style={{
                  width: `${Math.min(100, Math.max(0, globalProgress))}%`,
                }}
              />
            </div>
            <p className="text-sm text-slate-600 mt-2">
              Tu SGC esta al <strong>{globalProgress}%</strong> de completitud.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Indicadores rapidos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Gaps abiertos: <strong>{gapNormPoints.length}</strong>
            </p>
            <p>
              Puntos de norma cargados: <strong>{allNormPoints.length}</strong>
            </p>
            <p>
              Acciones proximas: <strong>{upcomingActions.length}</strong>
            </p>
          </CardContent>
        </Card>
      </div>

      <AgenticActivityCard />

      <Card>
        <CardHeader>
          <CardTitle>Semaforo por capitulo ISO (4-10)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {chapterSummary.map(item => (
              <div
                key={item.chapter}
                className={`rounded-md border p-3 text-center ${getTrafficLightColor(item.compliance)}`}
              >
                <p className="text-xs uppercase">Cap {item.chapter}</p>
                <p className="text-xl font-bold">{item.compliance}%</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Top 5 gaps criticos</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-slate-500">Cargando...</p>
            ) : topCriticalGaps.length === 0 ? (
              <p className="text-sm text-slate-500">
                Sin gaps criticos detectados.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {topCriticalGaps.map(gap => (
                  <li key={gap.id} className="rounded-md border p-2">
                    <p className="font-medium">
                      {gap.code || 'Sin codigo'} - {gap.title || 'Sin titulo'}
                    </p>
                    <p className="text-slate-500">
                      Prioridad: {gap.priority || 'media'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Proximas revisiones y acciones</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-slate-500">Cargando...</p>
            ) : upcomingActions.length === 0 ? (
              <p className="text-sm text-slate-500">
                No hay acciones pendientes en CRM.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {upcomingActions.map(action => (
                  <li key={action.id} className="rounded-md border p-2">
                    <p className="font-medium">
                      {action.titulo || 'Accion sin titulo'}
                    </p>
                    <p className="text-slate-500">
                      Tipo: {action.tipo || 'tarea'} | Fecha:{' '}
                      {action.fecha_programada || 'sin fecha'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Acceso rapido a modulos operativos */}
      <Card id="tour-quick-access">
        <CardHeader>
          <CardTitle>Acceso rapido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                title: 'Calidad',
                href: '/mejoras/auditorias/dashboard',
                desc: 'Auditorias y hallazgos',
              },
              {
                title: 'Procesos',
                href: '/procesos',
                desc: 'SIPOC e indicadores',
              },
              {
                title: 'RRHH',
                href: '/rrhh',
                desc: 'Personal y competencias',
              },
              {
                title: 'Comercial',
                href: '/crm',
                desc: 'Clientes y oportunidades',
              },
            ].map(m => (
              <Link
                key={m.title}
                href={m.href}
                className="rounded-lg border p-3 hover:border-emerald-300 hover:shadow-sm transition text-center"
              >
                <p className="font-medium text-sm">{m.title}</p>
                <p className="text-xs text-slate-500 mt-1">{m.desc}</p>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
