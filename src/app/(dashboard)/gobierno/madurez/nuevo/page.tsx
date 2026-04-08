'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/PageHeader';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { authFetch } from '@/lib/api/authFetch';
import { cn } from '@/lib/utils';
import type {
  DimensionEvaluacion,
  DimensionISO18091,
  GovMaturityCreateInput,
  NivelMadurez,
} from '@/types/gov-madurez';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Radar,
  Save,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type DimensionConfig = {
  key: DimensionISO18091;
  title: string;
  description: string;
};

const dimensionConfigs: DimensionConfig[] = [
  {
    key: 'liderazgo',
    title: 'Liderazgo',
    description: 'Compromiso de la alta direccion municipal con el SGC',
  },
  {
    key: 'planificacion',
    title: 'Planificacion',
    description: 'Gestion de riesgos, objetivos de calidad y planificacion de cambios',
  },
  {
    key: 'apoyo',
    title: 'Apoyo',
    description: 'Recursos, competencias, comunicacion y documentacion del SGC',
  },
  {
    key: 'operacion',
    title: 'Operacion',
    description: 'Planificacion y control de procesos de prestacion de servicios',
  },
  {
    key: 'mejora',
    title: 'Mejora',
    description: 'No conformidades, acciones correctivas y mejora continua',
  },
];

const levelMeta: Record<NivelMadurez, { label: string; helper: string }> = {
  1: { label: 'Inicial', helper: 'Practicas incipientes o no sistematizadas.' },
  2: { label: 'Gestionado', helper: 'Existen controles basicos y seguimiento parcial.' },
  3: { label: 'Definido', helper: 'El enfoque esta documentado y se aplica con consistencia.' },
  4: { label: 'Optimizado', helper: 'Se mejora de forma sistematica con datos y aprendizaje.' },
};

const initialDimensiones: DimensionEvaluacion[] = dimensionConfigs.map(dimension => ({
  dimension: dimension.key,
  nivel: 1,
  evidencias: '',
  oportunidades_mejora: '',
}));

function getDisplayName(
  usuario: ReturnType<typeof useCurrentUser>['usuario']
): string {
  if (!usuario) {
    return '';
  }

  const rawName =
    (usuario as unknown as { nombre?: string; displayName?: string }).nombre ||
    (usuario as unknown as { nombre?: string; displayName?: string }).displayName;

  if (typeof rawName === 'string' && rawName.trim().length > 0) {
    return rawName.trim();
  }

  return usuario.email;
}

