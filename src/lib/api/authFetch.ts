/**
 * authFetch - Utilidad centralizada para llamadas autenticadas a la API
 *
 * Obtiene automáticamente el token de Firebase Auth del usuario actual
 * y lo incluye como Bearer token en el header Authorization.
 *
 * Uso:
 *   import { authFetch, getAuthToken } from '@/lib/api/authFetch';
 *
 *   // Fetch autenticado (reemplaza a fetch())
 *   const response = await authFetch('/api/users/list');
 *
 *   // Con opciones adicionales
 *   const response = await authFetch('/api/users/sync', {
 *     method: 'POST',
 *     body: JSON.stringify({ ... }),
 *   });
 */

import { getAuth } from 'firebase/auth';

/**
 * Obtiene el ID token del usuario autenticado actual.
 * Lanza error si no hay usuario autenticado.
 */
export async function getAuthToken(): Promise<string> {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error('No hay usuario autenticado');
  }

  return user?.getIdToken?.();
}

/**
 * Obtiene el ID token del usuario autenticado actual, o null si no hay sesión.
 * No lanza error - útil para llamadas opcionales.
 */
export async function getAuthTokenSafe(): Promise<string | null> {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return null;
    return await user?.getIdToken?.();
  } catch {
    return null;
  }
}

/**
 * Wrapper de fetch() que incluye automáticamente el Bearer token.
 * Funciona como drop-in replacement de fetch().
 *
 * @param url - URL de la API (relativa o absoluta)
 * @param options - Opciones de fetch estándar
 * @returns Response de fetch
 * @throws Error si no hay usuario autenticado
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAuthToken();

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);

  // Si el body es un objeto y no se especificó Content-Type, agregar JSON
  if (
    options.body &&
    typeof options.body === 'string' &&
    !headers.has('Content-Type')
  ) {
    try {
      JSON.parse(options.body);
      headers.set('Content-Type', 'application/json');
    } catch {
      // No es JSON, no agregar header
    }
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
