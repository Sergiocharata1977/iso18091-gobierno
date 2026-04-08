/**
 * Helper para obtener sesión de autenticación
 * Temporal: usa Firebase Auth directamente
 * TODO: Migrar a Clerk en Phase 2
 */

import { cookies } from 'next/headers';

export interface AuthSession {
  user: {
    id: string;
    email: string;
    rol: 'admin' | 'gerente' | 'jefe' | 'operario' | 'auditor';
  };
}

export async function auth(): Promise<AuthSession | null> {
  try {
    // Obtener token de cookie
    const cookieStore = cookies();
    const authToken = cookieStore.get('auth-token')?.value;

    if (!authToken) {
      return null;
    }

    // TODO: Verificar token con Firebase Admin
    // Por ahora, decodificar JWT básico
    const payload = JSON.parse(atob(authToken.split('.')[1]));

    return {
      user: {
        id: payload.uid || payload.sub,
        email: payload.email,
        rol: payload.rol || 'operario',
      },
    };
  } catch (error) {
    console.error('Error en auth():', error);
    return null;
  }
}
