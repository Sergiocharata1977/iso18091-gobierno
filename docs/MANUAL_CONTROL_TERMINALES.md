# Manual — Control de Terminales Don Cándido

**Versión:** 1.0
**Fecha:** 2026-03-18
**Módulo:** Terminal Control (Olas 1–4)
**Audiencia:** Administradores de organización + personal IT

---

## 1. ¿Qué es el Control de Terminales?

El módulo de **Control de Terminales** conecta cada PC o notebook de un empleado con el árbol organizativo de Don Cándido:

```
Organización
  └── Departamento
        └── Puesto
              └── Personnel (empleado)
                    └── Terminal (PC/notebook)
                          └── Acciones del agente ← trazables a procesos ISO
```

El **agente local** (`don-candido-agent`) se instala en la máquina del empleado y se comunica con Don Cándido para:
- Reportar su estado (online/idle/offline)
- Ejecutar tools autorizadas (navegación, archivos, portapapeles) según la política de su departamento
- Solicitar aprobación para actions sensibles
- Registrar evidencia digital vinculada a procesos ISO 9001

---

## 2. Conceptos clave

| Concepto | Descripción |
|----------|-------------|
| **Terminal** | Representa un equipo (PC, notebook, Mac) asignado a un empleado |
| **Pairing Code** | Código temporal (DC-XXXX-XXXX) que activa el agente en la máquina. Válido 24 horas. |
| **Terminal Token** | JWT long-lived que el agente guarda en el OS keychain tras el pairing |
| **Política efectiva** | Conjunto de tools permitidas. Se hereda: Departamento → Puesto → Terminal (mayor prioridad gana) |
| **Action Log** | Registro auditable de cada acción ejecutada por el agente |
| **Pending Approval** | Acciones sensibles que esperan aprobación manual del admin antes de ejecutarse |

### Estados de una terminal

| Estado | Color | Significado |
|--------|-------|-------------|
| `pending` | Gris | Registrada, esperando activación con pairing code |
| `active` | Verde | Activa y comunicándose |
| `offline` | Rojo | Sin heartbeat > 10 minutos |
| `quarantined` | Rojo oscuro | Bloqueada por admin. El agente recibe 403 en todos los requests |

---

## 3. Flujo de activación (pairing)

### Paso 1 — El admin registra la terminal

1. Ir al panel: **Terminales → Nueva terminal**
2. Ingresar el nombre descriptivo (ej: `"Notebook Marketing - Ana López"`)
3. Seleccionar el empleado de RRHH
4. Don Cándido genera un **Pairing Code**: `DC-7X9K-2M4P`
5. El código se muestra **una sola vez** — copiar o fotografiar
6. Válido por **24 horas**

### Paso 2 — El empleado activa su máquina

El empleado (o un IT) ejecuta en la terminal:

```bash
# Instalación única
npm install -g @don-candido/agent

# Activación con el código del admin
don-candido-agent pair \
  --code DC-7X9K-2M4P \
  --org doncandidoia.com
```

El agente:
1. Contacta `POST /api/agent/pair` con el código + fingerprint del equipo
2. Don Cándido valida el código y activa la terminal
3. El agente recibe un **terminal token** (JWT firmado)
4. Guarda el token de forma segura en el **OS keychain** (no en disco)

### Paso 3 — Operación continua

Una vez activado, el agente opera automáticamente:

```
Cada 30 segundos → POST /api/agent/heartbeat  (estoy vivo, IP, versión)
Cada 5 minutos   → GET  /api/agent/policy     (descarga política vigente)
Por cada acción  → POST /api/agent/action/log (registra lo ejecutado)
Si tool sensible → POST /api/agent/action/request → espera aprobación del admin
```

---

## 4. Panel de administración

### 4.1 Lista de terminales

**Ruta:** `/terminales`

Muestra todas las terminales de la organización con:
- Nombre y hostname
- Empleado asignado
- Departamento y puesto
- Estado en tiempo real (indicador verde/amarillo/rojo)
- Última actividad

**Acciones disponibles:**
- **Nueva terminal** → Genera pairing code
- **Cuarentenar** → Bloquea la terminal inmediatamente
- Click en fila → Abre detalle de la terminal

