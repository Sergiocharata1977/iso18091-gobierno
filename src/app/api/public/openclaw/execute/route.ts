import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  confirmAndExecute,
  createConfirmationPrompt,
  createPendingConfirmation,
} from '@/lib/openclaw/confirmationStore';
import {
  getOpenClawTenantConfig,
  isOpenClawSkillEnabled,
} from '@/lib/openclaw/tenantConfig';
import { executeReadSkill } from '@/lib/openclaw/skillExecutor';
import { OPENCLAW_SKILL_REGISTRY } from '@/lib/openclaw/skillRegistry';
import { getTenantConfigByApiKey } from '@/lib/portal/tenantConfig';
import { CapabilityService } from '@/services/plugins/CapabilityService';
import type { OpenClawSkillManifest } from '@/types/openclaw';
import { Timestamp } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const ExecuteBodySchema = z.object({
  skill_id: z.string().min(1, 'skill_id es requerido'),
  tenant_key: z.string().min(1, 'tenant_key es requerido'),
  user_id: z.string().min(1).optional(),
  params: z.record(z.string(), z.unknown()).default({}),
  confirmation_token: z.string().min(1).optional(),
});

function validateParamsAgainstManifest(
  manifest: OpenClawSkillManifest,
  params: Record<string, unknown>
): string | null {
  for (const [key, definition] of Object.entries(manifest.params_schema)) {
    const value = params[key];

    if (definition.required && (value === undefined || value === null)) {
      return `Falta el parametro requerido "${key}"`;
    }

    if (value === undefined || value === null) {
      continue;
    }

    const valid =
      (definition.type === 'string' && typeof value === 'string') ||
      (definition.type === 'number' &&
        typeof value === 'number' &&
        Number.isFinite(value)) ||
      (definition.type === 'boolean' && typeof value === 'boolean');

    if (!valid) {
      return `El parametro "${key}" debe ser de tipo ${definition.type}`;
    }
  }

  return null;
}

async function logOpenClawAudit(params: {
  orgId: string;
  skillId: string;
  userId?: string;
  mode: 'read' | 'write';
}): Promise<void> {
  const db = getAdminFirestore();

  await db
    .collection('organizations')
    .doc(params.orgId)
    .collection('openclaw_audit_log')
    .add({
      org_id: params.orgId,
      skill_id: params.skillId,
      user_id: params.userId ?? null,
      executed_at: Timestamp.now(),
      mode: params.mode,
    });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsedBody = ExecuteBodySchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Body invalido',
          details: parsedBody.error.issues,
        },
        { status: 400 }
      );
    }

    const { skill_id, tenant_key, user_id, params, confirmation_token } =
      parsedBody.data;
    const tenantConfig = await getTenantConfigByApiKey(tenant_key);

    if (!tenantConfig?.orgId) {
      return NextResponse.json(
        { success: false, error: 'tenant_key invalido' },
        { status: 404 }
      );
    }

    const skill = OPENCLAW_SKILL_REGISTRY.find(
      entry => entry.skill_id === skill_id
    );

    if (!skill) {
      return NextResponse.json(
        { success: false, error: 'Skill no encontrada' },
        { status: 404 }
      );
    }

    if (skill.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Skill no disponible' },
        { status: 403 }
      );
    }

    const paramsValidationError = validateParamsAgainstManifest(skill, params);
    if (paramsValidationError) {
      return NextResponse.json(
        { success: false, error: paramsValidationError },
        { status: 400 }
      );
    }

    const [capabilityEnabled, openClawConfig] = await Promise.all([
      CapabilityService.isCapabilityEnabled(
        tenantConfig.orgId,
        skill.capability_required
      ),
      getOpenClawTenantConfig(tenantConfig.orgId),
    ]);

    if (!capabilityEnabled) {
      return NextResponse.json(
        {
          success: false,
          error: `La capability requerida no esta activa: ${skill.capability_required}`,
        },
        { status: 403 }
      );
    }

    if (!isOpenClawSkillEnabled(openClawConfig, skill.skill_id)) {
      return NextResponse.json(
        {
          success: false,
          error: `La skill no esta habilitada para este tenant: ${skill.skill_id}`,
        },
        { status: 403 }
      );
    }

    if (skill.mode === 'write') {
      if (!confirmation_token) {
        const confirmationId = await createPendingConfirmation(
          skill,
          tenant_key,
          tenantConfig.orgId,
          params
        );

        return NextResponse.json(
          {
            success: true,
            skill_id: skill.skill_id,
            requires_confirmation: true,
            confirmation_token: confirmationId,
            confirmation_prompt: createConfirmationPrompt(skill, params),
            message: 'La accion requiere una segunda confirmacion explicita.',
          },
          { status: 202 }
        );
      }

      const result = await confirmAndExecute(
        confirmation_token,
        tenant_key,
        skill.skill_id
      );
      const status =
        result.error === 'confirmation_expired'
          ? 410
          : result.error === 'confirmation_not_found'
            ? 404
            : result.error === 'confirmation_tenant_mismatch'
              ? 403
              : result.error === 'confirmation_skill_mismatch'
                ? 409
              : result.error === 'confirmation_already_used'
                ? 409
                : result.success
                  ? 200
                  : 400;

      if (result.success) {
        await logOpenClawAudit({
          orgId: tenantConfig.orgId,
          skillId: skill.skill_id,
          userId: user_id,
          mode: 'write',
        });
      }

      return NextResponse.json(result, { status });
    }

    const result = await executeReadSkill(skill, params, tenantConfig.orgId);
    await logOpenClawAudit({
      orgId: tenantConfig.orgId,
      skillId: skill.skill_id,
      userId: user_id,
      mode: 'read',
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[public/openclaw/execute][POST] Error:', error);

    const message = error instanceof Error ? error.message : 'Error interno';
    const status = /not implemented yet/i.test(message) ? 501 : 500;

    return NextResponse.json(
      {
        success: false,
        error:
          status === 501
            ? 'La skill existe pero todavia no esta implementada en este endpoint'
            : 'No se pudo ejecutar la skill',
        details: message,
      },
      { status }
    );
  }
}
