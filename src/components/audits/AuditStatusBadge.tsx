import type { AuditStatus } from '@/types/audits';
import { AUDIT_STATUS_COLORS, AUDIT_STATUS_LABELS } from '@/types/audits';

interface AuditStatusBadgeProps {
  status: AuditStatus;
}

export function AuditStatusBadge({ status }: AuditStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${AUDIT_STATUS_COLORS[status]}`}
    >
      {AUDIT_STATUS_LABELS[status]}
    </span>
  );
}
