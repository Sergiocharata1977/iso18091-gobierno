/**
 * LegajoFiscalService
 * Servicio para gestión de legajos fiscales de clientes CRM
 * Multi-tenant: todas las operaciones filtran por organizationId
 */

import { db } from '@/firebase/config';
import type {
  Balance,
  CreateBalanceData,
  CreateEstadoResultadosData,
  CreateInmuebleData,
  CreateMaquinariaData,
  DeclaracionMensual,
  EstadoResultados,
  Inmueble,
  LegajoFiscal,
  Maquinaria,
} from '@/types/crm-fiscal';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';

// Colección base para legajos fiscales
const COLLECTION = 'legajos_fiscales';

/**
 * Calcula ratios financieros a partir de un balance
 */
function calcularRatiosBalance(balance: Partial<Balance>): Partial<Balance> {
  const totalActivo =
    (balance.activoCorriente || 0) + (balance.activoNoCorriente || 0);
  const totalPasivo =
    (balance.pasivoCorriente || 0) + (balance.pasivoNoCorriente || 0);
  const patrimonioNeto = totalActivo - totalPasivo;

  return {
    ...balance,
    totalActivo,
    totalPasivo,
    patrimonioNeto,
    liquidezCorriente:
      balance.pasivoCorriente && balance.pasivoCorriente > 0
        ? (balance.activoCorriente || 0) / balance.pasivoCorriente
        : undefined,
    endeudamiento:
      patrimonioNeto > 0 ? totalPasivo / patrimonioNeto : undefined,
    solvencia: totalActivo > 0 ? patrimonioNeto / totalActivo : undefined,
  };
}

/**
 * Calcula ratios de un estado de resultados
 */
function calcularRatiosResultados(
  er: Partial<EstadoResultados>
): Partial<EstadoResultados> {
  const totalIngresos = (er.ventasNetas || 0) + (er.otrosIngresos || 0);
  const resultadoBruto = (er.ventasNetas || 0) - (er.costoVentas || 0);
  const resultadoOperativo =
    resultadoBruto -
    (er.gastosAdministrativos || 0) -
    (er.gastosComerciales || 0);
  const resultadoAntesImpuestos =
    resultadoOperativo + (er.resultadosFinancieros || 0);
  const resultadoNeto = resultadoAntesImpuestos - (er.impuestoGanancias || 0);

  return {
    ...er,
    totalIngresos,
    resultadoBruto,
    resultadoOperativo,
    resultadoAntesImpuestos,
    resultadoNeto,
    margenBruto:
      er.ventasNetas && er.ventasNetas > 0
        ? resultadoBruto / er.ventasNetas
        : undefined,
    margenNeto:
      er.ventasNetas && er.ventasNetas > 0
        ? resultadoNeto / er.ventasNetas
        : undefined,
  };
}

export class LegajoFiscalService {
  /**
   * Obtiene el legajo fiscal de un cliente
   */
  static async getByClienteId(
    organizationId: string,
    clienteId: string
  ): Promise<LegajoFiscal | null> {
    try {
      const q = query(
        collection(db, COLLECTION),
        where('organizationId', '==', organizationId),
        where('clienteId', '==', clienteId)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      } as LegajoFiscal;
    } catch (error) {
      console.error('Error getting legajo fiscal:', error);
      throw new Error('Failed to get legajo fiscal');
    }
  }

  /**
   * Obtiene legajo por CUIT (para vinculación con SIG-Agro)
   */
  static async getByCuit(
    organizationId: string,
    cuit: string
  ): Promise<LegajoFiscal | null> {
    try {
      const q = query(
        collection(db, COLLECTION),
        where('organizationId', '==', organizationId),
        where('cuit', '==', cuit)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data(),
      } as LegajoFiscal;
    } catch (error) {
      console.error('Error getting legajo by CUIT:', error);
      throw new Error('Failed to get legajo by CUIT');
    }
  }

