/**
 * PenetracionMercadoService
 * Servicio para cálculo de métricas de penetración de mercado (ISO 9001)
 */

import type {
  ClienteCRM,
  ClienteNoAtendido,
  MetricasPenetracionMercado,
  OportunidadPerdida,
} from '@/types/crm';
import { TipoCliente } from '@/types/crm';
import { ClienteCRMService } from './ClienteCRMService';

export class PenetracionMercadoService {
  /**
   * Calcula métricas de penetración de mercado para un período
   */
  static async calcularMetricas(
    fechaInicio: string,
    fechaFin: string
  ): Promise<MetricasPenetracionMercado> {
    try {
      // Obtener todos los clientes activos
      const clientes = await ClienteCRMService.getAll();

      // Contadores por tipo
      const totalPosiblesClientes = clientes.filter(
        c => c.tipo_cliente === TipoCliente.POSIBLE_CLIENTE
      ).length;

      const totalClientesFrecuentes = clientes.filter(
        c => c.tipo_cliente === TipoCliente.CLIENTE_FRECUENTE
      ).length;

      const totalClientesAntiguos = clientes.filter(
        c => c.tipo_cliente === TipoCliente.CLIENTE_ANTIGUO
      ).length;

      // Calcular conversión
      const oportunidadesAbiertas = clientes.filter(
        c => c.tipo_cliente === TipoCliente.POSIBLE_CLIENTE
      ).length;

      // Oportunidades ganadas (clientes que se convirtieron en el período)
      const oportunidadesGanadas = clientes.filter(
        c =>
          c.tipo_cliente === TipoCliente.CLIENTE_FRECUENTE &&
          c.fecha_primera_compra &&
          c.fecha_primera_compra >= fechaInicio &&
          c.fecha_primera_compra <= fechaFin
      ).length;

      // Oportunidades perdidas (clientes rechazados en el período)
      const oportunidadesPerdidas = 0; // Se calculará con estados "Rechazado"

      const tasaConversion =
        oportunidadesAbiertas > 0
          ? (oportunidadesGanadas / oportunidadesAbiertas) * 100
          : 0;

      // Calcular retención
      const clientesRetenidos = totalClientesFrecuentes;
      const clientesPerdidos = totalClientesAntiguos;

      const tasaRetencion =
        clientesRetenidos + clientesPerdidos > 0
          ? (clientesRetenidos / (clientesRetenidos + clientesPerdidos)) * 100
          : 0;

      // Clientes sin contacto
      const posiblesSinContacto30d = await this.getClientesSinContacto(30);
      const posiblesSinContacto60d = await this.getClientesSinContacto(60);
      const posiblesSinContacto90d = await this.getClientesSinContacto(90);

      // Pipeline
      const montoTotalPipeline = clientes
        .filter(c => c.tipo_cliente === TipoCliente.POSIBLE_CLIENTE)
        .reduce((sum, c) => sum + (c.monto_estimado_compra || 0), 0);

      const montoPromedioOportunidad =
        oportunidadesAbiertas > 0
          ? montoTotalPipeline / oportunidadesAbiertas
          : 0;

      // Distribución por estado
      const distribucionPorEstado =
        await this.getDistribucionPorEstado(clientes);

      // Distribución por riesgo
      const distribucionPorRiesgo =
        await this.getDistribucionPorRiesgo(clientes);

      return {
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        total_posibles_clientes: totalPosiblesClientes,
        total_clientes_frecuentes: totalClientesFrecuentes,
        total_clientes_antiguos: totalClientesAntiguos,
        oportunidades_abiertas: oportunidadesAbiertas,
        oportunidades_ganadas: oportunidadesGanadas,
        oportunidades_perdidas: oportunidadesPerdidas,
        tasa_conversion: Number(tasaConversion.toFixed(2)),
        clientes_retenidos: clientesRetenidos,
        clientes_perdidos: clientesPerdidos,
        tasa_retencion: Number(tasaRetencion.toFixed(2)),
        posibles_clientes_sin_contacto_30d: posiblesSinContacto30d.length,
        posibles_clientes_sin_contacto_60d: posiblesSinContacto60d.length,
        posibles_clientes_sin_contacto_90d: posiblesSinContacto90d.length,
        monto_total_pipeline: montoTotalPipeline,
        monto_promedio_oportunidad: Number(montoPromedioOportunidad.toFixed(2)),
        distribucion_por_estado: distribucionPorEstado,
        distribucion_por_riesgo: distribucionPorRiesgo,
      };
    } catch (error) {
      console.error('Error calculando métricas:', error);
      throw new Error('Failed to calcular métricas');
    }
  }

