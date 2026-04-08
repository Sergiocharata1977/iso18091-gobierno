'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  RefreshCw,
  Settings,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MiPanelHeaderProps {
  fullName: string;
  position?: string | null;
  department?: string | null;
  avatarUrl?: string | null;
  role?: string | null;
  organizationLabel?: string | null;
  overdueRecords: number;
  canEdit: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onConfigure: () => void;
  actions?: ReactNode;
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('');
}

export function MiPanelHeader({
  fullName,
  position,
  department,
  avatarUrl,
  role,
  organizationLabel,
  overdueRecords,
  canEdit,
  refreshing,
  onRefresh,
  onConfigure,
  actions,
}: MiPanelHeaderProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <header className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-5 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 min-w-0">
            {/* Foto del personal grande */}
            <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-4 border-slate-50 shadow-md">
              <AvatarImage
                src={avatarUrl || ''}
                alt={fullName}
                className="object-cover"
              />
              <AvatarFallback className="bg-slate-100 text-slate-400 text-2xl font-bold">
                {initials(fullName || 'Usuario')}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 text-center sm:text-left mt-2 sm:mt-0 flex-1">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight truncate">
                {fullName}
              </h1>
              <p className="text-base text-slate-600 font-medium truncate mt-1">
                {position || 'Sin puesto asignado'}
              </p>

              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors focus:outline-none"
              >
                {isExpanded
                  ? 'Ocultar información detallada'
                  : 'Ver información detallada'}
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {/* Contenido desplegable con animación */}
              <div
                className={cn(
                  'grid transition-all duration-300 ease-in-out mt-3',
                  isExpanded
                    ? 'grid-rows-[1fr] opacity-100'
                    : 'grid-rows-[0fr] opacity-0'
                )}
              >
                <div className="overflow-hidden">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 pb-2">
                    <Badge
                      variant="outline"
                      className="border-slate-300 bg-slate-50 text-slate-600"
                    >
                      Dep: {department || 'No asignado'}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-slate-300 bg-slate-50 text-slate-600"
                    >
                      Rol: {role || 'No definido'}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-slate-300 bg-slate-50 text-slate-600"
                    >
                      Org: {organizationLabel || 'Global'}
                    </Badge>
                  </div>
                  {overdueRecords > 0 && (
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 shadow-sm mt-1">
                      <AlertTriangle className="h-4 w-4" />
                      <span>
                        {overdueRecords} registros vencidos requieren tu
                        atención
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 shrink-0 md:pt-2">
            {actions}
            <Button
              type="button"
              variant="outline"
              onClick={onRefresh}
              disabled={refreshing}
              className="gap-2 rounded-xl text-slate-600 border-slate-200 hover:bg-slate-50"
            >
              <RefreshCw
                className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'}
              />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>
            {canEdit ? (
              <Button
                type="button"
                variant="outline"
                onClick={onConfigure}
                className="gap-2 rounded-xl text-slate-600 border-slate-200 hover:bg-slate-50"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Configurar</span>
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
