import { getAdminFirestore } from '@/lib/firebase/admin';
import { executeWriteSkill } from '@/lib/openclaw/skillExecutor';
import { OPENCLAW_SKILL_REGISTRY } from '@/lib/openclaw/skillRegistry';
import type {
  OpenClawExecuteResponse,
  OpenClawSkillManifest,
} from '@/types/openclaw';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

const CONFIRMATION_COLLECTION = 'openclaw_pending_confirmations';
const CONFIRMATION_TTL_MS = 5 * 60 * 1000;

type PendingConfirmationStatus = 'pending' | 'confirmed' | 'expired';

interface PendingConfirmationRecord {
  skill_id: string;
  tenant_key: string;
  org_id: string;
  params: Record<string, unknown>;
  expires_at: Timestamp;
  status: PendingConfirmationStatus;
  confirmed_at?: Timestamp;
  created_at?: FieldValue;
  updated_at?: FieldValue;
}

function buildConfirmationPrompt(
  skill: OpenClawSkillManifest,
  params: Record<string, unknown>
): string {
  const entries = Object.entries(params).filter(
    ([, value]) => value !== null && value !== undefined && value !== ''
  );

  if (entries.length === 0) {
    return `Confirmas ejecutar la accion "${skill.display_name}"?`;
  }

  const formattedParams = entries
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(', ');

  return `Confirmas ejecutar la accion "${skill.display_name}" con ${formattedParams}?`;
}

export async function createPendingConfirmation(
  skill: OpenClawSkillManifest,
  tenantKey: string,
  orgId: string,
  params: Record<string, unknown>
): Promise<string> {
  const db = getAdminFirestore();
  const docRef = db.collection(CONFIRMATION_COLLECTION).doc();

  const record: PendingConfirmationRecord = {
    skill_id: skill.skill_id,
    tenant_key: tenantKey,
    org_id: orgId,
    params,
    expires_at: Timestamp.fromDate(new Date(Date.now() + CONFIRMATION_TTL_MS)),
    status: 'pending',
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  };

  await docRef.set(record);
  return docRef.id;
}

export async function confirmAndExecute(
  confirmationId: string,
  tenantKey: string,
  expectedSkillId?: string
): Promise<OpenClawExecuteResponse> {
  const db = getAdminFirestore();
  const docRef = db.collection(CONFIRMATION_COLLECTION).doc(confirmationId);
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    return {
      success: false,
      skill_id: '',
      error: 'confirmation_not_found',
      message: 'No existe una confirmacion pendiente para ese token.',
    };
  }

  const data = snapshot.data() as PendingConfirmationRecord | undefined;
  if (!data) {
    return {
      success: false,
      skill_id: '',
      error: 'confirmation_not_found',
      message: 'No existe una confirmacion pendiente para ese token.',
    };
  }

  if (data.tenant_key !== tenantKey) {
    return {
      success: false,
      skill_id: data.skill_id,
      error: 'confirmation_tenant_mismatch',
      message: 'El token de confirmacion no pertenece a este tenant.',
    };
  }

  if (expectedSkillId && data.skill_id !== expectedSkillId) {
    return {
      success: false,
      skill_id: data.skill_id,
      error: 'confirmation_skill_mismatch',
      message: 'El token de confirmacion no corresponde a la skill solicitada.',
    };
  }

  const expiresAt = data.expires_at?.toDate();
  const isExpired =
    data.status === 'expired' ||
    data.status === 'confirmed' ||
    !expiresAt ||
    expiresAt.getTime() <= Date.now();

  if (isExpired) {
    await docRef.set(
      {
        status: data.status === 'confirmed' ? 'confirmed' : 'expired',
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return {
      success: false,
      skill_id: data.skill_id,
      error:
        data.status === 'confirmed'
          ? 'confirmation_already_used'
          : 'confirmation_expired',
      message:
        data.status === 'confirmed'
          ? 'La confirmacion ya fue utilizada.'
          : 'La confirmacion expiro. Volve a iniciar la accion.',
    };
  }

  const skill = OPENCLAW_SKILL_REGISTRY.find(
    entry => entry.skill_id === data.skill_id
  );

  if (!skill) {
    return {
      success: false,
      skill_id: data.skill_id,
      error: 'skill_not_found',
      message: 'La skill asociada a esta confirmacion ya no existe.',
    };
  }

  await docRef.set(
    {
      status: 'confirmed',
      confirmed_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return executeWriteSkill(skill, data.params, data.org_id);
}

export function createConfirmationPrompt(
  skill: OpenClawSkillManifest,
  params: Record<string, unknown>
): string {
  return buildConfirmationPrompt(skill, params);
}
