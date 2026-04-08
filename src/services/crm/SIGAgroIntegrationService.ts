/**
 * SIGAgroIntegrationService
 * Servicio para integración con SIG-Agro para obtener datos productivos
 * La vinculación se realiza por CUIT/CUIL
 */

import type { DatosProductivosSIGAgro } from '@/types/crm-scoring';

// URL base de SIG-Agro (configurable por entorno)
const SIG_AGRO_BASE_URL =
  process.env.NEXT_PUBLIC_SIG_AGRO_URL || 'http://localhost:3002';

export class SIGAgroIntegrationService {
  /**
   * Consulta datos productivos de un productor por CUIT
   */
  static async getDatosProductivosPorCuit(
    cuit: string,
    apiKey?: string
  ): Promise<DatosProductivosSIGAgro | null> {
    try {
      // Normalizar CUIT (quitar guiones)
      const cuitNormalizado = cuit.replace(/-/g, '');

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(
        `${SIG_AGRO_BASE_URL}/api/integration/productor/${cuitNormalizado}`,
        {
          method: 'GET',
          headers,
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          // No encontrado, retornar null sin error
          return null;
        }
        throw new Error(`SIG-Agro API error: ${response.status}`);
      }

      const data = await response.json();
      return this.transformarRespuesta(data, cuitNormalizado);
    } catch (error) {
      console.error('Error fetching datos productivos:', error);
      // No lanzar error, retornar null para que el scoring continúe sin estos datos
      return null;
    }
  }

  /**
   * Transforma la respuesta de SIG-Agro al formato esperado
   */
  private static transformarRespuesta(
    data: any,
    cuit: string
  ): DatosProductivosSIGAgro {
    // Calcular totales de campos y hectáreas
    const campos = data.campos || [];
    const totalCampos = campos.length;
    let totalHectareas = 0;
    let hectareasPropias = 0;
    let hectareasArrendadas = 0;

    for (const campo of campos) {
      totalHectareas += campo.superficieTotal || 0;
      // Asumimos propiedad si no hay indicador de arrendamiento
      if (campo.esArrendado) {
        hectareasArrendadas += campo.superficieTotal || 0;
      } else {
        hectareasPropias += campo.superficieTotal || 0;
      }
    }

    // Procesar cultivos actuales
    const cultivosMap = new Map<
      string,
      { hectareas: number; rindeEstimado: number; valorEstimado: number }
    >();

    for (const campo of campos) {
      for (const lote of campo.lotes || []) {
        if (lote.cultivoActual) {
          const existing = cultivosMap.get(lote.cultivoActual) || {
            hectareas: 0,
            rindeEstimado: 0,
            valorEstimado: 0,
          };
          existing.hectareas += lote.superficie || 0;
          existing.rindeEstimado =
            (existing.rindeEstimado + (lote.rindeEstimado || 0)) / 2;
          existing.valorEstimado +=
            (lote.superficie || 0) *
            (lote.rindeEstimado || 0) *
            (lote.precioEstimado || 0);
          cultivosMap.set(lote.cultivoActual, existing);
        }
      }
    }

    const cultivos = Array.from(cultivosMap.entries()).map(([tipo, datos]) => ({
      tipo,
      hectareas: datos.hectareas,
      rindeEstimado: datos.rindeEstimado,
      valorEstimado: datos.valorEstimado,
    }));

    // Procesar histórico de rindes
    const historicoRindes = (data.campanias || []).map((c: any) => ({
      campania: c.nombre,
      cultivo: c.cultivo,
      rinde: c.rendimiento || 0,
    }));

    // Calcular valor estimado de tierras (simplificado)
    const valorTierraEstimado = hectareasPropias * 5000; // USD 5000/ha promedio

    // Calcular valor de cosecha estimada
    const valorCosechaEstimada = cultivos.reduce(
      (sum, c) => sum + c.valorEstimado,
      0
    );

    return {
      cuit,
      productorId: data.productorId || '',
      productorNombre: data.productorNombre || data.razonSocial || '',
      totalCampos,
      totalHectareas,
      hectareasPropias,
      hectareasArrendadas,
      cultivos,
      historicoRindes,
      valorTierraEstimado,
      valorCosechaEstimada,
      fechaConsulta: new Date().toISOString(),
      organizacionOrigen: 'SIG-Agro',
    };
  }

  /**
   * Verifica la conexión con SIG-Agro
   */
  static async verificarConexion(): Promise<boolean> {
    try {
      const response = await fetch(`${SIG_AGRO_BASE_URL}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Obtiene resumen de datos para el scoring
   */
  static async getResumenParaScoring(cuit: string): Promise<{
    totalHectareas: number;
    hectareasPropias: number;
    valorTierraEstimado: number;
    cultivoPrincipal: string;
    rindePromedio: number;
  } | null> {
    const datos = await this.getDatosProductivosPorCuit(cuit);

    if (!datos) {
      return null;
    }

    // Encontrar cultivo principal (mayor superficie)
    const cultivoPrincipal =
      datos.cultivos.length > 0
        ? datos.cultivos.reduce((max, c) =>
            c.hectareas > max.hectareas ? c : max
          ).tipo
        : 'N/A';

    // Calcular rinde promedio
    const rindePromedio =
      datos.historicoRindes.length > 0
        ? datos.historicoRindes.reduce((sum, h) => sum + h.rinde, 0) /
          datos.historicoRindes.length
        : 0;

    return {
      totalHectareas: datos.totalHectareas,
      hectareasPropias: datos.hectareasPropias,
      valorTierraEstimado: datos.valorTierraEstimado,
      cultivoPrincipal,
      rindePromedio,
    };
  }
}
