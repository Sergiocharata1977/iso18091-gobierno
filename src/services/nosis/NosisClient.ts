/**
 * NosisClient
 * Cliente para API Nosis VR con gestión de múltiples API Keys
 * Multi-tenant con encriptación AES-256 para credenciales
 */

import { db } from '@/firebase/config';
import { decrypt, encrypt, getLastChars } from '@/lib/crypto';
import type {
  AddApiKeyData,
  ConsultarNosisData,
  CreateNosisConfigData,
  NosisApiKey,
  NosisConfig,
  NosisConsulta,
  NosisConsultaResponse,
  NosisResultado,
  TipoConsultaNosis,
} from '@/types/nosis';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';

const COLLECTION_CONFIG = 'nosis_config';
const COLLECTION_CONSULTAS = 'nosis_consultas';
const COLLECTION_ERRORS = 'nosis_errors';

export class NosisClient {
  /**
   * Obtiene la configuración de Nosis para una organización
   */
  static async getConfig(organizationId: string): Promise<NosisConfig | null> {
    try {
      const q = query(
        collection(db, COLLECTION_CONFIG),
        where('organizationId', '==', organizationId),
        limit(1)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data(),
      } as NosisConfig;
    } catch (error) {
      console.error('Error getting Nosis config:', error);
      throw new Error('Failed to get Nosis config');
    }
  }

  /**
   * Crea configuración inicial de Nosis para una organización
   */
  static async createConfig(
    organizationId: string,
    data: CreateNosisConfigData,
    userId: string
  ): Promise<string> {
    try {
      const now = new Date().toISOString();

      const configData: Omit<NosisConfig, 'id'> = {
        organizationId,
        apiKeys: [],
        endpoint: data.endpoint,
        endpointSandbox: data.endpointSandbox,
        usarSandbox: data.usarSandbox,
        timeout: data.timeout || 30000,
        reintentos: data.reintentos || 3,
        bloqueoAutomatico: data.bloqueoAutomatico || {
          habilitado: false,
          umbralScore: 400,
          accionBloqueo: 'alertar',
        },
        notificaciones: {
          errorConexion: true,
          consultaExitosa: false,
          scoreDebajo: true,
          emailsNotificacion: [],
        },
        estadoConexion: 'desconectado',
        createdAt: now,
        updatedAt: now,
        updatedBy: userId,
      };

      const docRef = await addDoc(
        collection(db, COLLECTION_CONFIG),
        configData
      );
      return docRef.id;
    } catch (error) {
      console.error('Error creating Nosis config:', error);
      throw new Error('Failed to create Nosis config');
    }
  }

  /**
   * Agrega una nueva API Key (encriptada)
   */
  static async addApiKey(
    organizationId: string,
    data: AddApiKeyData,
    userId: string
  ): Promise<void> {
    try {
      const config = await this.getConfig(organizationId);

      if (!config) {
        throw new Error('Configuración de Nosis no encontrada');
      }

      // Verificar límite de 3 keys
      if (config.apiKeys.length >= 3) {
        throw new Error('Máximo 3 API Keys permitidas');
      }

      const now = new Date().toISOString();

      // Encriptar la API Key
      const keyEncriptada = encrypt(data.apiKey);

      const newKey: NosisApiKey = {
        id: `key_${Date.now()}`,
        nombre: data.nombre,
        keyEncriptada,
        ultimosDigitos: getLastChars(data.apiKey, 4),
        estado: 'activa',
        fechaCreacion: now,
        usosTotal: 0,
      };

      const docRef = doc(db, COLLECTION_CONFIG, config.id);
      await updateDoc(docRef, {
        apiKeys: [...config.apiKeys, newKey],
        updatedAt: now,
        updatedBy: userId,
      });
    } catch (error) {
      console.error('Error adding API key:', error);
      throw error;
    }
  }

  /**
   * Desactiva una API Key
   */
  static async desactivarApiKey(
    organizationId: string,
    keyId: string,
    userId: string
  ): Promise<void> {
    try {
      const config = await this.getConfig(organizationId);

      if (!config) {
        throw new Error('Configuración no encontrada');
      }

      const updatedKeys = config.apiKeys.map(k =>
        k.id === keyId ? { ...k, estado: 'inactiva' as const } : k
      );

      const docRef = doc(db, COLLECTION_CONFIG, config.id);
      await updateDoc(docRef, {
        apiKeys: updatedKeys,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      });
    } catch (error) {
      console.error('Error desactivando API key:', error);
      throw error;
    }
  }

