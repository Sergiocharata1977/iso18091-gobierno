import { z } from 'zod';

export type ProveedorEstado =
  | 'pendiente_revision'
  | 'aprobado'
  | 'rechazado'
  | 'suspendido';

export type ProveedorRubro =
  | 'materias_primas'
  | 'servicios_profesionales'
  | 'tecnologia'
  | 'mantenimiento'
  | 'logistica'
  | 'otros';

export interface ProveedorRegistro {
  id: string;
  organization_id: string;
  razon_social: string;
  cuit: string;
  rubro: ProveedorRubro;
  contacto_nombre: string;
  contacto_email: string;
  contacto_telefono?: string;
  productos_servicios: string;
  certificaciones?: string;
  sitio_web?: string;
  estado: ProveedorEstado;
  created_at: string;
  updated_at: string;
}

export const ProveedorRegistroSchema = z.object({
  razon_social: z.string().min(2).max(200),
  cuit: z.string().regex(/^\d{2}-\d{8}-\d{1}$/, 'Formato: XX-XXXXXXXX-X'),
  rubro: z.enum([
    'materias_primas',
    'servicios_profesionales',
    'tecnologia',
    'mantenimiento',
    'logistica',
    'otros',
  ]),
  contacto_nombre: z.string().min(2).max(100),
  contacto_email: z.string().email(),
  contacto_telefono: z.string().optional(),
  productos_servicios: z.string().min(10).max(500),
  certificaciones: z.string().max(200).optional(),
  sitio_web: z.string().url().optional().or(z.literal('')),
});

export type CreateProveedorDTO = z.infer<typeof ProveedorRegistroSchema>;
