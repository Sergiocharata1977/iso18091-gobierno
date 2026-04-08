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

type CapabilityUpdatePayload = Omit<
  PlatformCapability,
  'id' | 'created_at' | 'updated_at'
> & {
  capability_id?: string;
  id?: string;
};

function errorResponse(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function parseUpdatePayload(
  body: unknown,
  existing: PlatformCapability
): { capability?: PlatformCapability; error?: string; status?: number } {
  if (!body || typeof body !== 'object') {
    return { error: 'Body invalido', status: 400 };
  }

  const payload = body as Partial<CapabilityUpdatePayload>;
  const providedCapabilityId =
    typeof payload.capability_id === 'string'
      ? payload.capability_id
      : typeof payload.id === 'string'
        ? payload.id
        : existing.id;

  if (!CAPABILITY_ID_REGEX.test(existing.id)) {
    return { error: 'capability_id invalido', status: 400 };
  }

  if (providedCapabilityId !== existing.id) {
    return { error: 'capability_id no puede modificarse', status: 400 };
  }

  const name =
    typeof payload.name === 'string' ? payload.name.trim() : existing.name;
  if (!name) {
    return { error: 'El campo name es obligatorio', status: 400 };
  }

  const description =
    typeof payload.description === 'string'
      ? payload.description.trim()
      : existing.description;
  if (!description) {
    return { error: 'El campo description es obligatorio', status: 400 };
  }

  const version =
    typeof payload.version === 'string'
      ? payload.version.trim()
      : existing.version;
  if (!version) {
    return { error: 'El campo version es obligatorio', status: 400 };
  }

  const systemIds = payload.system_ids ?? existing.system_ids;
  if (!isStringArray(systemIds) || systemIds.length === 0) {
    return { error: 'El campo system_ids debe ser un array no vacio', status: 400 };
  }

  const scope = payload.scope ?? existing.scope;
  if (!VALID_SCOPES.has(scope)) {
    return { error: 'El campo scope es invalido', status: 400 };
  }

  const status = payload.status ?? existing.status;
  if (!VALID_STATUSES.has(status)) {
    return { error: 'El campo status es invalido', status: 400 };
  }

  const tier = payload.tier ?? existing.tier;
  if (!VALID_TIERS.has(tier)) {
    return { error: 'El campo tier es invalido', status: 400 };
  }

  const icon =
    typeof payload.icon === 'string' ? payload.icon.trim() : existing.icon;
  if (!icon) {
    return { error: 'El campo icon es obligatorio', status: 400 };
  }

  const tags = payload.tags ?? existing.tags;
  if (!isStringArray(tags)) {
    return { error: 'El campo tags debe ser un array', status: 400 };
  }

  const dependencies = payload.dependencies ?? existing.dependencies ?? [];
  if (!isStringArray(dependencies)) {
    return { error: 'El campo dependencies debe ser un array', status: 400 };
  }

  const manifest =
    payload.manifest && typeof payload.manifest === 'object'
      ? {
          ...existing.manifest,
          ...payload.manifest,
        }
      : existing.manifest;

  if (
    typeof manifest.capability_id !== 'string' ||
    manifest.capability_id !== existing.id ||
    typeof manifest.version !== 'string' ||
    !manifest.version.trim() ||
    typeof manifest.system_id !== 'string' ||
    !manifest.system_id.trim() ||
    !Array.isArray(manifest.navigation)
  ) {
    return { error: 'El campo manifest es invalido', status: 400 };
  }

  return {
    capability: {
      id: existing.id,
      name,
      description,
      version,
      system_ids: systemIds,
      scope,
      status,
      tier,
      icon,
      color:
        typeof payload.color === 'string' ? payload.color.trim() : existing.color,
      tags,
      industries: payload.industries ?? existing.industries,
      industry_required:
        payload.industry_required ?? existing.industry_required,
      manifest: {
        ...manifest,
        version,
        system_id: manifest.system_id || systemIds[0],
      },
      dependencies,
      long_description:
        typeof payload.long_description === 'string'
          ? payload.long_description.trim()
          : existing.long_description,
      target_audience:
        typeof payload.target_audience === 'string'
          ? payload.target_audience.trim()
          : existing.target_audience,
      features:
        payload.features !== undefined ? payload.features : existing.features,
      benefits:
        payload.benefits !== undefined ? payload.benefits : existing.benefits,
      how_it_works:
        typeof payload.how_it_works === 'string'
          ? payload.how_it_works.trim()
          : existing.how_it_works,
      screenshots:
        payload.screenshots !== undefined
          ? payload.screenshots
          : existing.screenshots,
      created_at: existing.created_at,
      updated_at: new Date(),
    },
  };
}

export const GET = withAuth(async (_request: NextRequest, { params }) => {
  try {
    const { id } = await params;

    if (!id || !CAPABILITY_ID_REGEX.test(id)) {
      return errorResponse('capability_id invalido', 400);
    }

    const capability = await CapabilityService.getPlatformCapability(id);

    if (!capability) {
      return errorResponse('Capability no encontrada', 404);
    }

    return NextResponse.json({ success: true, data: capability });
  } catch (error) {
    console.error('[super-admin/capabilities/[id]][GET] Error:', error);
    return errorResponse('No se pudo obtener la capability', 500);
  }
}, SUPER_ADMIN_AUTH_OPTIONS);

export const PUT = withAuth(async (request: NextRequest, { params }) => {
  try {
    const { id } = await params;

    if (!id || !CAPABILITY_ID_REGEX.test(id)) {
      return errorResponse('capability_id invalido', 400);
    }

    const existing = await CapabilityService.getPlatformCapability(id);

    if (!existing) {
      return errorResponse('Capability no encontrada', 404);
    }

    const parsed = parseUpdatePayload(await request.json(), existing);

    if (!parsed.capability) {
      return errorResponse(parsed.error || 'Body invalido', parsed.status || 400);
    }

    await CapabilityService.upsertPlatformCapability(parsed.capability);

    const updated = await CapabilityService.getPlatformCapability(id);

    return NextResponse.json({
      success: true,
      data: updated ?? parsed.capability,
    });
  } catch (error) {
    console.error('[super-admin/capabilities/[id]][PUT] Error:', error);
    return errorResponse('No se pudo actualizar la capability', 500);
  }
}, SUPER_ADMIN_AUTH_OPTIONS);

export const DELETE = withAuth(async (_request: NextRequest, { params }) => {
  try {
    const { id } = await params;

    if (!id || !CAPABILITY_ID_REGEX.test(id)) {
      return errorResponse('capability_id invalido', 400);
    }

    const capability = await CapabilityService.getPlatformCapability(id);

    if (!capability) {
      return errorResponse('Capability no encontrada', 404);
    }

    const db = getAdminFirestore();
    const installationsSnapshot = await db
      .collectionGroup('installed_capabilities')
      .where('capability_id', '==', id)
      .limit(1)
      .get();

    if (!installationsSnapshot.empty) {
      return errorResponse(
        'No se puede eliminar la capability porque esta instalada en una o mas organizaciones',
        409
      );
    }

    await db.collection('platform_capabilities').doc(id).delete();

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error('[super-admin/capabilities/[id]][DELETE] Error:', error);
    return errorResponse('No se pudo eliminar la capability', 500);
  }
}, SUPER_ADMIN_AUTH_OPTIONS);
