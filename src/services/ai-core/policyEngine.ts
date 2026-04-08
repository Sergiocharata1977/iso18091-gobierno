import type {
  PolicyCheckRequest,
  PolicyCheckResult,
} from '@/types/ai-security';

function normalizeText(text?: string): string {
  return (text || '').toLowerCase().trim();
}

export class AIPolicyEngine {
  static checkPermission(input: PolicyCheckRequest): PolicyCheckResult {
    const role = normalizeText(input.role);
    const content = normalizeText(input.inputText);

    if (!input.organizationId && role !== 'super_admin') {
      return {
        allowed: false,
        code: 'NO_ORG',
        reason: 'Usuario sin organizacion asignada',
      };
    }

    // OLA 1.5 minimal rule: prevent approval actions for non-elevated roles.
    const asksApproveDocument =
      /aprob(ar|ame|a)?/.test(content) && /document/.test(content);
    const asksDeleteProcess =
      /(borr|elimin)/.test(content) && /proceso/.test(content);

    const elevated = ['admin', 'gerente', 'jefe', 'super_admin'].includes(role);
    if ((asksApproveDocument || asksDeleteProcess) && !elevated) {
      return {
        allowed: false,
        code: 'FORBIDDEN_ACTION',
        reason:
          'No tienes permisos para aprobar documentos o eliminar procesos desde la IA.',
      };
    }

    return { allowed: true };
  }
}
