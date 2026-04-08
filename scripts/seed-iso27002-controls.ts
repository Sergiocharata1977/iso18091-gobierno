import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { Timestamp } from 'firebase-admin/firestore';

dotenv.config({ path: '.env.local' });

if (fs.existsSync('service-account.json')) {
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH = 'service-account.json';
}

import { getAdminFirestore } from '../src/lib/firebase/admin';

const BATCH_LIMIT = 500;
const FRAMEWORK = 'ISO27002' as const;
const COLLECTION_NAME = 'sgsi_controles';

type Theme = 5 | 6 | 7 | 8;
type ThemeName = 'Organizacionales' | 'Personas' | 'Fisicos' | 'Tecnologicos';

type SeedControl = {
  code: string;
  title: string;
  description: string;
  theme: Theme;
  themeName: ThemeName;
  relatedNISTCSF: string;
  relatedCIS: string;
};

const CONTROLS: SeedControl[] = [
  { code: '5.1', title: 'Politicas para la seguridad de la informacion', description: 'Definir, aprobar, comunicar y revisar politicas de seguridad de la informacion alineadas con el negocio y el contexto de riesgo.', theme: 5, themeName: 'Organizacionales', relatedNISTCSF: 'GV', relatedCIS: '17' },
  { code: '5.2', title: 'Roles y responsabilidades de seguridad de la informacion', description: 'Asignar y comunicar responsabilidades especificas de seguridad para que cada funcion conozca sus obligaciones y autoridad.', theme: 5, themeName: 'Organizacionales', relatedNISTCSF: 'GV', relatedCIS: '17' },
  { code: '5.3', title: 'Segregacion de funciones', description: 'Separar tareas incompatibles para reducir errores, fraude y uso indebido de privilegios o informacion sensible.', theme: 5, themeName: 'Organizacionales', relatedNISTCSF: 'PR', relatedCIS: '6' },
  { code: '5.4', title: 'Responsabilidades de la direccion', description: 'Exigir a la direccion que impulse y supervise el cumplimiento de las politicas, procedimientos y controles de seguridad.', theme: 5, themeName: 'Organizacionales', relatedNISTCSF: 'GV', relatedCIS: '17' },
  { code: '5.5', title: 'Contacto con autoridades', description: 'Mantener canales definidos con autoridades y reguladores para responder a incidentes, requisitos legales y coordinaciones externas.', theme: 5, themeName: 'Organizacionales', relatedNISTCSF: 'GV', relatedCIS: '' },
  { code: '5.6', title: 'Contacto con grupos de interes especial', description: 'Participar en foros, asociaciones o comunidades especializadas para recibir orientacion, alertas y buenas practicas relevantes.', theme: 5, themeName: 'Organizacionales', relatedNISTCSF: 'GV', relatedCIS: '' },
  { code: '5.7', title: 'Inteligencia de amenazas', description: 'Recolectar y analizar informacion sobre amenazas para anticipar impactos, priorizar defensas y apoyar decisiones de tratamiento.', theme: 5, themeName: 'Organizacionales', relatedNISTCSF: 'ID', relatedCIS: '7' },
  { code: '5.8', title: 'Seguridad de la informacion en la gestion de proyectos', description: 'Incorporar requisitos de seguridad en la planificacion, ejecucion y cierre de proyectos durante todo su ciclo de vida.', theme: 5, themeName: 'Organizacionales', relatedNISTCSF: 'GV', relatedCIS: '17' },
  { code: '5.9', title: 'Inventario de informacion y otros activos asociados', description: 'Identificar y mantener inventarios actualizados de informacion, software, servicios, equipos y otros activos relevantes.', theme: 5, themeName: 'Organizacionales', relatedNISTCSF: 'ID', relatedCIS: '1' },
  { code: '5.10', title: 'Uso aceptable de la informacion y otros activos asociados', description: 'Establecer reglas de uso aceptable para proteger activos, definir limites de uso y reducir conductas riesgosas.', theme: 5, themeName: 'Organizacionales', relatedNISTCSF: 'PR', relatedCIS: '4' },
  { code: '5.11', title: 'Devolucion de activos', description: 'Asegurar que personal y terceros devuelvan activos fisicos y logicos al terminar funciones, contratos o relaciones.', theme: 5, themeName: 'Organizacionales', relatedNISTCSF: 'PR', relatedCIS: '5' },
  { code: '5.12', title: 'Clasificacion de la informacion', description: 'Clasificar la informacion segun su sensibilidad, valor y requisitos de manejo para aplicar protecciones adecuadas.', theme: 5, themeName: 'Organizacionales', relatedNISTCSF: 'ID', relatedCIS: '3' },
  { code: '5.13', title: 'Etiquetado de la informacion', description: 'Aplicar etiquetas consistentes a la informacion clasificada para facilitar su identificacion y tratamiento correcto.', theme: 5, themeName: 'Organizacionales', relatedNISTCSF: 'PR', relatedCIS: '3' },
  { code: '5.14', title: 'Transferencia de informacion', description: 'Proteger la informacion cuando se comparte interna o externamente mediante reglas, metodos y acuerdos de transferencia.', theme: 5, themeName: 'Organizacionales', relatedNISTCSF: 'PR', relatedCIS: '3' },
  { code: '5.15', title: 'Control de acceso', description: 'Definir y aplicar reglas de control de acceso basadas en necesidades del negocio y principios de minimo privilegio.', theme: 5, themeName: 'Organizacionales', relatedNISTCSF: 'PR', relatedCIS: '6' },
  { code: '5.16', title: 'Gestion de identidades', description: 'Administrar identidades durante todo su ciclo de vida para otorgar, modificar y retirar accesos de forma controlada.', theme: 5, themeName: 'Organizacionales', relatedNISTCSF: 'PR', relatedCIS: '5' },
  { code: '5.17', title: 'Informacion de autenticacion', description: 'Proteger credenciales y definir reglas para su emision, uso, renovacion y custodia segura.', theme: 5, themeName: 'Organizacionales', relatedNISTCSF: 'PR', relatedCIS: '6' },
  { code: '5.18', title: 'Derechos de acceso', description: 'Otorgar, revisar y revocar derechos de acceso de manera formal, periodica y trazable.', theme: 5, themeName: 'Organizacionales', relatedNISTCSF: 'PR', relatedCIS: '5' },
  { code: '5.19', title: 'Seguridad de la informacion en relaciones con proveedores', description: 'Gestionar riesgos de seguridad asociados a proveedores y terceros durante toda la relacion comercial.', theme: 5, themeName: 'Organizacionales', relatedNISTCSF: 'GV', relatedCIS: '15' },
  { code: '5.20', title: 'Tratamiento de la seguridad de la informacion en acuerdos con proveedores', description: 'Incluir requisitos de seguridad claros, verificables y exigibles en contratos y acuerdos con proveedores.', theme: 5, themeName: 'Organizacionales', relatedNISTCSF: 'GV', relatedCIS: '15' },
  { code: '5.21', title: 'Gestion de la seguridad de la informacion en la cadena de suministro TIC', description: 'Controlar riesgos en productos y servicios TIC de la cadena de suministro, incluyendo dependencias y subproveedores.', theme: 5, themeName: 'Organizacionales', relatedNISTCSF: 'GV', relatedCIS: '15' },
  { code: '5.22', title: 'Monitoreo, revision y gestion de cambios de servicios de proveedores', description: 'Supervisar el desempeno y los cambios de servicios tercerizados para mantener el nivel de seguridad esperado.', theme: 5, themeName: 'Organizacionales', relatedNISTCSF: 'GV', relatedCIS: '15' },
  { code: '5.23', title: 'Seguridad de la informacion para el uso de servicios en la nube', description: 'Definir criterios y responsabilidades para seleccionar, usar, monitorear y retirar servicios cloud de manera segura.', theme: 5, themeName: 'Organizacionales', relatedNISTCSF: 'GV', relatedCIS: '4' },
  { code: '5.24', title: 'Planificacion y preparacion para la gestion de incidentes de seguridad de la informacion', description: 'Establecer capacidades, roles, procesos y recursos para detectar, analizar y responder incidentes de forma ordenada.', theme: 5, themeName: 'Organizacionales', relatedNISTCSF: 'RS', relatedCIS: '17' },
  { code: '5.25', title: 'Evaluacion y decision sobre eventos de seguridad de la informacion', description: 'Evaluar eventos reportados para determinar su criticidad, clasificacion y necesidad de escalamiento o respuesta.', theme: 5, themeName: 'Organizacionales', relatedNISTCSF: 'DE', relatedCIS: '17' },
  { code: '5.26', title: 'Respuesta a incidentes de seguridad de la informacion', description: 'Aplicar procedimientos de contencion, analisis, erradicacion y recuperacion frente a incidentes confirmados.', theme: 5, themeName: 'Organizacionales', relatedNISTCSF: 'RS', relatedCIS: '17' },
  { code: '5.27', title: 'Aprendizaje a partir de incidentes de seguridad de la informacion', description: 'Registrar lecciones aprendidas y mejorar controles, procesos y capacidades a partir de incidentes ocurridos.', theme: 5, themeName: 'Organizacionales', relatedNISTCSF: 'RC', relatedCIS: '17' },
  { code: '5.28', title: 'Recoleccion de evidencia', description: 'Preservar y recopilar evidencia de manera integra y admisible para investigaciones internas o requerimientos legales.', theme: 5, themeName: 'Organizacionales', relatedNISTCSF: 'RS', relatedCIS: '8' },
  { code: '5.29', title: 'Seguridad de la informacion durante interrupciones', description: 'Mantener o restaurar controles clave de seguridad durante contingencias, crisis o situaciones de interrupcion operativa.', theme: 5, themeName: 'Organizacionales', relatedNISTCSF: 'RC', relatedCIS: '11' },
  { code: '5.30', title: 'Preparacion TIC para la continuidad del negocio', description: 'Asegurar que la infraestructura y servicios TIC soporten los objetivos de continuidad y recuperacion del negocio.', theme: 5, themeName: 'Organizacionales', relatedNISTCSF: 'RC', relatedCIS: '11' },
  { code: '5.31', title: 'Requisitos legales, estatutarios, regulatorios y contractuales', description: 'Identificar y cumplir obligaciones legales y contractuales relacionadas con seguridad de la informacion y proteccion de datos.', theme: 5, themeName: 'Organizacionales', relatedNISTCSF: 'GV', relatedCIS: '' },
  { code: '5.32', title: 'Derechos de propiedad intelectual', description: 'Proteger activos sujetos a propiedad intelectual y asegurar el uso licito de software, contenido y conocimiento.', theme: 5, themeName: 'Organizacionales', relatedNISTCSF: 'GV', relatedCIS: '2' },
  { code: '5.33', title: 'Proteccion de registros', description: 'Preservar registros autenticos, completos y disponibles conforme a plazos de retencion y requisitos aplicables.', theme: 5, themeName: 'Organizacionales', relatedNISTCSF: 'GV', relatedCIS: '8' },
  { code: '5.34', title: 'Privacidad y proteccion de PII', description: 'Aplicar controles para proteger datos personales y cumplir principios y obligaciones de privacidad.', theme: 5, themeName: 'Organizacionales', relatedNISTCSF: 'GV', relatedCIS: '3' },
  { code: '5.35', title: 'Revision independiente de la seguridad de la informacion', description: 'Realizar revisiones independientes para evaluar la adecuacion y eficacia del sistema de control de seguridad.', theme: 5, themeName: 'Organizacionales', relatedNISTCSF: 'GV', relatedCIS: '18' },
  { code: '5.36', title: 'Cumplimiento con politicas, reglas y estandares de seguridad de la informacion', description: 'Verificar periodicamente que personas, procesos y tecnologias cumplan las reglas internas de seguridad definidas.', theme: 5, themeName: 'Organizacionales', relatedNISTCSF: 'GV', relatedCIS: '17' },
  { code: '5.37', title: 'Procedimientos operativos documentados', description: 'Mantener procedimientos operativos documentados, actualizados y disponibles para actividades relevantes de seguridad.', theme: 5, themeName: 'Organizacionales', relatedNISTCSF: 'PR', relatedCIS: '4' },

  { code: '6.1', title: 'Verificacion de antecedentes', description: 'Realizar verificaciones previas al empleo o contratacion segun riesgo, normativa y sensibilidad del puesto.', theme: 6, themeName: 'Personas', relatedNISTCSF: 'GV', relatedCIS: '14' },
  { code: '6.2', title: 'Terminos y condiciones de empleo', description: 'Incluir responsabilidades de seguridad en contratos, acuerdos laborales y condiciones de empleo.', theme: 6, themeName: 'Personas', relatedNISTCSF: 'GV', relatedCIS: '14' },
  { code: '6.3', title: 'Concienciacion, educacion y capacitacion en seguridad de la informacion', description: 'Capacitar de forma periodica al personal para que comprenda riesgos, politicas y practicas seguras.', theme: 6, themeName: 'Personas', relatedNISTCSF: 'PR', relatedCIS: '14' },
  { code: '6.4', title: 'Proceso disciplinario', description: 'Aplicar medidas disciplinarias formales y coherentes ante incumplimientos de seguridad de la informacion.', theme: 6, themeName: 'Personas', relatedNISTCSF: 'GV', relatedCIS: '14' },
  { code: '6.5', title: 'Responsabilidades despues de la terminacion o cambio de empleo', description: 'Mantener obligaciones y controles aplicables cuando una persona cambia de rol o finaliza su relacion.', theme: 6, themeName: 'Personas', relatedNISTCSF: 'PR', relatedCIS: '5' },
  { code: '6.6', title: 'Acuerdos de confidencialidad o no divulgacion', description: 'Establecer acuerdos para proteger informacion confidencial durante y despues de la relacion laboral o comercial.', theme: 6, themeName: 'Personas', relatedNISTCSF: 'GV', relatedCIS: '' },
  { code: '6.7', title: 'Trabajo remoto', description: 'Definir medidas para proteger informacion, accesos y equipos cuando el personal trabaja fuera de instalaciones controladas.', theme: 6, themeName: 'Personas', relatedNISTCSF: 'PR', relatedCIS: '12' },
  { code: '6.8', title: 'Reporte de eventos de seguridad de la informacion', description: 'Asegurar que personal y terceros reporten rapidamente eventos sospechosos o debilidades de seguridad.', theme: 6, themeName: 'Personas', relatedNISTCSF: 'DE', relatedCIS: '17' },

  { code: '7.1', title: 'Perimetros de seguridad fisica', description: 'Definir y proteger perimetros fisicos para impedir acceso no autorizado a instalaciones y areas sensibles.', theme: 7, themeName: 'Fisicos', relatedNISTCSF: 'PR', relatedCIS: '14' },
  { code: '7.2', title: 'Ingreso fisico', description: 'Controlar y registrar el acceso fisico de personas y vehiculos a areas protegidas.', theme: 7, themeName: 'Fisicos', relatedNISTCSF: 'PR', relatedCIS: '14' },
  { code: '7.3', title: 'Proteccion de oficinas, salas e instalaciones', description: 'Asegurar oficinas, salas tecnicas e instalaciones frente a accesos indebidos y amenazas fisicas.', theme: 7, themeName: 'Fisicos', relatedNISTCSF: 'PR', relatedCIS: '14' },
  { code: '7.4', title: 'Monitoreo de seguridad fisica', description: 'Monitorear areas y accesos fisicos mediante vigilancia, sensores u otros medios adecuados.', theme: 7, themeName: 'Fisicos', relatedNISTCSF: 'DE', relatedCIS: '13' },
  { code: '7.5', title: 'Proteccion contra amenazas fisicas y ambientales', description: 'Aplicar salvaguardas frente a incendio, inundacion, temperatura, energia y otras amenazas ambientales.', theme: 7, themeName: 'Fisicos', relatedNISTCSF: 'PR', relatedCIS: '14' },
  { code: '7.6', title: 'Trabajo en areas seguras', description: 'Definir reglas y controles para actividades realizadas dentro de areas seguras o restringidas.', theme: 7, themeName: 'Fisicos', relatedNISTCSF: 'PR', relatedCIS: '14' },
  { code: '7.7', title: 'Escritorio limpio y pantalla limpia', description: 'Reducir exposiciones accidentales mediante orden, resguardo de documentos y bloqueo de pantallas.', theme: 7, themeName: 'Fisicos', relatedNISTCSF: 'PR', relatedCIS: '4' },
  { code: '7.8', title: 'Ubicacion y proteccion del equipamiento', description: 'Ubicar y proteger el equipamiento para minimizar riesgos de dano, robo, interferencia o acceso no autorizado.', theme: 7, themeName: 'Fisicos', relatedNISTCSF: 'PR', relatedCIS: '14' },
  { code: '7.9', title: 'Seguridad de los activos fuera de las instalaciones', description: 'Proteger equipos e informacion cuando se trasladan o usan fuera de las instalaciones de la organizacion.', theme: 7, themeName: 'Fisicos', relatedNISTCSF: 'PR', relatedCIS: '1' },
  { code: '7.10', title: 'Medios de almacenamiento', description: 'Gestionar almacenamiento, traslado, reutilizacion y eliminacion de medios para evitar divulgacion o perdida.', theme: 7, themeName: 'Fisicos', relatedNISTCSF: 'PR', relatedCIS: '3' },
  { code: '7.11', title: 'Servicios de soporte', description: 'Proteger energia, climatizacion, agua, telecomunicaciones y otros servicios de soporte criticos.', theme: 7, themeName: 'Fisicos', relatedNISTCSF: 'PR', relatedCIS: '11' },
  { code: '7.12', title: 'Seguridad del cableado', description: 'Proteger cableado electrico y de datos frente a danos, interceptacion o interferencias.', theme: 7, themeName: 'Fisicos', relatedNISTCSF: 'PR', relatedCIS: '12' },
  { code: '7.13', title: 'Mantenimiento del equipamiento', description: 'Realizar mantenimiento seguro y controlado para preservar disponibilidad, integridad y trazabilidad del equipamiento.', theme: 7, themeName: 'Fisicos', relatedNISTCSF: 'PR', relatedCIS: '4' },
  { code: '7.14', title: 'Eliminacion segura o reutilizacion del equipamiento', description: 'Borrar informacion y asegurar disposicion o reutilizacion segura de equipos antes de su salida de servicio.', theme: 7, themeName: 'Fisicos', relatedNISTCSF: 'PR', relatedCIS: '4' },

  { code: '8.1', title: 'Dispositivos de usuario final', description: 'Proteger notebooks, celulares, estaciones de trabajo y otros endpoints mediante configuracion y uso seguro.', theme: 8, themeName: 'Tecnologicos', relatedNISTCSF: 'PR', relatedCIS: '4' },
  { code: '8.2', title: 'Derechos de acceso privilegiado', description: 'Restringir y supervisar privilegios elevados para evitar uso indebido o cambios no autorizados.', theme: 8, themeName: 'Tecnologicos', relatedNISTCSF: 'PR', relatedCIS: '5' },
  { code: '8.3', title: 'Restriccion de acceso a la informacion', description: 'Aplicar restricciones tecnicas de acceso coherentes con la clasificacion y necesidad de conocer.', theme: 8, themeName: 'Tecnologicos', relatedNISTCSF: 'PR', relatedCIS: '6' },
  { code: '8.4', title: 'Acceso al codigo fuente', description: 'Restringir y controlar el acceso al codigo fuente para prevenir cambios indebidos y fuga de conocimiento.', theme: 8, themeName: 'Tecnologicos', relatedNISTCSF: 'PR', relatedCIS: '16' },
  { code: '8.5', title: 'Autenticacion segura', description: 'Implementar mecanismos de autenticacion robustos acordes al riesgo y la sensibilidad de los sistemas.', theme: 8, themeName: 'Tecnologicos', relatedNISTCSF: 'PR', relatedCIS: '6' },
  { code: '8.6', title: 'Gestion de capacidad', description: 'Monitorear y planificar capacidad de procesamiento, almacenamiento y red para sostener servicios seguros.', theme: 8, themeName: 'Tecnologicos', relatedNISTCSF: 'PR', relatedCIS: '12' },
  { code: '8.7', title: 'Proteccion contra malware', description: 'Prevenir, detectar y responder ante software malicioso con controles tecnicos y practicas operativas.', theme: 8, themeName: 'Tecnologicos', relatedNISTCSF: 'PR', relatedCIS: '10' },
  { code: '8.8', title: 'Gestion de vulnerabilidades tecnicas', description: 'Identificar, evaluar y remediar vulnerabilidades tecnicas de manera oportuna y basada en riesgo.', theme: 8, themeName: 'Tecnologicos', relatedNISTCSF: 'ID', relatedCIS: '7' },
  { code: '8.9', title: 'Gestion de configuracion', description: 'Definir configuraciones seguras y controlar cambios para mantener estados autorizados y consistentes.', theme: 8, themeName: 'Tecnologicos', relatedNISTCSF: 'PR', relatedCIS: '4' },
  { code: '8.10', title: 'Eliminacion de informacion', description: 'Eliminar informacion de forma segura cuando ya no sea necesaria o exista requerimiento de disposicion.', theme: 8, themeName: 'Tecnologicos', relatedNISTCSF: 'PR', relatedCIS: '3' },
  { code: '8.11', title: 'Enmascaramiento de datos', description: 'Aplicar tecnicas de enmascaramiento para limitar exposicion de datos sensibles en uso, prueba o analisis.', theme: 8, themeName: 'Tecnologicos', relatedNISTCSF: 'PR', relatedCIS: '3' },
  { code: '8.12', title: 'Prevencion de fuga de datos', description: 'Implementar medidas para detectar y bloquear divulgacion no autorizada de informacion sensible.', theme: 8, themeName: 'Tecnologicos', relatedNISTCSF: 'PR', relatedCIS: '3' },
  { code: '8.13', title: 'Respaldo de la informacion', description: 'Realizar copias de seguridad, verificar su restauracion y protegerlas segun criticidad y tiempo de recuperacion.', theme: 8, themeName: 'Tecnologicos', relatedNISTCSF: 'RC', relatedCIS: '11' },
  { code: '8.14', title: 'Redundancia de instalaciones de procesamiento de informacion', description: 'Disponer redundancia adecuada para sostener servicios criticos frente a fallas o indisponibilidades.', theme: 8, themeName: 'Tecnologicos', relatedNISTCSF: 'RC', relatedCIS: '11' },
  { code: '8.15', title: 'Registro de eventos', description: 'Generar y conservar logs relevantes para soporte operativo, investigacion y monitoreo de seguridad.', theme: 8, themeName: 'Tecnologicos', relatedNISTCSF: 'DE', relatedCIS: '8' },
  { code: '8.16', title: 'Actividades de monitoreo', description: 'Monitorear sistemas, redes y comportamientos para detectar actividades anormales o no autorizadas.', theme: 8, themeName: 'Tecnologicos', relatedNISTCSF: 'DE', relatedCIS: '13' },
  { code: '8.17', title: 'Sincronizacion de relojes', description: 'Mantener relojes sincronizados para asegurar consistencia temporal en registros, eventos y evidencias.', theme: 8, themeName: 'Tecnologicos', relatedNISTCSF: 'DE', relatedCIS: '8' },
  { code: '8.18', title: 'Uso de programas utilitarios privilegiados', description: 'Restringir y controlar el uso de utilitarios con privilegios capaces de eludir controles normales.', theme: 8, themeName: 'Tecnologicos', relatedNISTCSF: 'PR', relatedCIS: '5' },
  { code: '8.19', title: 'Instalacion de software en sistemas operativos', description: 'Autorizar y controlar la instalacion de software en entornos operativos para evitar cambios riesgosos.', theme: 8, themeName: 'Tecnologicos', relatedNISTCSF: 'PR', relatedCIS: '2' },
  { code: '8.20', title: 'Seguridad de redes', description: 'Proteger redes y componentes asociados frente a accesos no autorizados, abuso, alteracion o interrupcion.', theme: 8, themeName: 'Tecnologicos', relatedNISTCSF: 'PR', relatedCIS: '12' },
  { code: '8.21', title: 'Seguridad de los servicios de red', description: 'Definir y asegurar los niveles de seguridad requeridos para servicios de red internos o tercerizados.', theme: 8, themeName: 'Tecnologicos', relatedNISTCSF: 'PR', relatedCIS: '12' },
  { code: '8.22', title: 'Segregacion de redes', description: 'Separar redes, segmentos y zonas para limitar movimiento lateral y reducir impacto de incidentes.', theme: 8, themeName: 'Tecnologicos', relatedNISTCSF: 'PR', relatedCIS: '12' },
  { code: '8.23', title: 'Filtrado web', description: 'Restringir acceso a sitios y contenidos riesgosos para reducir exposicion a malware y fraude.', theme: 8, themeName: 'Tecnologicos', relatedNISTCSF: 'PR', relatedCIS: '9' },
  { code: '8.24', title: 'Uso de criptografia', description: 'Seleccionar y aplicar criptografia para proteger confidencialidad, integridad, autenticidad y no repudio segun contexto.', theme: 8, themeName: 'Tecnologicos', relatedNISTCSF: 'PR', relatedCIS: '3' },
  { code: '8.25', title: 'Ciclo de vida de desarrollo seguro', description: 'Integrar seguridad en el ciclo de vida de desarrollo desde requisitos hasta despliegue y mantenimiento.', theme: 8, themeName: 'Tecnologicos', relatedNISTCSF: 'PR', relatedCIS: '16' },
  { code: '8.26', title: 'Requisitos de seguridad de aplicaciones', description: 'Definir requisitos de seguridad para aplicaciones nuevas, cambiadas o adquiridas antes de implementarlas.', theme: 8, themeName: 'Tecnologicos', relatedNISTCSF: 'PR', relatedCIS: '16' },
  { code: '8.27', title: 'Arquitectura segura del sistema y principios de ingenieria', description: 'Aplicar principios de arquitectura e ingenieria segura al diseno e integracion de sistemas.', theme: 8, themeName: 'Tecnologicos', relatedNISTCSF: 'PR', relatedCIS: '4' },
  { code: '8.28', title: 'Codificacion segura', description: 'Adoptar practicas de codificacion segura para prevenir vulnerabilidades durante el desarrollo de software.', theme: 8, themeName: 'Tecnologicos', relatedNISTCSF: 'PR', relatedCIS: '16' },
  { code: '8.29', title: 'Pruebas de seguridad en desarrollo y aceptacion', description: 'Ejecutar pruebas de seguridad apropiadas antes de aceptar o liberar sistemas, cambios o componentes.', theme: 8, themeName: 'Tecnologicos', relatedNISTCSF: 'PR', relatedCIS: '16' },
  { code: '8.30', title: 'Desarrollo subcontratado', description: 'Gestionar riesgos y requisitos de seguridad cuando el desarrollo de software es realizado por terceros.', theme: 8, themeName: 'Tecnologicos', relatedNISTCSF: 'GV', relatedCIS: '15' },
  { code: '8.31', title: 'Separacion de entornos de desarrollo, prueba y produccion', description: 'Separar entornos y accesos para evitar interferencias, errores y exposicion de datos o configuraciones.', theme: 8, themeName: 'Tecnologicos', relatedNISTCSF: 'PR', relatedCIS: '4' },
  { code: '8.32', title: 'Gestion de cambios', description: 'Controlar cambios en sistemas, aplicaciones e infraestructura mediante evaluacion, aprobacion y trazabilidad.', theme: 8, themeName: 'Tecnologicos', relatedNISTCSF: 'PR', relatedCIS: '4' },
  { code: '8.33', title: 'Informacion de prueba', description: 'Proteger la informacion utilizada en pruebas para evitar uso no autorizado o exposicion de datos sensibles.', theme: 8, themeName: 'Tecnologicos', relatedNISTCSF: 'PR', relatedCIS: '3' },
  { code: '8.34', title: 'Proteccion de los sistemas de informacion durante pruebas de auditoria', description: 'Planificar y controlar pruebas de auditoria para no comprometer disponibilidad, integridad ni confidencialidad.', theme: 8, themeName: 'Tecnologicos', relatedNISTCSF: 'GV', relatedCIS: '18' },
];

