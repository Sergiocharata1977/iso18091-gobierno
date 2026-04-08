import { getAdminFirestore } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import type { TerminalPolicy } from '@/types/terminal-policy';
import { Timestamp } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const toolNameSchema = z.enum([
  'browser_navigate',
  'browser_screenshot',
  'browser_click',
  'browser_fill_form',
  'file_read',
  'file_write',
  'clipboard_read',
  'clipboard_write',
  'app_open',
  'don_candido_chat',
]);

const postBodySchema = z
  .object({
    nombre: z.string().trim().min(1, 'nombre es requerido'),
    departamento_id: z.string().trim().min(1).optional(),
    puesto_id: z.string().trim().min(1).optional(),
    terminal_id: z.string().trim().min(1).optional(),
    allowed_tools: z.array(toolNameSchema),
    require_approval_for: z.array(toolNameSchema),
    prioridad: z.number().int(),
    allowed_hours: z
      .object({
        from: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM requerido'),
        to: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM requerido'),
      })
      .optional(),
    activo: z.boolean().default(true),
  })
  .refine(
    data =>
      data.departamento_id !== undefined ||
      data.puesto_id !== undefined ||
      data.terminal_id !== undefined,
    {
      message:
        'Al menos uno de departamento_id, puesto_id o terminal_id es requerido',
    }
  );

export const GET = withAuth(
  async (_request, _context, auth) => {
    try {
      const orgScope = await resolveAuthorizedOrganizationId(auth, null, {
        requireOrg: true,
      });

      if (!orgScope.ok || !orgScope.organizationId) {
        const apiError = toOrganizationApiError(orgScope);
        return NextResponse.json(
          { success: false, error: apiError.error, errorCode: apiError.errorCode },
          { status: apiError.status }
        );
      }

      const orgId = orgScope.organizationId;
      const db = getAdminFirestore();

      const snapshot = await db
        .collection('organizations')
        .doc(orgId)
        .collection('terminal_policies')
        .where('organization_id', '==', orgId)
        .orderBy('prioridad', 'desc')
        .get();

      const policies: (TerminalPolicy & { id: string })[] = snapshot.docs.map(
        doc => ({
          id: doc.id,
          ...(doc.data() as Omit<TerminalPolicy, 'id'>),
        })
      );

      return NextResponse.json({ success: true, data: policies });
    } catch (error) {
      console.error('[admin/terminal-policies][GET] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudieron listar las politicas' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const orgScope = await resolveAuthorizedOrganizationId(auth, null, {
        requireOrg: true,
      });

      if (!orgScope.ok || !orgScope.organizationId) {
        const apiError = toOrganizationApiError(orgScope);
        return NextResponse.json(
          { success: false, error: apiError.error, errorCode: apiError.errorCode },
          { status: apiError.status }
        );
      }

      const orgId = orgScope.organizationId;
      const rawBody = await request.json();

      let body: z.infer<typeof postBodySchema>;
      try {
        body = postBodySchema.parse(rawBody);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          // Check if the refine failure (missing scope fields) triggered
          const scopeError = validationError.issues.find(
            issue => issue.path.length === 0
          );
          if (scopeError) {
            return NextResponse.json(
              {
                success: false,
                error: scopeError.message,
                details: validationError.issues,
              },
              { status: 400 }
            );
          }
          return NextResponse.json(
            {
              success: false,
              error: 'Payload invalido',
              details: validationError.issues,
            },
            { status: 400 }
          );
        }
        throw validationError;
      }

      const now = Timestamp.now();
      const db = getAdminFirestore();
      const policyRef = db
        .collection('organizations')
        .doc(orgId)
        .collection('terminal_policies')
        .doc();

      const policy: Omit<TerminalPolicy, 'id'> = {
        organization_id: orgId,
        nombre: body.nombre,
        ...(body.departamento_id !== undefined && {
          departamento_id: body.departamento_id,
        }),
        ...(body.puesto_id !== undefined && { puesto_id: body.puesto_id }),
        ...(body.terminal_id !== undefined && { terminal_id: body.terminal_id }),
        allowed_tools: body.allowed_tools,
        require_approval_for: body.require_approval_for,
        prioridad: body.prioridad,
        ...(body.allowed_hours !== undefined && {
          allowed_hours: body.allowed_hours,
        }),
        activo: body.activo,
        created_at: now,
        updated_at: now,
      };

      await policyRef.set(policy);

      return NextResponse.json(
        {
          success: true,
          data: { id: policyRef.id, ...policy },
        },
        { status: 201 }
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      console.error('[admin/terminal-policies][POST] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo crear la politica' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
