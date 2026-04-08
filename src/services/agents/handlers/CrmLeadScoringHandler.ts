import { getAdminFirestore } from '@/lib/firebase/admin';
import { AgentJob } from '@/types/agents';
import { IntentHandler } from './IntentHandler';

interface ScoreInputs {
  liquidityRatio: number;
  debtRatio: number;
  punctuality: number;
  delinquency: number;
}

/**
 * Handler para `crm.lead.score`.
 * Calcula score simple sobre datos financieros disponibles.
 */
export class CrmLeadScoringHandler implements IntentHandler {
  intent = 'crm.lead.score';

  /**
   * Evalua cliente por `cliente_id` y devuelve score, categoria y recomendaciones.
   */
  async handle(job: AgentJob): Promise<unknown> {
    const payload = job.payload || {};
    const clienteId = payload.cliente_id || payload.client_id;

    if (!clienteId || typeof clienteId !== 'string') {
      throw new Error('crm.lead.score requiere cliente_id');
    }

    const db = getAdminFirestore();
    const clienteDoc = await db
      .collection('crm_organizaciones')
      .doc(clienteId)
      .get();
    if (!clienteDoc.exists) {
      throw new Error(`Cliente no encontrado: ${clienteId}`);
    }

    const clienteData = clienteDoc.data() || {};
    const financial = clienteData.datos_financieros || {};
    const scoreInputs = this.extractInputs(financial);
    const score = this.calculateScore(scoreInputs);
    const categoria = this.mapCategory(score);
    const recomendaciones = this.buildRecommendations(scoreInputs, categoria);

    return {
      score,
      categoria,
      recomendaciones,
    };
  }

  /**
   * Extrae indicadores financieros con defaults seguros.
   */
  private extractInputs(data: Record<string, any>): ScoreInputs {
    const activoCorriente = Number(data.activo_corriente || 0);
    const pasivoCorriente = Number(data.pasivo_corriente || 0);
    const ventasAnuales = Number(data.ventas_anuales || 0);
    const deudasTotales = Number(data.deudas_totales || 0);

    const liquidityRatio =
      pasivoCorriente > 0 ? activoCorriente / pasivoCorriente : 1;
    const debtRatio = ventasAnuales > 0 ? deudasTotales / ventasAnuales : 1;

    return {
      liquidityRatio,
      debtRatio,
      punctuality: Number(data.historico_pagos_puntuales || 50),
      delinquency: Number(data.indice_morosidad || 50),
    };
  }

  /**
   * Calcula puntaje final de 0 a 10.
   */
  private calculateScore(input: ScoreInputs): number {
    const liquidityScore = this.normalizeRange(input.liquidityRatio, 0.8, 2.0);
    const debtScore = 1 - this.normalizeRange(input.debtRatio, 0.2, 1.2);
    const punctualityScore = this.normalizeRange(input.punctuality, 40, 100);
    const delinquencyScore = 1 - this.normalizeRange(input.delinquency, 0, 60);

    const weighted =
      liquidityScore * 0.25 +
      debtScore * 0.25 +
      punctualityScore * 0.3 +
      delinquencyScore * 0.2;

    return Number((Math.max(0, Math.min(1, weighted)) * 10).toFixed(2));
  }

  /**
   * Convierte score numerico en categoria de riesgo.
   */
  private mapCategory(score: number): 'A' | 'B' | 'C' | 'D' | 'E' {
    if (score >= 8) return 'A';
    if (score >= 6) return 'B';
    if (score >= 4) return 'C';
    if (score >= 2) return 'D';
    return 'E';
  }

  /**
   * Genera recomendaciones operativas a partir de factores mas debiles.
   */
  private buildRecommendations(
    input: ScoreInputs,
    categoria: 'A' | 'B' | 'C' | 'D' | 'E'
  ): string[] {
    const recommendations: string[] = [];

    if (input.liquidityRatio < 1) {
      recommendations.push('Solicitar respaldo adicional por baja liquidez.');
    }

    if (input.debtRatio > 0.8) {
      recommendations.push(
        'Limitar cupo inicial y revisar endeudamiento antes de aprobar.'
      );
    }

    if (input.punctuality < 70 || input.delinquency > 25) {
      recommendations.push(
        'Definir esquema de seguimiento de pagos con hitos semanales.'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Mantener condiciones comerciales estandar.');
    }

    if (categoria === 'D' || categoria === 'E') {
      recommendations.push('Escalar a aprobacion manual de comite de riesgo.');
    }

    return recommendations;
  }

  /**
   * Normaliza un valor entre 0 y 1 usando limites inferiores y superiores.
   */
  private normalizeRange(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) return 0;
    if (value <= min) return 0;
    if (value >= max) return 1;
    return (value - min) / (max - min);
  }
}
