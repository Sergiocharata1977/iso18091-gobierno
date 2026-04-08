/**
 * Utilidades de Encriptación AES-256
 * Para proteger API Keys y datos sensibles
 */

import crypto from 'crypto';

// Configuración de encriptación
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 64;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

/**
 * Obtiene la clave maestra del entorno
 * IMPORTANTE: En producción, usar un servicio de secrets (AWS KMS, etc.)
 */
function getMasterKey(): string {
  const key = process.env.ENCRYPTION_MASTER_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_MASTER_KEY not configured');
  }
  return key;
}

/**
 * Deriva una clave de encriptación del master key
 */
function deriveKey(salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(
    getMasterKey(),
    salt,
    ITERATIONS,
    KEY_LENGTH,
    'sha512'
  );
}

/**
 * Encripta un texto plano con AES-256-GCM
 * Retorna: base64(salt + iv + tag + encrypted)
 */
export function encrypt(plainText: string): string {
  // Generar salt e IV aleatorios
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  // Derivar clave
  const key = deriveKey(salt);

  // Crear cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // Encriptar
  const encrypted = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ]);

  // Obtener tag de autenticación
  const tag = cipher.getAuthTag();

  // Concatenar todo: salt + iv + tag + encrypted
  const result = Buffer.concat([salt, iv, tag, encrypted]);

  return result.toString('base64');
}

/**
 * Desencripta un texto encriptado con AES-256-GCM
 */
export function decrypt(encryptedText: string): string {
  // Decodificar de base64
  const buffer = Buffer.from(encryptedText, 'base64');

  // Extraer componentes
  const salt = buffer.subarray(0, SALT_LENGTH);
  const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = buffer.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + TAG_LENGTH
  );
  const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

  // Derivar clave
  const key = deriveKey(salt);

  // Crear decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  // Desencriptar
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * Genera un hash SHA-256 de un texto
 */
export function hash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Genera una clave aleatoria para uso como API Key
 */
export function generateRandomKey(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64url');
}

/**
 * Obtiene los últimos N caracteres de un texto (para mostrar parcialmente)
 */
export function getLastChars(text: string, n: number = 4): string {
  return `...${text.slice(-n)}`;
}

/**
 * Valida que la encriptación esté configurada correctamente
 */
export function validateCryptoConfig(): boolean {
  try {
    const testText = 'test_encryption_validation';
    const encrypted = encrypt(testText);
    const decrypted = decrypt(encrypted);
    return decrypted === testText;
  } catch {
    return false;
  }
}

// Exportar servicio como clase para compatibilidad con interface
export const CryptoService = {
  encrypt,
  decrypt,
  hash,
  generateKey: generateRandomKey,
};

export default CryptoService;
