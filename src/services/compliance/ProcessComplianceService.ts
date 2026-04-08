/**
 * ProcessComplianceService
 *
 * Servicio para verificar el cumplimiento de procesos obligatorios ISO 9001.
 * El sistema GUÍA pero NO BLOQUEA al usuario.
 */

import {
  MANDATORY_PROCESSES,
  MandatoryProcess,
  ProcessComplianceResult,
  ProcessComplianceStatus,
} from '@/lib/constants/mandatoryProcesses';

export interface ComplianceCheckResult {
  procesos: ProcessComplianceResult[];
  resumen: {
    total: number;
    no_definido: number;
    definido_minimo: number;
    implementado: number;
    eficaz: number;
    porcentaje_cumplimiento: number;
  };
  alertas: string[];
  sugerencias: string[];
}

/**
 * Verifica el cumplimiento de un proceso específico
 */
async function checkProcessCompliance(
  proceso: MandatoryProcess,
  organizationId: string
): Promise<ProcessComplianceResult> {
  let estado: ProcessComplianceStatus = 'no_definido';
  const evidencias = {
    tiene_definicion: false,
    tiene_registros: false,
    tiene_documentos: false,
    tiene_metricas: false,
    ultima_auditoria: undefined as Date | undefined,
  };

  try {
    // Verificar si existe definición de proceso
    const processDefResponse = await fetch(
      `/api/process-definitions?search=${encodeURIComponent(proceso.nombre)}&organization_id=${organizationId}`
    );
    if (processDefResponse.ok) {
      const processDefs = await processDefResponse.json();
      if (Array.isArray(processDefs) && processDefs.length > 0) {
        evidencias.tiene_definicion = true;
      }
    }

    // Verificar si existe documentación relacionada
    const docsResponse = await fetch(
      `/api/documents?search=${encodeURIComponent(proceso.nombre)}&organization_id=${organizationId}`
    );
    if (docsResponse.ok) {
      const docs = await docsResponse.json();
      if (Array.isArray(docs) && docs.length > 0) {
        evidencias.tiene_documentos = true;
      }
    }

    // Determinar estado basado en evidencias
    if (!evidencias.tiene_definicion && !evidencias.tiene_documentos) {
      estado = 'no_definido';
    } else if (evidencias.tiene_definicion || evidencias.tiene_documentos) {
      estado = 'definido_minimo';

      // Si tiene ambos, está implementado
      if (evidencias.tiene_definicion && evidencias.tiene_documentos) {
        estado = 'implementado';
      }

      // Si además tiene métricas y auditorías, es eficaz
      if (estado === 'implementado' && evidencias.tiene_metricas) {
        estado = 'eficaz';
      }
    }
  } catch (error) {
    console.error(`Error checking compliance for ${proceso.nombre}:`, error);
  }

  // Generar sugerencia si no está completo
  let sugerencia: string | undefined;
  if (estado === 'no_definido') {
    sugerencia = `Te recomiendo definir el proceso "${proceso.nombre}" en el módulo de Procesos o crear un documento en Documentos.`;
  } else if (estado === 'definido_minimo') {
    if (!evidencias.tiene_documentos) {
      sugerencia = `El proceso "${proceso.nombre}" necesita documentación formal. ¿Querés que te ayude a crearla?`;
    } else if (!evidencias.tiene_definicion) {
      sugerencia = `Falta la definición formal del proceso "${proceso.nombre}" en el módulo de Procesos.`;
    }
  }

  return {
    proceso,
    estado,
    evidencias,
    sugerencia,
  };
}

/**
 * Verifica el cumplimiento de todos los procesos obligatorios
 */
export async function checkAllProcessCompliance(
  organizationId: string,
  incluirCondicionales: boolean = true
): Promise<ComplianceCheckResult> {
  const procesosAVerificar = incluirCondicionales
    ? MANDATORY_PROCESSES
    : MANDATORY_PROCESSES.filter(p => !p.es_condicional);

  const resultados: ProcessComplianceResult[] = [];
  const alertas: string[] = [];
  const sugerencias: string[] = [];

  for (const proceso of procesosAVerificar) {
    const resultado = await checkProcessCompliance(proceso, organizationId);
    resultados.push(resultado);

    // Generar alertas para procesos no definidos (solo obligatorios)
    if (resultado.estado === 'no_definido' && !proceso.es_condicional) {
      alertas.push(
        `⚠️ Proceso obligatorio "${proceso.nombre}" (ISO ${proceso.clausula_iso}) no está definido.`
      );
    }

    // Agregar sugerencias
    if (resultado.sugerencia) {
      sugerencias.push(resultado.sugerencia);
    }
  }

  // Calcular resumen
  const resumen = {
    total: resultados.length,
    no_definido: resultados.filter(r => r.estado === 'no_definido').length,
    definido_minimo: resultados.filter(r => r.estado === 'definido_minimo')
      .length,
    implementado: resultados.filter(r => r.estado === 'implementado').length,
    eficaz: resultados.filter(r => r.estado === 'eficaz').length,
    porcentaje_cumplimiento: 0,
  };

  // Calcular porcentaje (ponderado: eficaz=100%, implementado=75%, definido_minimo=50%, no_definido=0%)
  const puntosTotales = resumen.total * 100;
  const puntosObtenidos =
    resumen.eficaz * 100 +
    resumen.implementado * 75 +
    resumen.definido_minimo * 50 +
    resumen.no_definido * 0;

  resumen.porcentaje_cumplimiento =
    puntosTotales > 0 ? Math.round((puntosObtenidos / puntosTotales) * 100) : 0;

  return {
    procesos: resultados,
    resumen,
    alertas,
    sugerencias,
  };
}

/**
 * Obtiene una verificación rápida para mostrar en el dashboard
 */
export async function getQuickComplianceCheck(organizationId: string): Promise<{
  porcentaje: number;
  procesosFaltantes: number;
  alertaPrincipal?: string;
}> {
  try {
    const resultado = await checkAllProcessCompliance(organizationId, false);

    return {
      porcentaje: resultado.resumen.porcentaje_cumplimiento,
      procesosFaltantes: resultado.resumen.no_definido,
      alertaPrincipal: resultado.alertas[0],
    };
  } catch (error) {
    console.error('Error in quick compliance check:', error);
    return {
      porcentaje: 0,
      procesosFaltantes: 0,
    };
  }
}
