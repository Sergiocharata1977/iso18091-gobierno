'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

type Language = 'en' | 'es' | 'pt';

interface Translations {
  nav: {
    howItWorks: string;
    benefits: string;
    pricing: string;
    contact: string;
  };
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    cta1: string;
    cta2: string;
    trust?: string[];
  };
  problem: {
    title: string;
    subtitle: string;
    items: {
      title: string;
      description: string;
    }[];
    footer: string;
  };
  proposal: {
    title: string;
    subtitle: string;
    explanation: string;
    items: string[];
  };
  howItWorks: {
    title: string;
    subtitle: string;
    features: {
      title: string;
      description: string;
    }[];
  };
  aiCapabilities: {
    title: string;
    subtitle: string;
    items: {
      title: string;
      description: string;
      details?: string[];
    }[];
  };
  agenticStrengths: {
    title: string;
    subtitle: string;
    outro: string;
    items: {
      title: string;
      description: string;
      accent: string;
    }[];
  };
  targetAudience: {
    title: string;
    subtitle: string;
    items: {
      title: string;
      description: string;
    }[];
  };
  results: {
    title: string;
    subtitle: string;
    items: string[];
  };
  autoGestion: {
    title: string;
    subtitle: string;
    steps: { label: string; description: string }[];
    cta: string;
  };
  architecture: {
    title: string;
    subtitle: string;
    description: string;
    features: { title: string; description: string }[];
  };
  ecosystem: {
    eyebrow: string;
    title: string;
    subtitle: string;
    nucleusLabel: string;
    footer: string;
    pillars: {
      title: string;
      items: string[];
    }[];
  };
  pricing: {
    title: string;
    subtitle: string;
    cta: string;
    features: string[];
  };
  benefits: {
    title: string;
    subtitle: string;
    items: {
      title: string;
      description: string;
    }[];
  };
  demo: {
    title: string;
    subtitle: string;
    form: {
      name: string;
      email: string;
      company: string;
      employees: string;
      message: string;
      submit: string;
      success: string;
    };
  };
  footer: {
    rights: string;
    privacy: string;
    terms: string;
  };
}

