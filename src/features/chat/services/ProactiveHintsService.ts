// ============================================
// SERVICIO DE SUGERENCIAS PROACTIVAS
// ============================================
// Don Cándido analiza el estado del sistema y sugiere el próximo paso

import {
  FASES_ISO_9001,
  PhaseProgress,
} from '@/features/journey/types/journey';

export interface ProactiveSuggestion {
  id: string;
  tipo: 'siguiente_paso' | 'recordatorio' | 'felicitacion' | 'alerta';
  titulo: string;
  mensaje: string;
  accion?: {
    texto: string;
    ruta: string;
  };
  prioridad: 'alta' | 'media' | 'baja';
  icono: string;
}

export interface OperationalSnapshot {
  hallazgosAbiertos: number;
  accionesPendientes: number;
  accionesVencidas: number;
  auditoriasPlaneadas: number;
  capacitacionesPendientes: number;
  directActionsPendientes: number;
  diasSinAnalisisEstrategico: number | null;
  faseActual: number;
  porcentajeFaseActual: number;
  nombreOrg: string;
  nombreUsuario: string;
}

/**
 * Servicio para generar sugerencias proactivas de Don Cándido
 */
export class ProactiveHintsService {
  /**
   * Generar sugerencias basadas en el progreso del journey
   */
  static getSuggestionsByJourney(
    faseActual: number,
    progress: PhaseProgress[],
    tareasCompletadasHoy: number = 0
  ): ProactiveSuggestion[] {
    const suggestions: ProactiveSuggestion[] = [];

    const currentPhase = FASES_ISO_9001.find(f => f.id === faseActual);
    const currentProgress = progress.find(p => p.phaseId === faseActual);

    if (!currentPhase || !currentProgress) {
      // Sin progreso - sugerir empezar
      suggestions.push({
        id: 'start-journey',
        tipo: 'siguiente_paso',
        titulo: '¡Comienza tu camino a ISO 9001!',
        mensaje:
          'Aún no has iniciado el proceso de implementación. El primer paso es realizar un diagnóstico de tu organización.',
        accion: { texto: 'Ir a Mi Certificación', ruta: '/journey' },
        prioridad: 'alta',
        icono: '🚀',
      });
      return suggestions;
    }

    // Calcular tareas pendientes de la fase actual
    const tareasRequeridas = currentPhase.tareas.filter(t => t.esRequerida);
    const tareasCompletadas = currentProgress.tareasCompletadas.length;
    const tareasPendientes = tareasRequeridas.length - tareasCompletadas;

    // Sugerencia del próximo paso
    if (tareasPendientes > 0) {
      const siguienteTarea = tareasRequeridas.find(
        t => !currentProgress.tareasCompletadas.includes(t.id)
      );

      if (siguienteTarea) {
        suggestions.push({
          id: 'next-task',
          tipo: 'siguiente_paso',
          titulo: `Próximo paso: ${siguienteTarea.titulo}`,
          mensaje: siguienteTarea.descripcion,
          accion: siguienteTarea.rutaModulo
            ? {
                texto: `Ir a ${siguienteTarea.moduloVinculado}`,
                ruta: siguienteTarea.rutaModulo,
              }
            : {
                texto: 'Ver detalle de la fase',
                ruta: `/journey/${faseActual}`,
              },
          prioridad: 'alta',
          icono: currentPhase.icono,
        });
      }
    } else {
      // Fase completa
      const siguienteFase = FASES_ISO_9001.find(f => f.id === faseActual + 1);
      if (siguienteFase) {
        suggestions.push({
          id: 'phase-complete',
          tipo: 'felicitacion',
          titulo: `¡Fase ${faseActual} completada!`,
          mensaje: `Has completado "${currentPhase.nombre}". Ahora puedes continuar con "${siguienteFase.nombre}".`,
          accion: {
            texto: 'Comenzar siguiente fase',
            ruta: `/journey/${siguienteFase.id}`,
          },
          prioridad: 'alta',
          icono: '🎉',
        });
      } else {
        // Última fase completada
        suggestions.push({
          id: 'ready-certification',
          tipo: 'felicitacion',
          titulo: '¡Listo para certificación!',
          mensaje:
            'Has completado todas las fases de implementación. Ya puedes contactar a un organismo certificador.',
          prioridad: 'alta',
          icono: '🏆',
        });
      }
    }

    // Felicitación por productividad
    if (tareasCompletadasHoy >= 3) {
      suggestions.push({
        id: 'productivity',
        tipo: 'felicitacion',
        titulo: '¡Excelente progreso hoy!',
        mensaje: `Has completado ${tareasCompletadasHoy} tareas hoy. Sigue así para mantener el ritmo.`,
        prioridad: 'baja',
        icono: '⭐',
      });
    }

    // Recordatorio si el progreso es bajo
    if (currentProgress.porcentaje < 30 && currentProgress.porcentaje > 0) {
      suggestions.push({
        id: 'low-progress',
        tipo: 'recordatorio',
        titulo: 'Mantén el impulso',
        mensaje: `Llevas ${currentProgress.porcentaje}% de la fase ${faseActual}. Dedicar 30 minutos al día te ayudará a avanzar rápido.`,
        accion: { texto: 'Continuar', ruta: `/journey/${faseActual}` },
        prioridad: 'media',
        icono: '💪',
      });
    }

    return suggestions;
  }

