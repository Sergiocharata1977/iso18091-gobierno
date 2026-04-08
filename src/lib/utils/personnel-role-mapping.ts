import type { UserRole } from '@/types/auth';

export type TipoPersonalCanonical =
  | 'administrativo'
  | 'ventas'
  | 'técnico'
  | 'supervisor'
  | 'gerencial';

const LEGACY_TIPO_PERSONAL_MAP: Record<string, TipoPersonalCanonical> = {
  administrativo: 'administrativo',
  Administrador: 'gerencial',
  administrativo_: 'administrativo',
  ventas: 'ventas',
  Ventas: 'ventas',
  tecnico: 'técnico',
  Técnico: 'técnico',
  tecnico_: 'técnico',
  técnico: 'técnico',
  supervisor: 'supervisor',
  Supervisor: 'supervisor',
  jefe: 'supervisor',
  Jefe: 'supervisor',
  gerencial: 'gerencial',
  Gerencial: 'gerencial',
  gerente: 'gerencial',
  Gerente: 'gerencial',
  directivo: 'gerencial',
  Directivo: 'gerencial',
  operativo: 'técnico',
  Operativo: 'técnico',
  operario: 'técnico',
  Operario: 'técnico',
};

export function normalizeTipoPersonal(
  value?: string | null
): TipoPersonalCanonical {
  if (!value) return 'administrativo';

  const trimmed = value.trim();
  const directMatch = LEGACY_TIPO_PERSONAL_MAP[trimmed];
  if (directMatch) return directMatch;

  const normalizedKey = trimmed
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (normalizedKey === 'tecnico') return 'técnico';
  if (normalizedKey === 'gerencial' || normalizedKey === 'gerente') {
    return 'gerencial';
  }
  if (normalizedKey === 'supervisor' || normalizedKey === 'jefe') {
    return 'supervisor';
  }
  if (normalizedKey === 'operativo' || normalizedKey === 'operario') {
    return 'técnico';
  }
  if (normalizedKey === 'directivo') return 'gerencial';
  if (normalizedKey === 'administrativo') return 'administrativo';
  if (normalizedKey === 'ventas') return 'ventas';

  return 'administrativo';
}

export function roleToTipoPersonal(
  role?: string | null
): TipoPersonalCanonical {
  switch (role) {
    case 'admin':
    case 'gerente':
    case 'super_admin':
      return 'gerencial';
    case 'jefe':
      return 'supervisor';
    case 'operario':
    case 'auditor':
    default:
      return 'técnico';
  }
}

export function tipoPersonalToUserRole(tipoPersonal?: string | null): UserRole {
  switch (normalizeTipoPersonal(tipoPersonal)) {
    case 'gerencial':
      return 'gerente';
    case 'supervisor':
    case 'administrativo':
      return 'jefe';
    case 'ventas':
    case 'técnico':
    default:
      return 'operario';
  }
}

export function getTipoPersonalRoleHint(tipoPersonal?: string | null): string {
  switch (normalizeTipoPersonal(tipoPersonal)) {
    case 'gerencial':
      return 'Administrador / Gerente';
    case 'supervisor':
    case 'administrativo':
      return 'Jefe';
    case 'ventas':
    case 'técnico':
    default:
      return 'Operario';
  }
}
