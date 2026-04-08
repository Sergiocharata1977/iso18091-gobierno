'use client';

import { Badge } from '@/components/ui/badge';

interface ClasificacionBadgeProps {
  label: string;
  color?: string;
}

function getContrastColor(hexColor: string) {
  const normalized = hexColor.replace('#', '');

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return '#0f172a';
  }

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.65 ? '#0f172a' : '#ffffff';
}

export function ClasificacionBadge({
  label,
  color,
}: ClasificacionBadgeProps) {
  if (!color) {
    return <Badge variant="secondary">{label}</Badge>;
  }

  return (
    <Badge
      className="border-transparent"
      style={{
        backgroundColor: color,
        color: getContrastColor(color),
      }}
    >
      {label}
    </Badge>
  );
}
