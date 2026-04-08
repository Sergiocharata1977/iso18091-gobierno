import { getAuth } from 'firebase/auth';

const TENANT_SLUG = process.env.NEXT_PUBLIC_AGRO_TENANT_SLUG ?? 'agrobiciufa';

export async function fetchPortal(
  path: string,
  options?: RequestInit
): Promise<Response> {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('No hay usuario autenticado');
  }

  const token = await currentUser.getIdToken();
  const sep = path.includes('?') ? '&' : '?';
  const url = `${path}${sep}tenant=${TENANT_SLUG}`;
  const headers = new Headers(options?.headers);

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  headers.set('Authorization', `Bearer ${token}`);

  return fetch(url, {
    ...options,
    headers,
  });
}
