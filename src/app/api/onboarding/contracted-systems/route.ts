import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

type ContractedSystem = {
  systemId: string;
  systemName: string;
  status?: string;
  modulesEnabled?: string[];
};

const ContractedSystemsQuerySchema = z.object({
  organization_id: z.string().optional(),
  organizationId: z.string().optional(),
});

export const GET = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      ContractedSystemsQuerySchema.parse(
        Object.fromEntries(searchParams.entries())
      );
      const requestedOrgId =
        searchParams.get('organization_id') ||
        searchParams.get('organizationId') ||
        auth.organizationId;

      const db = getAdminFirestore();

      if (!requestedOrgId) {
        return NextResponse.json(
          {
            success: false,
            error:
              'El onboarding federado fue removido. Se requiere organization_id.',
          },
          { status: 400 }
        );
      }

      const orgScope = await resolveAuthorizedOrganizationId(
        auth,
        requestedOrgId,
        {
          requireOrg: true,
        }
      );
      if (!orgScope.ok || !orgScope.organizationId) {
        const orgError = toOrganizationApiError(orgScope, {
          defaultStatus: 403,
          defaultError: 'No puedes consultar sistemas de otra organizacion',
        });
        return NextResponse.json(
          {
            success: false,
            error: orgError.error,
            errorCode: orgError.errorCode,
          },
          { status: orgError.status }
        );
      }
      const effectiveOrgId = orgScope.organizationId;

      const snapshot = await db
        .collection('organizations')
        .doc(effectiveOrgId)
        .collection('contracted_systems')
        .get();

      let systems: ContractedSystem[] = snapshot.docs.map(doc => {
        const data = doc.data() as Record<string, unknown>;
        return {
          systemId: doc.id,
          systemName: String(data.systemName || doc.id),
          status: typeof data.status === 'string' ? data.status : 'active',
          modulesEnabled: Array.isArray(data.modulesEnabled)
            ? (data.modulesEnabled as string[])
            : [],
        };
      });

      // Backward compatibility: if no contracts are configured yet, default to ISO.
      if (systems.length === 0) {
        systems = [
          {
            systemId: 'iso9001',
            systemName: 'ISO 9001 · Quality Management',
            status: 'active',
            modulesEnabled: ['mi-sgc', 'rrhh', 'procesos', 'mejoras'],
          },
        ];
      }

      return NextResponse.json({ success: true, data: systems });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Query invalida', details: error.issues },
          { status: 400 }
        );
      }
      console.error('[onboarding/contracted-systems] Error:', error);
      return NextResponse.json(
        { success: false, error: 'Error al obtener sistemas contratados' },
        { status: 500 }
      );
    }
  },
  {
    roles: ['super_admin', 'admin', 'gerente', 'jefe', 'auditor', 'operario'],
    allowNoOrg: true,
  }
);