  /**
   * Generar sugerencias basadas en módulos pendientes
   */
  static getSuggestionsByModules(stats: {
    documentosPendientes?: number;
    hallazgosAbiertos?: number;
    accionesPendientes?: number;
    auditoriasPlaneadas?: number;
    capacitacionesPendientes?: number;
  }): ProactiveSuggestion[] {
    const suggestions: ProactiveSuggestion[] = [];

    if (stats.hallazgosAbiertos && stats.hallazgosAbiertos > 0) {
      suggestions.push({
        id: 'open-findings',
        tipo: 'alerta',
        titulo: `${stats.hallazgosAbiertos} hallazgos abiertos`,
        mensaje:
          'Tienes hallazgos que requieren atención. Revísalos y crea acciones correctivas.',
        accion: { texto: 'Ver hallazgos', ruta: '/hallazgos' },
        prioridad: 'alta',
        icono: '⚠️',
      });
    }

    if (stats.accionesPendientes && stats.accionesPendientes > 0) {
      suggestions.push({
        id: 'pending-actions',
        tipo: 'recordatorio',
        titulo: `${stats.accionesPendientes} acciones pendientes`,
        mensaje: 'Hay acciones correctivas que necesitan seguimiento.',
        accion: { texto: 'Ver acciones', ruta: '/acciones' },
        prioridad: 'media',
        icono: '📋',
      });
    }

    if (stats.documentosPendientes && stats.documentosPendientes > 0) {
      suggestions.push({
        id: 'pending-docs',
        tipo: 'recordatorio',
        titulo: `${stats.documentosPendientes} documentos en borrador`,
        mensaje: 'Tienes documentos que necesitan aprobación.',
        accion: { texto: 'Ver documentos', ruta: '/documentos' },
        prioridad: 'baja',
        icono: '📝',
      });
    }

    return suggestions;
  }

