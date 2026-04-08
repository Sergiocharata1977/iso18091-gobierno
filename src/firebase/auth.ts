import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from './config';

// Helper function to set auth cookie
const setAuthCookie = (token: string | null) => {
  if (typeof document !== 'undefined') {
    if (token) {
      // Set cookie with 7 days expiry
      const expires = new Date();
      expires.setDate(expires.getDate() + 7);
      document.cookie = `auth-token=${token}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
    } else {
      // Remove cookie
      document.cookie =
        'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
  }
};

// Función para iniciar sesión
export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    // Get the ID token and set it as a cookie for middleware
    const token = await userCredential.user.getIdToken();
    setAuthCookie(token);
    return { success: true, user: userCredential.user };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Función para registrar usuario
export const signUp = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    // Get the ID token and set it as a cookie for middleware
    const token = await userCredential.user.getIdToken();
    setAuthCookie(token);
    return { success: true, user: userCredential.user };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Función para cerrar sesión
export const logout = async () => {
  try {
    await signOut(auth);
    // Remove auth cookie
    setAuthCookie(null);
    return { success: true };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Función para escuchar cambios de autenticación
export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, async user => {
    if (user) {
      // Refresh the auth cookie when auth state changes
      try {
        const token = await user.getIdToken();
        setAuthCookie(token);
      } catch {
        // If we can't get the token, clear the cookie
        setAuthCookie(null);
      }
    } else {
      // User logged out, clear the cookie
      setAuthCookie(null);
    }
    callback(user);
  });
};

// Export helper for manual cookie management
export { setAuthCookie };