const translations: Record<Language, Translations> = {
  en: {
    nav: {
      howItWorks: 'How It Works',
      benefits: 'Benefits',
      pricing: 'Pricing',
      contact: 'Demo',
    },
    hero: {
      badge: 'Operating system for ISO 9001',
      title: 'Turn ISO 9001 into a real management system.',
      subtitle:
        'Don Candido IA turns ISO 9001 implementation into a real operating system for your company: processes, documents, audits, owners, and contextual intelligence in one place.',
      cta1: 'Request guided demo',
      cta2: 'How it works',
      trust: [
        'Reduces operational improvisation',
        'Transforms ISO into real management',
        'Guides each person by their role',
      ],
    },
    problem: {
      title: 'Most companies do not fail for lack of effort.',
      subtitle: 'They fail for lack of system.',
      items: [
        {
          title: 'Fragile processes',
          description: 'Critical work depends on memory and specific people.',
        },
        {
          title: 'Blind decisions',
          description:
            'Teams act without reliable data, status, or traceability.',
        },
        {
          title: 'Stressful audits',
          description: 'Audits expose disorder instead of proving control.',
        },
        {
          title: 'Binder ISO',
          description:
            'The certificate exists, but the system is not lived daily.',
        },
      ],
      footer:
        'The issue is not the standard. The issue is operating without structure.',
    },
    proposal: {
      title: 'Not another tool for the folder.',
      subtitle: 'A management layer that makes ISO operational.',
      explanation:
        'Don Candido IA organizes daily execution so quality stops depending on memory, spreadsheets, and chasing people:',
      items: [
        'Each process has an owner.',
        'Each role knows what to do and when.',
        'Each action leaves traceability.',
        'Each deviation is detected before it becomes urgency.',
      ],
    },
    howItWorks: {
      title: 'How It Works',
      subtitle:
        'It structures the company in three layers: structure, context, and active follow-up.',
      features: [
        {
          title: '1. Structure',
          description:
            'Departments, roles, processes, and responsibilities are defined with clear ownership.',
        },
        {
          title: '2. Context',
          description:
            'AI understands the role, process, and objective of each person inside the system.',
        },
        {
          title: '3. Active governance',
          description:
            'The platform monitors status, deadlines, and deviations before they turn into noise.',
        },
      ],
    },
    aiCapabilities: {
      title: 'What AI Does in Practice',
      subtitle:
        'Concrete capabilities to operate quality, audits, and daily follow-up',
      items: [
        {
          title: 'Contextual ISO chat',
          description:
            'Every person gets answers based on role, task, and real ISO context.',
        },
        {
          title: 'Audit evaluation',
          description:
            'It detects gaps against ISO clauses with structured, reviewable outputs.',
        },
        {
          title: 'ISO document generation',
          description:
            'It drafts procedures, manuals, and instructions with a professional structure.',
        },
        {
          title: 'Operational agent',
          description:
            'It detects overdue work, notifies owners, and escalates when there is no response.',
        },
      ],
    },
    agenticStrengths: {
      title: 'The 4 Strengths That Make AI Operational',
      subtitle:
        'Don Candido goes beyond chat. It combines asynchronous execution, workflow orchestration, supervised actions, and governed local agents.',
      outro:
        'A stronger category: enterprise agents with context, real execution, auditability, and human control when needed.',
      items: [
        {
          title: 'Asynchronous operations',
          description:
            'Runs assignments, reminders, alerts, scoring, and notifications in the background without waiting for a person to stay inside the chat.',
          accent: 'bg-sky-500',
        },
        {
          title: 'Intelligent workflows',
          description:
            'Coordinates multi-step processes with dependencies, pauses, approvals, and continuity across teams and responsibilities.',
          accent: 'bg-emerald-500',
        },
        {
          title: 'Confirmed actions',
          description:
            'AI can propose real changes to the system, but only executes them after human confirmation and with full traceability.',
          accent: 'bg-amber-500',
        },
        {
          title: 'Sentinel local agent',
          description:
            'Extends intelligence to the employee terminal with policies, quarantine, approvals, and centralized governance.',
          accent: 'bg-rose-500',
        },
      ],
    },
    targetAudience: {
      title: 'Who It Is For',
      subtitle: 'For teams that need real order, not another disconnected app.',
      items: [
        {
          title: 'Management: control & visibility',
          description:
            'Traceable decisions, risk control, and total visibility of the operation.',
        },
        {
          title: 'Quality: centralized system',
          description:
            'A single traceable place for documents, audits, findings, and follow-up.',
        },
        {
          title: 'Middle Managers: clear processes',
          description:
            'Defined owners and early alerts so the team executes without guessing.',
        },
        {
          title: 'Teams: contextual guidance',
          description:
            'Precise instructions and an AI assistant that helps with everyday work.',
        },
      ],
    },
    results: {
      title: 'Expected Result',
      subtitle:
        'Less improvisation. More traceability. More everyday management.',
      items: [
        'Clear responsibilities',
        'Defined processes',
        'Traceable decisions',
        'Calmer audits',
        'Continuous improvement in daily work',
      ],
    },
    autoGestion: {
      title: 'Your QMS Runs with Follow-up',
      subtitle:
        'Detection, notification, and escalation without manual chasing',
      steps: [
        {
          label: 'Detection',
          description:
            'AI scans overdue measurements, expired documents, and unmanaged risks.',
        },
        {
          label: 'Notification',
          description:
            'Owners receive WhatsApp alerts with context and due dates.',
        },
        {
          label: 'Escalation',
          description:
            'If no one responds, the system escalates automatically to supervisors.',
        },
      ],
      cta: 'See how it works',
    },
    architecture: {
      title: 'Operational credibility, not just positioning',
      subtitle: 'A real product built for serious work.',
      description:
        'Don Candido IA works on top of real ISO structure, with organization isolation, complete traceability, and concrete modules for documents, processes, audits, findings, and follow-up.',
      features: [
        {
          title: 'Organization isolation',
          description:
            'Each company works in its own isolated environment. Data does not cross organizations.',
        },
        {
          title: 'Complete traceability',
          description:
            'Every action, decision, and AI response is recorded with date and owner.',
        },
        {
          title: 'Real operating modules',
          description:
            'Processes, documents, audits, actions, and owners live inside the same system.',
        },
      ],
    },
    ecosystem: {
      eyebrow: 'Unified platform',
      title: 'One nucleus, multiple operational solutions',
      subtitle:
        'A clearer interactive view of how our Quality Management System (QMS) connects ISO, operations, industry modules, and service channels in one base.',
      nucleusLabel: 'Core QMS',
      footer: 'One platform. Shared base. Multiple solutions and capabilities.',
      pillars: [
        {
          title: 'Compliance & ISO management',
          items: [
            'Quality audits',
            'ISO 27001 (ISMS)',
            'ISO 14001 (Environmental)',
            'ISO 45001 (OHS)',
          ],
        },
        {
          title: 'Industry solutions',
          items: [
            'Industrial operations',
            'Dealer networks',
            'HSE package',
            'Enterprise solutions',
          ],
        },
        {
          title: 'Central operations',
          items: [
            'Process management',
            'Document control',
            'Findings management',
            'Executive panel and HR',
          ],
        },
        {
          title: 'Connectivity & services',
          items: [
            'Web chat and webhooks',
            'Voice assistant',
            'WhatsApp integration',
            'Commercial CRM',
          ],
        },
      ],
    },
    pricing: {
      title: 'Start today',
      subtitle: 'No credit card. No commitment. Just strategic clarity.',
      cta: 'Request a quote',
      features: [
        'Unlimited users',
        'All ISO modules',
        'Don Candido IA included',
        'WhatsApp notifications',
      ],
    },
    benefits: {
      title: 'What You Understand in Seconds',
      subtitle: 'The value proposition in direct operational terms.',
      items: [
        {
          title: 'Clear processes',
          description:
            'Each critical flow has a visible sequence, status, and owner.',
        },
        {
          title: 'Centralized documents',
          description:
            'Procedures, records, and evidence stay in one controlled system.',
        },
        {
          title: 'Defined responsibilities',
          description:
            'Every role knows what to do, what is pending, and what escalates.',
        },
        {
          title: 'Contextual AI by role',
          description:
            'Guidance changes according to role, process, and current ISO status.',
        },
      ],
    },
    demo: {
      title: 'Request a guided demo',
      subtitle:
        'See how Don Candido IA organizes processes, documents, audits, and owners in one place.',
      form: {
        name: 'Full Name',
        email: 'Email Address',
        company: 'Company Name',
        employees: 'Number of Employees',
        message: 'Tell us about your needs',
        submit: 'I want to see the demo',
        success: "Thank you! We'll contact you soon.",
      },
    },
    footer: {
      rights: 'All rights reserved.',
      privacy: 'Privacy Policy',
      terms: 'Terms of Service',
    },
  },
  es: {
    nav: {
      howItWorks: 'Como funciona',
      benefits: 'Beneficios',
      pricing: 'Precios',
      contact: 'Demo',
    },
    hero: {
      badge: 'Sistema operativo para ISO 9001',
      title: 'Converti tu ISO 9001 en un sistema real de gestion.',
      subtitle:
        'Don Candido IA convierte la implementación ISO 9001 en un sistema operativo real para tu empresa: procesos, documentos, auditorías, responsables e inteligencia contextual en un solo lugar.',
      cta1: 'Ver demo guiada',
      cta2: 'Como funciona',
      trust: [
        'Reduce la improvisacion operativa',
        'Transforma la ISO en gestion real',
        'Guia a cada persona segun su rol',
      ],
    },
    problem: {
      title: 'La mayoria de las empresas no falla por falta de ganas.',
      subtitle: 'Falla por falta de sistema.',
      items: [
        {
          title: 'Procesos fragiles',
          description:
            'Dependen de memoria y de personas especificas, no del sistema.',
        },
        {
          title: 'Decisiones a ciegas',
          description:
            'Se toman sin datos confiables, contexto ni trazabilidad.',
        },
        {
          title: 'Auditorias con miedo',
          description: 'Exponen desorden en lugar de demostrar control.',
        },
        {
          title: 'ISO de carpeta',
          description: 'Existe el certificado, pero no la gestion cotidiana.',
        },
      ],
      footer:
        'El problema no es la norma. El problema es operar sin estructura.',
    },
    proposal: {
      title: 'No es otro software para la carpeta.',
      subtitle: 'Es una capa de gestion que vuelve operativa tu ISO.',
      explanation:
        'Don Candido IA ordena la ejecucion diaria para que la calidad deje de depender de memoria, planillas y perseguir personas:',
      items: [
        'Cada proceso tiene dueno.',
        'Cada responsable sabe que hacer y cuando.',
        'Cada accion tiene trazabilidad.',
        'Cada desvio se detecta antes de convertirse en urgencia.',
      ],
    },
    howItWorks: {
      title: 'Como funciona',
      subtitle:
        'Ordena la empresa en tres capas: estructura, contexto y seguimiento activo.',
      features: [
        {
          title: '1. Estructura',
          description:
            'Define departamentos, puestos, procesos y responsabilidades con un dueno claro.',
        },
        {
          title: '2. Contexto',
          description:
            'La IA entiende el rol, el proceso y el objetivo de cada persona dentro del sistema.',
        },
        {
          title: '3. Gobernanza activa',
          description:
            'La plataforma monitorea estado, plazos y desvios antes de que se conviertan en ruido.',
        },
      ],
    },
    aiCapabilities: {
      title: 'Lo que la IA hace en la practica',
      subtitle:
        'Capacidades concretas para operar calidad, auditorias y seguimiento diario',
      items: [
        {
          title: 'Chat ISO contextual',
          description:
            'Cada persona recibe respuestas segun su rol, sus tareas y el contexto real del sistema.',
        },
        {
          title: 'Evaluacion de auditoria',
          description:
            'Detecta brechas contra clausulas ISO con salidas estructuradas y revisables.',
        },
        {
          title: 'Generacion documental ISO',
          description:
            'Genera procedimientos, manuales e instructivos con estructura profesional.',
        },
        {
          title: 'Agente operativo',
          description:
            'Detecta vencimientos, avisa por WhatsApp y escala cuando no hay respuesta.',
        },
      ],
    },
    agenticStrengths: {
      title: 'Las 4 fortalezas que vuelven operativa a la IA',
      subtitle:
        'Don Cándido va mucho más allá del chat. Combina ejecución asíncrona, orquestación de workflows, acciones supervisadas y agentes locales gobernados.',
      outro:
        'Una categoría más fuerte y defendible: agentes empresariales con contexto, ejecución real, auditabilidad y control humano donde hace falta.',
      items: [
        {
          title: 'Asincronía operativa',
          description:
            'Ejecuta asignaciones, recordatorios, alertas, scoring y notificaciones en segundo plano, sin depender de que alguien esté mirando el chat.',
          accent: 'bg-sky-500',
        },
        {
          title: 'Workflows inteligentes',
          description:
            'Coordina procesos de varios pasos con dependencias, pausas, aprobaciones y continuidad entre áreas y responsables.',
          accent: 'bg-emerald-500',
        },
        {
          title: 'Acciones con confirmación',
          description:
            'La IA puede proponer cambios reales sobre el sistema, pero solo los ejecuta tras validación humana y con trazabilidad completa.',
          accent: 'bg-amber-500',
        },
        {
          title: 'Sentinel',
          description:
            'Lleva la inteligencia hasta la terminal del empleado con políticas, cuarentena, aprobaciones y gobierno centralizado.',
          accent: 'bg-rose-500',
        },
      ],
    },
    targetAudience: {
      title: 'Para quien es',
      subtitle:
        'Para equipos que necesitan orden real, no otra herramienta suelta.',
      items: [
        {
          title: 'Gerencia: control y visibilidad',
          description:
            'Decisiones con trazabilidad, control de riesgos y visibilidad total de la operacion.',
        },
        {
          title: 'Calidad: sistema centralizado',
          description:
            'Un solo lugar rastreable para documentos, auditorias, hallazgos y seguimiento.',
        },
        {
          title: 'Mandos medios: procesos claros',
          description:
            'Responsables definidos y alertas tempranas para que el equipo ejecute sin improvisar.',
        },
        {
          title: 'Equipos: guia contextual',
          description:
            'Instrucciones precisas y un asistente IA que ayuda en el trabajo de todos los dias.',
        },
      ],
    },
    results: {
      title: 'Resultado esperado',
      subtitle: 'Menos improvisacion. Mas trazabilidad. Mas gestion cotidiana.',
      items: [
        'Responsabilidades claras',
        'Procesos definidos',
        'Decisiones trazables',
        'Auditorias con menos estres',
        'Mejora continua en el trabajo diario',
      ],
    },
    autoGestion: {
      title: 'Tu SGC se sigue solo',
      subtitle: 'Deteccion, aviso y escalamiento sin perseguir personas',
      steps: [
        {
          label: 'Deteccion',
          description:
            'La IA escanea mediciones vencidas, documentos caducados y riesgos sin gestionar.',
        },
        {
          label: 'Notificacion',
          description:
            'Los responsables reciben avisos por WhatsApp con contexto y plazo.',
        },
        {
          label: 'Escalamiento',
          description:
            'Si no hay respuesta, el sistema escala automaticamente a supervisores.',
        },
      ],
      cta: 'Ver como funciona',
    },
    architecture: {
      title: 'Credibilidad operativa, no solo discurso',
      subtitle: 'Producto real, trazable y preparado para trabajo serio.',
      description:
        'Don Candido IA trabaja sobre estructura ISO real, con aislamiento por organizacion, trazabilidad completa y modulos concretos para documentos, procesos, auditorias, hallazgos y seguimiento.',
      features: [
        {
          title: 'Aislamiento por organizacion',
          description:
            'Cada empresa opera en su propio entorno. Ningun dato cruza entre organizaciones.',
        },
        {
          title: 'Trazabilidad completa',
          description:
            'Cada accion, decision y respuesta de IA queda registrada con fecha y responsable.',
        },
        {
          title: 'Modulos reales para operar',
          description:
            'Procesos, documentos, auditorias, acciones y responsables viven dentro del mismo sistema.',
        },
      ],
    },
    ecosystem: {
      eyebrow: 'Plataforma unificada',
      title: 'Un núcleo, múltiples soluciones operativas',
      subtitle:
        'Una vista interactiva más clara de cómo nuestro Software de Administración de Normas de Calidad conecta ISO, operación, soluciones por industria y canales de servicio sobre una misma base.',
      nucleusLabel: 'Core SGC',
      footer:
        'Plataforma única. Base común. Múltiples soluciones y capacidades.',
      pillars: [
        {
          title: 'Gestion de compliance e ISO',
          items: [
            'Auditorias de calidad',
            'ISO 27001 (SGSI)',
            'ISO 14001 (Ambiental)',
            'ISO 45001 (SST)',
          ],
        },
        {
          title: 'Soluciones por industria',
          items: [
            'Soluciones industriales',
            'Dealer / concesionarias',
            'Pack HSE',
            'Soluciones enterprise',
          ],
        },
        {
          title: 'Gestion operativa central',
          items: [
            'Gestion de procesos',
            'Gestion de documentos',
            'Gestion de hallazgos',
            'Panel ejecutivo y RRHH',
          ],
        },
        {
          title: 'Conectividad y servicios',
          items: [
            'Chat web y webhooks',
            'Asistente de voz',
            'Integracion WhatsApp',
            'CRM comercial',
          ],
        },
      ],
    },
    pricing: {
      title: 'Empeza hoy',
      subtitle: 'Sin tarjeta. Sin compromiso. Solo claridad estrategica.',
      cta: 'Solicitar cotizacion',
      features: [
        'Usuarios ilimitados',
        'Todos los modulos ISO',
        'Don Candido IA incluido',
        'Notificaciones WhatsApp',
      ],
    },
    benefits: {
      title: 'Lo que entendes en segundos',
      subtitle:
        'No vendemos una idea abstracta: vendemos orden operativo con IA.',
      items: [
        {
          title: 'Procesos claros',
          description:
            'Cada flujo importante tiene secuencia, estado y responsable visible.',
        },
        {
          title: 'Documentacion centralizada',
          description:
            'Procedimientos, registros y evidencias quedan en un solo sistema controlado.',
        },
        {
          title: 'Responsables definidos',
          description:
            'Cada puesto sabe que debe hacer, que esta pendiente y que escala.',
        },
        {
          title: 'IA contextual por rol',
          description:
            'La asistencia cambia segun area, puesto, proceso y situacion ISO.',
        },
      ],
    },
    demo: {
      title: 'Pedi una demo guiada de Don Candido IA',
      subtitle:
        'Te mostramos como ordenar procesos, documentos, auditorias y responsables en tu empresa.',
      form: {
        name: 'Nombre completo',
        email: 'Correo electronico',
        company: 'Nombre de la empresa',
        employees: 'Numero de empleados',
        message: 'Contanos sobre tus necesidades',
        submit: 'Quiero ver la demo',
        success: 'Gracias. Te contactaremos pronto.',
      },
    },
    footer: {
      rights: 'Todos los derechos reservados.',
      privacy: 'Politica de privacidad',
      terms: 'Terminos de servicio',
    },
  },
  pt: {
    nav: {
      howItWorks: 'Como funciona',
      benefits: 'Beneficios',
      pricing: 'Precos',
      contact: 'Demo',
    },
    hero: {
      badge: 'Sistema operacional para ISO 9001',
      title: 'Transforme a ISO 9001 em um sistema real de gestao.',
      subtitle:
        'Don Candido IA converte a implementacao da ISO 9001 em um sistema operacional real para a sua empresa: processos, documentos, auditorias, responsaveis e inteligencia contextual em um so lugar.',
      cta1: 'Ver demo guiada',
      cta2: 'Como funciona',
      trust: [
        'Reduz o improviso operacional',
        'Transforma a ISO em gestao real',
        'Guia cada pessoa segundo a sua funcao',
      ],
    },
    problem: {
      title: 'A maioria das empresas nao falha por falta de vontade.',
      subtitle: 'Falha por falta de sistema.',
      items: [
        {
          title: 'Processos frageis',
          description: 'Dependem de memoria e de pessoas especificas.',
        },
        {
          title: 'Decisoes no escuro',
          description: 'Acontecem sem dados confiaveis nem rastreabilidade.',
        },
        {
          title: 'Auditorias com tensao',
          description: 'Exibem desordem em vez de provar controle.',
        },
        {
          title: 'ISO de pasta',
          description: 'Existe o certificado, mas nao a rotina de gestao.',
        },
      ],
      footer: 'O problema nao e a norma. O problema e operar sem estrutura.',
    },
    proposal: {
      title: 'Nao e mais uma ferramenta.',
      subtitle: 'E uma camada de gestao que torna a ISO operacional.',
      explanation:
        'Don Candido IA organiza a execucao diaria para que a qualidade nao dependa de planilhas e memoria:',
      items: [
        'Cada processo tem dono.',
        'Cada responsavel sabe o que fazer e quando.',
        'Cada acao deixa rastreabilidade.',
        'Cada desvio e detectado antes de virar urgencia.',
      ],
    },
    howItWorks: {
      title: 'Como funciona',
      subtitle:
        'Estrutura, contexto e acompanhamento ativo em uma mesma camada.',
      features: [
        {
          title: '1. Estrutura',
          description:
            'Define departamentos, funcoes, processos e responsabilidades.',
        },
        {
          title: '2. Contexto',
          description:
            'A IA entende papel, processo e objetivo de cada pessoa no sistema.',
        },
        {
          title: '3. Governanca ativa',
          description:
            'A plataforma monitora status, prazos e desvios antes do ruido.',
        },
      ],
    },
    aiCapabilities: {
      title: 'O que a IA faz na pratica',
      subtitle: 'Capacidades concretas para operar qualidade e acompanhamento',
      items: [
        {
          title: 'Chat ISO contextual',
          description:
            'Cada pessoa recebe respostas conforme funcao, tarefa e contexto real.',
        },
        {
          title: 'Avaliacao de auditoria',
          description:
            'Detecta lacunas frente a clausulas ISO com saidas estruturadas.',
        },
        {
          title: 'Geracao documental ISO',
          description:
            'Gera procedimentos, manuais e instrucoes com estrutura profissional.',
        },
        {
          title: 'Agente operacional',
          description:
            'Detecta vencimentos, notifica e escala quando nao ha resposta.',
        },
      ],
    },
    agenticStrengths: {
      title: 'As 4 forcas que tornam a IA operacional',
      subtitle:
        'Don Candido vai muito alem do chat. Combina execucao assincrona, orquestracao de workflows, acoes supervisionadas e agentes locais governados.',
      outro:
        'Uma categoria mais forte: agentes empresariais com contexto, execucao real, rastreabilidade e controle humano quando necessario.',
      items: [
        {
          title: 'Operacao assincrona',
          description:
            'Executa atribuicoes, lembretes, alertas, scoring e notificacoes em segundo plano, sem depender de alguem estar no chat.',
          accent: 'bg-sky-500',
        },
        {
          title: 'Workflows inteligentes',
          description:
            'Coordena processos com varias etapas, dependencias, pausas, aprovacoes e continuidade entre areas e responsaveis.',
          accent: 'bg-emerald-500',
        },
        {
          title: 'Acoes com confirmacao',
          description:
            'A IA pode propor mudancas reais no sistema, mas so executa apos validacao humana e com rastreabilidade completa.',
          accent: 'bg-amber-500',
        },
        {
          title: 'Sentinel',
          description:
            'Leva a inteligencia ate o terminal do colaborador com politicas, quarentena, aprovacoes e governanca centralizada.',
          accent: 'bg-rose-500',
        },
      ],
    },
    targetAudience: {
      title: 'Para quem e',
      subtitle:
        'Para equipes que precisam de ordem real, nao outra ferramenta solta.',
      items: [
        {
          title: 'Gerencia: controle e visibilidade',
          description:
            'Decisoes com rastreabilidade, controle de riscos e visibilidade total da operacao.',
        },
        {
          title: 'Qualidade: sistema centralizado',
          description:
            'Um so lugar rastreavel para documentos, auditorias, achados e acompanhamento.',
        },
        {
          title: 'Liderancas: processos claros',
          description:
            'Responsaveis definidos e alertas precoces para executar sem improvisar.',
        },
        {
          title: 'Equipes: guia contextual',
          description:
            'Instrucoes precisas e um assistente IA que ajuda no trabalho do dia a dia.',
        },
      ],
    },
    results: {
      title: 'Resultado esperado',
      subtitle: 'Menos improviso. Mais rastreabilidade. Mais gestao diaria.',
      items: [
        'Responsabilidades claras',
        'Processos definidos',
        'Decisoes rastreaveis',
        'Auditorias mais tranquilas',
        'Melhoria continua no dia a dia',
      ],
    },
    autoGestion: {
      title: 'Seu SGQ se acompanha sozinho',
      subtitle: 'Deteccao, aviso e escalonamento sem perseguir pessoas',
      steps: [
        {
          label: 'Deteccao',
          description: 'A IA monitora vencimentos e riscos sem tratar.',
        },
        {
          label: 'Notificacao',
          description: 'Os responsaveis recebem contexto e prazo por WhatsApp.',
        },
        {
          label: 'Escalonamento',
          description: 'Sem resposta, o sistema escala automaticamente.',
        },
      ],
      cta: 'Ver como funciona',
    },
    architecture: {
      title: 'Credibilidade operacional, nao apenas discurso',
      subtitle: 'Produto real e preparado para trabalho serio.',
      description:
        'Don Candido IA opera sobre estrutura ISO real, com isolamento por organizacao, rastreabilidade completa e modulos concretos.',
      features: [
        {
          title: 'Isolamento por organizacao',
          description: 'Cada empresa opera em ambiente proprio e isolado.',
        },
        {
          title: 'Rastreabilidade completa',
          description:
            'Cada acao e resposta fica registrada com data e responsavel.',
        },
        {
          title: 'Modulos reais para operar',
          description:
            'Processos, documentos, auditorias e acoes vivem no mesmo sistema.',
        },
      ],
    },
    ecosystem: {
      eyebrow: 'Plataforma unificada',
      title: 'Um nucleo, multiplas solucoes operacionais',
      subtitle:
        'Uma visao interativa mais clara de como Don Candido IA conecta ISO, operacao, modulos setoriais e canais de servico sobre a mesma base.',
      nucleusLabel: 'Nucleo de solucoes',
      footer:
        'Uma plataforma. Base compartilhada. Multiplas solucoes e capacidades.',
      pillars: [
        {
          title: 'Gestao de compliance e ISO',
          items: [
            'Auditorias de qualidade',
            'ISO 27001 (SGSI)',
            'ISO 14001 (Ambiental)',
            'ISO 45001 (SST)',
          ],
        },
        {
          title: 'Solucoes por industria',
          items: [
            'Operacoes industriais',
            'Redes dealer',
            'Pacote HSE',
            'Solucoes enterprise',
          ],
        },
        {
          title: 'Operacao central',
          items: [
            'Gestao de processos',
            'Controle documental',
            'Gestao de achados',
            'Painel executivo e RH',
          ],
        },
        {
          title: 'Conectividade e servicos',
          items: [
            'Chat web e webhooks',
            'Assistente de voz',
            'Integracao WhatsApp',
            'CRM comercial',
          ],
        },
      ],
    },
    pricing: {
      title: 'Comece hoje',
      subtitle: 'Sem cartao. Sem compromisso. Apenas clareza estrategica.',
      cta: 'Solicitar orcamento',
      features: [
        'Usuarios ilimitados',
        'Todos os modulos ISO',
        'Don Candido IA incluido',
        'Notificacoes WhatsApp',
      ],
    },
    benefits: {
      title: 'O que voce entende em segundos',
      subtitle: 'O valor central da plataforma em linguagem direta.',
      items: [
        {
          title: 'Processos claros',
          description: 'Cada fluxo tem dono, estado e prioridade.',
        },
        {
          title: 'Documentacao centralizada',
          description: 'Procedimentos e evidencias ficam em um so lugar.',
        },
        {
          title: 'Responsaveis definidos',
          description: 'Cada pessoa sabe o que executar e acompanhar.',
        },
        {
          title: 'IA contextual por funcao',
          description: 'A assistencia muda conforme papel e contexto.',
        },
      ],
    },
    demo: {
      title: 'Solicite uma demo guiada',
      subtitle:
        'Mostramos como organizar processos, documentos, auditorias e responsaveis em um so sistema.',
      form: {
        name: 'Nome completo',
        email: 'Endereco de e-mail',
        company: 'Nome da empresa',
        employees: 'Numero de funcionarios',
        message: 'Conte sobre suas necessidades',
        submit: 'Quero ver a demo',
        success: 'Obrigado. Entraremos em contato em breve.',
      },
    },
    footer: {
      rights: 'Todos os direitos reservados.',
      privacy: 'Politica de privacidade',
      terms: 'Termos de servico',
    },
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('es');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t: translations[language],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
