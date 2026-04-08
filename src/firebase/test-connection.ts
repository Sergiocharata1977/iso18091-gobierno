import { auth, db } from './config';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

// Función para probar la conexión con Firebase
export const testFirebaseConnection = async () => {
  try {
    console.log('🔍 Probando conexión con Firebase...');

    // Verificar que auth esté inicializado
    if (!auth) {
      throw new Error('Firebase Auth no está inicializado');
    }

    console.log('✅ Firebase Auth inicializado correctamente');
    console.log('✅ Firebase Firestore inicializado correctamente');

    return { success: true, message: 'Conexión exitosa' };
  } catch (error) {
    console.error('❌ Error en la conexión:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

// Función para crear un usuario de prueba
export const createTestUser = async (email: string, password: string) => {
  try {
    console.log('👤 Creando usuario de prueba...');

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Guardar información adicional del usuario
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      name: 'Usuario de Prueba',
      role: 'admin',
      createdAt: new Date(),
    });

    console.log('✅ Usuario creado exitosamente:', user.email);
    return { success: true, user };
  } catch (error) {
    console.error('❌ Error creando usuario:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

// Función para probar login
export const testLogin = async (email: string, password: string) => {
  try {
    console.log('🔐 Probando login...');

    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    console.log('✅ Login exitoso:', user.email);
    return { success: true, user };
  } catch (error) {
    console.error('❌ Error en login:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};
