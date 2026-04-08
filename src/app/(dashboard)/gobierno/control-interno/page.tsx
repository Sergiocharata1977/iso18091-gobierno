import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Building2, ClipboardCheck, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

const upcomingItems = [
  {
    title: 'Taxonomia municipal de hallazgos',
    description:
      'Clasificacion adaptada a procesos, secretarias y riesgos propios del entorno municipal.',
    icon: ClipboardCheck,
    accentClassName: 'bg-emerald-100 text-emerald-700',
  },
  {
    title: 'Auditorias por secretaria/direccion',
    description:
      'Cobertura segmentada por dependencia para ordenar planes de accion y responsables.',
    icon: Building2,
    accentClassName: 'bg-sky-100 text-sky-700',
  },
  {
    title: 'Dashboard de control interno municipal',
    description:
      'Vista ejecutiva de hallazgos, vencimientos, reincidencias y estado de mejora.',
    icon: ShieldCheck,
    accentClassName: 'bg-amber-100 text-amber-700',
  },
] as const;

export default function ControlInternoPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-6 md:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-3">
            <Badge className="border-[#bfdbfe] bg-[#dbeafe] text-[#1d4ed8]">
              ISO 18091
            </Badge>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                Control Interno Municipal
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                Auditorias internas con taxonomia municipal, hallazgos por
                secretaria y seguimiento de planes de mejora.
              </p>
            </div>
          </div>
        </section>

        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
                Estado actual
              </p>
              <p className="text-base text-slate-700">
                Las auditorias ISO 9001 del nucleo base ya estan disponibles en
                el modulo de Auditorias.
              </p>
            </div>
            <Link
              href="/auditorias"
              className="inline-flex items-center gap-2 self-start rounded-full border border-[#bfdbfe] px-5 py-3 text-sm font-semibold text-[#1d4ed8] transition hover:bg-[#eff6ff]"
            >
              Ir a Auditorias
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>

        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-900">Proximamente</h2>
            <p className="text-sm text-slate-600">
              Estructura reservada para ampliar el alcance de control interno sin
              rutas rotas ni dependencias de backend.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {upcomingItems.map(item => {
              const Icon = item.icon;

              return (
                <Card
                  key={item.title}
                  className="rounded-3xl border border-slate-200 bg-white shadow-sm"
                >
                  <CardHeader className="space-y-4">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.accentClassName}`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl text-slate-900">
                      {item.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-6 text-slate-600">
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
