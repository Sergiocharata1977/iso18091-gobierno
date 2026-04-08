/**
 * Vault Service
 *
 * Gestiona el ciclo de vida de las conexiones (IntegrationConnection) y el acceso a credenciales.
 */

import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  ConnectionUsageLog,
  CredentialsPayload,
  IntegrationConnection,
} from '@/types/integrations';
import { Timestamp } from 'firebase-admin/firestore';
import { IntegrationEncryptionService } from './IntegrationEncryptionService';

const CONNECTIONS_COLLECTION = 'integration_connections';
const USAGE_COLLECTION = 'integration_usage_logs';

export class VaultService {
  /**
   * Crea o actualiza una conexión segura
   */
  static async saveConnection(
    data: Omit<
      IntegrationConnection,
      'encrypted_credentials' | 'created_at' | 'updated_at'
    >,
    credentials: CredentialsPayload
  ): Promise<string> {
    const db = getAdminFirestore();

    // 1. Encriptar credenciales
    const { encryptedData, iv } =
      IntegrationEncryptionService.encrypt(credentials);

    const connectionData = {
      ...data,
      encrypted_credentials: {
        data: encryptedData,
        iv: iv,
        version: 1,
      },
      updated_at: Timestamp.now().toDate(),
    };

    if (!data.id) {
      // Create
      const ref = await db.collection(CONNECTIONS_COLLECTION).add({
        ...connectionData,
        created_at: Timestamp.now().toDate(),
      });
      return ref.id;
    } else {
      // Update
      await db
        .collection(CONNECTIONS_COLLECTION)
        .doc(data.id)
        .update(connectionData);
      return data.id;
    }
  }

  /**
   * Obtiene una conexión y DESENCRIPTA sus credenciales para uso interno (Runtime)
   * ¡NUNCA EXPONER ESTO AL CLIENTE!
   */
  static async getCredentialsForRuntime(
    connectionId: string,
    organizationId: string
  ): Promise<{
    connection: IntegrationConnection;
    credentials: CredentialsPayload;
  } | null> {
    const db = getAdminFirestore();

    const doc = await db
      .collection(CONNECTIONS_COLLECTION)
      .doc(connectionId)
      .get();

    if (!doc.exists) return null;

    const connection = { id: doc.id, ...doc.data() } as IntegrationConnection;

    // Validar Org
    if (connection.organization_id !== organizationId) {
      throw new Error('Unauthorized access to connection');
    }

    if (connection.status !== 'active') {
      throw new Error(`Connection is ${connection.status}`);
    }

    // Desencriptar
    try {
      const credentials = IntegrationEncryptionService.decrypt(
        connection.encrypted_credentials.data,
        connection.encrypted_credentials.iv
      );

      // Actualizar last_used
      await db.collection(CONNECTIONS_COLLECTION).doc(connectionId).update({
        last_used_at: Timestamp.now().toDate(),
      });

      return { connection, credentials };
    } catch (error) {
      console.error(
        `[VaultService] Decryption failed for ${connectionId}`,
        error
      );
      return null;
    }
  }

  /**
   * Registra el uso de una conexión para auditoría
   */
  static async logUsage(
    log: Omit<ConnectionUsageLog, 'id' | 'timestamp'>
  ): Promise<void> {
    const db = getAdminFirestore();
    await db.collection(USAGE_COLLECTION).add({
      ...log,
      timestamp: Timestamp.now().toDate(),
    });
  }
}
