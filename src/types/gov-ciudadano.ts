import { z } from 'zod';

export type EstadoCiudadano = 'activo' | 'inactivo' | 'bloqueado';

export interface GovCiudadano {
  id: string;
  organization_id: string;
  nombre: string;
  apellido: string;
  dni: string;
  email?: string;
  telefono?: string;
  domicilio?: string;
  estado: EstadoCiudadano;
  created_at: string;
  updated_at: string;
}

export const GovCiudadanoCreateSchema = z.object({
  nombre: z.string().min(2),
  apellido: z.string().min(2),
  dni: z.string().min(7).max(12),
  email: z.string().email().optional(),
  telefono: z.string().optional(),
  domicilio: z.string().optional(),
});

export const GovCiudadanoUpdateSchema = GovCiudadanoCreateSchema.partial().extend(
  {
    estado: z.enum(['activo', 'inactivo', 'bloqueado']).optional(),
  }
);

export type GovCiudadanoCreateInput = z.infer<typeof GovCiudadanoCreateSchema>;
export type GovCiudadanoUpdateInput = z.infer<typeof GovCiudadanoUpdateSchema>;
