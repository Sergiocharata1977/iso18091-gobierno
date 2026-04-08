'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/components/ui/use-toast';
import { authFetch } from '@/lib/api/authFetch';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  MATURITY_DIMENSIONS,
  calculateMaturityTotals,
} from '@/lib/gov/maturity-dimensions';
import { cn } from '@/lib/utils';
import type {
  DiagnosticoMadurez,
  MaturityDimensionId,
  MaturityScore,
} from '@/types/gov/maturity';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Loader2,
  Radar,
  Save,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar as RechartsRadar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

type DiagnosticoPersistido = Omit<DiagnosticoMadurez, 'created_at'> & {
  created_at: string;
};

type DiagnosticoResponse = {
  success: boolean;
  data?: {
    latest: DiagnosticoPersistido | null;
    items: DiagnosticoPersistido[];
  };
  error?: string;
};

const DEFAULT_SCORES: Record<MaturityDimensionId, MaturityScore> = {
  D1: 1,
  D2: 1,
  D3: 1,
  D4: 1,
  D5: 1,
};

const LEVEL_LABELS: Record<MaturityScore, string> = {
  1: 'Nivel 1',
  2: 'Nivel 2',
  3: 'Nivel 3',
  4: 'Nivel 4',
};

const LEVEL_STYLES: Record<
  MaturityScore,
  { badge: string; card: string; text: string }
> = {
  1: {
    badge: 'border-rose-200 bg-rose-50 text-rose-700',
    card: 'border-rose-200 bg-rose-50/60',
    text: 'text-rose-700',
  },
  2: {
    badge: 'border-amber-200 bg-amber-50 text-amber-700',
    card: 'border-amber-200 bg-amber-50/60',
    text: 'text-amber-700',
  },
  3: {
    badge: 'border-sky-200 bg-sky-50 text-sky-700',
    card: 'border-sky-200 bg-sky-50/60',
    text: 'text-sky-700',
  },
  4: {
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    card: 'border-emerald-200 bg-emerald-50/60',
    text: 'text-emerald-700',
  },
};

function getLevelDescription(
  dimensionId: MaturityDimensionId,
  score: MaturityScore
) {
  const dimension = MATURITY_DIMENSIONS.find(item => item.id === dimensionId);
  if (!dimension) {
    return '';
  }

  return dimension[`nivel${score}`];
}

