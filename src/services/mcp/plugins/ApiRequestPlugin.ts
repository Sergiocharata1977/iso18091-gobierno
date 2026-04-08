/**
 * Plugin Estándar: API Request Executor
 * Permite a los agentes realizar peticiones HTTP autenticadas
 * usando credenciales gestionadas por la Bóveda (Vault).
 */

import { VaultService } from '@/services/integrations/VaultService';
import { AuthMethod, CredentialsPayload } from '@/types/integrations';

export interface ApiPluginPayload {
  connection_id: string; // ID de la conexión en el Vault
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string; // Path relativo o absoluto si la conexión no tiene base_url
  body?: any;
  query_params?: Record<string, string>;
  headers?: Record<string, string>;
}

export class ApiRequestPlugin {
  /**
   * Ejecuta una petición API segura
   */
  static async execute(
    organizationId: string,
    agentInstanceId: string,
    userId: string,
    payload: ApiPluginPayload
  ): Promise<any> {
    // 1. Obtener credenciales desencriptadas
    const vaultData = await VaultService.getCredentialsForRuntime(
      payload.connection_id,
      organizationId
    );

    if (!vaultData) {
      throw new Error(
        `Connection ${payload.connection_id} not found or inaccessible.`
      );
    }

    const { connection, credentials } = vaultData;

    // 2. Construir la petición básica
    const baseURL = connection.base_url?.replace(/\/$/, '') || '';
    let url = payload.endpoint.startsWith('http')
      ? payload.endpoint
      : `${baseURL}${payload.endpoint.startsWith('/') ? '' : '/'}${payload.endpoint}`;

    // Append query params
    if (payload.query_params) {
      const params = new URLSearchParams(payload.query_params);
      url += `?${params.toString()}`;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...payload.headers,
    };

    // 3. Inyectar Autenticación
    this.injectAuth(headers, connection.auth_method, credentials);

    const config: RequestInit = {
      method: payload.method,
      headers: headers,
      body: payload.body ? JSON.stringify(payload.body) : undefined,
    };

    // 4. Ejecutar Petición
    try {
      const response = await fetch(url, config);

      const responseData = await response.json().catch(() => null); // Handle non-JSON responses gracefully

      // 5. Registrar Auditoría
      await VaultService.logUsage({
        organization_id: organizationId,
        connection_id: connection.id,
        agent_instance_id: agentInstanceId,
        user_id: userId,
        intent: 'api.request.execute',
        success: response.ok,
        metadata: {
          method: payload.method,
          url: url,
          status: response.status,
        },
      });

      if (!response.ok) {
        throw new Error(
          `API Request Failed with status ${response.status}: ${JSON.stringify(responseData)}`
        );
      }

      return {
        status: response.status,
        data: responseData,
        headers: Object.fromEntries(response.headers.entries()),
      };
    } catch (error: any) {
      // Registrar Fallo
      await VaultService.logUsage({
        organization_id: organizationId,
        connection_id: connection.id,
        agent_instance_id: agentInstanceId,
        user_id: userId,
        intent: 'api.request.execute',
        success: false,
        metadata: {
          method: payload.method,
          url: url,
          error: error.message,
        },
      });

      throw new Error(`API Request Failed: ${error.message}`);
    }
  }

  /**
   * Inyecta las credenciales en los headers
   */
  private static injectAuth(
    headers: Record<string, string>,
    method: AuthMethod,
    creds: CredentialsPayload
  ) {
    switch (method) {
      case 'basic_auth':
        if (creds.username && creds.password) {
          const token = Buffer.from(
            `${creds.username}:${creds.password}`
          ).toString('base64');
          headers['Authorization'] = `Basic ${token}`;
        }
        break;

      case 'bearer_token':
        if (creds.token) {
          headers['Authorization'] = `Bearer ${creds.token}`;
        }
        break;

      case 'api_key':
        if (creds.header_name && creds.api_key) {
          headers[creds.header_name] = creds.api_key;
        }
        break;

      case 'oauth2':
        if (creds.access_token) {
          headers['Authorization'] = `Bearer ${creds.access_token}`;
        }
        break;

      case 'none':
      default:
        break;
    }
  }
}
