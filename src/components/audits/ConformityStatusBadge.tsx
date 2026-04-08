import type { ConformityStatus } from '@/types/audits';
import {
  CONFORMITY_STATUS_COLORS,
  CONFORMITY_STATUS_LABELS,
  getConformityStatusIcon,
} from '@/types/audits';

interface ConformityStatusBadgeProps {
  status: ConformityStatus;
  showIcon?: boolean;
}

export function ConformityStatusBadge({
  status,
  showIcon = true,
}: ConformityStatusBadgeProps) {
  if (!status) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        No verificado
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${CONFORMITY_STATUS_COLORS[status]}`}
    >
      {showIcon && <span>{getConformityStatusIcon(status)}</span>}
      <span>{CONFORMITY_STATUS_LABELS[status]}</span>
    </span>
  );
}
