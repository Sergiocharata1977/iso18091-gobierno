jest.mock('next/server', () => ({
  NextResponse: {
    json: (
      body: unknown,
      init?: { status?: number; headers?: Record<string, string> }
    ) => ({
      status: init?.status ?? 200,
      headers: init?.headers ?? {},
      json: async () => body,
    }),
  },
}));

jest.mock('@/lib/api/withAuth', () => ({
  withAuth: (handler: any, options?: { roles?: string[] }) => {
    return (request: any, context: any = { params: Promise.resolve({}) }) => {
      if (request.__unauth) {
        return {
          status: 401,
          json: async () => ({ error: 'No autorizado' }),
        };
      }

      const role = request.__role || 'admin';
      if (options?.roles?.length && !options.roles.includes(role)) {
        return {
          status: 403,
          json: async () => ({ error: 'Sin permisos' }),
        };
      }

      const organizationId = request.__orgId || 'org-1';
      return handler(request, context, {
        uid: request.__uid || 'user-1',
        email: 'user@test.com',
        organizationId,
        role,
        user: {
          id: request.__uid || 'user-1',
          email: 'user@test.com',
          rol: role,
          organization_id: organizationId,
          personnel_id: null,
          activo: true,
          status: 'active',
        },
      });
    };
  },
}));

jest.mock('@/lib/firebase/admin', () => ({
  getAdminAuth: jest.fn(() => ({
    updateUser: jest.fn(),
  })),
}));

import { GET as OpenAIGet } from '@/app/api/openai/session/route';
import { POST as ResetPasswordPost } from '@/app/api/temp/reset-password/route';

describe('Agent 9 security hardening', () => {
  it('returns 401 without auth on OpenAI session endpoint', async () => {
    const response = await OpenAIGet(
      { __unauth: true } as any,
      { params: Promise.resolve({}) } as any
    );

    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error).toBe('No autorizado');
  });

  it('returns 403 with insufficient role on reset-password endpoint', async () => {
    const response = await ResetPasswordPost(
      {
        __role: 'admin',
        json: async () => ({
          uid: 'target-user',
          newPassword: 'SecurePass1234!',
        }),
      } as any,
      { params: Promise.resolve({}) } as any
    );

    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error).toBe('Sin permisos');
  });
});
