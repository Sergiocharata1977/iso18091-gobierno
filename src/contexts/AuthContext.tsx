'use client';

import { UserSyncNotification } from '@/components/auth/UserSyncNotification';
import { onAuthChange } from '@/firebase/auth';
import { auth, db } from '@/firebase/config';
import { UserService } from '@/services/auth/UserService';
import { User } from '@/types/auth';
import type { Edition } from '@/types/edition';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  modulosHabilitados: string[] | null;
  organizationEdition: Edition;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  modulosHabilitados: null,
  organizationEdition: 'enterprise',
  logout: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSyncNotification, setShowSyncNotification] = useState(false);
  const [organizationEdition, setOrganizationEdition] =
    useState<Edition>('enterprise');
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthChange(async firebaseUser => {
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken();
          const orgIdFromSession =
            typeof window !== 'undefined'
              ? sessionStorage.getItem('organization_id')
              : null;

          // First, ensure user exists in Firestore
          const response = await fetch('/api/users/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              organization_id: orgIdFromSession || undefined,
            }),
          });

          if (response.ok) {
            console.log(
              '[AuthContext] User record created/verified in Firestore'
            );
            // Show sync notification for new users
            const data = await response.json();
            if (data.message === 'Usuario creado exitosamente') {
              setShowSyncNotification(true);
            }
          } else if (response.status === 409) {
            // User already exists, this is fine
            console.log('[AuthContext] User already exists in Firestore');
          } else {
            console.error(
              '[AuthContext] Failed to create user record:',
              await response.text()
            );
          }

          // Fetch the full user data from Firestore
          const fullUser = await UserService.getById(firebaseUser.uid);

          // Super admin org override: permite que super_admin pruebe
          // el app-vendedor como si fuera un usuario de una org específica.
          // Se activa seteando sessionStorage['super_admin_org_override'].
          const superAdminOverrideOrg =
            fullUser?.rol === 'super_admin' && typeof window !== 'undefined'
              ? sessionStorage.getItem('super_admin_org_override')
              : null;

          const resolvedUser = superAdminOverrideOrg
            ? { ...fullUser!, organization_id: superAdminOverrideOrg }
            : fullUser;

          const userWithToken = resolvedUser
            ? { ...resolvedUser, getIdToken: () => firebaseUser.getIdToken() }
            : null;
          setUser(userWithToken);

          if (resolvedUser?.organization_id) {
            try {
              const organizationDoc = await getDoc(
                doc(db, 'organizations', resolvedUser.organization_id)
              );
              const edition = organizationDoc.data()?.edition;
              setOrganizationEdition(
                edition === 'government' ? 'government' : 'enterprise'
              );
            } catch (organizationError) {
              console.error(
                '[AuthContext] Error fetching organization edition:',
                organizationError
              );
              setOrganizationEdition('enterprise');
            }
          } else {
            setOrganizationEdition('enterprise');
          }

          // Store organization_id in sessionStorage for components that need it
          // IMPORTANT: Super admins should NOT have an organization context
          // EXCEPTION: super_admin_org_override allows testing vendedor app
          if (resolvedUser?.organization_id && resolvedUser?.rol !== 'super_admin') {
            sessionStorage.setItem('organization_id', resolvedUser.organization_id);
          } else if (resolvedUser?.rol === 'super_admin') {
            if (superAdminOverrideOrg) {
              sessionStorage.setItem('organization_id', superAdminOverrideOrg);
            } else {
              sessionStorage.removeItem('organization_id');
            }
          }

          // Create session cookie (httpOnly) via API
          try {
            const sessionResponse = await fetch('/api/auth/session', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ idToken }),
            });

            if (sessionResponse.ok) {
              console.log('[AuthContext] Session cookie created successfully');
            } else {
              console.error('[AuthContext] Failed to create session cookie');
            }
          } catch (sessionError) {
            console.error(
              '[AuthContext] Error creating session:',
              sessionError
            );
          }
        } catch (error) {
          console.error('[AuthContext] Error fetching user data:', error);
          setUser(null);
          // Clear session on error
          await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
        }
      } else {
        setUser(null);
        setOrganizationEdition('enterprise');
        // Clear session and sessionStorage when user logs out
        if (typeof document !== 'undefined') {
          sessionStorage.removeItem('organization_id');
          console.log('[AuthContext] Session and organization_id cleared');
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const modulosHabilitados = useMemo(
    () => user?.modulos_habilitados ?? null,
    [user]
  );

  const logout = async () => {
    try {
      // Call logout API to revoke session cookie
      await fetch('/api/auth/logout', {
        method: 'POST',
      });

      // Sign out from Firebase
      const { signOut } = await import('firebase/auth');
      await signOut(auth);

      // Clear sessionStorage
      if (typeof document !== 'undefined') {
        sessionStorage.removeItem('organization_id');
      }

      router.push('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        modulosHabilitados,
        organizationEdition,
        logout,
      }}
    >
      {children}
      <UserSyncNotification
        show={showSyncNotification}
        onComplete={() => setShowSyncNotification(false)}
      />
    </AuthContext.Provider>
  );
};
