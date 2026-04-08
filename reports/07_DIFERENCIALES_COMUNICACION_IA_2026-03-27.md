# 07 — Diferenciales de Comunicación IA: Don Cándido
**Actualizado:** 2026-03-27

---

## Los 4 diferenciales de comunicación que nos distinguen

Estos no son features genéricos de IA. Son capacidades de comunicación con identidad propia que ningún software ISO del mercado tiene integrado.

---

## 1. Sentinel — Agente IA en la terminal local del empleado

**Nombre comercial:** Sentinel by Don Cándido
**Nombre interno en código:** `terminales`, agente: `don-candido-agent`

### Qué es
Un agente IA instalado en la PC de cada empleado, gobernado centralmente desde el SGC. No es un chatbot en el navegador — es un proceso local que puede actuar en la máquina del usuario con permisos controlados por la empresa.

### Cómo funciona
```
Admin crea terminal en /terminales → genera pairing code (24h)
                    ↓
Empleado ejecuta en su PC:
  don-candido-agent pair --code XXXXX --org [dominio]
                    ↓
Agente activo → conectado al SGC → gobernado por políticas
```

### Qué puede hacer el agente local
| Tool | Acción |
|---|---|
| `browser_navigate` | Navegar en el browser del usuario |
| `browser_click` | Hacer clic en elementos |
| `browser_fill_form` | Completar formularios automáticamente |
| `browser_screenshot` | Capturar pantalla |
| `file_read` / `file_write` | Leer y escribir archivos locales |
| `clipboard_read` / `clipboard_write` | Acceso al portapapeles |
| `app_open` | Abrir aplicaciones |
| `don_candido_chat` | Comunicarse con Don Cándido desde la terminal |

### Gobierno centralizado
- **Políticas en cascada:** Departamento → Puesto → Terminal (mayor prioridad gana)
- **Cuarentena inmediata:** el admin puede bloquear una terminal desde la web
- **Auditoría completa:** cada acción queda en `terminal_action_log`
- **Aprobación humana:** acciones sensibles requieren confirmación de un manager
- **Revocar y reactivar:** nuevo pairing code si se compromete una terminal

### Diferencial de mercado
Ningún software ISO tiene esto. Es equivalente a tener un **agente RPA** (Robotic Process Automation) en cada escritorio, pero integrado al SGC, auditado, y controlado por la misma plataforma de calidad.

---

## 2. WhatsApp Clientes — Canal externo IA con contexto SGC

**Plugin:** `crm_whatsapp_inbox`
**Ruta web:** `/crm/whatsapp`

### Qué es
Don Cándido atiende clientes por WhatsApp Business. El cliente escribe, Don Cándido responde con contexto real del SGC (oportunidades CRM, solicitudes, historial).

### Arquitectura
```
Cliente envía mensaje por WhatsApp
    ↓
Meta → POST /api/public/whatsapp/webhook (HMAC verificado)
    ↓
WhatsAppAdapter → ChannelIdentityResolver (resuelve quién es)
    ↓
UnifiedConverseService → Claude/Groq
    ↓
Respuesta con contexto: CRM, solicitudes, estado del pedido
```

### Features
- **HMAC-SHA256** en cada mensaje (seguridad real, no solo token)
- **Idempotencia:** mensajes duplicados de Meta no se procesan dos veces
- **Identidad del cliente:** si el número está en CRM, responde con su historial
- **Fallback de org:** si el número no está mapeado, usa fallback configurable
- **Dashboard interno:** inbox completo con historial, estados, conversaciones
- **Simulador de dev:** pruebas sin depender de Meta

### Estado de producción
⚠️ Código 100% listo. Pendiente: configurar webhook URL en Meta Developer Console + 3 variables de entorno en Vercel.

---

## 3. WhatsApp RRHH — IA que gestiona personas por WhatsApp

### Qué es
Don Cándido envía y procesa mensajes de WhatsApp dentro de los flujos de Recursos Humanos — no solo de cara al cliente, sino hacia los empleados.

### Casos de uso implementados (handlers activos)

| Intent | Qué hace | Trigger |
|---|---|---|
| `task.assign` | Asigna una tarea/visita a un empleado por WhatsApp | Manager solicita asignación |
| `task.reminder` | Envía recordatorio de tarea vencida o próxima | Sistema automático |
| `governance.alert.handle` | Envía alerta de gobernanza al manager responsable | Evento de auditoría |
| `quality.measurement.overdue.notify` | Detecta y notifica mediciones de calidad vencidas | Scheduler |

