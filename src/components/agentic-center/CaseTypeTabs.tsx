'use client';

import type { AgenticCaseType } from '@/components/agentic-center/agenticCenterPresentation';
import { getTypeLabel } from '@/components/agentic-center/agenticCenterPresentation';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type AgenticPrimaryFilter = 'todos' | AgenticCaseType;

interface CaseTypeTabsProps {
  value: AgenticPrimaryFilter;
  onChange: (value: AgenticPrimaryFilter) => void;
  counts: Record<AgenticPrimaryFilter, number>;
}

const orderedFilters: AgenticPrimaryFilter[] = [
  'todos',
  'alerta',
  'accion-sugerida',
  'cambio-registro',
];

export default function CaseTypeTabs({
  value,
  onChange,
  counts,
}: CaseTypeTabsProps) {
  return (
    <Tabs value={value} onValueChange={next => onChange(next as AgenticPrimaryFilter)}>
      <TabsList className="h-auto flex-wrap justify-start gap-2 rounded-2xl bg-slate-100/90 p-1.5">
        {orderedFilters.map(filter => (
          <TabsTrigger
            key={filter}
            value={filter}
            className="rounded-xl border border-transparent px-3 py-2 text-sm data-[state=active]:border-slate-200 data-[state=active]:bg-white"
          >
            <span>{filter === 'todos' ? 'Todos' : getTypeLabel(filter)}</span>
            <Badge variant="outline" className="ml-2 border-slate-200 bg-slate-50 text-slate-600">
              {counts[filter]}
            </Badge>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
