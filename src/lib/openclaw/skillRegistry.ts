import type { OpenClawSkillManifest } from '@/types/openclaw';

export const OPENCLAW_SKILL_REGISTRY: OpenClawSkillManifest[] = [
  {
    skill_id: 'ver_solicitudes_abiertas',
    display_name: 'Ver solicitudes abiertas',
    description:
      'Lista solicitudes dealer abiertas para seguimiento operativo inicial.',
    capability_required: 'dealer_solicitudes',
    mode: 'read',
    params_schema: {
      tipo: {
        type: 'string',
        required: false,
        description:
          'Tipo de solicitud a filtrar: repuestos, servicios o comercial.',
      },
      limit: {
        type: 'number',
        required: false,
        description: 'Cantidad maxima de resultados a devolver.',
      },
    },
    example_query: 'Cuantas solicitudes abiertas tenemos hoy en repuestos?',
    api_endpoint: '/api/solicitudes?estado=ingresada',
    api_method: 'GET',
    status: 'active',
  },
  {
    skill_id: 'ver_solicitudes_en_proceso',
    display_name: 'Ver solicitudes en proceso',
    description:
      'Consulta solicitudes dealer que ya estan siendo trabajadas por el equipo.',
    capability_required: 'dealer_solicitudes',
    mode: 'read',
    params_schema: {
      flujo: {
        type: 'string',
        required: false,
        description:
          'Flujo operativo a consultar, por ejemplo repuestos o servicios.',
      },
      limit: {
        type: 'number',
        required: false,
        description: 'Cantidad maxima de solicitudes a listar.',
      },
    },
    example_query: 'Mostrame las solicitudes de servicio que siguen en proceso.',
    api_endpoint: '/api/solicitudes?estado=en_proceso',
    api_method: 'GET',
    status: 'active',
  },
  {
    skill_id: 'ver_solicitudes_comerciales_pendientes',
    display_name: 'Ver solicitudes comerciales pendientes',
    description:
      'Devuelve solicitudes comerciales pendientes para priorizar seguimiento.',
    capability_required: 'dealer_solicitudes',
    mode: 'read',
    params_schema: {
      limit: {
        type: 'number',
        required: false,
        description: 'Cantidad maxima de solicitudes a devolver.',
      },
    },
    example_query: 'Que solicitudes comerciales pendientes tenemos ahora?',
    api_endpoint: '/api/solicitudes?tipo=comercial&estado=ingresada',
    api_method: 'GET',
    status: 'active',
  },
  {
    skill_id: 'ver_oportunidades_activas',
    display_name: 'Ver oportunidades activas',
    description:
      'Lista oportunidades comerciales activas del pipeline CRM del tenant.',
    capability_required: 'crm',
    mode: 'read',
    params_schema: {
      vendedor_id: {
        type: 'string',
        required: false,
        description: 'Filtra oportunidades por vendedor responsable.',
      },
      estado_kanban_id: {
        type: 'string',
        required: false,
        description: 'Filtra oportunidades por etapa del pipeline.',
      },
    },
    example_query: 'Mostrame las oportunidades activas del equipo comercial.',
    api_endpoint: '/api/crm/oportunidades',
    api_method: 'GET',
    status: 'active',
  },
  {
    skill_id: 'ver_oportunidades_por_vendedor',
    display_name: 'Ver oportunidades por vendedor',
    description:
      'Consulta el pipeline de oportunidades asignadas a un vendedor.',
    capability_required: 'crm',
    mode: 'read',
    params_schema: {
      vendedor_id: {
        type: 'string',
        required: true,
        description: 'Identificador del vendedor a consultar.',
      },
    },
    example_query: 'Cuantas oportunidades activas tiene Juan Perez?',
    api_endpoint: '/api/crm/oportunidades',
    api_method: 'GET',
    status: 'active',
  },
  {
    skill_id: 'ver_documentos_cliente_crm',
    display_name: 'Ver documentos de cliente CRM',
    description:
      'Obtiene documentos historicos vinculados a un cliente del CRM.',
    capability_required: 'crm',
    mode: 'read',
    params_schema: {
      cliente_id: {
        type: 'string',
        required: true,
        description: 'Identificador del cliente CRM.',
      },
    },
    example_query: 'Mostrame los documentos historicos del cliente Garcia.',
    api_endpoint: '/api/crm/historico/{cliente_id}/documentos',
    api_method: 'GET',
    status: 'active',
  },
  {
    skill_id: 'ver_no_conformidades',
    display_name: 'Ver no conformidades',
    description:
      'Lista hallazgos y no conformidades abiertos del sistema de calidad.',
    capability_required: 'mejoras',
    mode: 'read',
    params_schema: {
      status: {
        type: 'string',
        required: false,
        description: 'Estado del hallazgo, por ejemplo open o closed.',
      },
      year: {
        type: 'number',
        required: false,
        description: 'Anio de los hallazgos a consultar.',
      },
    },
    example_query: 'Que no conformidades siguen abiertas este mes?',
    api_endpoint: '/api/findings',
    api_method: 'GET',
    status: 'active',
  },
  {
    skill_id: 'ver_documentos_recientes',
    display_name: 'Ver documentos recientes',
    description:
      'Consulta los documentos mas recientes cargados en el sistema ISO.',
    capability_required: 'documentos',
    mode: 'read',
    params_schema: {
      category: {
        type: 'string',
        required: false,
        description: 'Categoria documental opcional para filtrar resultados.',
      },
      limit: {
        type: 'number',
        required: false,
        description: 'Cantidad maxima de documentos a devolver.',
      },
    },
    example_query: 'Mostrame los ultimos documentos publicados del sistema.',
    api_endpoint: '/api/documents?sort=created_at&order=desc',
    api_method: 'GET',
    status: 'active',
  },
  {
    skill_id: 'ver_metricas_sgc',
    display_name: 'Ver metricas SGC',
    description:
      'Devuelve metricas resumidas del sistema de gestion y sus modulos base.',
    capability_required: 'mi-sgc',
    mode: 'read',
    params_schema: {},
    example_query: 'Como estan las metricas generales del sistema de calidad?',
    api_endpoint: '/api/mapa-procesos/metrics',
    api_method: 'GET',
    status: 'active',
  },
  {
    skill_id: 'consultar_mayor',
    display_name: 'Consultar mayor contable',
    description:
      'Consulta movimientos y saldo de una cuenta del mayor contable.',
    capability_required: 'contabilidad_central',
    mode: 'read',
    params_schema: {
      cuenta_id: {
        type: 'string',
        required: true,
        description: 'Identificador de la cuenta contable.',
      },
    },
    example_query: 'Mostrame el mayor de la cuenta caja principal.',
    api_endpoint: '/api/fin/asientos/mayor?cuenta_id={cuenta_id}',
    api_method: 'GET',
    status: 'disabled',
  },
  {
    skill_id: 'ver_libro_diario',
    display_name: 'Ver libro diario',
    description: 'Lista asientos contables recientes del libro diario.',
    capability_required: 'contabilidad_central',
    mode: 'read',
    params_schema: {
      limit: {
        type: 'number',
        required: false,
        description: 'Cantidad maxima de asientos a listar.',
      },
    },
    example_query: 'Mostrame los ultimos asientos del libro diario.',
    api_endpoint: '/api/fin/asientos',
    api_method: 'GET',
    status: 'disabled',
  },
  {
    skill_id: 'consultar_cuenta_corriente',
    display_name: 'Consultar cuenta corriente',
    description:
      'Consulta el estado de cuenta corriente de un cliente financiero.',
    capability_required: 'financiacion_consumo',
    mode: 'read',
    params_schema: {
      cliente_id: {
        type: 'string',
        required: true,
        description: 'Identificador del cliente financiero.',
      },
    },
    example_query: 'Cuanto debe el cliente Garcia hoy?',
    api_endpoint: '/api/fin/clientes/{cliente_id}/cuenta-corriente',
    api_method: 'GET',
    status: 'disabled',
  },
  {
    skill_id: 'ver_cartera',
    display_name: 'Ver cartera',
    description: 'Consulta un resumen operativo de la cartera financiera.',
    capability_required: 'financiacion_consumo',
    mode: 'read',
    params_schema: {},
    example_query: 'Como esta la cartera financiera del dia?',
    api_endpoint: '/api/fin/dashboard',
    api_method: 'GET',
    status: 'disabled',
  },
  {
    skill_id: 'consultar_cuotas_vencidas',
    display_name: 'Consultar cuotas vencidas',
    description: 'Lista cuotas vencidas para seguimiento de cobranzas.',
    capability_required: 'financiacion_consumo',
    mode: 'read',
    params_schema: {
      limit: {
        type: 'number',
        required: false,
        description: 'Cantidad maxima de cuotas a listar.',
      },
    },
    example_query: 'Que cuotas vencidas tenemos pendientes de cobro?',
    api_endpoint: '/api/fin/cuotas?estado=vencida',
    api_method: 'GET',
    status: 'disabled',
  },
];