if (CONTROLS.length !== 93) {
  throw new Error(`Se esperaban 93 controles ISO 27002 y se cargaron ${CONTROLS.length}.`);
}

function chunkControls<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

async function seedIso27002Controls() {
  const orgId = process.argv[2];

  if (!orgId) {
    console.error('Uso: npx ts-node scripts/seed-iso27002-controls.ts <orgId>');
    process.exit(1);
  }

  const db = getAdminFirestore();
  const controlsCollection = db
    .collection('organizations')
    .doc(orgId)
    .collection(COLLECTION_NAME);

  const existingCountSnapshot = await controlsCollection.count().get();
  const existingCount = existingCountSnapshot.data().count;

  if (existingCount > 0) {
    console.log(
      `La coleccion organizations/${orgId}/${COLLECTION_NAME} ya tiene ${existingCount} documentos. Seed omitido para evitar duplicados.`
    );
    return;
  }

  const now = Timestamp.now();
  const chunks = chunkControls(CONTROLS, BATCH_LIMIT);

  for (const [index, chunk] of chunks.entries()) {
    const batch = db.batch();

    for (const control of chunk) {
      const docRef = controlsCollection.doc();

      batch.set(docRef, {
        id: docRef.id,
        organizationId: orgId,
        framework: FRAMEWORK,
        code: control.code,
        title: control.title,
        description: control.description,
        theme: control.theme,
        themeName: control.themeName,
        applicable: true,
        applicabilityReason: '',
        implementationStatus: 'no_implementado',
        linkedAssets: [],
        linkedRisks: [],
        linkedIncidents: [],
        scoreDesign: 0,
        scoreEvidence: 0,
        scoreEffectiveness: 0,
        relatedNISTCSF: control.relatedNISTCSF,
        relatedCIS: control.relatedCIS,
        createdAt: now,
        updatedAt: now,
      });
    }

    await batch.commit();
    console.log(
      `Batch ${index + 1}/${chunks.length} confirmado con ${chunk.length} controles.`
    );
  }

  console.log(
    `Seed completado: ${CONTROLS.length} controles ISO 27002:2022 creados en organizations/${orgId}/${COLLECTION_NAME}.`
  );
}

seedIso27002Controls().catch(error => {
  console.error('Error al ejecutar el seed ISO 27002:', error);
  process.exit(1);
});
