'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { AgenticCenterSummary } from '@/types/agentic-center';
import { Bot, Clock3, MonitorCog, Sparkles, Users } from 'lucide-react';

interface AgenticCenterSummaryCardsProps {
  summary: AgenticCenterSummary;
}

const items = [
  {
    key: 'jobs_activos',
    title: 'Operaciones activas',
    description: 'Casos en deteccion o ejecucion automatizada.',
    icon: Sparkles,
    accent: 'from-emerald-500/15 via-emerald-500/5 to-transparent',
  },
  {
    key: 'sagas_pausadas',
    title: 'Flujos esperando decision',
    description: 'Orquestaciones pausadas hasta recibir validacion.',
    icon: Bot,
    accent: 'from-sky-500/15 via-sky-500/5 to-transparent',
  },
  {
    key: 'direct_actions_pendientes',
    title: 'Acciones propuestas',
    description: 'Cambios listos para aprobar y registrar.',
    icon: Clock3,
    accent: 'from-amber-500/15 via-amber-500/5 to-transparent',
  },
  {
    key: 'terminales_con_aprobacion',
    title: 'Terminales en espera',
    description: 'Equipos con una instruccion pendiente de liberacion.',
    icon: MonitorCog,
    accent: 'from-violet-500/15 via-violet-500/5 to-transparent',
  },
  {
    key: 'personas_impactadas',
    title: 'Personas involucradas',
    description: 'Colaboradores alcanzados por decisiones activas.',
    icon: Users,
    accent: 'from-rose-500/15 via-rose-500/5 to-transparent',
  },
] as const;

export default function AgenticCenterSummaryCards({
  summary,
}: AgenticCenterSummaryCardsProps) {
  return (
    <section className="grid gap-4 xl:grid-cols-5 md:grid-cols-2">
      {items.map(item => {
        const Icon = item.icon;
        const value = summary[item.key];

        return (
          <Card
            key={item.key}
            className="relative overflow-hidden border-slate-200 bg-white/90 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.45)]"
          >
            <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-br ${item.accent}`} />
            <CardContent className="relative p-5">
              <div className="flex items-center justify-between gap-3">
                <Badge variant="outline" className="border-slate-200 bg-white/80 text-slate-600">
                  {item.title}
                </Badge>
                <Icon className="h-4 w-4 text-slate-500" />
              </div>
              <p className="mt-6 text-3xl font-semibold tracking-tight text-slate-950">
                {value}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
