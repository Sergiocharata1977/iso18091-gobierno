import { AmortizationService } from '@/services/AmortizationService';

describe('AmortizationService', () => {
  it('calcula tabla francesa y cierra capital y total', () => {
    const tabla = AmortizationService.calcular(
      100000,
      0.05,
      12,
      'frances',
      '2026-04-01'
    );

    const capitalTotal = tabla.cuotas.reduce(
      (sum, cuota) => sum + cuota.capital,
      0
    );
    const totalCuotas = tabla.cuotas.reduce((sum, cuota) => sum + cuota.total, 0);

    expect(tabla.cuotas).toHaveLength(12);
    expect(Number(capitalTotal.toFixed(2))).toBe(100000);
    expect(Number(totalCuotas.toFixed(2))).toBe(tabla.total_credito);
    expect(tabla.cuotas[0].total).toBe(tabla.cuotas[1].total);
    expect(tabla.cuotas[11].saldo_capital_fin).toBe(0);
  });

  it('calcula tabla alemana con capital constante y ultima cuota ajustada', () => {
    const tabla = AmortizationService.calcular(
      100000,
      0.05,
      12,
      'aleman',
      '2026-04-01'
    );

    const capitales = tabla.cuotas.map((cuota) => cuota.capital);
    const capitalTotal = tabla.cuotas.reduce(
      (sum, cuota) => sum + cuota.capital,
      0
    );

    expect(tabla.cuotas).toHaveLength(12);
    expect(new Set(capitales.slice(0, -1)).size).toBe(1);
    expect(Number(capitalTotal.toFixed(2))).toBe(100000);
    expect(tabla.cuotas[11].saldo_capital_fin).toBe(0);
  });

  it('maneja tasa cero sin generar interes', () => {
    const tabla = AmortizationService.calcular(
      1200,
      0,
      12,
      'frances',
      '2026-04-01'
    );

    expect(tabla.total_intereses).toBe(0);
    expect(tabla.cuotas.every((cuota) => cuota.interes === 0)).toBe(true);
    expect(Number(tabla.cuotas.reduce((sum, cuota) => sum + cuota.capital, 0).toFixed(2))).toBe(1200);
  });

  it('genera fechas mensuales respetando fin de mes', () => {
    const fechas = AmortizationService.calcularFechasVencimiento(
      '2026-01-31',
      4
    );

    expect(fechas).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ]);
  });
});