  /**
   * Generar sugerencias combinando journey + contexto operativo
   */
  static getSuggestionsByOperationalSnapshot(
    snapshot: OperationalSnapshot
  ): ProactiveSuggestion[] {
    const suggestions: ProactiveSuggestion[] = [];

    if (snapshot.accionesVencidas > 0) {
      suggestions.push({
        id: 'overdue-actions-blocker',
        tipo: 'alerta',
        titulo: `${snapshot.accionesVencidas} acciones vencidas`,
        mensaje: `Tenés ${snapshot.accionesVencidas} acciones vencidas que bloquean el avance del SGC.`,
        accion: { texto: 'Ver acciones', ruta: '/acciones' },
        prioridad: 'alta',
        icono: '⚠️',
      });
    }

    if (snapshot.directActionsPendientes > 0) {
      suggestions.push({
        id: 'pending-agentic-decisions',
        tipo: 'alerta',
        titulo: `${snapshot.directActionsPendientes} decisiones pendientes`,
        mensaje: `Hay ${snapshot.directActionsPendientes} decisiones esperando tu aprobación en el Centro Agéntico.`,
        accion: { texto: 'Ir al Centro Agéntico', ruta: '/centro-agentico' },
        prioridad: 'alta',
        icono: '🧭',
      });
    }

    if (
      snapshot.diasSinAnalisisEstrategico === null ||
      snapshot.diasSinAnalisisEstrategico > 30
    ) {
      const diasTexto =
        snapshot.diasSinAnalisisEstrategico === null
          ? 'sin registros'
          : `${snapshot.diasSinAnalisisEstrategico} días`;

      suggestions.push({
        id: 'stale-strategic-analysis',
        tipo: 'recordatorio',
        titulo: 'Análisis estratégico desactualizado',
        mensaje: `El último análisis estratégico tiene ${diasTexto}. Conviene actualizarlo.`,
        accion: {
          texto: 'Actualizar análisis',
          ruta: '/analisis-estrategico',
        },
        prioridad: 'media',
        icono: '📈',
      });
    }

    if (snapshot.hallazgosAbiertos > 5) {
      suggestions.push({
        id: 'high-open-findings',
        tipo: 'alerta',
        titulo: `${snapshot.hallazgosAbiertos} hallazgos abiertos`,
        mensaje:
          'Tenés varios hallazgos abiertos. Conviene priorizar su tratamiento antes de que frenen el sistema.',
        accion: { texto: 'Ver hallazgos', ruta: '/hallazgos' },
        prioridad: 'media',
        icono: '🔎',
      });
    }

    const journeySuggestions = this.getSuggestionsByJourney(
      snapshot.faseActual,
      [
        {
          phaseId: snapshot.faseActual,
          status:
            snapshot.porcentajeFaseActual >= 100 ? 'completed' : 'in_progress',
          porcentaje: snapshot.porcentajeFaseActual,
          tareasCompletadas: [],
        },
      ]
    );

    if (journeySuggestions.length > 0) {
      suggestions.push(journeySuggestions[0]);
    }

    if (
      snapshot.porcentajeFaseActual < 20 &&
      snapshot.porcentajeFaseActual > 0
    ) {
      suggestions.push({
        id: 'keep-momentum-operational',
        tipo: 'recordatorio',
        titulo: 'Mantener el impulso',
        mensaje: `Ya comenzaste la fase ${snapshot.faseActual}, pero todavía está en ${snapshot.porcentajeFaseActual}%. Sostener el ritmo ahora te va a destrabar más rápido.`,
        accion: {
          texto: 'Continuar fase actual',
          ruta: `/journey/${snapshot.faseActual}`,
        },
        prioridad: 'media',
        icono: '💪',
      });
    }

    const priorityWeight = { alta: 0, media: 1, baja: 2 };

    return suggestions.sort(
      (a, b) => priorityWeight[a.prioridad] - priorityWeight[b.prioridad]
    );
  }

  /**
   * Generar mensaje de bienvenida contextual para Don Cándido
   */
  static getContextualGreeting(
    userName: string,
    faseActual: number,
    horaActual: number = new Date().getHours(),
    pendingCount?: number
  ): string {
    const saludo =
      horaActual < 12
        ? '¡Buenos días'
        : horaActual < 19
          ? '¡Buenas tardes'
          : '¡Buenas noches';
    const fase = FASES_ISO_9001.find(f => f.id === faseActual);

    if (!fase) {
      const mensaje = `${saludo}, ${userName}! ¿Listo para comenzar tu camino hacia ISO 9001?`;
      return pendingCount && pendingCount > 0
        ? `${mensaje} Tenés ${pendingCount} pendientes para hoy.`
        : mensaje;
    }

    const mensajes = [
      `${saludo}, ${userName}! Estás en la **Fase ${faseActual}: ${fase.nombre}**. ¿En qué te ayudo hoy?`,
      `${saludo}! Veo que trabajas en **${fase.nombre}**. ¿Continuamos donde lo dejamos?`,
      `${saludo}, ${userName}! Hoy podemos avanzar en **${fase.nombreCorto}**. ¿Qué necesitas?`,
    ];

    const mensaje = mensajes[Math.floor(Math.random() * mensajes.length)];

    return pendingCount && pendingCount > 0
      ? `${mensaje} Tenés ${pendingCount} pendientes para hoy.`
      : mensaje;
  }
}
