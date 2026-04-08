import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const POST = withAuth(
  async request => {
    try {
      const body = await request.json();
      const { organizationId, dryRun = true } = body;

      if (!organizationId) {
        return NextResponse.json(
          { error: 'organizationId es requerido' },
          { status: 400 }
        );
      }

      const db = getAdminFirestore();
      const results = {
        totalUsers: 0,
        totalPersonnel: 0,
        personnelMigrated: 0,
        personnelCreatedFromUsers: 0,
        alreadyHasOrgId: 0,
        errors: [] as string[],
        details: [] as any[],
      };

      const usersSnapshot = await db
        .collection('users')
        .where('organization_id', '==', organizationId)
        .get();
      results.totalUsers = usersSnapshot.size;

      const usersByEmail: Record<string, any> = {};
      usersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.email) {
          usersByEmail[data.email.toLowerCase()] = {
            id: doc.id,
            ...data,
          };
        }
      });

      const personnelSnapshot = await db.collection('personnel').get();
      results.totalPersonnel = personnelSnapshot.size;

      const personnelByEmail: Record<string, any> = {};
      personnelSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.email) {
          personnelByEmail[data.email.toLowerCase()] = {
            id: doc.id,
            ref: doc.ref,
            ...data,
          };
        }
      });

      const batch = db.batch();
      let batchCount = 0;

      for (const doc of personnelSnapshot.docs) {
        const data = doc.data();

        if (!data.organization_id) {
          results.details.push({
            action: 'update_personnel',
            id: doc.id,
            email: data.email,
            status: 'migrated',
          });

          if (!dryRun) {
            batch.update(doc.ref, {
              organization_id: organizationId,
              updated_at: Timestamp.now(),
            });
            batchCount++;
          }

          results.personnelMigrated++;
        } else {
          results.alreadyHasOrgId++;
        }
      }

      for (const email of Object.keys(usersByEmail)) {
        const user = usersByEmail[email];
        const existingPersonnel = personnelByEmail[email];

        if (!existingPersonnel) {
          const newPersonnelData = {
            organization_id: organizationId,
            email: user.email,
            nombres:
              user.displayName?.split(' ')[0] || user.email.split('@')[0] || '',
            apellidos: user.displayName?.split(' ').slice(1).join(' ') || '',
            estado: 'Activo',
            tipo_personal:
              user.role === 'admin' ? 'Administrativo' : 'Operativo',
            user_id: user.id,
            tiene_acceso_sistema: true,
            fecha_ingreso: user.createdAt || Timestamp.now(),
            created_at: Timestamp.now(),
            updated_at: Timestamp.now(),
          };

          results.details.push({
            action: 'create_personnel',
            email: user.email,
            userId: user.id,
            status: 'created',
            data: newPersonnelData,
          });

          if (!dryRun) {
            const newDocRef = db.collection('personnel').doc();
            batch.set(newDocRef, newPersonnelData);
            batchCount++;
          }

          results.personnelCreatedFromUsers++;
        }

        if (!dryRun && batchCount >= 400) {
          await batch.commit();
          batchCount = 0;
        }
      }

      if (!dryRun && batchCount > 0) {
        await batch.commit();
      }

      return NextResponse.json({
        success: true,
        dryRun,
        message: dryRun
          ? `Simulacion completada. Se migrarian ${results.personnelMigrated} y se crearian ${results.personnelCreatedFromUsers} personnel.`
          : `Migracion completada. Se migraron ${results.personnelMigrated} y se crearon ${results.personnelCreatedFromUsers} personnel.`,
        results,
      });
    } catch (error) {
      console.error('Error en migracion de personnel:', error);
      return NextResponse.json(
        {
          error: 'Error en migracion',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['super_admin'] }
);

export const GET = withAuth(
  async request => {
    try {
      const { searchParams } = new URL(request.url);
      const organizationId = searchParams.get('organizationId');

      const db = getAdminFirestore();
      const personnelSnapshot = await db.collection('personnel').get();

      const stats = {
        total: personnelSnapshot.size,
        withOrgId: 0,
        withoutOrgId: 0,
        byOrganization: {} as Record<string, number>,
        personnel: [] as any[],
      };

      personnelSnapshot.docs.forEach(doc => {
        const data = doc.data();

        if (data.organization_id) {
          stats.withOrgId++;
          stats.byOrganization[data.organization_id] =
            (stats.byOrganization[data.organization_id] || 0) + 1;
        } else {
          stats.withoutOrgId++;
        }

        stats.personnel.push({
          id: doc.id,
          email: data.email,
          nombres: data.nombres,
          apellidos: data.apellidos,
          organization_id: data.organization_id || null,
          user_id: data.user_id || null,
          tiene_acceso_sistema: data.tiene_acceso_sistema || false,
        });
      });

      return NextResponse.json({
        success: true,
        stats,
        targetOrganization: organizationId,
      });
    } catch (error) {
      console.error('Error obteniendo estado de personnel:', error);
      return NextResponse.json(
        {
          error: 'Error al obtener estado',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['super_admin'] }
);
