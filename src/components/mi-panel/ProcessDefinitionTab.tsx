'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ProcessDefinition } from '@/types/procesos';
import type { QualityIndicator, QualityObjective } from '@/types/quality';

interface ProcessDefinitionTabProps {
  processDefinition: ProcessDefinition;
  objectives: QualityObjective[];
  indicators: QualityIndicator[];
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </h3>
      {children}
    </section>
  );
}

function ReadOnlyList({
  items,
  emptyLabel = 'No definido',
}: {
  items?: string[];
  emptyLabel?: string;
}) {
  if (!items || items.length === 0) {
    return <p className="text-sm italic text-slate-500">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-2 text-sm text-slate-700">
      {items.map((item, index) => (
        <li
          key={`${item}-${index}`}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function getProcessStatusBadge(status: ProcessDefinition['estado']) {
  return status === 'activo'
    ? { label: 'Activo', variant: 'success' as const }
    : { label: 'Inactivo', variant: 'secondary' as const };
}

function getObjectiveStatusBadge(status: QualityObjective['status']) {
  if (status === 'activo')
    return { label: 'Activo', variant: 'success' as const };
  if (status === 'atrasado')
    return { label: 'Atrasado', variant: 'destructive' as const };
  if (status === 'completado')
    return { label: 'Completado', variant: 'outline' as const };
  return { label: 'Cancelado', variant: 'secondary' as const };
}

export function ProcessDefinitionTab({
  processDefinition,
  objectives,
  indicators,
}: ProcessDefinitionTabProps) {
  const status = getProcessStatusBadge(processDefinition.estado);

  return (
    <div className="space-y-5">
      <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Ficha tecnica del proceso
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold text-slate-950">
                {processDefinition.nombre}
              </h2>
              <Badge variant="outline">{processDefinition.codigo}</Badge>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
          </div>

          <Link
            href="/procesos/definiciones"
            className="text-sm font-medium text-slate-700 underline-offset-4 transition hover:text-slate-950 hover:underline"
          >
            Editar en modulo Procesos
          </Link>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <Section title="Objetivo">
            <p className="text-sm leading-6 text-slate-700">
              {processDefinition.objetivo || 'No definido'}
            </p>
          </Section>

          <Section title="Alcance">
            <p className="text-sm leading-6 text-slate-700">
              {processDefinition.alcance || 'No definido'}
            </p>
          </Section>

          <Section title="Responsable">
            <p className="text-sm leading-6 text-slate-700">
              {processDefinition.responsable || 'No definido'}
            </p>
          </Section>

          <Section title="Documentos">
            <ReadOnlyList items={processDefinition.documentos} />
          </Section>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-3">
        <Section title="Entradas">
          <ReadOnlyList items={processDefinition.entradas} />
        </Section>

        <Section title="Salidas">
          <ReadOnlyList items={processDefinition.salidas} />
        </Section>

        <Section title="Controles">
          <ReadOnlyList items={processDefinition.controles} />
        </Section>
      </div>

      <Section title="Objetivos de calidad vinculados">
        {objectives.length === 0 ? (
          <p className="text-sm italic text-slate-500">No definido</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Codigo</TableHead>
                <TableHead>Titulo</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {objectives.map(objective => {
                const objectiveStatus = getObjectiveStatusBadge(
                  objective.status
                );

                return (
                  <TableRow key={objective.id} className="bg-white">
                    <TableCell className="font-medium text-slate-900">
                      {objective.code}
                    </TableCell>
                    <TableCell>{objective.title}</TableCell>
                    <TableCell>
                      <Badge variant={objectiveStatus.variant}>
                        {objectiveStatus.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Section>

      <Section title="Indicadores vinculados">
        {indicators.length === 0 ? (
          <p className="text-sm italic text-slate-500">No definido</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Codigo</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Frecuencia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {indicators.map(indicator => (
                <TableRow key={indicator.id} className="bg-white">
                  <TableCell className="font-medium text-slate-900">
                    {indicator.code}
                  </TableCell>
                  <TableCell>{indicator.name}</TableCell>
                  <TableCell className="capitalize">
                    {indicator.measurement_frequency}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>
    </div>
  );
}