  /**
   * Obtiene clientes sin contacto en X días
   */
  private static async getClientesSinContacto(
    dias: number
  ): Promise<ClienteCRM[]> {
    return await ClienteCRMService.getClientesSinContacto(dias);
  }

  /**
   * Obtiene lista de clientes no atendidos con prioridad
   */
  static async getClientesNoAtendidos(): Promise<ClienteNoAtendido[]> {
    try {
      const clientes30d = await this.getClientesSinContacto(30);
      const clientes60d = await this.getClientesSinContacto(60);
      const clientes90d = await this.getClientesSinContacto(90);

      const clientesNoAtendidos: ClienteNoAtendido[] = [];

      // Procesar clientes sin contacto
      const procesarClientes = (
        clientes: ClienteCRM[],
        prioridad: 'baja' | 'media' | 'alta'
      ) => {
        for (const cliente of clientes) {
          const diasSinContacto = Math.floor(
            (new Date().getTime() -
              new Date(cliente.ultima_interaccion).getTime()) /
              (1000 * 60 * 60 * 24)
          );

          clientesNoAtendidos.push({
            cliente_id: cliente.id,
            razon_social: cliente.razon_social,
            tipo_cliente: cliente.tipo_cliente,
            estado_kanban_nombre: cliente.estado_kanban_nombre,
            dias_sin_contacto: diasSinContacto,
            ultima_interaccion: cliente.ultima_interaccion,
            responsable_id: cliente.responsable_id,
            responsable_nombre: cliente.responsable_nombre || '',
            monto_estimado: cliente.monto_estimado_compra,
            prioridad,
          });
        }
      };

      // Clientes 90+ días = alta prioridad
      procesarClientes(clientes90d, 'alta');

      // Clientes 60-89 días = media prioridad
      const clientes60_89 = clientes60d.filter(
        c => !clientes90d.some(c90 => c90.id === c.id)
      );
      procesarClientes(clientes60_89, 'media');

      // Clientes 30-59 días = baja prioridad
      const clientes30_59 = clientes30d.filter(
        c => !clientes60d.some(c60 => c60.id === c.id)
      );
      procesarClientes(clientes30_59, 'baja');

      // Ordenar por prioridad y días sin contacto
      return clientesNoAtendidos.sort((a, b) => {
        const prioridadOrden = { alta: 3, media: 2, baja: 1 };
        if (prioridadOrden[a.prioridad] !== prioridadOrden[b.prioridad]) {
          return prioridadOrden[b.prioridad] - prioridadOrden[a.prioridad];
        }
        return b.dias_sin_contacto - a.dias_sin_contacto;
      });
    } catch (error) {
      console.error('Error getting clientes no atendidos:', error);
      throw new Error('Failed to get clientes no atendidos');
    }
  }

  /**
   * Obtiene oportunidades perdidas
   */
  static async getOportunidadesPerdidas(): Promise<OportunidadPerdida[]> {
    try {
      // TODO: Implementar cuando tengamos estados "Rechazado"
      // Por ahora retornamos array vacío
      return [];
    } catch (error) {
      console.error('Error getting oportunidades perdidas:', error);
      throw new Error('Failed to get oportunidades perdidas');
    }
  }

