import { SUPER_ADMIN_AUTH_OPTIONS } from '@/lib/api/superAdminAuth';
import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { CapabilityService } from '@/services/plugins/CapabilityService';
import type { PlatformCapability } from '@/types/plugins';
import { NextRequest, NextResponse } from 'next/server';

const CAPABILITY_ID_REGEX = /^[a-z0-9-]+$/;
const VALID_SCOPES = new Set<PlatformCapability['scope']>(['platform', 'system']);
const VALID_STATUSES = new Set<PlatformCapability['status']>([
  'active',
  'beta',
  'deprecated',
]);
const VALID_TIERS = new Set<PlatformCapability['tier']>([
  'base',
  'opcional',
  'premium',
]);

type CapabilityCreatePayload = Omit<
  PlatformCapability,
  'id' | 'created_at' | 'updated_at'
> & {
  capability_id?: string;
};

function errorResponse(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function parseCreatePayload(
  body: unknown
): { capability?: PlatformCapability; error?: string; status?: number } {
  if (!body || typeof body !== 'object') {
    return { error: 'Body invalido', status: 400 };
  }

  const payload = body as CapabilityCreatePayload & { id?: unknown };
  const { capability_id: _capabilityId, id: _ignoredId, ...rest } = payload;
  const capabilityId =
    typeof payload.capability_id === 'string'
      ? payload.capability_id
      : typeof payload.id === 'string'
        ? payload.id
        : '';

  if (!capabilityId || !CAPABILITY_ID_REGEX.test(capabilityId)) {
    return { error: 'capability_id invalido', status: 400 };
  }

  if (typeof payload.name !== 'string' || !payload.name.trim()) {
    return { error: 'El campo name es obligatorio', status: 400 };
  }

  if (typeof payload.description !== 'string' || !payload.description.trim()) {
    return { error: 'El campo description es obligatorio', status: 400 };
  }

  if (typeof payload.version !== 'string' || !payload.version.trim()) {
    return { error: 'El campo version es obligatorio', status: 400 };
  }

  if (!isStringArray(payload.system_ids) || payload.system_ids.length === 0) {
    return { error: 'El campo system_ids debe ser un array no vacio', status: 400 };
  }

  if (!VALID_SCOPES.has(payload.scope)) {
    return { error: 'El campo scope es invalido', status: 400 };
  }

  if (!VALID_STATUSES.has(payload.status)) {
    return { error: 'El campo status es invalido', status: 400 };
  }

  if (!VALID_TIERS.has(payload.tier)) {
    return { error: 'El campo tier es invalido', status: 400 };
  }

  if (typeof payload.icon !== 'string' || !payload.icon.trim()) {
    return { error: 'El campo icon es obligatorio', status: 400 };
  }

  if (!isStringArray(payload.tags)) {
    return { error: 'El campo tags debe ser un array', status: 400 };
  }

  if (
    payload.dependencies !== undefined &&
    !isStringArray(payload.dependencies)
  ) {
    return { error: 'El campo dependencies debe ser un array', status: 400 };
  }

  if (
    !payload.manifest ||
    typeof payload.manifest !== 'object' ||
    typeof payload.manifest.capability_id !== 'string' ||
    payload.manifest.capability_id !== capabilityId ||
    typeof payload.manifest.version !== 'string' ||
    !payload.manifest.version.trim() ||
    typeof payload.manifest.system_id !== 'string' ||
    !payload.manifest.system_id.trim() ||
    !Array.isArray(payload.manifest.navigation)
  ) {
    return { error: 'El campo manifest es invalido', status: 400 };
  }

  const now = new Date();

  return {
    capability: {
      ...rest,
      id: capabilityId,
      created_at: now,
      updated_at: now,
    },
  };
}

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const systemId = searchParams.get('system_id') || undefined;
    const status = searchParams.get('status') || undefined;

    if (status && !VALID_STATUSES.has(status as PlatformCapability['status'])) {
      return errorResponse('El filtro status es invalido', 400);
    }

    let capabilities = await CapabilityService.getPlatformCapabilities({
      systemId,
    });

    if (status) {
      capabilities = capabilities.filter(capability => capability.status === status);
    }

    return NextResponse.json({ success: true, data: capabilities });
  } catch (error) {
    console.error('[super-admin/capabilities][GET] Error:', error);
    return errorResponse('No se pudo obtener la lista de capabilities', 500);
  }
}, SUPER_ADMIN_AUTH_OPTIONS);

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const parsed = parseCreatePayload(await request.json());

    if (!parsed.capability) {
      return errorResponse(parsed.error || 'Body invalido', parsed.status || 400);
    }

    const db = getAdminFirestore();
    const existing = await db
      .collection('platform_capabilities')
      .doc(parsed.capability.id)
      .get();

    if (existing.exists) {
      return errorResponse('Ya existe una capability con ese capability_id', 409);
    }

    await CapabilityService.upsertPlatformCapability(parsed.capability);

    const created = await CapabilityService.getPlatformCapability(parsed.capability.id);

    return NextResponse.json(
      { success: true, data: created ?? parsed.capability },
      { status: 201 }
    );
  } catch (error) {
    console.error('[super-admin/capabilities][POST] Error:', error);
    return errorResponse('No se pudo crear la capability', 500);
  }
}, SUPER_ADMIN_AUTH_OPTIONS);