export default function NuevoDiagnosticoMadurezPage() {
  const { usuario, loading: userLoading } = useCurrentUser();
  const [step, setStep] = useState(0);
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [evaluador, setEvaluador] = useState('');
  const [dimensiones, setDimensiones] =
    useState<DimensionEvaluacion[]>(initialDimensiones);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentDimension = dimensiones[step];
  const currentConfig = dimensionConfigs[step];
  const progressValue = ((step + 1) / dimensionConfigs.length) * 100;

  useEffect(() => {
    const resolvedName = getDisplayName(usuario);
    if (!evaluador && resolvedName) {
      setEvaluador(resolvedName);
    }
  }, [evaluador, usuario]);

  const promedio = useMemo(() => {
    const total = dimensiones.reduce((sum, item) => sum + item.nivel, 0);
    return Number((total / dimensiones.length).toFixed(2));
  }, [dimensiones]);

  const updateDimension = (
    dimension: DimensionISO18091,
    changes: Partial<DimensionEvaluacion>
  ) => {
    setDimensiones(current =>
      current.map(item =>
        item.dimension === dimension ? { ...item, ...changes } : item
      )
    );
  };

  const handleNext = () => {
    setStep(current => Math.min(current + 1, dimensionConfigs.length - 1));
  };

  const handlePrevious = () => {
    setStep(current => Math.max(current - 1, 0));
  };

  const handleSave = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const payload: GovMaturityCreateInput = {
        fecha,
        evaluador:
          evaluador.trim() || getDisplayName(usuario) || 'Evaluador no identificado',
        dimensiones,
        plan_accion: dimensiones
          .map(item => {
            const title =
              dimensionConfigs.find(dimension => dimension.key === item.dimension)
                ?.title || item.dimension;
            const improvement = item.oportunidades_mejora.trim();
            return improvement ? `${title}: ${improvement}` : null;
          })
          .filter((item): item is string => Boolean(item))
          .join('\n'),
        estado: 'finalizado',
      };

      const response = await authFetch('/api/gobierno/madurez', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const json = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'No se pudo guardar el diagnostico');
      }

      window.location.href = '/gobierno/madurez';
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo guardar el diagnostico'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-6 md:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <PageHeader
          eyebrow="ISO 18091"
          title="Nuevo diagnostico de madurez"
          description="Completa las cinco dimensiones del modelo para registrar el nivel institucional del municipio."
          breadcrumbs={[
            { label: 'Gobierno', href: '/gobierno/panel' },
            { label: 'Madurez ISO 18091', href: '/gobierno/madurez' },
            { label: 'Nuevo diagnostico' },
          ]}
          actions={
            <Button variant="outline" asChild>
              <Link href="/gobierno/madurez">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Link>
            </Button>
          }
        />

        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Radar className="h-5 w-5 text-[#2563eb]" />
                Progreso del diagnostico
              </CardTitle>
              <CardDescription>
                Avanza por cada dimension y registra evidencias concretas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">
                    Paso {step + 1} de {dimensionConfigs.length}
                  </span>
                  <span className="text-slate-500">{progressValue.toFixed(0)}%</span>
                </div>
                <Progress value={progressValue} indicatorColor="#2563eb" />
              </div>

              <div className="space-y-3">
                {dimensionConfigs.map((dimension, index) => {
                  const isActive = index === step;
                  const isCompleted = index < step;

                  return (
                    <button
                      key={dimension.key}
                      type="button"
                      onClick={() => setStep(index)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition',
                        isActive
                          ? 'border-[#93c5fd] bg-[#eff6ff]'
                          : 'border-slate-200 bg-white hover:border-slate-300',
                        isCompleted && 'border-emerald-200 bg-emerald-50/70'
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold',
                          isCompleted
                            ? 'bg-emerald-600 text-white'
                            : isActive
                              ? 'bg-[#2563eb] text-white'
                              : 'bg-slate-100 text-slate-600'
                        )}
                      >
                        {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{dimension.title}</p>
                        <p className="text-sm text-slate-500">
                          Nivel actual: {levelMeta[dimensiones[index].nivel].label}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Promedio actual</p>
                <p className="mt-1 text-3xl font-semibold text-slate-900">{promedio}/4</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <Badge className="border-[#bfdbfe] bg-[#dbeafe] text-[#1d4ed8]">
                    Paso {step + 1}
                  </Badge>
                  <CardTitle className="mt-3">{currentConfig.title}</CardTitle>
                  <CardDescription className="mt-2">
                    {currentConfig.description}
                  </CardDescription>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fecha">Fecha</Label>
                    <Input
                      id="fecha"
                      type="date"
                      value={fecha}
                      onChange={event => setFecha(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="evaluador">Evaluador</Label>
                    <Input
                      id="evaluador"
                      value={evaluador}
                      onChange={event => setEvaluador(event.target.value)}
                      placeholder={userLoading ? 'Cargando usuario...' : 'Nombre del evaluador'}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {[1, 2, 3, 4].map(level => {
                  const typedLevel = level as NivelMadurez;
                  const selected = currentDimension.nivel === typedLevel;

                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() =>
                        updateDimension(currentDimension.dimension, {
                          nivel: typedLevel,
                        })
                      }
                      className={cn(
                        'rounded-2xl border p-4 text-left transition',
                        selected
                          ? 'border-[#2563eb] bg-[#eff6ff] shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-slate-900">
                          Nivel {level}
                        </span>
                        <Badge
                          className={
                            selected
                              ? 'border-[#93c5fd] bg-white text-[#1d4ed8]'
                              : 'border-slate-200 bg-slate-100 text-slate-600'
                          }
                        >
                          {levelMeta[typedLevel].label}
                        </Badge>
                      </div>
                      <p className="mt-3 text-sm text-slate-500">
                        {levelMeta[typedLevel].helper}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2">
                <Label htmlFor="evidencias">Evidencias</Label>
                <Textarea
                  id="evidencias"
                  rows={6}
                  value={currentDimension.evidencias}
                  onChange={event =>
                    updateDimension(currentDimension.dimension, {
                      evidencias: event.target.value,
                    })
                  }
                  placeholder="Describe documentos, registros o practicas observadas."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="oportunidades">Oportunidades de mejora</Label>
                <Textarea
                  id="oportunidades"
                  rows={6}
                  value={currentDimension.oportunidades_mejora}
                  onChange={event =>
                    updateDimension(currentDimension.dimension, {
                      oportunidades_mejora: event.target.value,
                    })
                  }
                  placeholder="Indica brechas, riesgos o acciones recomendadas."
                />
              </div>

              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={step === 0 || submitting}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Paso anterior
                </Button>

                {step < dimensionConfigs.length - 1 ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="bg-[#2563eb] hover:bg-[#1d4ed8]"
                  >
                    Siguiente paso
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={submitting}
                    className="bg-[#2563eb] hover:bg-[#1d4ed8]"
                  >
                    {submitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Guardar diagnostico
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
