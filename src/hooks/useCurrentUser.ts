// Hook for getting current user with context

import { auth } from '@/firebase/config';
import { User } from '@/types/auth';
import { UserContext } from '@/types/context';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';

interface UseCurrentUserOptions {
  includeContext?: boolean; // Load full context (default: false)
}

interface UseCurrentUserReturn {
  usuario: User | null;
  contexto: UserContext | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useCurrentUser(
  options: UseCurrentUserOptions = {}
): UseCurrentUserReturn {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [contexto, setContexto] = useState<UserContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadUser = async (
    userId: string,
    email: string | null,
    idToken?: string | null
  ) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch user from users collection
      const response = await fetch(
        `/api/ia/context?userId=${userId}&light=true`
      );

      if (!response.ok) {
        // User doesn't exist in Firestore, create it automatically
        if (response.status === 404 && email) {
          console.log(
            '[useCurrentUser] User not found in Firestore, creating...'
          );

          const createResponse = await fetch('/api/users/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
            },
            body: JSON.stringify({
              uid: userId,
              email,
              organization_id:
                typeof window !== 'undefined'
                  ? sessionStorage.getItem('organization_id') || undefined
                  : undefined,
            }),
          });

          if (createResponse.ok) {
            const createData = await createResponse.json();
            setUsuario(createData.user);
            console.log('[useCurrentUser] User created successfully');
            return;
          }
        }

        throw new Error('Failed to load user');
      }

      const data = await response.json();

      // Support new API structure
      if (data.user) {
        setUsuario(data.user);
      }
      // Legacy support
      else if (data.contexto?.user) {
        setUsuario(data.contexto.user);
      }

      // Load full context if requested and available
      if (options.includeContext) {
        // If we already got context in the first response (new API behavior not implemented yet but good practice)
        if (data.context) {
          setContexto(data.context);
        } else {
          // Fetch full context if not in light response
          const fullResponse = await fetch(`/api/ia/context?userId=${userId}`);
          if (fullResponse.ok) {
            const fullData = await fullResponse.json();
            // Handle both legacy and new structures
            setContexto(fullData.context || fullData.contexto);
          }
        }
      }
    } catch (err) {
      console.error('[useCurrentUser] Error loading user:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Subscribe to Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(
      auth,
      async (authUser: FirebaseUser | null) => {
        if (authUser) {
          const idToken = await authUser.getIdToken().catch(() => null);
          await loadUser(authUser.uid, authUser.email, idToken);
        } else {
          setUsuario(null);
          setContexto(null);
          setLoading(false);
        }
      }
    );

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.includeContext]);

  const refresh = async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const idToken = await currentUser.getIdToken().catch(() => null);
      await loadUser(currentUser.uid, currentUser.email, idToken);
    }
  };

  return {
    usuario,
    contexto,
    loading,
    error,
    refresh,
  };
}
