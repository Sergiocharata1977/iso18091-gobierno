/**
 * Tipos para Integraciones Externas y Bóveda de Secretos (Vault)
 *
 * Define cómo se almacenan y gestionan las credenciales para conectar
 * con sistemas externos (ERP, AFIP, Bancos, etc.) de forma segura.
 */

import { Timestamp } from 'firebase/firestore';

export type IntegrationType =
  | 'rest_api'
  | 'soap_api'
  | 'web_automation'
  | 'database'
  | 'google_workspace';

export type AuthMethod =
  | 'none'
  | 'basic_auth' // user + pass
  | 'bearer_token' // token estático
  | 'api_key' // header key + value
  | 'oauth2' // client_id + secret + refresh_token
  | 'certificate'; // .p12 / .pem (ej: AFIP)

export type ConnectionStatus = 'active' | 'paused' | 'error' | 'expired';

// ============================================
// INTEGRATION CONNECTION (La "Llave")
// ============================================

export interface IntegrationConnection {
  id: string;
  organization_id: string;

  // Metadatos visibles
  name: string; // Ej: "ERP Tango", "MercadoPago"
  type: IntegrationType;
  base_url?: string;
  description?: string;

  // Configuración de Autenticación
  auth_method: AuthMethod;

  // Credenciales ENCRIPTADAS (Nunca texto plano en DB)
  // Se desencriptan solo en el momento de uso (Runtime) y nunca se envían al frontend
  encrypted_credentials: {
    data: string; // Base64 del JSON encriptado
    iv: string; // Vector de inicialización
    version: number; // Para rotación de claves
  };

  // Alcance y Seguridad
  scopes: string[]; // Qué puede hacer esta conexión: ["erp.orders.read", "erp.orders.write"]
  whitelisted_agents?: string[]; // IDs de AgentProfiles permitidos (null = todos)

  status: ConnectionStatus;
  last_used_at?: Date | Timestamp;
  error_message?: string;

  created_by: string; // User ID
  created_at: Date | Timestamp;
  updated_at: Date | Timestamp;
}

// ============================================
// CREDENTIALS SCHEMA (Lo que va dentro de encrypted_credentials)
// ============================================

export interface CredentialsPayload {
  username?: string;
  password?: string;
  api_key?: string;
  header_name?: string;
  token?: string;
  client_id?: string;
  client_secret?: string;
  certificate_content?: string;
  certificate_password?: string;
  [key: string]: any; // Campos custom
}

// ============================================
// CONNECTION CONSENT (Auditoría de Acceso)
// ============================================

export interface ConnectionUsageLog {
  id: string;
  organization_id: string;
  connection_id: string;
  agent_instance_id: string; // Quién lo usó
  user_id: string;
  intent: string; // Para qué lo usó
  timestamp: Date | Timestamp;
  success: boolean;
  metadata?: any;
}
