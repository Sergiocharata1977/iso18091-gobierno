import { getAdminAuth } from '@/lib/firebase/admin';
import { resolvePublicOrgId } from '@/lib/public/resolveTenantOrg';
import { PortalCustomerIdentityService } from '@/services/public/PortalCustomerIdentityService';
import { ClienteCRMServiceAdmin } from '@/services/crm/ClienteCRMServiceAdmin';
import { ContactoCRMService } from '@/services/crm/ContactoCRMService';
import type {
  PortalCustomerIdentity,
  PortalCustomerScope,
  ResolvedPortalCustomerIdentity,
} from '@/types/portal-customer-identity';
import { NextRequest } from 'next/server';

export class PortalCustomerIdentityError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code = 'PORTAL_IDENTITY_ERROR') {
    super(message);
    this.name = 'PortalCustomerIdentityError';
    this.status = status;
    this.code = code;
  }
}

export function portalIdentityHasScope(
  identity: PortalCustomerIdentity,
  scope: PortalCustomerScope
): boolean {
  return identity.allowed_scopes.includes(scope);
}

export async function resolvePortalCustomerIdentity(
  request: NextRequest,
  requiredScope?: PortalCustomerScope
): Promise<ResolvedPortalCustomerIdentity> {
  const authHeader =
    request.headers.get('authorization') || request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : null;

  if (!token) {
    throw new PortalCustomerIdentityError('No autorizado', 401, 'UNAUTHORIZED');
  }

  let decodedToken: { uid: string; email?: string };
  try {
    decodedToken = (await getAdminAuth().verifyIdToken(token)) as {
      uid: string;
      email?: string;
    };
  } catch {
    throw new PortalCustomerIdentityError(
      'Token invalido o expirado',
      401,
      'INVALID_TOKEN'
    );
  }

  const organizationId = await resolvePublicOrgId(request);
  if (!organizationId) {
    throw new PortalCustomerIdentityError(
      'Organizacion publica no resuelta',
      404,
      'ORG_NOT_FOUND'
    );
  }

  const identity = await PortalCustomerIdentityService.findOne({
    organization_id: organizationId,
    firebase_uid: decodedToken.uid,
    isActive: true,
  });

  if (!identity) {
    throw new PortalCustomerIdentityError(
      'El usuario autenticado no esta vinculado a un cliente CRM de este tenant',
      403,
      'PORTAL_LINK_REQUIRED'
    );
  }

  if (identity.status !== 'active') {
    throw new PortalCustomerIdentityError(
      'La identidad portal-cliente esta suspendida',
      403,
      'PORTAL_IDENTITY_SUSPENDED'
    );
  }

  if (requiredScope && !portalIdentityHasScope(identity, requiredScope)) {
    throw new PortalCustomerIdentityError(
      `La identidad portal-cliente no tiene acceso a ${requiredScope}`,
      403,
      'PORTAL_SCOPE_DENIED'
    );
  }

  if (!identity.crm_organizacion_id) {
    throw new PortalCustomerIdentityError(
      'La identidad portal-cliente no tiene un cliente CRM vinculado',
      409,
      'PORTAL_CLIENT_INVALID'
    );
  }

  const crmCliente = await ClienteCRMServiceAdmin.getById(
    identity.crm_organizacion_id
  );
  if (!crmCliente || crmCliente.organization_id !== organizationId) {
    throw new PortalCustomerIdentityError(
      'La vinculacion portal-cliente apunta a un cliente CRM invalido',
      409,
      'PORTAL_CLIENT_INVALID'
    );
  }

  const crmContacto = identity.crm_contacto_id
    ? await ContactoCRMService.getById(identity.crm_contacto_id)
    : null;

  if (
    crmContacto &&
    (crmContacto.organization_id !== organizationId ||
      crmContacto.crm_organizacion_id !== identity.crm_organizacion_id)
  ) {
    throw new PortalCustomerIdentityError(
      'La vinculacion portal-cliente apunta a un contacto CRM invalido',
      409,
      'PORTAL_CONTACT_INVALID'
    );
  }

  await PortalCustomerIdentityService.touchLastLogin(identity.id);

  return {
    auth: {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
    },
    organization_id: organizationId,
    identity,
    crm_cliente: crmCliente,
    crm_contacto: crmContacto,
  };
}