  /**
   * Realiza una consulta a Nosis
   */
  static async consultar(
    organizationId: string,
    data: ConsultarNosisData,
    userId: string
  ): Promise<NosisConsultaResponse> {
    const startTime = Date.now();
    let consultaId = '';

    try {
      const config = await this.getConfig(organizationId);

      if (!config) {
        throw new Error('Configuración de Nosis no encontrada');
      }

      // Obtener API Key activa
      const activeKey = config.apiKeys.find(k => k.estado === 'activa');
      if (!activeKey) {
        throw new Error('No hay API Keys activas');
      }

      // Desencriptar API Key
      const apiKey = decrypt(activeKey.keyEncriptada);

      // Crear registro de consulta
      const consultaData: Omit<NosisConsulta, 'id'> = {
        organizationId,
        clienteId: data.clienteId,
        clienteCuit: data.cuit,
        clienteNombre: '',
        tipoConsulta: data.tipoConsulta,
        requestTimestamp: new Date().toISOString(),
        tiempoRespuestaMs: 0,
        estado: 'procesando',
        apiKeyUsada: activeKey.id,
        usuarioSolicitante: userId,
        createdAt: new Date().toISOString(),
      };

      const consultaRef = await addDoc(
        collection(db, COLLECTION_CONSULTAS),
        consultaData
      );
      consultaId = consultaRef.id;

      // Determinar endpoint
      const endpoint =
        config.usarSandbox && config.endpointSandbox
          ? config.endpointSandbox
          : config.endpoint;

      // Construir request según tipo de consulta
      const requestBody = this.buildRequestBody(data.cuit, data.tipoConsulta);

      // Realizar llamada a Nosis
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);

      let response: Response;
      let retries = 0;

      while (retries <= config.reintentos) {
        try {
          response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          });
          break;
        } catch (fetchError) {
          retries++;
          if (retries > config.reintentos) {
            throw fetchError;
          }
          await new Promise(r => setTimeout(r, 1000 * retries));
        }
      }

      clearTimeout(timeoutId);

      const tiempoRespuestaMs = Date.now() - startTime;

      if (!response!.ok) {
        const errorText = await response!.text();
        throw new Error(`Nosis API error: ${response!.status} - ${errorText}`);
      }

      // Parsear respuesta
      const responseData = await response!.json();
      const resultado = this.parseNosisResponse(responseData, data.cuit);

      // Actualizar consulta con resultado exitoso
      await updateDoc(doc(db, COLLECTION_CONSULTAS, consultaId), {
        responseTimestamp: new Date().toISOString(),
        responseJSON: responseData,
        tiempoRespuestaMs,
        scoreObtenido: resultado.score,
        categoriaRiesgo: resultado.scoreCategoria,
        datosExtraidos: resultado,
        estado: 'exitoso',
      });

      // Actualizar contador de uso de la key
      const updatedKeys = config.apiKeys.map(k =>
        k.id === activeKey.id
          ? {
              ...k,
              usosTotal: k.usosTotal + 1,
              ultimoUso: new Date().toISOString(),
            }
          : k
      );
      await updateDoc(doc(db, COLLECTION_CONFIG, config.id), {
        apiKeys: updatedKeys,
        estadoConexion: 'conectado',
        ultimaVerificacion: new Date().toISOString(),
      });

      return {
        success: true,
        consultaId,
        resultado,
        tiempoMs: tiempoRespuestaMs,
      };
    } catch (error: any) {
      const tiempoRespuestaMs = Date.now() - startTime;

      // Registrar error
      if (consultaId) {
        await updateDoc(doc(db, COLLECTION_CONSULTAS, consultaId), {
          estado: 'error',
          errorCodigo: error.code || 'UNKNOWN',
          errorMensaje: error.message,
          tiempoRespuestaMs,
        });
      }

      // Log de error
      await addDoc(collection(db, COLLECTION_ERRORS), {
        organizationId,
        consultaId,
        timestamp: new Date().toISOString(),
        nivel: 'error',
        codigo: error.code || 'UNKNOWN',
        mensaje: error.message,
        cuitConsultado: data.cuit,
        resuelto: false,
      });

      return {
        success: false,
        consultaId,
        error: {
          codigo: error.code || 'UNKNOWN',
          mensaje: error.message,
        },
        tiempoMs: tiempoRespuestaMs,
      };
    }
  }

  /**
   * Construye el body del request según tipo de consulta
   */
  private static buildRequestBody(
    cuit: string,
    tipo: TipoConsultaNosis
  ): object {
    const cuitNormalizado = cuit.replace(/-/g, '');

    const baseRequest = {
      documento: cuitNormalizado,
      tipoDocumento: cuitNormalizado.length === 11 ? 'CUIT' : 'CUIL',
    };

    switch (tipo) {
      case 'veraz':
        return { ...baseRequest, informe: 'VERAZ' };
      case 'nosis_score':
        return { ...baseRequest, informe: 'SCORE' };
      case 'situacion_crediticia':
        return { ...baseRequest, informe: 'BCRA' };
      case 'informe_comercial':
        return { ...baseRequest, informe: 'COMERCIAL' };
      case 'completo':
      default:
        return { ...baseRequest, informe: 'COMPLETO' };
    }
  }

  /**
   * Parsea la respuesta de Nosis al formato interno
   */
  private static parseNosisResponse(data: any, cuit: string): NosisResultado {
    // Esta implementación depende del formato real de respuesta de Nosis
    // Se adapta según la documentación de la API
    return {
      cuit,
      razonSocial: data.razonSocial || data.nombre || '',
      tipoPersona: data.tipoPersona === 'J' ? 'juridica' : 'fisica',
      score: data.score || data.nosis?.score || 0,
      scoreCategoria: this.mapScoreToCategoria(data.score || 0),
      scoreFechaCalculo: data.fechaScore || new Date().toISOString(),
      bcra: {
        situacionActual: data.bcra?.situacion || 1,
        situacionHistorica: data.bcra?.peorSituacion || 1,
        entidadesInformantes: data.bcra?.entidades || 0,
        montoDeuda: data.bcra?.deuda || 0,
        montoEnSituacion2a5: data.bcra?.deudaIrregular || 0,
      },
      cheques: {
        rechazados: data.cheques?.rechazados || 0,
        montoRechazados: data.cheques?.monto || 0,
        ultimoRechazo: data.cheques?.ultimoRechazo,
      },
      juicios: {
        cantidad: data.juicios?.cantidad || 0,
        montoTotal: data.juicios?.monto || 0,
        activos: data.juicios?.activos || 0,
      },
      concursos: {
        presentados: data.concursos?.presenta || false,
        fechaPresentacion: data.concursos?.fecha,
        estado: data.concursos?.estado,
      },
      inhabilitaciones: {
        cantidad: data.inhabilitaciones?.cantidad || 0,
        vigentes: data.inhabilitaciones?.vigentes || false,
        motivos: data.inhabilitaciones?.motivos,
      },
      consultasPrevias: {
        ultimos30Dias: data.consultas?.ultimos30 || 0,
        ultimos90Dias: data.consultas?.ultimos90 || 0,
        ultimos365Dias: data.consultas?.ultimos365 || 0,
      },
      fechaActualizacion: new Date().toISOString(),
    };
  }

  /**
   * Mapea score numérico a categoría
   */
  private static mapScoreToCategoria(
    score: number
  ): 'A' | 'B' | 'C' | 'D' | 'E' {
    if (score >= 800) return 'A';
    if (score >= 600) return 'B';
    if (score >= 400) return 'C';
    if (score >= 200) return 'D';
    return 'E';
  }

  /**
   * Obtiene las últimas consultas de una organización
   */
  static async getUltimasConsultas(
    organizationId: string,
    cantidad: number = 10
  ): Promise<NosisConsulta[]> {
    try {
      const q = query(
        collection(db, COLLECTION_CONSULTAS),
        where('organizationId', '==', organizationId),
        orderBy('createdAt', 'desc'),
        limit(cantidad)
      );
      const snapshot = await getDocs(q);

      return snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
      })) as NosisConsulta[];
    } catch (error) {
      console.error('Error getting últimas consultas:', error);
      return [];
    }
  }

  /**
   * Obtiene la última consulta de un CUIT específico
   */
  static async getUltimaConsultaCuit(
    organizationId: string,
    cuit: string
  ): Promise<NosisConsulta | null> {
    try {
      const q = query(
        collection(db, COLLECTION_CONSULTAS),
        where('organizationId', '==', organizationId),
        where('clienteCuit', '==', cuit),
        where('estado', '==', 'exitoso'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) return null;

      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data(),
      } as NosisConsulta;
    } catch (error) {
      console.error('Error getting última consulta CUIT:', error);
      return null;
    }
  }

  /**
   * Verifica la conexión con Nosis
   */
  static async verificarConexion(organizationId: string): Promise<boolean> {
    try {
      const config = await this.getConfig(organizationId);
      if (!config) return false;

      const endpoint =
        config.usarSandbox && config.endpointSandbox
          ? config.endpointSandbox
          : config.endpoint;

      const response = await fetch(`${endpoint}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      const connected = response.ok;

      // Actualizar estado
      await updateDoc(doc(db, COLLECTION_CONFIG, config.id), {
        estadoConexion: connected ? 'conectado' : 'error',
        ultimaVerificacion: new Date().toISOString(),
      });

      return connected;
    } catch {
      return false;
    }
  }
}