  /**
   * Crea un nuevo legajo fiscal para un cliente
   */
  static async create(
    organizationId: string,
    clienteId: string,
    cuit: string,
    userId: string
  ): Promise<string> {
    try {
      const now = new Date().toISOString();

      const legajoData: Omit<LegajoFiscal, 'id'> = {
        organizationId,
        clienteId,
        cuit,
        balances: [],
        estadosResultados: [],
        declaracionesIVA: [],
        declaracionesRentas: [],
        declaraciones931: [],
        maquinarias: [],
        inmuebles: [],
        otrosBienes: [],
        resumen: {
          patrimonioTotal: 0,
          ventasAnuales: 0,
          liquidezPromedio: 0,
          ultimaActualizacion: now,
        },
        createdAt: now,
        updatedAt: now,
        updatedBy: userId,
      };

      const docRef = await addDoc(collection(db, COLLECTION), legajoData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating legajo fiscal:', error);
      throw new Error('Failed to create legajo fiscal');
    }
  }

  /**
   * Agrega un balance al legajo
   */
  static async addBalance(
    organizationId: string,
    clienteId: string,
    data: CreateBalanceData,
    userId: string
  ): Promise<void> {
    try {
      const legajo = await this.getByClienteId(organizationId, clienteId);

      if (!legajo) {
        throw new Error('Legajo fiscal no encontrado');
      }

      const now = new Date().toISOString();
      const balanceData = calcularRatiosBalance(data);

      const nuevoBalance: Balance = {
        id: `bal_${Date.now()}`,
        ...balanceData,
        capital: data.capital,
        resultadosAcumulados: data.resultadosAcumulados,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
      } as Balance;

      const docRef = doc(db, COLLECTION, legajo.id);
      await updateDoc(docRef, {
        balances: [...legajo.balances, nuevoBalance],
        updatedAt: now,
        updatedBy: userId,
        'resumen.ultimaActualizacion': now,
      });
    } catch (error) {
      console.error('Error adding balance:', error);
      throw new Error('Failed to add balance');
    }
  }

  /**
   * Agrega un estado de resultados al legajo
   */
  static async addEstadoResultados(
    organizationId: string,
    clienteId: string,
    data: CreateEstadoResultadosData,
    userId: string
  ): Promise<void> {
    try {
      const legajo = await this.getByClienteId(organizationId, clienteId);

      if (!legajo) {
        throw new Error('Legajo fiscal no encontrado');
      }

      const now = new Date().toISOString();
      const erData = calcularRatiosResultados(data);

      const nuevoER: EstadoResultados = {
        id: `er_${Date.now()}`,
        ...erData,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
      } as EstadoResultados;

      const docRef = doc(db, COLLECTION, legajo.id);
      await updateDoc(docRef, {
        estadosResultados: [...legajo.estadosResultados, nuevoER],
        updatedAt: now,
        updatedBy: userId,
        'resumen.ventasAnuales': erData.ventasNetas || 0,
        'resumen.ultimaActualizacion': now,
      });
    } catch (error) {
      console.error('Error adding estado de resultados:', error);
      throw new Error('Failed to add estado de resultados');
    }
  }

  /**
   * Agrega una maquinaria al legajo
   */
  static async addMaquinaria(
    organizationId: string,
    clienteId: string,
    data: CreateMaquinariaData,
    userId: string
  ): Promise<void> {
    try {
      const legajo = await this.getByClienteId(organizationId, clienteId);

      if (!legajo) {
        throw new Error('Legajo fiscal no encontrado');
      }

      const now = new Date().toISOString();

      const nuevaMaquinaria: Maquinaria = {
        id: `maq_${Date.now()}`,
        ...data,
        createdAt: now,
        updatedAt: now,
      };

      // Calcular nuevo patrimonio total
      const valorMaquinarias = [...legajo.maquinarias, nuevaMaquinaria]
        .filter(m => m.propiedad === 'propia')
        .reduce((sum, m) => sum + m.valorActual, 0);

      const valorInmuebles = legajo.inmuebles
        .filter(i => !i.tieneHipoteca)
        .reduce((sum, i) => sum + (i.valorMercado || 0), 0);

      const docRef = doc(db, COLLECTION, legajo.id);
      await updateDoc(docRef, {
        maquinarias: [...legajo.maquinarias, nuevaMaquinaria],
        updatedAt: now,
        updatedBy: userId,
        'resumen.patrimonioTotal': valorMaquinarias + valorInmuebles,
        'resumen.ultimaActualizacion': now,
      });
    } catch (error) {
      console.error('Error adding maquinaria:', error);
      throw new Error('Failed to add maquinaria');
    }
  }

  /**
   * Agrega un inmueble al legajo
   */
  static async addInmueble(
    organizationId: string,
    clienteId: string,
    data: CreateInmuebleData,
    userId: string
  ): Promise<void> {
    try {
      const legajo = await this.getByClienteId(organizationId, clienteId);

      if (!legajo) {
        throw new Error('Legajo fiscal no encontrado');
      }

      const now = new Date().toISOString();

      const nuevoInmueble: Inmueble = {
        id: `inm_${Date.now()}`,
        ...data,
        createdAt: now,
        updatedAt: now,
      };

      // Recalcular patrimonio
      const valorMaquinarias = legajo.maquinarias
        .filter(m => m.propiedad === 'propia')
        .reduce((sum, m) => sum + m.valorActual, 0);

      const valorInmuebles = [...legajo.inmuebles, nuevoInmueble]
        .filter(i => !i.tieneHipoteca)
        .reduce((sum, i) => sum + (i.valorMercado || 0), 0);

      const docRef = doc(db, COLLECTION, legajo.id);
      await updateDoc(docRef, {
        inmuebles: [...legajo.inmuebles, nuevoInmueble],
        updatedAt: now,
        updatedBy: userId,
        'resumen.patrimonioTotal': valorMaquinarias + valorInmuebles,
        'resumen.ultimaActualizacion': now,
      });
    } catch (error) {
      console.error('Error adding inmueble:', error);
      throw new Error('Failed to add inmueble');
    }
  }

  /**
   * Agrega una declaración mensual
   */
  static async addDeclaracionMensual(
    organizationId: string,
    clienteId: string,
    tipo: 'iva' | 'rentas' | '931',
    data: Omit<DeclaracionMensual, 'id' | 'tipo' | 'createdAt' | 'updatedAt'>,
    userId: string
  ): Promise<void> {
    try {
      const legajo = await this.getByClienteId(organizationId, clienteId);

      if (!legajo) {
        throw new Error('Legajo fiscal no encontrado');
      }

      const now = new Date().toISOString();

      const nuevaDeclaracion: DeclaracionMensual = {
        id: `dec_${Date.now()}`,
        tipo,
        ...data,
        createdAt: now,
        updatedAt: now,
      };

      const fieldName =
        tipo === 'iva'
          ? 'declaracionesIVA'
          : tipo === 'rentas'
            ? 'declaracionesRentas'
            : 'declaraciones931';

      const currentDeclaraciones = legajo[fieldName] || [];

      const docRef = doc(db, COLLECTION, legajo.id);
      await updateDoc(docRef, {
        [fieldName]: [...currentDeclaraciones, nuevaDeclaracion],
        updatedAt: now,
        updatedBy: userId,
        'resumen.ultimaActualizacion': now,
      });
    } catch (error) {
      console.error('Error adding declaracion mensual:', error);
      throw new Error('Failed to add declaracion mensual');
    }
  }

  /**
   * Obtiene resumen del legajo para scoring
   */
  static async getResumenParaScoring(
    organizationId: string,
    clienteId: string
  ): Promise<{
    ultimoBalance: Balance | null;
    ultimoER: EstadoResultados | null;
    valorMaquinarias: number;
    valorInmuebles: number;
    patrimonioTotal: number;
  } | null> {
    try {
      const legajo = await this.getByClienteId(organizationId, clienteId);

      if (!legajo) {
        return null;
      }

      // Obtener último balance
      const ultimoBalance =
        legajo.balances.sort((a, b) =>
          b.ejercicio.localeCompare(a.ejercicio)
        )[0] || null;

      // Obtener último estado de resultados
      const ultimoER =
        legajo.estadosResultados.sort((a, b) =>
          b.ejercicio.localeCompare(a.ejercicio)
        )[0] || null;

      // Calcular valor maquinarias propias
      const valorMaquinarias = legajo.maquinarias
        .filter(m => m.propiedad === 'propia')
        .reduce((sum, m) => sum + m.valorActual, 0);

      // Calcular valor inmuebles libres de gravámenes
      const valorInmuebles = legajo.inmuebles
        .filter(i => !i.tieneHipoteca && i.tipo !== 'campo_arrendado')
        .reduce((sum, i) => sum + (i.valorMercado || i.valorFiscal || 0), 0);

      return {
        ultimoBalance,
        ultimoER,
        valorMaquinarias,
        valorInmuebles,
        patrimonioTotal: valorMaquinarias + valorInmuebles,
      };
    } catch (error) {
      console.error('Error getting resumen para scoring:', error);
      throw new Error('Failed to get resumen para scoring');
    }
  }
}