### 4.2 Detalle de terminal

**Ruta:** `/terminales/{id}`

#### Sección "Información"
Datos del equipo: hostname, OS, versión del agente, fecha de activación, empleado/departamento/puesto asignados, pairing code vigente.

#### Sección "Política efectiva"
Muestra **qué puede hacer** el agente en esta terminal, con la fuente de cada regla:

- **Tools permitidas** (badges verdes): el agente puede ejecutar estas sin restricción
- **Tools con aprobación requerida** (badges amarillos): el agente espera confirmación del admin
- Capas visibles: Política por departamento, por puesto, override específico de la terminal

#### Sección "Aprobaciones pendientes"
Aparece solo cuando hay acciones en espera. Muestra:
- Tool solicitada
- Justificación del empleado
- Hace cuánto tiempo espera
- Botones **Aprobar** / **Rechazar** con diálogo de confirmación

#### Sección "Acciones recientes"
Historial de ejecución: tool, parámetros (resumidos), resultado, proceso ISO asociado, duración, fecha.

#### Botones de cabecera
- **Cuarentenar**: bloquea la terminal inmediatamente (el agente recibe error 403)
- **Revocar y reactivar**: genera nuevo pairing code (token anterior queda inválido)

### 4.3 Gestión de políticas

**Ruta:** `/terminales/politicas`

#### ¿Qué es una política?
Conjunto de reglas que define qué tools puede usar el agente. Se aplica por **scope**:

| Scope | Aplica a |
|-------|----------|
| Departamento | Todas las terminales de empleados en ese departamento |
| Puesto | Todas las terminales de empleados con ese puesto |
| Terminal | Override específico para una terminal |

**Prioridad:** Terminal > Puesto > Departamento (mayor número de prioridad gana).

#### Crear una política
1. Click **"Nueva política"**
2. Ingresar nombre descriptivo
3. Seleccionar scope (Departamento / Puesto / Terminal específica)
4. Tildar las **tools permitidas** del catálogo
5. Tildar las **tools que requieren aprobación** (subset de las permitidas)
6. Asignar prioridad (número: a mayor número, más prioridad)
7. Opcionalmente: restricción de horario (ej: solo 08:00–18:00)

---

## 5. Catálogo de tools

| Tool | Descripción |
|------|-------------|
| `browser_navigate` | El agente navega a una URL en Chromium aislado |
| `browser_screenshot` | Captura de pantalla del browser del agente |
| `browser_click` | Click en elemento del browser |
| `browser_fill_form` | Relleno automático de formularios web |
| `file_read` | Lectura de archivos del sistema (paths autorizados) |
| `file_write` | Escritura de archivos del sistema (paths autorizados) |
| `clipboard_read` | Lectura del portapapeles |
| `clipboard_write` | Escritura al portapapeles |
| `app_open` | Abrir una aplicación instalada |
| `don_candido_chat` | Conversación con el asistente (siempre permitida) |

**Nota:** El agente NO ejecuta shell commands libres, NO accede al Chrome del usuario (usa Chromium aislado), y NO puede operar sin activación previa por el admin.

---

## 6. Trazabilidad ISO 9001

Cada acción del agente puede vincularse a un proceso ISO:

```
Proceso ISO "PD-COM-001 Ventas"
  └── Responsable: J. López (Personnel)
        └── Terminal: NB-Ventas-03
              └── Acciones: browser_navigate → CRM, app_open → ERP
                    └── Timestamp + resultado → evidencia de auditoría
```

### En el panel de Procesos ISO
En el detalle de cada proceso aparece la sección **"Actividad digital"** (colapsada):
- Tabla: Empleado | Terminal | Tool | Resultado | Fecha
- Máximo 20 registros recientes
- Link "Ver más" al log completo de la terminal
- Si no hay actividad: aviso informativo

### En el log de acciones
El campo `proceso_id` en cada acción conecta el registro con el proceso ISO correspondiente.

---

## 7. Seguridad y control

