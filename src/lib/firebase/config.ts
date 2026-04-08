/**
 * Firebase Configuration Validation
 *
 * This module validates Firebase Admin SDK configuration
 * and environment variables.
 */

export interface FirebaseConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  storageBucket: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate that all required Firebase Admin environment variables are present
 */
export function validateFirebaseConfig(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  if (!process.env.FIREBASE_PROJECT_ID) {
    errors.push('FIREBASE_PROJECT_ID is not set');
  }

  if (!process.env.FIREBASE_CLIENT_EMAIL) {
    errors.push('FIREBASE_CLIENT_EMAIL is not set');
  }

  if (!process.env.FIREBASE_PRIVATE_KEY) {
    errors.push('FIREBASE_PRIVATE_KEY is not set');
  }

  // Check optional but recommended variables
  if (!process.env.FIREBASE_STORAGE_BUCKET) {
    warnings.push('FIREBASE_STORAGE_BUCKET is not set, will use default');
  }

  // Validate email format
  if (process.env.FIREBASE_CLIENT_EMAIL) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(process.env.FIREBASE_CLIENT_EMAIL)) {
      errors.push('FIREBASE_CLIENT_EMAIL has invalid format');
    }
  }

  // Validate private key format
  if (process.env.FIREBASE_PRIVATE_KEY) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    if (
      !privateKey.includes('BEGIN PRIVATE KEY') ||
      !privateKey.includes('END PRIVATE KEY')
    ) {
      errors.push(
        'FIREBASE_PRIVATE_KEY appears to be invalid (missing BEGIN/END markers)'
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get Firebase configuration from environment variables
 * Throws error if configuration is invalid
 */
export function getFirebaseConfig(): FirebaseConfig {
  const validation = validateFirebaseConfig();

  if (!validation.isValid) {
    throw new Error(
      `Invalid Firebase configuration:\n${validation.errors.join('\n')}`
    );
  }

  // Log warnings if any
  if (validation.warnings.length > 0) {
    console.warn('⚠️  Firebase configuration warnings:');
    validation.warnings.forEach(warning => console.warn(`   ${warning}`));
  }

  return {
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    storageBucket:
      process.env.FIREBASE_STORAGE_BUCKET ||
      `${process.env.FIREBASE_PROJECT_ID}.appspot.com`,
  };
}

/**
 * Detect current environment (development, staging, production)
 */
export function getEnvironment(): 'development' | 'staging' | 'production' {
  const nodeEnv = process.env.NODE_ENV;

  if (nodeEnv === 'production') {
    return 'production';
  }

  if ((nodeEnv as any) === 'staging' || process.env.VERCEL_ENV === 'preview') {
    return 'staging';
  }

  return 'development';
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return getEnvironment() === 'development';
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return getEnvironment() === 'production';
}

/**
 * Log configuration status (without sensitive data)
 */
export function logConfigStatus(): void {
  const env = getEnvironment();
  const validation = validateFirebaseConfig();

  console.log('🔧 Firebase Configuration Status');
  console.log(`   Environment: ${env}`);
  console.log(`   Valid: ${validation.isValid ? '✅' : '❌'}`);

  if (validation.errors.length > 0) {
    console.log('   Errors:');
    validation.errors.forEach(error => console.log(`     - ${error}`));
  }

  if (validation.warnings.length > 0) {
    console.log('   Warnings:');
    validation.warnings.forEach(warning => console.log(`     - ${warning}`));
  }

  if (validation.isValid) {
    console.log(`   Project ID: ${process.env.FIREBASE_PROJECT_ID}`);
    console.log(`   Client Email: ${process.env.FIREBASE_CLIENT_EMAIL}`);
    console.log(
      `   Private Key: ${process.env.FIREBASE_PRIVATE_KEY ? '[SET]' : '[NOT SET]'}`
    );
  }
}