export default function MunicipioMadurezPage() {
  const { usuario, loading: userLoading } = useCurrentUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [scores, setScores] =
    useState<Record<MaturityDimensionId, MaturityScore>>(DEFAULT_SCORES);
  const [selectedDimensionId, setSelectedDimensionId] =
    useState<MaturityDimensionId>('D1');
  const [latest, setLatest] = useState<DiagnosticoPersistido | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authFetch('/api/municipio/madurez', {
        cache: 'no-store',
      });
      const json = (await response.json()) as DiagnosticoResponse;

      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.error || 'No se pudo cargar el diagnostico');
      }

      setLatest(json.data.latest);

      if (json.data.latest) {
        setScores(json.data.latest.puntajes);
        setFecha(json.data.latest.fecha);
      }
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'No se pudo cargar el diagnostico'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userLoading) {
      return;
    }

    if (!usuario) {
      setLoading(false);
      setError('No hay una sesion autenticada para consultar este diagnostico.');
      return;
    }

    void loadData();
  }, [userLoading, usuario]);

  const currentTotals = useMemo(
    () => calculateMaturityTotals(scores),
    [scores]
  );

  const radarData = useMemo(
    () =>
      MATURITY_DIMENSIONS.map(dimension => ({
        dimension: dimension.id,
        nombre: dimension.nombre,
        puntaje: scores[dimension.id],
        maximo: 4,
      })),
    [scores]
  );

  const activeDimension =
    MATURITY_DIMENSIONS.find(item => item.id === selectedDimensionId) ||
    MATURITY_DIMENSIONS[0];

  const handleScoreChange = (
    dimensionId: MaturityDimensionId,
    value: string
  ) => {
    const parsed = Number(value);
    if (parsed < 1 || parsed > 4) {
      return;
    }

    setScores(current => ({
      ...current,
      [dimensionId]: parsed as MaturityScore,
    }));
    setSelectedDimensionId(dimensionId);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const response = await authFetch('/api/municipio/madurez', {
        method: 'POST',
        body: JSON.stringify({
          fecha,
          puntajes: scores,
        }),
      });

      const json = (await response.json()) as {
        success: boolean;
        data?: DiagnosticoPersistido;
        error?: string;
      };

      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.error || 'No se pudo guardar el diagnostico');
      }

      setLatest(json.data);
      toast({
        title: 'Diagnostico guardado',
        description: 'El analisis de madurez municipal se registro correctamente.',
      });
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : 'No se pudo guardar el diagnostico';
      setError(message);
      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description: message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Diagnostico de madurez municipal"
        description="Evaluacion basada en 5 dimensiones ISO 18091 para gobierno local, con puntaje global y foco de mejora."
        breadcrumbs={[
          { label: 'Municipio' },
          { label: 'Madurez' },
        ]}
        actions={
            <Button onClick={handleSave} disabled={saving || loading || userLoading}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Guardar diagnostico
          </Button>
        }
      />

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Formulario por dimension</CardTitle>
            <CardDescription>
              Selecciona un nivel del 1 al 4 para cada dimension del modelo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading || userLoading ? (
              <div className="flex min-h-[240px] items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cargando diagnostico...
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-dashed md:col-span-1">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Resultado actual</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-slate-100 p-3">
                        <Building2 className="h-5 w-5 text-slate-700" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">
                          {currentTotals.puntaje_total}/20
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Nivel {currentTotals.nivel_global}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fecha">Fecha del diagnostico</Label>
                      <input
                        id="fecha"
                        type="date"
                        value={fecha}
                        onChange={event => setFecha(event.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-slate-700">
                          Dimension activa
                        </span>
                        <Badge variant="outline">{activeDimension.id}</Badge>
                      </div>
                      <p className="mt-2 font-medium text-slate-900">
                        {activeDimension.nombre}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {activeDimension.descripcion}
                      </p>
                      <p
                        className={cn(
                          'mt-3 text-sm font-medium',
                          LEVEL_STYLES[scores[activeDimension.id]].text
                        )}
                      >
                        {getLevelDescription(
                          activeDimension.id,
                          scores[activeDimension.id]
                        )}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-4 md:col-span-2">
                  {MATURITY_DIMENSIONS.map(dimension => (
                    <Card
                      key={dimension.id}
                      className={cn(
                        'transition-colors',
                        selectedDimensionId === dimension.id
                          ? 'border-primary/40 shadow-sm'
                          : 'border-border'
                      )}
                      onMouseEnter={() => setSelectedDimensionId(dimension.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <CardTitle className="text-base">
                              {dimension.id} · {dimension.nombre}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              {dimension.descripcion}
                            </CardDescription>
                          </div>
                          <Badge
                            className={cn(
                              'border',
                              LEVEL_STYLES[scores[dimension.id]].badge
                            )}
                          >
                            {LEVEL_LABELS[scores[dimension.id]]}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <RadioGroup
                          value={String(scores[dimension.id])}
                          onValueChange={value =>
                            handleScoreChange(dimension.id, value)
                          }
                          className="grid gap-3 md:grid-cols-2"
                        >
                          {[1, 2, 3, 4].map(level => {
                            const score = level as MaturityScore;
                            const selected = scores[dimension.id] === score;

                            return (
                              <label
                                key={level}
                                className={cn(
                                  'flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors',
                                  selected
                                    ? LEVEL_STYLES[score].card
                                    : 'border-border bg-background hover:border-primary/30'
                                )}
                                onMouseEnter={() =>
                                  setSelectedDimensionId(dimension.id)
                                }
                              >
                                <RadioGroupItem
                                  value={String(level)}
                                  id={`${dimension.id}-${level}`}
                                  className="mt-1"
                                />
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Label
                                      htmlFor={`${dimension.id}-${level}`}
                                      className="cursor-pointer font-medium"
                                    >
                                      {LEVEL_LABELS[score]}
                                    </Label>
                                    <Badge variant="outline">{level}/4</Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {(dimension as Record<string, unknown>)[`nivel${level}`] as string}
                                  </p>
                                </div>
                              </label>
                            );
                          })}
                        </RadioGroup>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Radar className="h-5 w-5" />
                Radar de madurez
              </CardTitle>
              <CardDescription>
                Visualizacion del puntaje actual por dimension.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="72%">
                  <PolarGrid stroke="#dbe4f0" />
                  <PolarAngleAxis
                    dataKey="dimension"
                    tick={{ fontSize: 12, fill: '#475569' }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 4]}
                    tickCount={5}
                    tick={{ fontSize: 11 }}
                  />
                  <RechartsRadar
                    dataKey="puntaje"
                    stroke="#0f766e"
                    fill="#14b8a6"
                    fillOpacity={0.35}
                  />
                  <Tooltip
                    formatter={(value: number | undefined) => [`${value ?? 0}/4`, 'Nivel'] as [string, string]}
                    labelFormatter={label => {
                      const dimension = MATURITY_DIMENSIONS.find(
                        item => item.id === label
                      );
                      return dimension
                        ? `${dimension.id} · ${dimension.nombre}`
                        : label;
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Nivel global</CardTitle>
              <CardDescription>
                Clasificacion segun el total acumulado del diagnostico.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-teal-200 bg-teal-50 p-4">
                <div>
                  <p className="text-3xl font-bold text-teal-900">
                    {currentTotals.puntaje_total}
                  </p>
                  <p className="text-sm text-teal-700">sobre 20 puntos</p>
                </div>
                <Badge className="border-teal-200 bg-white text-teal-700">
                  {currentTotals.nivel_global}
                </Badge>
              </div>

              <div className="grid gap-2">
                {[
                  ['Emergente', '5-9'],
                  ['En desarrollo', '10-14'],
                  ['Consolidado', '15-17'],
                  ['Maduro', '18-20'],
                ].map(([label, range]) => (
                  <div
                    key={label}
                    className={cn(
                      'flex items-center justify-between rounded-xl border px-3 py-2 text-sm',
                      currentTotals.nivel_global === label
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border'
                    )}
                  >
                    <span>{label}</span>
                    <span className="text-muted-foreground">{range}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Plan de mejora</CardTitle>
              <CardDescription>
                Acciones sugeridas para dimensiones con menor desarrollo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {currentTotals.plan_mejora.map((action, index) => (
                <div
                  key={`${index}-${action}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
                >
                  {action}
                </div>
              ))}
            </CardContent>
          </Card>

          {latest ? (
            <Card>
              <CardHeader>
                <CardTitle>Ultimo diagnostico guardado</CardTitle>
                <CardDescription>
                  Referencia persistida actualmente en Firestore.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Fecha</span>
                  <span className="font-medium">{latest.fecha}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Puntaje</span>
                  <span className="font-medium">{latest.puntaje_total}/20</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Nivel</span>
                  <span className="font-medium">{latest.nivel_global}</span>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  <div className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    Diagnostico persistido correctamente
                  </div>
                  <p className="mt-1">
                    El formulario se precarga desde el ultimo registro guardado.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
