'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { OpenClawSkillManifest } from '@/types/openclaw';

interface SkillCardProps {
  skill: OpenClawSkillManifest;
  enabled: boolean;
  disabled?: boolean;
  onToggle: (nextValue: boolean) => void;
}

export function SkillCard({
  skill,
  enabled,
  disabled = false,
  onToggle,
}: SkillCardProps) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="flex items-start justify-between gap-4 p-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">
              {skill.display_name}
            </h3>
            <Badge
              className={cn(
                'border',
                skill.mode === 'read'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-amber-200 bg-amber-50 text-amber-700'
              )}
            >
              {skill.mode === 'read' ? 'Read' : 'Write'}
            </Badge>
            <Badge variant="outline" className="border-slate-200 text-slate-600">
              {skill.skill_id}
            </Badge>
          </div>
          <p className="text-sm text-slate-600">{skill.description}</p>
          {skill.mode === 'write' ? (
            <p className="text-xs text-amber-700">
              Requiere confirmacion antes de ejecutar acciones de escritura.
            </p>
          ) : null}
        </div>

        <div className="flex min-w-[88px] flex-col items-end gap-2">
          <Switch
            checked={enabled}
            disabled={disabled}
            aria-label={`Toggle ${skill.display_name}`}
            onCheckedChange={onToggle}
          />
          <span className="text-xs text-slate-500">
            {enabled ? 'Activa' : 'Inactiva'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
