'use client';

import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle, Circle, Clock, XCircle } from 'lucide-react';

type Status =
  | 'programado'
  | 'en_progreso'
  | 'completado'
  | 'cancelado'
  | 'vencido'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'overdue'
  | 'planned'
  | 'pending'
  | 'active'
  | 'closed';

interface StatusBadgeProps {
  status: Status | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    color: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  // Español
  programado: {
    label: 'Programado',
    color: 'bg-blue-100 text-blue-700',
    icon: Calendar,
  },
  en_progreso: {
    label: 'En Progreso',
    color: 'bg-yellow-100 text-yellow-700',
    icon: Clock,
  },
  completado: {
    label: 'Completado',
    color: 'bg-green-100 text-green-700',
    icon: CheckCircle,
  },
  cancelado: {
    label: 'Cancelado',
    color: 'bg-gray-100 text-gray-600',
    icon: XCircle,
  },
  vencido: {
    label: 'Vencido',
    color: 'bg-red-100 text-red-700',
    icon: XCircle,
  },

  // Inglés
  scheduled: {
    label: 'Programado',
    color: 'bg-blue-100 text-blue-700',
    icon: Calendar,
  },
  in_progress: {
    label: 'En Progreso',
    color: 'bg-yellow-100 text-yellow-700',
    icon: Clock,
  },
  completed: {
    label: 'Completado',
    color: 'bg-green-100 text-green-700',
    icon: CheckCircle,
  },
  cancelled: {
    label: 'Cancelado',
    color: 'bg-gray-100 text-gray-600',
    icon: XCircle,
  },
  overdue: {
    label: 'Vencido',
    color: 'bg-red-100 text-red-700',
    icon: XCircle,
  },

  // Otras variantes
  planned: {
    label: 'Planificado',
    color: 'bg-blue-100 text-blue-700',
    icon: Calendar,
  },
  pending: {
    label: 'Pendiente',
    color: 'bg-yellow-100 text-yellow-700',
    icon: Clock,
  },
  active: {
    label: 'Activo',
    color: 'bg-green-100 text-green-700',
    icon: CheckCircle,
  },
  closed: {
    label: 'Cerrado',
    color: 'bg-gray-100 text-gray-600',
    icon: Circle,
  },
};

export function StatusBadge({
  status,
  size = 'md',
  showIcon = true,
}: StatusBadgeProps) {
  const config = STATUS_CONFIG[status.toLowerCase()] || {
    label: status,
    color: 'bg-gray-100 text-gray-600',
    icon: Circle,
  };

  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <Badge
      variant="secondary"
      className={`${config.color} ${sizeClasses[size]} font-medium inline-flex items-center gap-1.5`}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </Badge>
  );
}
