/**
 * Servicio de Encriptación para Credenciales de Integración (AES-256)
 * Se encarga de proteger secretos antes de guardarlos en Firestore.
 *
 * NOTA: En producción, MASTER_KEY debería venir de Google Secret Manager.
 * Por ahora, usaremos una variable de entorno o fallback para desarrollo.
 */

import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
// Debe ser 32 bytes para AES-256
const MASTER_KEY =
  process.env.INTEGRATION_MASTER_KEY || 'development_master_key_32_bytes_!!';

export class IntegrationEncryptionService {
  /**
   * Encripta un objeto de credenciales
   */
  static encrypt(data: object): { encryptedData: string; iv: string } {
    const iv = crypto.randomBytes(16); // IV aleatorio para cada encriptación
    const cipher = crypto.createCipheriv(
      ALGORITHM,
      Buffer.from(MASTER_KEY),
      iv
    );

    let encrypted = cipher.update(JSON.stringify(data));
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return {
      encryptedData: encrypted.toString('hex'),
      iv: iv.toString('hex'),
    };
  }

  /**
   * Desencripta credenciales para usarlas en runtime
   */
  static decrypt(encryptedData: string, ivHex: string): object {
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = Buffer.from(encryptedData, 'hex');

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(MASTER_KEY),
      iv
    );

    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return JSON.parse(decrypted.toString());
  }

  /**
   * Valida que la llave maestra tenga la longitud correcta
   */
  static validateKey() {
    if (Buffer.from(MASTER_KEY).length !== 32) {
      throw new Error('INTEGRATION_MASTER_KEY must be exactly 32 bytes.');
    }
  }
}
