import { withAuth } from '@/lib/api/withAuth';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const POST = withAuth(
  async request => {
    try {
      const body = await request.json();
      const { keepEmails = [], dryRun = true } = body;

      if (!keepEmails || keepEmails.length === 0) {
        return NextResponse.json(
          { error: 'keepEmails es requerido - lista de emails a mantener' },
          { status: 400 }
        );
      }

      const auth = getAdminAuth();
      const db = getAdminFirestore();
      const results = {
        totalUsers: 0,
        usersDeleted: 0,
        usersKept: 0,
        firestoreDeleted: 0,
        errors: [] as string[],
        deleted: [] as string[],
        kept: [] as string[],
      };

      const keepEmailsLower = keepEmails.map((e: string) => e.toLowerCase());
      const listUsersResult = await auth.listUsers(1000);
      results.totalUsers = listUsersResult.users.length;

      for (const userRecord of listUsersResult.users) {
        const email = userRecord.email?.toLowerCase() || '';

        if (keepEmailsLower.includes(email)) {
          results.usersKept++;
          results.kept.push(email);
          continue;
        }

        results.deleted.push(email || userRecord.uid);

        if (!dryRun) {
          try {
            await auth.deleteUser(userRecord.uid);

            const userDoc = await db
              .collection('users')
              .doc(userRecord.uid)
              .get();
            if (userDoc.exists) {
              await db.collection('users').doc(userRecord.uid).delete();
              results.firestoreDeleted++;
            }

            results.usersDeleted++;
          } catch (error) {
            results.errors.push(`Error eliminando ${email}: ${error}`);
          }
        } else {
          results.usersDeleted++;
        }
      }

      return NextResponse.json({
        success: true,
        dryRun,
        message: dryRun
          ? `Simulacion: Se eliminarian ${results.usersDeleted} usuarios, se mantendrian ${results.usersKept}`
          : `Completado: Se eliminaron ${results.usersDeleted} usuarios, se mantuvieron ${results.usersKept}`,
        results,
      });
    } catch (error) {
      console.error('Error:', error);
      return NextResponse.json(
        {
          error: 'Error en la operacion',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['super_admin'] }
);
