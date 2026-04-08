'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { authFetch } from '@/lib/api/authFetch';
import {
  ArrowRight,
  Building2,
  ClipboardList,
  Loader2,
  Radar,
  RefreshCcw,
  Star,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import type { ComponentType } from 'react';
import { useCallback, useEffect, useState } from 'react';

type GobiernoPanelData = {
  expedientes_total: number;
  ciudadanos_registrados: number;
  expedientes_pendientes: number;
  nps_ciudadano: number | null;
};

type GobiernoPanelResponse = {
  success?: boolean;
  data?: GobiernoPanelData;
  error?: string;
};

type StatCardProps = {
  title: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  accentClassName: string;
};

const DEFAULT_DATA: GobiernoPanelData = {
  expedientes_total: 0,
  ciudadanos_registrados: 0,
  expedientes_pendientes: 0,
  nps_ciudadano: null,
};

const quickLinks = [
  {
    title: 'Expedientes',
    description: 'Consulta la gestion de tramites y expedientes abiertos.',
    href: '/gobierno/expedientes',
  },
  {
    title: 'Ciudadanos',
    description: 'Accede al registro y seguimiento de ciudadanos.',
    href: '/gobierno/ciudadanos',
  },
  {
    title: 'Madurez ISO 18091',
    description: 'Revisa el diagnostico de madurez institucional.',
    href: '/gobierno/madurez',
  },
];

function StatCard({ title, value, icon: Icon, accentClassName }: StatCardProps) {
  return (
    <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {value}
          </p>
        </div>
        <div className={`rounded-2xl p-3 ${accentClassName}`}>
          <Icon className="h-6 w-6" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function GobiernoPanelPage() {
  const [data, setData] = useState<GobiernoPanelData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPanel = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const response = await authFetch('/api/gobierno/panel', {
        cache: 'no-store',
      });
      const json = (await response.json()) as GobiernoPanelResponse;

      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.error || 'No se pudo cargar el panel municipal');
      }

      setData(json.data);
      setError(null);
    } catch (fetchError) {
      setData(DEFAULT_DATA);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'No se pudo cargar el panel municipal'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadPanel();
  }, [loadPanel]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#f8fafc]">
        <Loader2 className="h-8 w-8 animate-spin text-[#2563eb]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-6 md:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <Badge className="border-[#bfdbfe] bg-[#dbeafe] text-[#1d4ed8]">
                ISO 18091
              </Badge>
              <div className="space-y-2">
                <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight text-slate-900">
                  <Building2 className="h-8 w-8 text-[#2563eb]" />
                  Panel Municipal
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-slate-600">
                  Vista inicial para seguimiento de expedientes, ciudadanos y
                  madurez institucional del municipio.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => void loadPanel('refresh')}
              disabled={refreshing}
              className="border-[#bfdbfe] text-[#1d4ed8] hover:bg-[#eff6ff]"
            >
              {refreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="mr-2 h-4 w-4" />
              )}
              Actualizar
            </Button>
          </div>
        </section>

        {error ? (
          <Card className="rounded-3xl border border-amber-200 bg-amber-50 shadow-sm">
            <CardContent className="p-5 text-sm text-amber-800">
              {error}
            </CardContent>
          </Card>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Expedientes totales"
            value={String(data.expedientes_total)}
            icon={ClipboardList}
            accentClassName="bg-[#dbeafe] text-[#2563eb]"
          />
          <StatCard
            title="Ciudadanos"
            value={String(data.ciudadanos_registrados)}
            icon={Users}
            accentClassName="bg-sky-100 text-sky-700"
          />
          <StatCard
            title="Pendientes"
            value={String(data.expedientes_pendientes)}
            icon={Loader2}
            accentClassName="bg-amber-100 text-amber-700"
          />
          <StatCard
            title="NPS ciudadano"
            value={data.nps_ciudadano === null ? 'Sin dato' : String(data.nps_ciudadano)}
            icon={Star}
            accentClassName="bg-indigo-100 text-indigo-700"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl text-slate-900">
                Proximas revisiones ISO 18091
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
                Sin revisiones programadas
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl text-slate-900">
                Accesos rapidos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-4 transition hover:border-[#93c5fd] hover:bg-[#eff6ff]"
                >
                  <div>
                    <p className="font-medium text-slate-900">{link.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{link.description}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-400 transition group-hover:text-[#2563eb]" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>

      <Link
        href="/gobierno/madurez"
        className="fixed bottom-6 right-6 inline-flex items-center gap-2 rounded-full bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-[#1d4ed8]"
      >
        <Radar className="h-4 w-4" />
        Diagnostico de Madurez ISO 18091
      </Link>
    </div>
  );
}