### Diferencial RRHH
El agente no solo notifica — **sabe a quién notificar** porque consulta el organigrama del SGC. Conoce el departamento, el puesto, el responsable jerárquico y el número de WhatsApp de cada persona.

### Flujo típico: asignación de tarea
```
Manager le dice a Don Cándido: "Asignar auditoría de proceso a Ana López"
    ↓
AgentWorkerService → TaskAssignHandler
    ↓
Resuelve número de WhatsApp de Ana desde RRHH
    ↓
Envía mensaje personalizado con detalle de la tarea
    ↓
Log en agent_jobs con resultado
```

---

## 4. IA Conversacional que escribe en la base de datos

### Qué es
Don Cándido no solo responde texto. Puede crear registros, actualizar estados y disparar flujos, con o sin aprobación humana, dependiendo de la sensibilidad de la acción.

### Sistema completo de acciones IA

#### a) Tool Registry — Acciones directas en conversación
El usuario le habla a Don Cándido y el sistema detecta la intención y ejecuta la acción:

```
Usuario: "registrá una no conformidad en el proceso de compras"
    ↓
AIToolRegistry.pick() → createNCTool (detecta "no conform / nc / desvío")
    ↓
Escribe en Firestore: findings/{id} con ai_draft: true
    ↓
Responde con link al hallazgo creado
```

**Tools activos:**
| Tool | Acción |
|---|---|
| `createNCTool` | Crea borrador de No Conformidad en `findings` |
| `getDashboardDataTool` | Lee métricas del panel ejecutivo |
| `getPendingTasksTool` | Lee tareas pendientes del usuario |
| `navigateUserToTool` | Navega al usuario a una pantalla específica |

#### b) DirectActionService — Acciones con confirmación humana
Para operaciones más sensibles, Don Cándido sugiere la acción y espera confirmación:

```
IA sugiere → summary + preview → Usuario confirma → executeAction() → Firestore
```

**Entidades que puede crear/modificar con confirmación:**
`audit` | `finding` | `action` | `non-conformity` | `process-record` | `personnel` | `training` | `evaluation`

**Tipos de acción:** `CREATE` | `UPDATE` | `COMPLETE` | `ASSIGN` | `CHANGE_STATUS` | `DELETE`

#### c) Saga Engine — Workflows multi-paso con compensación
Para procesos complejos que requieren múltiples pasos:

```
Saga planifica DAG de pasos → ejecuta secuencial/paralelo
    → si falla: ejecuta compensación (rollback por paso)
    → si requiere aprobación: pausa y espera
    → continúa cuando se aprueba
```

**Estados de un saga:** `planning` → `running` → `paused` → `completed` / `failed` / `cancelled`

**Casos de uso:** onboarding multi-paso, cierre de auditoría (notifica + crea acciones + archiva), procesos de aprobación secuencial.

---

## Resumen ejecutivo: el stack de comunicación IA

```
                    DON CÁNDIDO IA
                         │
       ┌─────────────────┼──────────────────┐
       │                 │                  │
   Sentinel          WhatsApp           Chat Web
  (local PC)       (clientes +           (interno)
       │              RRHH)                 │
       │                 │                  │
  browser tools     WhatsApp API       UnifiedConverse
  file tools        HMAC verified          │
  app_open          Identity resolver       │
  clipboard         Inbox dashboard         │
       │                 │                  │
       └─────────────────┴──────────────────┘
                         │
              Acciones en la base de datos
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    Tool Registry   DirectAction      Saga Engine
   (inmediato)   (con confirmación)  (multi-paso)
         │               │               │
     findings/NC     any entity      workflows
```

---

## Por qué esto importa comercialmente

| Feature | Competidores ISO | Don Cándido |
|---|---|---|
| Chatbot en el sistema | Algunos tienen | ✅ |
| WhatsApp externo IA | ❌ Ninguno | ✅ |
| WhatsApp interno RRHH | ❌ Ninguno | ✅ |
| Agente local en PC | ❌ Ninguno | ✅ Sentinel |
| IA que escribe en el SGC | ❌ Ninguno | ✅ |
| Flujos saga multi-paso | ❌ Ninguno | ✅ |

**El diferencial no es "tiene IA". El diferencial es que la IA actúa — en la PC del empleado, en WhatsApp, y dentro del SGC — todo auditado y gobernado.**
