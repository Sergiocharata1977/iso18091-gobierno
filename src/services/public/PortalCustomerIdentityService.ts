import { getAdminFirestore } from '@/lib/firebase/admin';
import { ClienteCRMServiceAdmin } from '@/services/crm/ClienteCRMServiceAdmin';
import { ContactoCRMService } from '@/services/crm/ContactoCRMService';
import type {
  PortalCustomerIdentity,
  PortalCustomerIdentityFilters,
  PortalCustomerIdentityPrincipalType,
  PortalCustomerIdentityStatus,
  PortalCustomerIdentityUpsertInput,
  PortalCustomerScope,
} from '@/types/portal-customer-identity';

const COLLECTION = 'portal_customer_identities';
const DEFAULT_STATUS: PortalCustomerIdentityStatus = 'active';
const DEFAULT_PRINCIPAL_TYPE: PortalCustomerIdentityPrincipalType =
  'external_customer';

function normalizeScopes(value: unknown): PortalCustomerScope[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (scope): scope is PortalCustomerScope => typeof scope === 'string'
  );
}

function normalizeIdentity(
  id: string,
  data: FirebaseFirestore.DocumentData
): PortalCustomerIdentity {
  return {
    id,
    principal_type:
      data.principal_type === 'external_customer'
        ? data.principal_type
        : DEFAULT_PRINCIPAL_TYPE,
    firebase_uid: String(data.firebase_uid || ''),
    organization_id: String(data.organization_id || ''),
    crm_organizacion_id: String(data.crm_organizacion_id || ''),
    crm_contacto_id:
      typeof data.crm_contacto_id === 'string' ? data.crm_contacto_id : null,
    auth_email: typeof data.auth_email === 'string' ? data.auth_email : null,
    display_name:
      typeof data.display_name === 'string' ? data.display_name : null,
    allowed_scopes: normalizeScopes(data.allowed_scopes),
    status: data.status === 'suspended' ? 'suspended' : DEFAULT_STATUS,
    isActive: data.isActive !== false,
    linked_at: String(data.linked_at || data.created_at || ''),
    last_login_at:
      typeof data.last_login_at === 'string' ? data.last_login_at : null,
    created_at: String(data.created_at || ''),
    updated_at: String(data.updated_at || ''),
  };
}

async function validateReferences(
  input: PortalCustomerIdentityUpsertInput
): Promise<void> {
  if (!input.crm_organizacion_id) {
    return; // CRM is optional — skip reference validation
  }

  const crmCliente = await ClienteCRMServiceAdmin.getById(input.crm_organizacion_id);
  if (!crmCliente || crmCliente.organization_id !== input.organization_id) {
    throw new Error(
      'crm_organizacion_id no corresponde a un cliente CRM del tenant indicado'
    );
  }

  if (!input.crm_contacto_id) {
    return;
  }

  const crmContacto = await ContactoCRMService.getById(input.crm_contacto_id);
  if (
    !crmContacto ||
    crmContacto.organization_id !== input.organization_id ||
    crmContacto.crm_organizacion_id !== input.crm_organizacion_id
  ) {
    throw new Error(
      'crm_contacto_id no corresponde a un contacto del cliente CRM indicado'
    );
  }
}

export class PortalCustomerIdentityService {
  static normalize(
    id: string,
    data: FirebaseFirestore.DocumentData
  ): PortalCustomerIdentity {
    return normalizeIdentity(id, data);
  }

  static async getById(id: string): Promise<PortalCustomerIdentity | null> {
    const db = getAdminFirestore();
    const doc = await db.collection(COLLECTION).doc(id).get();

    if (!doc.exists) {
      return null;
    }

    return normalizeIdentity(doc.id, doc.data() || {});
  }

  static async findOne(
    filters: PortalCustomerIdentityFilters
  ): Promise<PortalCustomerIdentity | null> {
    const db = getAdminFirestore();
    let query: FirebaseFirestore.Query = db
      .collection(COLLECTION)
      .where('organization_id', '==', filters.organization_id);

    if (filters.crm_organizacion_id) {
      query = query.where(
        'crm_organizacion_id',
        '==',
        filters.crm_organizacion_id
      );
    }

    if (filters.firebase_uid) {
      query = query.where('firebase_uid', '==', filters.firebase_uid);
    }

    if (typeof filters.isActive === 'boolean') {
      query = query.where('isActive', '==', filters.isActive);
    }

    const snapshot = await query.limit(1).get();
    if (snapshot.empty) {
      return null;
    }

    return normalizeIdentity(snapshot.docs[0].id, snapshot.docs[0].data());
  }

  static async listByCliente(
    organizationId: string,
    crmOrganizacionId: string
  ): Promise<PortalCustomerIdentity[]> {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection(COLLECTION)
      .where('organization_id', '==', organizationId)
      .where('crm_organizacion_id', '==', crmOrganizacionId)
      .where('isActive', '==', true)
      .get();

    return snapshot.docs.map(doc => normalizeIdentity(doc.id, doc.data()));
  }

  static async upsert(
    input: PortalCustomerIdentityUpsertInput
  ): Promise<PortalCustomerIdentity> {
    await validateReferences(input);

    const db = getAdminFirestore();
    const now = new Date().toISOString();
    const existing = await this.findOne({
      organization_id: input.organization_id,
      firebase_uid: input.firebase_uid,
    });

    const payload = {
      principal_type: DEFAULT_PRINCIPAL_TYPE,
      firebase_uid: input.firebase_uid,
      organization_id: input.organization_id,
      crm_organizacion_id: input.crm_organizacion_id,
      crm_contacto_id: input.crm_contacto_id ?? null,
      auth_email: input.auth_email ?? null,
      display_name: input.display_name ?? null,
      allowed_scopes: Array.from(new Set(input.allowed_scopes)),
      status: input.status ?? DEFAULT_STATUS,
      isActive: input.isActive ?? true,
      updated_at: now,
    };

    if (existing) {
      await db.collection(COLLECTION).doc(existing.id).update(payload);
      return {
        ...existing,
        ...payload,
      };
    }

    const created = {
      ...payload,
      linked_at: now,
      created_at: now,
      last_login_at: null,
    };

    const docRef = await db.collection(COLLECTION).add(created);
    return normalizeIdentity(docRef.id, created);
  }

  static async touchLastLogin(id: string): Promise<void> {
    const db = getAdminFirestore();
    await db.collection(COLLECTION).doc(id).update({
      last_login_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  static async deactivate(id: string): Promise<void> {
    const db = getAdminFirestore();
    const now = new Date().toISOString();
    await db.collection(COLLECTION).doc(id).update({
      isActive: false,
      updated_at: now,
    });
  }
}