### Cuarentena
Al cuarentenar una terminal:
- El agente recibe `403 TERMINAL_QUARANTINED` en el próximo heartbeat
- Se detiene inmediatamente — no puede ejecutar ninguna action
- El estado se refleja en el panel en tiempo real
- Para rehabilitar: "Revocar y reactivar" genera nuevo pairing code

### Rotación de tokens
Si sospecha que el token fue comprometido:
1. Panel → detalle de terminal → **"Revocar y reactivar"**
2. Se genera nuevo pairing code
3. El token anterior queda inválido
4. El empleado debe hacer el proceso de pairing de nuevo

### Permisos en Firestore
Las colecciones de terminales solo son accesibles por miembros de la organización:
- `terminals/*` — lectura/escritura para admins
- `terminal_heartbeats/*` — solo lectura desde panel (escritura solo vía Admin SDK)
- `terminal_action_log/*` — solo lectura desde panel (escritura solo vía Admin SDK)
- `terminal_policies/*` — lectura/escritura para admins
- `terminal_security_events/*` — lectura para admins (futuro: módulo Oktsec)

---

## 8. Variables de entorno requeridas

| Variable | Descripción |
|----------|-------------|
| `TERMINAL_JWT_SECRET` | Clave secreta para firmar y verificar los terminal tokens (mínimo 32 chars) |

Agregar en Vercel → Settings → Environment Variables → Production + Preview.

---

## 9. Punto de extensión — módulos de seguridad

El sistema tiene un punto de extensión declarado en `src/types/terminal-extension.ts`:

```typescript
export interface TerminalSecurityModule {
  name: string
  version: string
  analyze(event: TerminalActionLog): Promise<TerminalSecurityEvent | null>
  onHeartbeat(terminal: Terminal, hb: TerminalHeartbeat): Promise<TerminalSecurityEvent | null>
}
```

**Oktsec** (Ola D+, futuro) implementará esta interfaz aportando:
- 188 reglas de detección pre-escritas
- Correlación multi-evento con LLM
- Hooks CLI para capturar acciones de Claude Code antes de ejecutarlas

Los eventos de seguridad se guardan en `organizations/{orgId}/terminal_security_events/`.

---

## 10. Guía rápida de troubleshooting

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| Terminal en estado "Pendiente" | Pairing code no usado o expirado | Revocar y reactivar → nuevo pairing code |
| Agente devuelve 403 | Terminal cuarentenada | Panel → rehabilitar o revocar+reactivar |
| Agente devuelve 401 | Token expirado o inválido | Revocar y reactivar → nuevo pairing |
| Actions bloqueadas inesperadamente | Tool no en política efectiva | Revisar política del departamento/puesto |
| No aparece "Actividad digital" en proceso ISO | El agente no está enviando `proceso_id` | El agente debe incluir el ID del proceso en cada action log |
| Aprobación pendiente no aparece en panel | Delay de sincronización | Refrescar la página o esperar el próximo heartbeat |

---

## 11. Referencia de APIs

### APIs del agente (requieren terminal token)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/agent/pair` | Activar terminal con pairing code (público, sin token) |
| POST | `/api/agent/heartbeat` | Latido cada 30s |
| GET | `/api/agent/policy` | Descargar política efectiva (cache 5min) |
| POST | `/api/agent/action/log` | Registrar acción ejecutada |
| POST | `/api/agent/action/request` | Solicitar aprobación para action sensible |
| GET | `/api/agent/action/request/{id}` | Polling: ver si fue aprobada/rechazada |

### APIs del panel admin (requieren sesión de usuario admin)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/admin/terminals` | Listar terminales |
| POST | `/api/admin/terminals` | Crear terminal + generar pairing code |
| GET | `/api/admin/terminals/{id}` | Detalle de terminal |
| PATCH | `/api/admin/terminals/{id}` | Editar, cuarentenar, revocar |
| GET | `/api/admin/terminals/{id}/log` | Historial de acciones |
| PATCH | `/api/admin/terminals/{id}/log?logId={id}` | Aprobar/rechazar pending |
| GET | `/api/admin/terminal-policies` | Listar políticas |
| POST | `/api/admin/terminal-policies` | Crear política |

---

*Documentación generada para Don Cándido IA — Control de Terminales v1.0*
