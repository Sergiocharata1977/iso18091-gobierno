import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

const ORG_ID = 'org_agrobiciufa';

function initAdmin() {
  if (getApps().length > 0) return;
  const sa = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'service-account.json'), 'utf8'));
  initializeApp({ credential: cert(sa) });
  console.log(`📦 Firebase Admin — ${sa.project_id}`);
}
function now() { return Timestamp.now(); }

const NUEVOS_PROCESOS = [
  {
    id: 'pro_agro_rrhh_001',
    codigo: 'PRO-RRHH-001',
    nombre: 'Gestión de Recursos Humanos',
    objetivo: 'Gestionar el ciclo completo del personal: incorporación, capacitación, evaluación de desempeño y desvinculación, asegurando la competencia del equipo conforme a ISO 9001 cláusula 7.2.',
    alcance: 'Todo el personal de Agro Bicufa SRL. Incluye contratación, inducción, plan de capacitación anual y evaluaciones de desempeño.',
    responsable: 'Gerente General',
    departamento_responsable_id: 'dept_agro_direccion',
    departamento_responsable_nombre: 'Dirección General',
    entradas: ['Necesidad de incorporación detectada por área', 'Plan anual de capacitación', 'Evaluaciones de desempeño previas', 'Requisitos de competencia por puesto (Matriz de Polivalencia)'],
    salidas: ['Personal incorporado e inducido', 'Legajo de empleado actualizado', 'Registros de capacitación y evaluaciones', 'Matriz de Polivalencia actualizada'],
    controles: ['Toda contratación requiere aprobación de Gerencia', 'Evaluaciones de desempeño semestrales obligatorias', 'Capacitaciones técnicas CASE IH con certificación CNH', 'Registros conservados 5 años según ISO 9001'],
    indicadores: ['Horas de capacitación por empleado/año', 'Rotación de personal (%)', 'Índice de satisfacción del personal', 'Cobertura de la Matriz de Polivalencia (%)'],
    documentos: ['DOC-RRHH-01: Perfil de puesto', 'DOC-RRHH-02: Plan anual de capacitación', 'DOC-RRHH-03: Evaluación de desempeño', 'DOC-RRHH-04: Registro de inducción'],
    estado: 'activo',
  },
  {
    id: 'pro_agro_nc_001',
    codigo: 'PRO-NC-001',
    nombre: 'Gestión de No Conformidades y Acciones Correctivas',
    objetivo: 'Identificar, analizar y eliminar las causas de no conformidades para prevenir su recurrencia y promover la mejora continua del SGC, según ISO 9001:2015 cláusula 10.2.',
    alcance: 'Todas las no conformidades detectadas en cualquier proceso o área de Agro Bicufa: auditoría interna, reclamo de cliente, inspección o autoevaluación.',
    responsable: 'Responsable de Calidad (ISO 9001)',
    departamento_responsable_id: 'dept_agro_calidad',
    departamento_responsable_nombre: 'Calidad',
    entradas: ['No conformidad detectada (interna o de cliente)', 'Hallazgo de auditoría interna', 'Reclamo o devolución de cliente', 'Resultado de indicador fuera de meta'],
    salidas: ['Registro de No Conformidad (RNC) completo', 'Análisis de causa raíz documentado', 'Plan de acción correctiva con responsable y fecha', 'Verificación de efectividad de la acción'],
    controles: ['Toda NC registrada en el sistema dentro de 48hs', 'Análisis de causa raíz obligatorio (5 Porqués o Ishikawa)', 'Plazo máximo de cierre de NC: 30 días hábiles', 'Verificación de efectividad a los 60 días'],
    indicadores: ['NC registradas por mes y por proceso', 'Tiempo promedio de cierre de NC (días)', '% NC cerradas en plazo', '% NC con recurrencia'],
    documentos: ['DOC-NC-01: Formulario de No Conformidad', 'DOC-NC-02: Análisis de causa raíz', 'DOC-NC-03: Plan de acción correctiva', 'DOC-NC-04: Verificación de efectividad'],
    estado: 'activo',
  },
  {
    id: 'pro_agro_doc_001',
    codigo: 'PRO-DOC-001',
    nombre: 'Control de Documentos y Registros',
    objetivo: 'Asegurar que los documentos y registros del SGC estén disponibles, sean adecuados, protegidos y conservados conforme a ISO 9001:2015 cláusulas 7.5.2 y 7.5.3.',
    alcance: 'Toda la documentación del SGC: procedimientos, instructivos, formularios, registros, manuales técnicos y documentación externa relevante (normas CASE IH, legislación).',
    responsable: 'Responsable de Calidad (ISO 9001)',
    departamento_responsable_id: 'dept_agro_calidad',
    departamento_responsable_nombre: 'Calidad',
    entradas: ['Necesidad de crear o modificar un documento', 'Cambio en proceso o requisito normativo', 'Documento externo nuevo (norma, manual técnico CNH)'],
    salidas: ['Documento aprobado y publicado en el sistema', 'Lista maestra de documentos actualizada', 'Versiones obsoletas retiradas', 'Registros archivados con tiempo de conservación definido'],
    controles: ['Todo documento debe tener código, versión, fecha y aprobación', 'Revisión periódica mínimo anual', 'Solo versiones vigentes disponibles para el personal', 'Respaldo digital de todos los registros'],
    indicadores: ['Documentos vencidos sin revisión (%)', 'Tiempo promedio de aprobación de nuevos documentos (días)', 'Documentos obsoletos retirados por período'],
    documentos: ['DOC-DOC-01: Procedimiento de control de documentos', 'DOC-DOC-02: Lista maestra de documentos', 'DOC-DOC-03: Tabla de conservación de registros'],
    estado: 'activo',
  },
  {
    id: 'pro_agro_obj_001',
    codigo: 'PRO-OBJ-001',
    nombre: 'Planificación y Seguimiento de Objetivos de Calidad',
    objetivo: 'Establecer, comunicar, monitorear y revisar los objetivos de calidad alineados con la política y objetivos estratégicos del negocio, según ISO 9001:2015 cláusula 6.2.',
    alcance: 'Todos los departamentos y procesos clave de Agro Bicufa. Objetivos definidos anualmente en la Revisión por la Dirección y monitoreados mensualmente.',
    responsable: 'Gerente General',
    departamento_responsable_id: 'dept_agro_direccion',
    departamento_responsable_nombre: 'Dirección General',
    entradas: ['Política de Calidad vigente', 'Resultados del año anterior', 'Contexto del negocio y riesgos', 'Requisitos de CNH Industrial para concesionarios'],
    salidas: ['Objetivos de calidad definidos y comunicados', 'Plan de acción por objetivo', 'Tablero de seguimiento mensual', 'Informe para Revisión por la Dirección'],
    controles: ['Objetivos SMART: medibles, con responsable y fecha', 'Revisión mensual del cumplimiento', 'Revisión formal semestral con Gerencia', 'Comunicados a todo el personal'],
    indicadores: ['% objetivos con cumplimiento igual o mayor a meta', 'Variación real vs meta por indicador', 'Objetivos alcanzados al cierre del año'],
    documentos: ['DOC-OBJ-01: Objetivos de calidad anuales', 'DOC-OBJ-02: Tablero de indicadores', 'DOC-OBJ-03: Informe de revisión por la dirección'],
    estado: 'activo',
  },
  {
    id: 'pro_agro_fin_001',
    codigo: 'PRO-FIN-001',
    nombre: 'Gestión Administrativa y Financiera',
    objetivo: 'Garantizar el correcto registro contable, gestión de tesorería, facturación y cumplimiento de obligaciones impositivas de Agro Bicufa SRL.',
    alcance: 'Todas las operaciones económico-financieras: facturación de ventas y servicios, pagos a proveedores, cobros y liquidación de sueldos.',
    responsable: 'Administrador General',
    departamento_responsable_id: 'dept_agro_admin',
    departamento_responsable_nombre: 'Administración y Finanzas',
    entradas: ['Facturas de compra de proveedores', 'Remitos y contratos de ventas para facturar', 'OT cerradas del taller', 'Novedades de RRHH para sueldos'],
    salidas: ['Facturas emitidas (ventas, servicios, repuestos)', 'Pagos realizados a proveedores y empleados', 'Declaraciones juradas presentadas', 'Estados financieros mensuales para Dirección'],
    controles: ['Conciliación bancaria semanal', 'Aprobación de Gerencia para pagos mayores a 500.000 pesos', 'Cierre contable mensual antes del día 10', 'Resguardo digital de documentación impositiva'],
    indicadores: ['Días de cobranza promedio', 'Días de pago promedio a proveedores', 'Cumplimiento de presentaciones impositivas en término (%)', 'Resultado operativo mensual'],
    documentos: ['DOC-FIN-01: Procedimiento de facturación', 'DOC-FIN-02: Procedimiento de cobranzas', 'DOC-FIN-03: Pagos a proveedores', 'DOC-FIN-04: Cierre contable mensual'],
    estado: 'activo',
  },
  {
    id: 'pro_agro_mkt_001',
    codigo: 'PRO-MKT-001',
    nombre: 'Gestión Comercial, Marketing y Ferias',
    objetivo: 'Planificar y ejecutar acciones de marketing, comunicación y participación en exposiciones rurales (Expoagro, AgroActiva, Rurales) para posicionar a Agro Bicufa y generar oportunidades de venta.',
    alcance: 'Presencia en redes sociales, web, ferias y exposiciones agropecuarias, fidelización de clientes y materiales de comunicación CASE IH.',
    responsable: 'Gerente de Ventas',
    departamento_responsable_id: 'dept_agro_ventas',
    departamento_responsable_nombre: 'Ventas y Comercial',
    entradas: ['Calendario de ferias del sector agro', 'Directrices de marca CASE IH (CNH)', 'Base de datos de clientes del CRM', 'Presupuesto anual de marketing'],
    salidas: ['Plan de marketing anual aprobado', 'Presencia en ferias con exhibición de maquinaria', 'Leads generados y registrados en CRM', 'Contenido digital publicado (redes, web)'],
    controles: ['Toda comunicación sigue guía de marca CASE IH', 'Presupuesto aprobado por Gerencia anualmente', 'Registro de leads en cada feria en el CRM', 'Evaluación post-feria: ROI y oportunidades generadas'],
    indicadores: ['Ferias y eventos participados por año', 'Leads generados por canal', 'Costo por lead generado', 'Tasa de conversión leads a ventas (%)'],
    documentos: ['DOC-MKT-01: Plan de marketing anual', 'DOC-MKT-02: Protocolo de participación en ferias', 'DOC-MKT-03: Guía de uso de marca CASE IH'],
    estado: 'activo',
  },
  {
    id: 'pro_agro_inf_001',
    codigo: 'PRO-INF-001',
    nombre: 'Gestión de Infraestructura y Equipamiento',
    objetivo: 'Mantener en condiciones adecuadas las instalaciones, herramientas y equipos necesarios para la prestación de servicios de calidad en taller, mostrador y administración, según ISO 9001:2015 cláusula 7.1.3.',
    alcance: 'Instalaciones de Casa Central (Rafaela) y sucursales de Sunchales y Esperanza: taller mecánico, depósito, mostrador de repuestos y oficinas.',
    responsable: 'Gerente General',
    departamento_responsable_id: 'dept_agro_direccion',
    departamento_responsable_nombre: 'Dirección General',
    entradas: ['Plan de mantenimiento preventivo anual', 'Reporte de falla o deterioro de equipos', 'Requisitos técnicos CNH para taller certificado', 'Normativa de seguridad e higiene laboral'],
    salidas: ['Instalaciones y equipos operativos', 'Registro de mantenimientos realizados', 'Plan de inversión en infraestructura', 'Certificaciones de equipos de medición calibrados'],
    controles: ['Mantenimiento preventivo según cronograma', 'Calibración anual de equipos de diagnóstico', 'Inspección semestral de condiciones de seguridad', 'Aprobación CNH para modificaciones en taller certificado'],
    indicadores: ['% mantenimientos preventivos realizados en tiempo', 'Equipos fuera de servicio no planificados por mes', 'Costo de mantenimiento correctivo vs preventivo', 'Cumplimiento de calibración de equipos (%)'],
    documentos: ['DOC-INF-01: Plan de mantenimiento preventivo', 'DOC-INF-02: Registro de mantenimientos', 'DOC-INF-03: Plan de calibración de equipos', 'DOC-INF-04: Mapa de instalaciones y equipos críticos'],
    estado: 'activo',
  },
];

async function main() {
  console.log('\n🚀 Insertando 7 procesos adicionales — Agro Bicufa\n');
  initAdmin();
  const db = getFirestore();
  const batch = db.batch();
  for (const p of NUEVOS_PROCESOS) {
    batch.set(db.collection('processDefinitions').doc(p.id), {
      ...p,
      organization_id: ORG_ID,
      organizationId: ORG_ID,
      createdAt: now(),
      updatedAt: now(),
    }, { merge: true });
    console.log(`  ✓ [${p.codigo}] ${p.nombre}`);
  }
  await batch.commit();
  console.log(`\n✅ ${NUEVOS_PROCESOS.length} procesos insertados`);
  console.log('   Total procesos Agro Bicufa: 15\n');
  process.exit(0);
}
main().catch(e => { console.error('❌', e); process.exit(1); });
