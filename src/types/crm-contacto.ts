// src/types/crm-contacto.ts
// Tipos para la colección crm_contactos

export interface ContactoCRM {
  id: string;
  organization_id: string;
  nombre: string;
  apellido?: string;
  email?: string;
  telefono: string; // Principal
  whatsapp?: string; // Número WhatsApp (puede ser igual a telefono)
  cargo?: string;
  empresa?: string;
  crm_organizacion_id?: string; // Relación con crm_organizaciones
  notas?: string;
  created_at: string;
  updated_at: string;
  isActive: boolean;
}

export interface CreateContactoCRMData {
  nombre: string;
  apellido?: string;
  email?: string;
  telefono: string;
  whatsapp?: string;
  cargo?: string;
  empresa?: string;
  crm_organizacion_id?: string;
  notas?: string;
}

export interface UpdateContactoCRMData {
  nombre?: string;
  apellido?: string;
  email?: string;
  telefono?: string;
  whatsapp?: string;
  cargo?: string;
  empresa?: string;
  crm_organizacion_id?: string;
  notas?: string;
}
