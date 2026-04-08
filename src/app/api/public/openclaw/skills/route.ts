import { OPENCLAW_SKILL_REGISTRY } from '@/lib/openclaw/skillRegistry';
import { getTenantConfigByApiKey } from '@/lib/portal/tenantConfig';
import { CapabilityService } from '@/services/plugins/CapabilityService';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const tenantKey = request.nextUrl.searchParams.get('tenant_key')?.trim();

    if (!tenantKey) {
      return NextResponse.json(
        { success: false, error: 'tenant_key requerido' },
        { status: 400 }
      );
    }

    const tenantConfig = await getTenantConfigByApiKey(tenantKey);

    if (!tenantConfig?.orgId) {
      return NextResponse.json(
        { success: false, error: 'tenant_key invalido' },
        { status: 404 }
      );
    }

    const [installedCapabilities] = await Promise.all([
      CapabilityService.getInstalledCapabilities(tenantConfig.orgId),
    ]);

    const enabledCapabilities = new Set(
      installedCapabilities
        .filter(item => item.enabled)
        .map(item => item.capability_id)
    );

    const skills = OPENCLAW_SKILL_REGISTRY.filter(skill => {
      if (skill.status !== 'active') {
        return false;
      }

      return enabledCapabilities.has(skill.capability_required);
    });

    return NextResponse.json({
      success: true,
      data: skills,
    });
  } catch (error) {
    console.error('[public/openclaw/skills][GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'No se pudieron obtener las skills' },
      { status: 500 }
    );
  }
}
