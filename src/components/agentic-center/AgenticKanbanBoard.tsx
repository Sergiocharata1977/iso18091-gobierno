'use client';

import type {
  AgenticBoardColumnId,
  AgenticCaseViewModel,
} from '@/components/agentic-center/agenticCenterPresentation';
import AgenticCaseCard from '@/components/agentic-center/AgenticCaseCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface AgenticKanbanBoardProps {
  items: AgenticCaseViewModel[];
}

const columns: Array<{
  id: AgenticBoardColumnId;
  title: string;
  subtitle: string;
  tone: string;
}> = [
  {
    id: 'detectado',
    title: 'Detectado',
    subtitle: 'Nuevos casos identificados por IA',
    tone: 'bg-slate-500',
  },
  {
    id: 'pendiente-revision',
    title: 'Pendiente de revision',
    subtitle: 'Esperan decision humana o validacion',
    tone: 'bg-amber-500',
  },
  {
    id: 'en-ejecucion',
    title: 'En ejecucion',
    subtitle: 'Acciones en curso o automatizadas',
    tone: 'bg-sky-500',
  },
  {
    id: 'completado',
    title: 'Completado',
    subtitle: 'Cierre con evidencia disponible',
    tone: 'bg-emerald-500',
  },
];

export default function AgenticKanbanBoard({ items }: AgenticKanbanBoardProps) {
  return (
    <section
      aria-label="Tablero kanban centralizado"
      className="rounded-[28px] border border-slate-200 bg-white/90 p-4 shadow-sm"
    >
      <div className="grid gap-4 xl:grid-cols-4">
        {columns.map(column => {
          const columnItems = items.filter(item => item.columnId === column.id);

          return (
            <div
              key={column.id}
              className="flex min-h-[520px] flex-col rounded-[24px] border border-slate-200 bg-slate-50/80"
            >
              <div className="border-b border-slate-200 px-4 py-4">
                <div className="flex items-center gap-2">
                  <span className={cn('h-2.5 w-2.5 rounded-full', column.tone)} />
                  <h2 className="text-sm font-semibold text-slate-950">{column.title}</h2>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500">
                    {columnItems.length}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">{column.subtitle}</p>
              </div>

              <ScrollArea className="h-[560px] px-3 py-3">
                <div className="space-y-3 pr-3">
                  {columnItems.length > 0 ? (
                    columnItems.map(item => (
                      <AgenticCaseCard
                        key={item.caseItem.id}
                        item={item}
                      />
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                      Sin casos en esta etapa.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>
    </section>
  );
}
