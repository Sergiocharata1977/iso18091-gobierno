// API endpoint to manually sync users between Firebase Auth and Firestore
// Protected: requires admin or super_admin role

import { withAuth } from '@/lib/api/withAuth';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import { NextResponse } from 'next/server';

export const POST = withAuth(
  async (_request, _context, auth) => {
    try {
      const adminAuth = getAdminAuth();
      const db = getAdminFirestore();

      console.log('[API /users/sync] Starting sync by:', auth.email);

      console.log('[API /users/sync] Starting user synchronization');

      // List all users from Firebase Auth
      const listUsersResult = await adminAuth.listUsers(1000);

      // Get all user records from Firestore
      const usersSnapshot = await db.collection('users').get();
      const firestoreUsers = new Map();
      usersSnapshot.docs.forEach(doc => {
        firestoreUsers.set(doc.id, doc.data());
      });

      // Sync missing users to Firestore
      const syncPromises: Promise<unknown>[] = [];
      let syncedCount = 0;

      listUsersResult.users.forEach(userRecord => {
        if (!firestoreUsers.has(userRecord.uid)) {
          console.log(
            '[API /users/sync] Syncing missing user:',
            userRecord.uid
          );
          syncedCount++;
          syncPromises.push(
            db
              .collection('users')
              .doc(userRecord.uid)
              .set({
                email: userRecord.email || '',
                role: userRecord.customClaims?.role || 'operario',
                personnel_id: userRecord.customClaims?.personnelId || null,
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
        console.log('[API /users/sync] Synced', syncedCount, 'missing users');
      }

      // Also check for orphaned Firestore users (users in Firestore but not in Auth)
      let orphanedCount = 0;
      const authUserIds = new Set(listUsersResult.users.map(u => u.uid));

      for (const doc of usersSnapshot.docs) {
        if (!authUserIds.has(doc.id)) {
          console.log(
            '[API /users/sync] Found orphaned user in Firestore:',
            doc.id
          );
          orphanedCount++;
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Sincronización completada',
        stats: {
          totalAuthUsers: listUsersResult.users.length,
          totalFirestoreUsers: usersSnapshot.docs.length,
          syncedUsers: syncedCount,
          orphanedUsers: orphanedCount,
        },
      });
    } catch (error) {
      console.error('[API /users/sync] Error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Error during synchronization',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'super_admin'] }
);
