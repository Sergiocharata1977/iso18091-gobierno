---
title: "Sistema Multiagente"
module: "don-candido"
screen: "/agentes"
summary: "Conoce cómo funciona el sistema multiagente de Don Cándido y sus capacidades."
roles: ["admin", "gerente", "super_admin"]
tags: ["ia", "agentes", "automatizacion", "dashboard"]
relatedRoutes: ["/agentes", "/mi-panel"]
order: 4
status: "active"
category: "usuario"
lastValidated: "2026-03-06"
---

# Sistema Multiagente de Don Cándido

El **Sistema Multiagente** es el núcleo de inteligencia artificial autónoma de la plataforma. Mientras que el asistente de chat tradicional (Don Cándido) responde preguntas basándose en el contexto que le proporcionas, el sistema multiagente es capaz de **ejecutar tareas complejas en segundo plano**, dividirlas en pasos, y completarlas sin requerir de tu supervisión constante.

## ¿Qué es un Agente?

En nuestra plataforma, un **agente** es un programa de inteligencia artificial especializado con permisos específicos (Capabilities) para realizar acciones dentro del sistema ISO 9001 o del CRM, como si fuera un usuario humano adicional en tu equipo.

Por ejemplo, un agente puede:
* Recibir un mensaje de WhatsApp de un cliente.
* Analizar el mensaje y buscar información en el sistema.
* Registrar una nueva oportunidad (Lead) en el CRM.
* Asignarle una tarea a un vendedor para que le haga seguimiento.

Todo esto ocurre en segundo plano de manera automática.

---

## Capacidades Disponibles (Intents)

Actualmente, los agentes están entrenados para manejar los siguientes escenarios (conocidos como "Intents"):

1. **Consulta ISO (`iso.consultation`)**: El agente puede buscar información dentro de tus documentos normativos, evidencias y procesos del sistema de gestión de calidad para responder consultas complejas.
2. **Evaluación de Leads CRM (`crm.lead.score`)**: Analiza la información de un cliente potencial y le asigna un puntaje (scoring) basado en la probabilidad de cierre.
3. **Asignación de Tareas (`task.assign`)**: Puede crear tareas y asignarlas a los responsables adecuados basándose en el contexto de una reunión o documento.
4. **Recordatorios (`task.reminder`)**: Gestiona alertas proactivas sobre eventos próximos.
5. **Alertas de Gobernanza (`governance.alert.handle`)**: Detecta y procesa eventos de riesgo corporativo o desviaciones en el sistema.
6. **Recepción de WhatsApp (`whatsapp.message.received`)**: Procesa los mensajes entrantes de los clientes por WhatsApp y los clasifica.
7. **Medición Vencida (`quality.measurement.overdue.notify`)**: Detecta indicadores de calidad que no han sido medidos a tiempo y notifica a los responsables.

---

## El Centro de Agentes (Dashboard)

Para brindar total transparencia sobre lo que los agentes están haciendo "detrás de escena", hemos creado el **Centro de Agentes IA**. 

Puedes acceder a él desde el menú principal de navegación o visitando la ruta `/agentes`.

En este panel podrás visualizar:
* **Métricas en tiempo real**: Cuántas tareas se han procesado, cuántas están en cola y el porcentaje de éxito.
* **Actividad de los últimos 7 días**: Un gráfico que detalla el volumen de trabajo manejado por la IA.
* **Feed de Actividad (Jobs)**: Un registro detallado de cada acción que está tomando un agente, qué intent está utilizando, y si la completó con éxito o falló.
* **Filtros**: Si necesitas auditar algo en particular, puedes filtrar la actividad por el estado de la tarea (ej. "Fallidos") o por la capacidad utilizada (ej. "Lead Scoring").

### Estados de un Trabajo (Job)

Cuando el sistema procesa una acción, verás que el trabajo pasa por distintos estados:

* **En Cola**: El trabajo ha sido recibido pero aún no hay agentes libres para procesarlo.
* **Ejecutando**: Un agente está trabajando activamente en la resolución.
* **Completado**: El agente ha finalizado su labor exitosamente y sus resultados ya están en el sistema.
* **Fallido**: Ocurrió un error. El sistema internamente realizará hasta 3 reintentos antes de marcarlo como fallido definitivo.
* **Pendiente de Aprobación**: Para acciones críticas, el agente pausará su trabajo y esperará a que un usuario humano apruebe continuar.

## ¿Cómo interactuar con los agentes?

Actualmente, los agentes actúan de dos formas:

1. **De forma reactiva (vía Chat)**: Cuando conversas con Don Cándido en `/mi-panel`, y la respuesta requiere una acción del sistema (ej. *"¿Puedes recordarme medir el indicador de ventas mañana?"*), el chat delegará internamente esta acción al sistema multiagente.
2. **Por disparadores internos**: Eventos en el sistema (como recibir un WhatsApp o que se venza una fecha de medición ISO) lanzan automáticamente trabajos a la cola de agentes sin que tengas que intervenir.

*El Sistema Multiagente está en constante evolución y pronto incorporará nuevas capacidades de análisis y automatización para hacer el trabajo de tu equipo aún más eficiente.*
