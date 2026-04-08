import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import { roleToTipoPersonal } from '@/lib/utils/personnel-role-mapping';
import { withAuth } from '@/lib/api/withAuth';
import { NextResponse } from 'next/server';

export const POST = withAuth(
  async (request, _context, authCtx) => {
    try {
      const body = await request.json();
      const db = getAdminFirestore();

      const hasOnlySelfCreateFields = Object.keys(body).every(key =>
        ['uid', 'email', 'organization_id', 'modulos_habilitados'].includes(key)
      );

      if (body.uid && body.email && hasOnlySelfCreateFields) {
        if (body.uid !== authCtx.uid) {
          return NextResponse.json(
            { error: 'No autorizado para crear registro de otro usuario' },
            { status: 403 }
          );
        }

        const orgId = authCtx.organizationId || body.organization_id || null;
        if (!orgId && authCtx.role !== 'super_admin') {
          return NextResponse.json(
            { error: 'organization_id es requerido' },
            { status: 400 }
          );
        }

        const modulosHabilitados =
          body.modulos_habilitados === undefined
            ? null
            : body.modulos_habilitados;
        if (modulosHabilitados !== null && !Array.isArray(modulosHabilitados)) {
          return NextResponse.json(
            { error: 'modulos_habilitados debe ser null o string[]' },
            { status: 400 }
          );
        }

        const userDoc = await db.collection('users').doc(body.uid).get();
        if (userDoc.exists) {
          return NextResponse.json(
            {
              error: 'El usuario ya existe',
              message: 'El registro de usuario ya fue creado previamente',
            },
            { status: 409 }
          );
        }

        await db.collection('users').doc(body.uid).set({
          email: body.email,
          personnel_id: '',
          rol: 'operario',
          activo: true,
          organization_id: orgId,
          modulos_habilitados: modulosHabilitados,
          created_at: new Date(),
          updated_at: new Date(),
        });

        return NextResponse.json({
          user: {
            id: body.uid,
            email: body.email,
            rol: 'operario',
            activo: true,
          },
          message: 'Usuario creado exitosamente',
        });
      }

      if (!['admin', 'super_admin'].includes(authCtx.role)) {
        return NextResponse.json(
          { error: 'Sin permisos para crear usuarios manualmente' },
          { status: 403 }
        );
      }

      const {
        email,
        password,
        role,
        createPersonnel,
        nombres,
        apellidos,
        modulos_habilitados,
      } = body;
      if (!email)
        return NextResponse.json(
          { error: 'Email es requerido' },
          { status: 400 }
        );
      if (!password || password.length < 6) {
        return NextResponse.json(
          { error: 'La contrasena debe tener al menos 6 caracteres' },
          { status: 400 }
        );
      }
      if (createPersonnel && (!nombres || !apellidos)) {
        return NextResponse.json(
          {
            error:
              'Nombres y apellidos son requeridos cuando se crea personnel',
          },
          { status: 400 }
        );
      }
      if (
        modulos_habilitados !== undefined &&
        modulos_habilitados !== null &&
        !Array.isArray(modulos_habilitados)
      ) {
        return NextResponse.json(
          { error: 'modulos_habilitados debe ser null o string[]' },
          { status: 400 }
        );
      }

      const orgId =
        authCtx.role === 'super_admin'
          ? body.organization_id || authCtx.organizationId || null
          : authCtx.organizationId;
      if (!orgId && authCtx.role !== 'super_admin') {
        return NextResponse.json(
          { error: 'organization_id es requerido' },
          { status: 400 }
        );
      }

      const adminAuth = getAdminAuth();

      try {
        const existingAuthUser = await adminAuth.getUserByEmail(email);
        if (existingAuthUser) {
          return NextResponse.json(
            {
              error: 'El email ya esta en uso',
              message: `Ya existe un usuario con el email ${email}.`,
              existingUserId: existingAuthUser.uid,
            },
            { status: 409 }
          );
        }
      } catch (authError: unknown) {
        if (
          authError &&
          typeof authError === 'object' &&
          'errorInfo' in authError &&
          (authError as { errorInfo: { code: string } }).errorInfo.code !==
            'auth/user-not-found'
        ) {
          throw authError;
        }
      }

      if (createPersonnel) {
        const existingPersonnelQuery = await db
          .collection('personnel')
          .where('email', '==', email)
          .limit(1)
          .get();

        if (!existingPersonnelQuery.empty) {
          const existingPersonnel = existingPersonnelQuery.docs[0];
          return NextResponse.json(
            {
              error: 'El email ya esta en uso',
              message: 'Ya existe un empleado con este email.',
              existingPersonnelId: existingPersonnel.id,
            },
            { status: 409 }
          );
        }
      }

      const userRecord = await adminAuth.createUser({
        email,
        emailVerified: false,
        password,
      });

      await adminAuth.setCustomUserClaims(userRecord.uid, {
        role: role || 'operario',
      });

      let personnelId: string | null = null;
      if (createPersonnel) {
        const personnelData = {
          nombres,
          apellidos,
          email,
          estado: 'Activo' as const,
          tipo_personal: roleToTipoPersonal(role),
          fecha_ingreso: new Date(),
          tiene_acceso_sistema: true,
          user_id: userRecord.uid,
          organization_id: orgId,
          created_at: new Date(),
          updated_at: new Date(),
        };

        const personnelRef = await db
          .collection('personnel')
          .add(personnelData);
        personnelId = personnelRef.id;

        await adminAuth.setCustomUserClaims(userRecord.uid, {
          role: role || 'operario',
          personnelId,
        });
      }

      await db
        .collection('users')
        .doc(userRecord.uid)
        .set({
          email,
          personnel_id: personnelId,
          rol: role || 'operario',
          activo: true,
          organization_id: orgId,
          modulos_habilitados:
            modulos_habilitados === undefined ? null : modulos_habilitados,
          created_at: new Date(),
          updated_at: new Date(),
        });

      return NextResponse.json({
        success: true,
        message: 'Usuario creado exitosamente.',
        user: { uid: userRecord.uid, email, personnelId },
      });
    } catch (error) {
      console.error('[API /users/create] Error:', error);
      if (error && typeof error === 'object' && 'errorInfo' in error) {
        const firebaseError = error as { errorInfo: { code: string } };
        if (firebaseError.errorInfo.code === 'auth/email-already-exists') {
          return NextResponse.json(
            {
              error: 'El email ya esta en uso',
              message: 'Ya existe un usuario con este email.',
            },
            { status: 409 }
          );
        }
      }

      return NextResponse.json(
        {
          error: 'Error al crear usuario',
          message: error instanceof Error ? error.message : 'Error desconocido',
        },
        { status: 500 }
      );
    }
  },
  {
    roles: ['admin', 'gerente', 'jefe', 'operario', 'auditor', 'super_admin'],
    allowMissingUser: true,
    allowNoOrg: true,
  }
);
