import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, FileText, Mail, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import type { ComponentType } from 'react';

type UpcomingCardProps = {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  accentClassName: string;
};

const upcomingItems: UpcomingCardProps[] = [
  {
    title: 'Presupuesto y ejecucion',
    description:
      'Publicacion estructurada de partidas, avances y desvios para consulta ciudadana.',
    icon: DollarSign,
    accentClassName: 'bg-emerald-100 text-emerald-700',
  },
  {
    title: 'Compras y licitaciones',
    description:
      'Seguimiento de procesos de compra, adjudicaciones y documentacion respaldatoria.',
    icon: ShoppingCart,
    accentClassName: 'bg-sky-100 text-sky-700',
  },
  {
    title: 'Actos administrativos',
    description:
      'Resoluciones, decretos y disposiciones listos para publicacion en el portal ciudadano.',
    icon: FileText,
    accentClassName: 'bg-amber-100 text-amber-700',
  },
];

function UpcomingCard({
  title,
  description,
  icon: Icon,
  accentClassName,
}: UpcomingCardProps) {
  return (
    <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <CardHeader className="space-y-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${accentClassName}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <Badge className="w-fit border-slate-200 bg-slate-100 text-slate-600">
            Proximamente
          </Badge>
          <CardTitle className="text-xl text-slate-900">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-slate-600">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function TransparenciaPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-6 md:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-3">
            <Badge className="border-[#bfdbfe] bg-[#dbeafe] text-[#1d4ed8]">
              ISO 18091 - Art. 7.4
            </Badge>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                Transparencia Activa
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                Gestion de informacion publica: presupuesto, compras, actos
                administrativos y KPIs publicables en el portal ciudadano.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {upcomingItems.map(item => (
            <UpcomingCard key={item.title} {...item} />
          ))}
        </section>

        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="text-lg font-semibold text-slate-900">
                Modulo en preparacion
              </p>
              <p className="text-sm text-slate-600">
                Si necesitas habilitar esta funcionalidad antes, podemos
                priorizar su implementacion.
              </p>
            </div>
            <Link
              href="mailto:hola@doncandidoia.com"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
            >
              <Mail className="h-4 w-4" />
              Necesitas esta funcionalidad urgente? Contactanos
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