  /**
   * Calcula distribución de clientes por estado Kanban
   */
  private static async getDistribucionPorEstado(
    clientes: ClienteCRM[]
  ): Promise<
    Array<{
      estado_id: string;
      estado_nombre: string;
      cantidad_clientes: number;
      monto_total: number;
    }>
  > {
    const distribucion = new Map<
      string,
      {
        estado_id: string;
        estado_nombre: string;
        cantidad_clientes: number;
        monto_total: number;
      }
    >();

    for (const cliente of clientes) {
      const key = cliente.estado_kanban_id;

      if (!distribucion.has(key)) {
        distribucion.set(key, {
          estado_id: cliente.estado_kanban_id,
          estado_nombre: cliente.estado_kanban_nombre,
          cantidad_clientes: 0,
          monto_total: 0,
        });
      }

      const dist = distribucion.get(key)!;
      dist.cantidad_clientes++;
      dist.monto_total += cliente.monto_estimado_compra || 0;
    }

    return Array.from(distribucion.values());
  }

  /**
   * Calcula distribución de clientes por categoría de riesgo
   */
  private static async getDistribucionPorRiesgo(
    clientes: ClienteCRM[]
  ): Promise<
    Array<{
      categoria: any;
      cantidad_clientes: number;
      monto_credito_total: number;
    }>
  > {
    const distribucion = new Map<
      string,
      {
        categoria: any;
        cantidad_clientes: number;
        monto_credito_total: number;
      }
    >();

    for (const cliente of clientes) {
      if (!cliente.categoria_riesgo) continue;

      const key = cliente.categoria_riesgo;

      if (!distribucion.has(key)) {
        distribucion.set(key, {
          categoria: cliente.categoria_riesgo,
          cantidad_clientes: 0,
          monto_credito_total: 0,
        });
      }

      const dist = distribucion.get(key)!;
      dist.cantidad_clientes++;
      dist.monto_credito_total += cliente.limite_credito_actual || 0;
    }

    return Array.from(distribucion.values());
  }

  /**
   * Genera reporte de penetración de mercado para ISO 9001
   */
  static async generarReporteISO(
    fechaInicio: string,
    fechaFin: string
  ): Promise<string> {
    try {
      const metricas = await this.calcularMetricas(fechaInicio, fechaFin);
      const clientesNoAtendidos = await this.getClientesNoAtendidos();

      // Generar reporte en formato texto
      const reporte = `
# Reporte de Penetración de Mercado
**Período**: ${fechaInicio} a ${fechaFin}

## Resumen Ejecutivo
- Total Posibles Clientes: ${metricas.total_posibles_clientes}
- Total Clientes Frecuentes: ${metricas.total_clientes_frecuentes}
- Total Clientes Antiguos: ${metricas.total_clientes_antiguos}

## Métricas de Conversión
- Oportunidades Abiertas: ${metricas.oportunidades_abiertas}
- Oportunidades Ganadas: ${metricas.oportunidades_ganadas}
- **Tasa de Conversión: ${metricas.tasa_conversion}%**

## Métricas de Retención
- Clientes Retenidos: ${metricas.clientes_retenidos}
- Clientes Perdidos: ${metricas.clientes_perdidos}
- **Tasa de Retención: ${metricas.tasa_retencion}%**

## Clientes No Atendidos
- Últimos 30 días: ${metricas.posibles_clientes_sin_contacto_30d}
- Últimos 60 días: ${metricas.posibles_clientes_sin_contacto_60d}
- Últimos 90 días: ${metricas.posibles_clientes_sin_contacto_90d}

### Clientes de Alta Prioridad
${clientesNoAtendidos
  .filter(c => c.prioridad === 'alta')
  .slice(0, 5)
  .map(c => `- ${c.razon_social} (${c.dias_sin_contacto} días sin contacto)`)
  .join('\n')}

## Pipeline de Ventas
- Monto Total en Pipeline: $${metricas.monto_total_pipeline.toLocaleString()}
- Monto Promedio por Oportunidad: $${metricas.monto_promedio_oportunidad.toLocaleString()}

## Cumplimiento ISO 9001
- Cláusula 9.1.2: Satisfacción del Cliente
- Cláusula 9.1.3: Análisis y Evaluación
- Cláusula 10.2: Acciones Correctivas (${clientesNoAtendidos.length} clientes requieren atención)
      `.trim();

      return reporte;
    } catch (error) {
      console.error('Error generando reporte ISO:', error);
      throw new Error('Failed to generar reporte ISO');
    }
  }
}
