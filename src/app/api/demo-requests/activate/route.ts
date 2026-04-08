import { withAuth } from '@/lib/api/withAuth';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import { NextRequest, NextResponse } from 'next/server';

/**
 * LEGACY ADMIN ROUTE - Flujo de activación manual de demo requests.
 * Este endpoint es solo para uso interno de super-admin.
 * Los nuevos clientes se registran vía POST /api/auth/self-register (autoservicio).
 * No eliminar: mantiene compatibilidad con cuentas creadas antes de 2026-04-08.
 */

function generatePassword(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export const POST = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const body = await request.json();
      const {
        demoRequestId,
        name,
        email,
        company,
        whatsapp,
        trialDays = 30,
      } = body;

      if (!email || !name) {
        return NextResponse.json(
          { error: 'Email y nombre son requeridos' },
          { status: 400 }
        );
      }

      const authService = getAdminAuth();
      const db = getAdminFirestore();
      const password = generatePassword();

      try {
        const existingUser = await authService.getUserByEmail(email);
        if (existingUser) {
          return NextResponse.json(
            {
              error: 'Ya existe un usuario con este email',
              existingUserId: existingUser.uid,
            },
            { status: 409 }
          );
        }
      } catch (error: any) {
        if (error.code !== 'auth/user-not-found') {
          throw error;
        }
      }

      const userRecord = await authService.createUser({
        email,
        password,
        displayName: name,
        emailVerified: false,
      });

      const now = new Date();
      const expirationDate = new Date();
      expirationDate.setDate(now.getDate() + trialDays);

      await db
        .collection('users')
        .doc(userRecord.uid)
        .set({
          email,
          personnel_id: null,
          rol: 'admin',
          activo: true,
          status: 'active',
          planType: 'trial',
          trialStartDate: now,
          expirationDate,
          organization_id: auth.organizationId || null,
          modulos_habilitados: null,
          created_at: now,
          updated_at: now,
          company_name: company,
          phone: whatsapp,
          source: 'demo_request',
          created_by: auth.uid,
        });

      if (demoRequestId) {
        await db.collection('demo_requests').doc(demoRequestId).update({
          status: 'activated',
          activated_user_id: userRecord.uid,
          activated_at: now,
          updated_at: now,
          updated_by: auth.uid,
        });
      }

      return NextResponse.json({
        success: true,
        userId: userRecord.uid,
        email,
        password,
        loginUrl: 'https://doncandidoia.com/login',
        trialDays,
        expirationDate: expirationDate.toISOString(),
      });
    } catch (error: any) {
      console.error('Error creando usuario desde demo:', error);
      return NextResponse.json(
        { error: error.message || 'Error interno del servidor' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'super_admin'], allowNoOrg: true, allowInactive: true }
);

