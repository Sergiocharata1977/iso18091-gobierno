import type { ClienteCRM } from '@/types/crm';
import type { ContactoCRM } from '@/types/crm-contacto';

export const PORTAL_CUSTOMER_SCOPES = [
  'profile',
  'solicitudes',
  'compras',
  'servicios',
  'mantenimientos',
  'maquinaria',
  'cuenta_corriente',
] as const;

export type PortalCustomerScope = (typeof PORTAL_CUSTOMER_SCOPES)[number];

export type PortalCustomerIdentityStatus = 'active' | 'suspended';

export type PortalCustomerIdentityPrincipalType = 'external_customer';

export interface PortalCustomerIdentity {
  id: string;
  principal_type: PortalCustomerIdentityPrincipalType;
  firebase_uid: string;
  organization_id: string;
  crm_organizacion_id?: string | null;
  crm_contacto_id?: string | null;
  auth_email?: string | null;
  display_name?: string | null;
  allowed_scopes: PortalCustomerScope[];
  status: PortalCustomerIdentityStatus;
  isActive: boolean;
  linked_at: string;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PortalCustomerIdentityUpsertInput {
  firebase_uid: string;
  organization_id: string;
  crm_organizacion_id?: string | null;
  crm_contacto_id?: string | null;
  auth_email?: string | null;
  display_name?: string | null;
  allowed_scopes: PortalCustomerScope[];
  status?: PortalCustomerIdentityStatus;
  isActive?: boolean;
}

export interface PortalCustomerIdentityFilters {
  organization_id: string;
  crm_organizacion_id?: string;
  firebase_uid?: string;
  isActive?: boolean;
}

export interface ResolvedPortalCustomerIdentity {
  auth: {
    uid: string;
    email: string | null;
  };
  organization_id: string;
  identity: PortalCustomerIdentity;
  crm_cliente: ClienteCRM;
  crm_contacto: ContactoCRM | null;
}
