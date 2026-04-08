'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle, Loader2, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import type {
  CategoriaItem,
  TierCredito,
} from '@/types/crm-evaluacion-riesgo';
import {
  ITEMS_CUALITATIVOS,
  ITEMS_CONFLICTOS,
  ITEMS_CUANTITATIVOS,
} from '@/types/crm-evaluacion-riesgo';

// ─── tipos internos ────────────────────────────────────────────
interface ItemState {
  categoria: CategoriaItem;
  item_key: string;
  nombre: string;
  peso: number;
  puntaje: number;
  observaciones: string;
}

interface ClienteInfo {
  id: string;
  razon_social: string;
  cuit_cuil: string;
}

// ─── helpers ───────────────────────────────────────────────────
const PESO_CAT = { cualitativos: 0.43, conflictos: 0.31, cuantitativos: 0.26 };

function calcScoreCategoria(items: ItemState[], categoria: CategoriaItem) {
  return items
    .filter(i => i.categoria === categoria)
    .reduce((acc, i) => acc + i.puntaje * i.peso, 0);
}

function calcTotal(
  sc: number,
  sconf: number,
  scuant: number,
): number {
  return (
    sc * PESO_CAT.cualitativos +
    sconf * PESO_CAT.conflictos +
    scuant * PESO_CAT.cuantitativos
  );
}

function deriveTier(score: number): TierCredito {
  if (score >= 8) return 'A';
  if (score >= 6) return 'B';
  if (score >= 4) return 'C';
  return 'REPROBADO';
}

const TIER_STYLES: Record<TierCredito, string> = {
  A: 'bg-emerald-500 text-white',
  B: 'bg-blue-500 text-white',
  C: 'bg-amber-500 text-white',
  REPROBADO: 'bg-rose-500 text-white',
};

