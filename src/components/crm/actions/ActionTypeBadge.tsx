import { Badge } from '@/components/ui/badge';
import { CRMAccionTipo } from '@/types/crmAcciones';
import {
  Calendar,
  CheckSquare,
  FileText,
  Mail,
  MessageCircle,
  Phone,
  Radio,
  RefreshCw,
  Users,
} from 'lucide-react';

interface ActionTypeBadgeProps {
  tipo: CRMAccionTipo;
  className?: string;
  showLabel?: boolean;
}

const actionConfig: Record<
  CRMAccionTipo,
  { label: string; icon: any; color: string; bg: string }
> = {
  llamada: {
    label: 'Llamada',
    icon: Phone,
    color: 'text-blue-600',
    bg: 'bg-blue-100',
  },
  mail: {
    label: 'Mail',
    icon: Mail,
    color: 'text-gray-600',
    bg: 'bg-gray-100',
  },
  visita: {
    label: 'Visita',
    icon: Radio,
    color: 'text-green-600',
    bg: 'bg-green-100',
  },
  whatsapp: {
    label: 'WhatsApp',
    icon: MessageCircle,
    color: 'text-green-600',
    bg: 'bg-green-100',
  },
  reunion: {
    label: 'Reunión',
    icon: Users,
    color: 'text-purple-600',
    bg: 'bg-purple-100',
  },
  cotizacion: {
    label: 'Cotización',
    icon: FileText,
    color: 'text-orange-600',
    bg: 'bg-orange-100',
  },
  seguimiento: {
    label: 'Seguimiento',
    icon: RefreshCw,
    color: 'text-cyan-600',
    bg: 'bg-cyan-100',
  },
  tarea: {
    label: 'Tarea',
    icon: CheckSquare,
    color: 'text-indigo-600',
    bg: 'bg-indigo-100',
  },
  otro: {
    label: 'Otro',
    icon: Calendar,
    color: 'text-gray-500',
    bg: 'bg-gray-100',
  },
};

export function ActionTypeBadge({
  tipo,
  className = '',
  showLabel = true,
}: ActionTypeBadgeProps) {
  const config = actionConfig[tipo] || actionConfig.otro;
  const Icon = config.icon;

  if (!showLabel) {
    return (
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center ${config.bg} ${className}`}
        title={config.label}
      >
        <Icon className={`w-4 h-4 ${config.color}`} />
      </div>
    );
  }

  return (
    <Badge
      variant="secondary"
      className={`${config.bg} ${config.color} hover:${config.bg} border-0 gap-1.5 py-1 ${className}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </Badge>
  );
}
