import type {
  CreateSGSIAssetRequest,
  CreateSGSIControlRequest,
  CreateSGSIRiskRequest,
  SGSIAsset,
  SGSIControl,
  SGSIIncident,
  SGSIRisk,
  SGSIRiskLevel,
} from '@/types/sgsi';
import { Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';

export const SGSI_COLLECTIONS = {
  assets: 'sgsi_assets',
  risks: 'sgsi_risks',
  controls: 'sgsi_controls',
  incidents: 'sgsi_incidents',
} as const;

export const sgsiAssetSchema = z.object({
  nombre: z.string().trim().min(2).max(160),
  descripcion: z.string().trim().max(800).optional(),
  tipo: z.enum([
    'informacion',
    'software',
    'hardware',
    'servicio',
    'personas',
    'instalacion',
  ]),
  clasificacion: z.enum(['critico', 'alto', 'medio', 'bajo']),
  propietario_id: z.string().trim().min(1),
  ubicacion: z.string().trim().max(200).optional(),
  confidencialidad: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  integridad: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  disponibilidad: z.union([z.literal(1), z.literal(2), z.literal(3)]),
}) satisfies z.ZodType<CreateSGSIAssetRequest>;

export const sgsiRiskSchema = z.object({
  activo_id: z.string().trim().min(1),
  amenaza: z.string().trim().min(2).max(200),
  vulnerabilidad: z.string().trim().min(2).max(200),
  probabilidad: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  impacto: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  responsable_id: z.string().trim().min(1),
}) satisfies z.ZodType<CreateSGSIRiskRequest>;

export const sgsiControlSchema = z.object({
  codigo_anexo_a: z.string().trim().min(2).max(32),
  nombre: z.string().trim().min(2).max(160),
  descripcion: z.string().trim().min(4).max(1000),
  status: z.enum(['aplicable', 'no_aplicable']),
  implementacion: z.enum([
    'implementado',
    'parcial',
    'planificado',
    'no_aplica',
  ]),
  justificacion_exclusion: z.string().trim().max(400).optional(),
  evidencia: z.string().trim().max(400).optional(),
  responsable_id: z.string().trim().max(120).optional(),
  fecha_implementacion: z.string().trim().max(40).optional(),
}) satisfies z.ZodType<CreateSGSIControlRequest>;

function toIsoString(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in (value as Record<string, unknown>) &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    return ((value as { toDate: () => Date }).toDate()).toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  return undefined;
}

export function serializeSgsiAsset(
  id: string,
  data: Record<string, unknown>
): SGSIAsset {
  return {
    id,
    organization_id: String(data.organization_id || ''),
    nombre: String(data.nombre || ''),
    descripcion: typeof data.descripcion === 'string' ? data.descripcion : undefined,
    tipo: (data.tipo as SGSIAsset['tipo']) || 'informacion',
    clasificacion: (data.clasificacion as SGSIAsset['clasificacion']) || 'medio',
    propietario_id: String(data.propietario_id || ''),
    ubicacion: typeof data.ubicacion === 'string' ? data.ubicacion : undefined,
    confidencialidad: Number(data.confidencialidad || 1) as 1 | 2 | 3,
    integridad: Number(data.integridad || 1) as 1 | 2 | 3,
    disponibilidad: Number(data.disponibilidad || 1) as 1 | 2 | 3,
    valor_activo: Number(data.valor_activo || 3),
    activo: data.activo !== false,
    created_at: toIsoString(data.created_at) || new Date(0).toISOString(),
    updated_at: toIsoString(data.updated_at),
  };
}

export function serializeSgsiRisk(
  id: string,
  data: Record<string, unknown>
): SGSIRisk {
  return {
    id,
    organization_id: String(data.organization_id || ''),
    activo_id: String(data.activo_id || ''),
    amenaza: String(data.amenaza || ''),
    vulnerabilidad: String(data.vulnerabilidad || ''),
    probabilidad: Number(data.probabilidad || 1) as 1 | 2 | 3 | 4 | 5,
    impacto: Number(data.impacto || 1) as 1 | 2 | 3 | 4 | 5,
    nivel_riesgo_inherente: Number(data.nivel_riesgo_inherente || 1),
    nivel_riesgo_residual:
      data.nivel_riesgo_residual == null
        ? undefined
        : Number(data.nivel_riesgo_residual),
    nivel: (data.nivel as SGSIRiskLevel) || 'bajo',
    controles_aplicados: Array.isArray(data.controles_aplicados)
      ? data.controles_aplicados.map(String)
      : [],
    status: (data.status as SGSIRisk['status']) || 'identificado',
    responsable_id: String(data.responsable_id || ''),
    fecha_revision:
      typeof data.fecha_revision === 'string'
        ? data.fecha_revision
        : toIsoString(data.fecha_revision),
    created_at: toIsoString(data.created_at) || new Date(0).toISOString(),
    updated_at: toIsoString(data.updated_at),
  };
}

export function serializeSgsiControl(
  id: string,
  data: Record<string, unknown>
): SGSIControl {
  return {
    id,
    organization_id: String(data.organization_id || ''),
    codigo_anexo_a: String(data.codigo_anexo_a || ''),
    nombre: String(data.nombre || ''),
    descripcion: String(data.descripcion || ''),
    status: (data.status as SGSIControl['status']) || 'aplicable',
    implementacion:
      (data.implementacion as SGSIControl['implementacion']) || 'planificado',
    justificacion_exclusion:
      typeof data.justificacion_exclusion === 'string'
        ? data.justificacion_exclusion
        : undefined,
    evidencia: typeof data.evidencia === 'string' ? data.evidencia : undefined,
    responsable_id:
      typeof data.responsable_id === 'string' ? data.responsable_id : undefined,
    fecha_implementacion:
      typeof data.fecha_implementacion === 'string'
        ? data.fecha_implementacion
        : undefined,
    created_at: toIsoString(data.created_at) || new Date(0).toISOString(),
    updated_at: toIsoString(data.updated_at),
  };
}

export function serializeSgsiIncident(
  id: string,
  data: Record<string, unknown>
): SGSIIncident {
  return {
    id,
    organization_id: String(data.organization_id || ''),
    titulo: String(data.titulo || data.title || 'Incidente SGSI'),
    descripcion: String(data.descripcion || data.description || ''),
    severidad: (data.severidad as SGSIIncident['severidad']) || 'media',
    activos_afectados: Array.isArray(data.activos_afectados)
      ? data.activos_afectados.map(String)
      : [],
    fecha_deteccion:
      toIsoString(data.fecha_deteccion || data.detected_at) ||
      new Date(0).toISOString(),
    fecha_resolucion: toIsoString(data.fecha_resolucion || data.resolved_at),
    status: (data.status as SGSIIncident['status']) || 'abierto',
    responsable_id: String(data.responsable_id || data.assigned_to || ''),
    acciones_tomadas:
      typeof data.acciones_tomadas === 'string' ? data.acciones_tomadas : undefined,
    lecciones_aprendidas:
      typeof data.lecciones_aprendidas === 'string'
        ? data.lecciones_aprendidas
        : undefined,
    created_at: toIsoString(data.created_at) || new Date(0).toISOString(),
    updated_at: toIsoString(data.updated_at),
  };
}

export function deriveRiskLevel(score: number): SGSIRiskLevel {
  if (score >= 20) return 'critico';
  if (score >= 12) return 'alto';
  if (score >= 6) return 'medio';
  return 'bajo';
}
