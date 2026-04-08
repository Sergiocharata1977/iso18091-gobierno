'use client';

import { useState } from 'react';
import { GripVertical, Plus } from 'lucide-react';
import type { CustomRegisterSchema, CustomRegisterEntry, RegisterStage } from '@/types/registers';

// module-level drag state
let draggingId: string | null = null;

const STAGE_COLORS: Record<string, { header: string; dot: string }> = {
  '#22c55e': { header: 'bg-green-900/30 border-green-700/50',   dot: 'bg-green-500' },
  '#3b82f6': { header: 'bg-blue-900/30 border-blue-700/50',    dot: 'bg-blue-500' },
  '#8b5cf6': { header: 'bg-violet-900/30 border-violet-700/50', dot: 'bg-violet-500' },
  '#f59e0b': { header: 'bg-amber-900/30 border-amber-700/50',  dot: 'bg-amber-500' },
  '#ef4444': { header: 'bg-rose-900/30 border-rose-700/50',    dot: 'bg-rose-500' },
  '#06b6d4': { header: 'bg-cyan-900/30 border-cyan-700/50',    dot: 'bg-cyan-500' },
  '#6b7280': { header: 'bg-slate-800/60 border-slate-700',     dot: 'bg-slate-400' },
};

function getStageColor(color: string) {
  return STAGE_COLORS[color] ?? { header: 'bg-slate-800/60 border-slate-700', dot: 'bg-slate-400' };
}

interface RegisterKanbanProps {
  schema: CustomRegisterSchema;
  entries: CustomRegisterEntry[];
  onMoveEntry: (entryId: string, stageId: string) => Promise<void>;
  onNewEntry: (stageId: string) => void;
  onEntryClick: (entry: CustomRegisterEntry) => void;
}

export function RegisterKanban({
  schema,
  entries,
  onMoveEntry,
  onNewEntry,
  onEntryClick,
}: RegisterKanbanProps) {
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  const stages = [...schema.stages].sort((a, b) => a.order - b.order);

  const entriesByStage = stages.reduce<Record<string, CustomRegisterEntry[]>>((acc, stage) => {
    acc[stage.id] = entries.filter(e => e.stage_id === stage.id);
    return acc;
  }, {});

  const handleDrop = async (stageId: string) => {
    if (!draggingId || movingId) return;
    const entry = entries.find(e => e.id === draggingId);
    if (!entry || entry.stage_id === stageId) {
      draggingId = null;
      setDragOverStage(null);
      return;
    }
    // check if target stage is locked
    const targetStage = schema.stages.find(s => s.id === stageId);
    if (targetStage?.locked) {
      alert(`La etapa "${targetStage.label}" está bloqueada.`);
      draggingId = null;
      setDragOverStage(null);
      return;
    }
    setMovingId(draggingId);
    try {
      await onMoveEntry(draggingId, stageId);
    } finally {
      draggingId = null;
      setMovingId(null);
      setDragOverStage(null);
    }
  };

  // render the visible fields of a card
  const getCardFields = (entry: CustomRegisterEntry) => {
    const visibleFields = schema.fields
      .filter(f => f.visible_in_kanban !== false)
      .slice(0, 3);
    return visibleFields.map(field => ({
      label: field.label,
      value: String(entry.data[field.id] ?? ''),
    })).filter(f => f.value);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {stages.map(stage => {
        const { header, dot } = getStageColor(stage.color);
        const stageEntries = entriesByStage[stage.id] ?? [];
        const isOver = dragOverStage === stage.id;

        return (
          <div
            key={stage.id}
            className={`flex w-72 shrink-0 flex-col rounded-2xl border transition-colors ${header} ${isOver ? 'ring-2 ring-emerald-500/50' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOverStage(stage.id); }}
            onDragLeave={() => setDragOverStage(null)}
            onDrop={() => void handleDrop(stage.id)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                <span className="text-sm font-semibold text-slate-100">{stage.label}</span>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                  {stageEntries.length}
                </span>
              </div>
              {!stage.locked && (
                <button
                  onClick={() => onNewEntry(stage.id)}
                  className="rounded-lg p-1 text-slate-500 hover:bg-slate-700 hover:text-slate-200 transition"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2 px-3 pb-3 min-h-[120px]">
              {stageEntries.map(entry => {
                const cardFields = getCardFields(entry);
                const isMoving = movingId === entry.id;
                return (
                  <div
                    key={entry.id}
                    draggable={!stage.locked}
                    onDragStart={e => {
                      draggingId = entry.id;
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragEnd={() => { draggingId = null; setDragOverStage(null); }}
                    onClick={() => onEntryClick(entry)}
                    className={`cursor-pointer rounded-xl border border-slate-700 bg-slate-800/80 p-3 transition hover:border-slate-500 hover:bg-slate-800 ${isMoving ? 'opacity-40' : ''}`}
                  >
                    <div className="flex items-start gap-2">
                      {!stage.locked && (
                        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-slate-600 cursor-grab" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-100 truncate">
                          {entry.title || `Entrada #${entry.id.slice(-6)}`}
                        </p>
                        {cardFields.map(f => (
                          <p key={f.label} className="mt-0.5 text-xs text-slate-400 truncate">
                            <span className="text-slate-500">{f.label}:</span> {f.value}
                          </p>
                        ))}
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-slate-600">
                      {new Date(entry.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                    </div>
                  </div>
                );
              })}

              {stageEntries.length === 0 && (
                <div className="flex h-16 items-center justify-center rounded-xl border border-dashed border-slate-700 text-xs text-slate-600">
                  Sin entradas
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
