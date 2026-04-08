// API endpoint to list all Firebase Auth users
// Supports multi-tenant filtering by organization_id
// Protected: requires admin or super_admin role

import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const adminAuth = getAdminAuth();
      const db = getAdminFirestore();

      // Get query parameters for filtering
      const { searchParams } = new URL(request.url);
      const includeAll = searchParams.get('include_all') === 'true';

      // Use organization_id from verified token (prefer over query param)
      const organizationFilter =
        auth.role === 'super_admin'
          ? searchParams.get('organization_id') // super_admin can filter by any org
          : auth.organizationId; // regular admin uses their own org

      console.log('[API /users/list] Filters:', {
        organizationFilter,
        includeAll,
        requestedBy: auth.email,
        role: auth.role,
      });

      // List all users from Firebase Auth (max 1000 by default)
      const listUsersResult = await adminAuth.listUsers(1000);

      // Get all user records from Firestore
      const usersSnapshot = await db.collection('users').get();
      const firestoreUsers = new Map();
      usersSnapshot.docs.forEach(doc => {
        firestoreUsers.set(doc.id, doc.data());
      });

      // Get all personnel records to check relationships
      const personnelSnapshot = await db.collection('personnel').get();
      const personnelMap = new Map();
      personnelSnapshot.docs.forEach(doc => {
        const data = doc.data();
        personnelMap.set(doc.id, {
          id: doc.id,
          nombres: data.nombres,
          apellidos: data.apellidos,
          email: data.email,
          user_id: data.user_id,
          procesos_asignados: data.procesos_asignados || [],
          tiene_acceso_sistema: data.tiene_acceso_sistema || false,
        });
      });

      // Sync missing users to Firestore
      const syncPromises: Promise<unknown>[] = [];
      listUsersResult.users.forEach(userRecord => {
        if (!firestoreUsers.has(userRecord.uid)) {
          console.log(
            '[API /users/list] Syncing missing user to Firestore:',
            userRecord.uid
          );
          syncPromises.push(
            db
              .collection('users')
              .doc(userRecord.uid)
              .set({
                email: userRecord.email || '',
                rol: userRecord.customClaims?.role || 'operario',
                personnel_id: userRecord.customClaims?.personnelId || null,
                organization_id: null,
                created_at: new Date(
                  userRecord.metadata.creationTime || Date.now()
                ),
                updated_at: new Date(),
              })
          );
        }
      });

      // Wait for all sync operations to complete
      if (syncPromises.length > 0) {
        await Promise.all(syncPromises);
        console.log(
          '[API /users/list] Synced',
          syncPromises.length,
          'missing users'
        );
      }

      // Combine Auth and Firestore data with personnel information
      const allUsers = listUsersResult.users.map(userRecord => {
        const firestoreData = firestoreUsers.get(userRecord.uid);
        const personnelId =
          firestoreData?.personnel_id ||
          userRecord.customClaims?.personnelId ||
          null;

        // Get personnel data if linked
        let personnelData = null;
        let relationshipStatus: 'ok' | 'broken' | 'none' = 'none';

        if (personnelId) {
          personnelData = personnelMap.get(personnelId);
          if (personnelData) {
            if (personnelData.user_id === userRecord.uid) {
              relationshipStatus = 'ok';
            } else {
              relationshipStatus = 'broken';
              console.warn(
                `[API /users/list] Broken relationship: User ${userRecord.uid} -> Personnel ${personnelId}, but personnel.user_id = ${personnelData.user_id}`
              );
            }
          } else {
            relationshipStatus = 'broken';
            console.warn(
              `[API /users/list] Broken relationship: User ${userRecord.uid} references non-existent personnel ${personnelId}`
            );
          }
        }

        return {
          uid: userRecord.uid,
          email: userRecord.email || '',
          emailVerified: userRecord.emailVerified,
          disabled: userRecord.disabled,
          metadata: {
            creationTime: userRecord.metadata.creationTime,
            lastSignInTime: userRecord.metadata.lastSignInTime,
          },
          customClaims: {
            role:
              firestoreData?.rol ||
              firestoreData?.role ||
              userRecord.customClaims?.role ||
              'operario',
            personnelId: personnelId,
          },
          // Multi-tenant fields
          organization_id: firestoreData?.organization_id || null,
          rol:
            firestoreData?.rol ||
            firestoreData?.role ||
            userRecord.customClaims?.role ||
            'operario',
          // Additional personnel information
          personnelData: personnelData
            ? {
                id: personnelData.id,
                nombres: personnelData.nombres,
                apellidos: personnelData.apellidos,
                email: personnelData.email,
                procesos_asignados: personnelData.procesos_asignados,
                tiene_acceso_sistema: personnelData.tiene_acceso_sistema,
              }
            : null,
          relationshipStatus,
        };
      });

      // Apply organization filter if specified
      let filteredUsers = allUsers;
      if (organizationFilter && !includeAll) {
        filteredUsers = allUsers.filter(user => {
          // Exclude super_admin users from regular org admin pages
          if (user.rol === 'super_admin') return false;
          return user.organization_id === organizationFilter;
        });
        console.log(
          `[API /users/list] Filtered to ${filteredUsers.length} users for org: ${organizationFilter}`
        );
      }

      console.log('[API /users/list] Listed', filteredUsers.length, 'users');

      return NextResponse.json({
        success: true,
        users: filteredUsers,
        count: filteredUsers.length,
        totalCount: allUsers.length,
      });
    } catch (error) {
      console.error('[API /users/list] Error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Error listing users',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'super_admin'] }
);