// ─── componente de categoría ──────────────────────────────────
function CategoriaSection({
  titulo,
  descripcion,
  items,
  porcentaje,
  score,
  onChange,
}: {
  titulo: string;
  descripcion: string;
  items: ItemState[];
  porcentaje: string;
  score: number;
  onChange: (key: string, field: 'puntaje' | 'observaciones', value: number | string) => void;
}) {
  return (
    <Card className="rounded-2xl border border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base text-slate-900">{titulo}</CardTitle>
            <p className="mt-1 text-xs text-slate-500">{descripcion} — peso: {porcentaje}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Score parcial</p>
            <p className="text-2xl font-bold text-slate-900">{score.toFixed(2)}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map(item => (
          <div key={item.item_key} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">{item.nombre}</p>
                <p className="text-xs text-slate-400">Peso: {(item.peso * 100).toFixed(1)}%</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={item.puntaje}
                  onChange={e => onChange(item.item_key, 'puntaje', Number(e.target.value))}
                  className="w-32 accent-emerald-600"
                />
                <span className={`w-8 text-center text-lg font-bold ${
                  item.puntaje >= 8 ? 'text-emerald-600' :
                  item.puntaje >= 6 ? 'text-blue-600' :
                  item.puntaje >= 4 ? 'text-amber-600' : 'text-rose-600'
                }`}>
                  {item.puntaje}
                </span>
              </div>
            </div>
            <input
              type="text"
              value={item.observaciones}
              onChange={e => onChange(item.item_key, 'observaciones', e.target.value)}
              placeholder="Observaciones opcionales..."
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-emerald-400"
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── página principal ─────────────────────────────────────────
function NuevaEvaluacionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clienteId = searchParams.get('cliente_id') ?? '';
  const { user } = useAuth();

  const [cliente, setCliente] = useState<ClienteInfo | null>(null);
  const [loadingCliente, setLoadingCliente] = useState(true);
  const [patrimonioNeto, setPatrimonioNeto] = useState(0);
  const [evaluacionPersonal, setEvaluacionPersonal] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  // Inicializar items con puntaje 5 por defecto
  const [items, setItems] = useState<ItemState[]>([
    ...ITEMS_CUALITATIVOS.map(i => ({
      categoria: 'cualitativos' as CategoriaItem,
      item_key: i.key,
      nombre: i.nombre,
      peso: i.peso,
      puntaje: 5,
      observaciones: '',
    })),
    ...ITEMS_CONFLICTOS.map(i => ({
      categoria: 'conflictos' as CategoriaItem,
      item_key: i.key,
      nombre: i.nombre,
      peso: i.peso,
      puntaje: 5,
      observaciones: '',
    })),
    ...ITEMS_CUANTITATIVOS.map(i => ({
      categoria: 'cuantitativos' as CategoriaItem,
      item_key: i.key,
      nombre: i.nombre,
      peso: i.peso,
      puntaje: 5,
      observaciones: '',
    })),
  ]);

  // Cargar cliente
  useEffect(() => {
    if (!clienteId) return;
    fetch(`/api/crm/clientes/${clienteId}`)
      .then(r => r.json())
      .then((json: { success: boolean; data?: ClienteInfo }) => {
        if (json.success && json.data) setCliente(json.data);
      })
      .catch(() => {})
      .finally(() => setLoadingCliente(false));
  }, [clienteId]);

  const handleItemChange = (
    key: string,
    field: 'puntaje' | 'observaciones',
    value: number | string,
  ) => {
    setItems(prev =>
      prev.map(i =>
        i.item_key === key ? { ...i, [field]: value } : i,
      ),
    );
  };

  // Scores calculados en tiempo real
  const scoreCual = useMemo(() => calcScoreCategoria(items, 'cualitativos'), [items]);
  const scoreConf = useMemo(() => calcScoreCategoria(items, 'conflictos'), [items]);
  const scoreCuant = useMemo(() => calcScoreCategoria(items, 'cuantitativos'), [items]);
  const scoreTotal = useMemo(() => calcTotal(scoreCual, scoreConf, scoreCuant), [scoreCual, scoreConf, scoreCuant]);
  const tierSugerido = useMemo(() => deriveTier(scoreTotal), [scoreTotal]);
  const capitalGarantia = patrimonioNeto * 0.5;

  const handleSubmit = async () => {
    if (!user?.organization_id || !clienteId || !cliente) return;
    setSaving(true);
    try {
      const res = await fetch('/api/crm/evaluaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crm_organizacion_id: clienteId,
          cliente_nombre: cliente.razon_social,
          cliente_cuit: cliente.cuit_cuil ?? '',
          patrimonio_neto_computable: patrimonioNeto,
          items: items.map(i => ({
            categoria: i.categoria,
            item_key: i.item_key,
            puntaje: i.puntaje,
            observaciones: i.observaciones || undefined,
          })),
          evaluacion_personal: evaluacionPersonal || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Error al guardar');
      setSavedId(json.data.id as string);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al guardar evaluación');
    } finally {
      setSaving(false);
    }
  };

  if (savedId) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-8">
        <CheckCircle className="h-16 w-16 text-emerald-500" />
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-slate-900">Evaluación guardada</h2>
          <p className="mt-2 text-slate-600">
            Score total: <strong>{scoreTotal.toFixed(2)}</strong> — Tier sugerido:{' '}
            <Badge className={TIER_STYLES[tierSugerido]}>{tierSugerido}</Badge>
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push(`/crm/clientes/${clienteId}`)}>
            Volver al cliente
          </Button>
          <Button onClick={() => router.push(`/crm/evaluaciones/${savedId}`)}>
            Ver evaluación
          </Button>
        </div>
      </div>
    );
  }

  if (loadingCliente) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const itemsCual = items.filter(i => i.categoria === 'cualitativos');
  const itemsConf = items.filter(i => i.categoria === 'conflictos');
  const itemsCuant = items.filter(i => i.categoria === 'cuantitativos');

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-6">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/crm/clientes/${clienteId}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
            Análisis de Riesgo Crediticio
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Nueva Evaluación</h1>
          {cliente && (
            <p className="mt-1 text-sm text-slate-600">
              {cliente.razon_social}
              {cliente.cuit_cuil ? ` — CUIT: ${cliente.cuit_cuil}` : ''}
            </p>
          )}
        </div>

        {/* Score en tiempo real */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Cualitativos (43%)', value: scoreCual.toFixed(2), color: 'text-blue-700' },
            { label: 'Conflictos (31%)', value: scoreConf.toFixed(2), color: 'text-rose-700' },
            { label: 'Cuantitativos (26%)', value: scoreCuant.toFixed(2), color: 'text-emerald-700' },
            { label: 'Score Total', value: scoreTotal.toFixed(2), color: 'text-slate-900' },
          ].map(card => (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm"
            >
              <p className="text-xs text-slate-500">{card.label}</p>
              <p className={`mt-1 text-2xl font-bold ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Tier y capital */}
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-xs text-slate-500">Tier sugerido</p>
            <Badge className={`mt-1 text-base px-3 py-1 ${TIER_STYLES[tierSugerido]}`}>
              Tier {tierSugerido}
            </Badge>
          </div>
          <div className="ml-6">
            <p className="text-xs text-slate-500">Patrimonio neto computable</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm text-slate-500">$</span>
              <input
                type="number"
                min={0}
                step={10000}
                value={patrimonioNeto || ''}
                onChange={e => setPatrimonioNeto(Number(e.target.value))}
                placeholder="0"
                className="w-40 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-emerald-400"
              />
            </div>
          </div>
          {patrimonioNeto > 0 && (
            <div className="ml-4">
              <p className="text-xs text-slate-500">Capital garantía (50%)</p>
              <p className="mt-1 text-sm font-semibold text-emerald-700">
                ${capitalGarantia.toLocaleString('es-AR')}
              </p>
            </div>
          )}
        </div>

        {/* Categorías */}
        <CategoriaSection
          titulo="Factores Cualitativos"
          descripcion="Aspectos de gestión, historial y relación comercial"
          items={itemsCual}
          porcentaje="43%"
          score={scoreCual}
          onChange={handleItemChange}
        />

        <CategoriaSection
          titulo="Factores de Conflicto"
          descripcion="Situaciones legales, fiscales y financieras adversas"
          items={itemsConf}
          porcentaje="31%"
          score={scoreConf}
          onChange={handleItemChange}
        />

        <CategoriaSection
          titulo="Factores Cuantitativos"
          descripcion="Indicadores económicos y financieros"
          items={itemsCuant}
          porcentaje="26%"
          score={scoreCuant}
          onChange={handleItemChange}
        />

        {/* Evaluación personal */}
        <Card className="rounded-2xl border border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Evaluación personal del analista</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              value={evaluacionPersonal}
              onChange={e => setEvaluacionPersonal(e.target.value)}
              rows={4}
              placeholder="Conclusiones, observaciones adicionales, contexto del cliente..."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none focus:border-emerald-400"
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-sm font-medium text-slate-700">
              Score total: <span className="text-lg font-bold text-slate-900">{scoreTotal.toFixed(2)}</span>
              {' '}— Tier: <Badge className={`${TIER_STYLES[tierSugerido]}`}>{tierSugerido}</Badge>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              La evaluación se guardará como borrador. Podés aprobarla o rechazarla luego.
            </p>
          </div>
          <Button
            onClick={() => void handleSubmit()}
            disabled={saving || !cliente}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Guardar Evaluación
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function NuevaEvaluacionPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    }>
      <NuevaEvaluacionContent />
    </Suspense>
  );
}
