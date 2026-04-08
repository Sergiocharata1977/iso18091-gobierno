export interface AgenticCenterDemoScenario {
  id: string;
  selectorLabel: string;
  stageLabel: string;
  heroTitle: string;
  heroBody: string;
  businessImpact: string;
  humanControl: string;
  narratorSteps: string[];
  expectedOutcome: string;
}

export const agenticCenterDemoScenarios: AgenticCenterDemoScenario[] = [
  {
    id: 'demo-capacitacion-vencida',
    selectorLabel: 'Capacitacion vencida',
    stageLabel: 'Recupero preventivo',
    heroTitle: 'La IA detecta un vencimiento antes de que se convierta en desvio operativo.',
    heroBody:
      'El sistema identifica a una persona fuera de vigencia, propone el mejor siguiente paso y deja la aprobacion en manos del responsable.',
    businessImpact:
      'Se evita exponer a la operacion a una persona no habilitada y se recupera el plan de formacion sin perseguir datos manualmente.',
    humanControl:
      'La recomendacion sale lista, pero la inscripcion solo avanza cuando alguien confirma la accion.',
    narratorSteps: [
      'La pantalla muestra el alerta de vencimiento y el riesgo sobre la operacion.',
      'La IA sugiere el turno mas conveniente sin cambiar nada por si sola.',
      'El responsable aprueba y la evidencia queda lista para seguimiento.',
    ],
    expectedOutcome:
      'Juan Perez queda reprogramado en el siguiente curso disponible con trazabilidad visible.',
  },
  {
    id: 'demo-hallazgo-sin-responsable',
    selectorLabel: 'Hallazgo sin responsable',
    stageLabel: 'Cierre de vacios',
    heroTitle: 'La IA ubica hallazgos huerfanos y propone a quien debe tomar el caso.',
    heroBody:
      'Cuando un hallazgo queda sin dueno, el Centro Agentico conecta contexto, area y jerarquia para elevar una asignacion lista para decidir.',
    businessImpact:
      'Se reduce tiempo muerto entre deteccion y accion, evitando que un hallazgo quede fuera de seguimiento por falta de responsable.',
    humanControl:
      'La sugerencia llega con fundamento y fecha propuesta, pero la asignacion final sigue bajo aprobacion humana.',
    narratorSteps: [
      'Se visualiza el hallazgo detenido y su impacto sobre el area.',
      'La IA propone a la jefatura mas adecuada con plazo recomendado.',
      'Con una aprobacion, el caso vuelve a tener duenio y fecha de respuesta.',
    ],
    expectedOutcome:
      'El hallazgo HAL-031 queda asignado a Ana Martinez con compromiso de respuesta.',
  },
  {
    id: 'demo-nc-auditoria',
    selectorLabel: 'No conformidad detectada',
    stageLabel: 'Escalamiento asistido',
    heroTitle: 'La IA convierte una observacion de auditoria en una accion formal y trazable.',
    heroBody:
      'El motor resume el desvio, arma el borrador de no conformidad y deja la decision preparada para el equipo de calidad.',
    businessImpact:
      'Se acelera el pasaje desde la auditoria hasta la accion formal, con menos demora administrativa y mejor consistencia documental.',
    humanControl:
      'El borrador llega completo, pero su creacion efectiva requiere validacion del equipo responsable.',
    narratorSteps: [
      'La pantalla parte del hallazgo detectado en auditoria.',
      'La IA propone la no conformidad con criterio y plazo de cierre.',
      'Calidad revisa, aprueba y obtiene un registro listo para operar.',
    ],
    expectedOutcome:
      'La NC-2026-047 queda lista para emitirse con contexto, severidad y plazo sugerido.',
  },
  {
    id: 'demo-aprobacion-terminal-pendiente',
    selectorLabel: 'Terminal o persona pendiente',
    stageLabel: 'Ultima milla controlada',
    heroTitle: 'La IA acerca la accion hasta la terminal o la persona correcta sin perder control.',
    heroBody:
      'El Centro Agentico muestra cuando una decision ya esta lista para ejecutarse y solo falta la aprobacion final en el canal adecuado.',
    businessImpact:
      'Se evita que pedidos listos para ejecutar se enfrien en la ultima milla y se mantiene visibilidad sobre quien debe responder.',
    humanControl:
      'La accion esta preparada para terminal o supervisor, pero no se ejecuta hasta recibir la conformidad explicita.',
    narratorSteps: [
      'Se presenta una aprobacion pendiente en terminal y el responsable visible.',
      'La IA explica por que la recomendacion conviene ahora.',
      'La organizacion decide y la ejecucion queda registrada con evidencia.',
    ],
    expectedOutcome:
      'La solicitud pendiente queda aprobada en terminal con respaldo de politica y registro final.',
  },
];

export const agenticCenterDemoScenarioMap = Object.fromEntries(
  agenticCenterDemoScenarios.map(scenario => [scenario.id, scenario])
) satisfies Record<string, AgenticCenterDemoScenario>;
