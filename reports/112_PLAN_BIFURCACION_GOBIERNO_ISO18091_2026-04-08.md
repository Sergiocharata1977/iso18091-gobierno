# Plan Bifurcación — Proyecto Gobierno Local ISO 18091

**Fecha:** 2026-04-08
**Feature:** Duplicar `9001app-firebase` como proyecto independiente enfocado en gobierno local ISO 18091
**Proyectos afectados:** `9001app-firebase` (fuente) → nuevo repo `iso18091-gobierno` (destino)

---

## Contexto y decisiones

### ¿Qué se bifurca?
- Se crea una **copia física** del proyecto `9001app-firebase` en un nuevo directorio `iso18091-gobierno`
- Nuevo repo en GitHub: `Sergiocharata1977/iso18091-gobierno`
- Nuevo proyecto en Vercel (linked al nuevo repo)
- El **mismo Firebase project** (`app-4b05c`) se reutiliza — solo cambia el frontend deployment
- La edición queda **hardcodeada como `government`** via variables de entorno Vercel

### ¿Qué mantiene el nuevo proyecto?
- ISO 9001 core (procesos, auditorías, hallazgos, acciones, documentos, RRHH, mi-panel)
- TODO el stack `gobierno/*` (ciudadanos, expedientes, servicios, madurez, transparencia, control-interno)
- API routes `/api/gobierno/*` y `/api/mobile/government/*`
- `src/lib/gov/*`, `src/types/gov*`
- `pack_gov.manifest.ts` como plugin siempre activo
- Municipio legacy (`/municipio/*`)
- Android flavor `government`
- IA / Don Cándido

### ¿Qué se desactiva (no elimina) del nav?
- CRM (`/crm/*`) — en nav: oculto por no estar en `edition=government`
- Dealer solicitudes — mismo motivo
- HSE dashboard — no es necesario para gobierno local
- Contabilidad central — no activo en gobierno por defecto

> Los archivos del código NO se borran — solo se ocultan del nav/capabilities.
> Esto facilita mantener el fork sincronizado con el padre si se necesita.

---

## Resumen de olas

| Ola | Agentes | Paralelos entre sí | Dependen de |
|-----|---------|---------------------|-------------|
| 1   | A       | Es el único         | Nada — operación de setup |
| 2   | A, B, C | Sí — archivos distintos | Ola 1 completa |
| 3   | A       | Es el único         | Ola 2 completa |
| 4   | A       | Es el único         | Ola 3 completa |

---

## Ola 1 — Bifurcación y setup del repositorio
> Un solo agente, secuencial interno. Ejecutar primero obligatoriamente.

### Agente A — Crear copia local, GitHub repo y push inicial

**Puede ejecutarse en paralelo con:** Es el único agente de esta ola
**Depende de:** Nada — es la primera ola

#### Objetivo
Crear el directorio `iso18091-gobierno` como copia del proyecto, inicializar git limpio, crear el repo en GitHub y hacer el primer push.

#### Archivos a crear
- `c:/Users/Usuario/Documents/Proyectos/ISO -conjunto/iso18091-gobierno/` — directorio completo (copia de 9001app-firebase)

#### Archivos a modificar
- Ninguno adicional — es setup puro

#### Prompt completo para el agente

Estás en Windows con bash (git bash o similar). La carpeta del proyecto original es `c:/Users/Usuario/Documents/Proyectos/ISO -conjunto/9001app-firebase`. Tienes disponibles `git`, `gh` (GitHub CLI) y `vercel` CLI.

**Ejecuta exactamente estos pasos en orden:**

**Paso 1 — Copiar el proyecto**
```bash
cd "c:/Users/Usuario/Documents/Proyectos/ISO -conjunto"
cp -r "9001app-firebase" "iso18091-gobierno"
cd "iso18091-gobierno"
```

**Paso 2 — Limpiar el historial git del fork (nuevo repo independiente)**
```bash
rm -rf .git
git init
git add .
git commit -m "Initial: fork from 9001app-firebase as gobierno local ISO 18091 edition"
```

**Paso 3 — Crear el repo en GitHub**
```bash
gh repo create Sergiocharata1977/iso18091-gobierno \
  --public \
  --description "Don Cándido — Edición Gobierno Local ISO 18091" \
  --source=. \
  --remote=origin \
  --push
```

Si `gh repo create` con `--source` falla, usar el flujo alternativo:
```bash
gh repo create Sergiocharata1977/iso18091-gobierno --public \
  --description "Don Cándido — Edición Gobierno Local ISO 18091"
git remote add origin https://github.com/Sergiocharata1977/iso18091-gobierno.git
git branch -M main
git push -u origin main
```

**Paso 4 — Verificar**
```bash
git remote -v
gh repo view Sergiocharata1977/iso18091-gobierno
```

**Criterio de éxito:** `git remote -v` muestra `origin → github.com/Sergiocharata1977/iso18091-gobierno` y el repo es visible en GitHub con todos los archivos.

**IMPORTANTE:**
- NO toques `node_modules/` — está en `.gitignore`, no se copia
- NO elimines `.env.local` si existe (pero ya está en `.gitignore`, no se subirá)
- El `.vercel/` directory del original NO se copia al nuevo proyecto (el `cp` lo copiará, pero en Ola 3 se reconfigurará con `vercel link`)

---

## Ola 2 — Configuración del proyecto gobierno
> Ejecutar SOLO después de que Ola 1 esté completa
> Ejecutar Agente A + Agente B + Agente C en PARALELO — cada uno toca archivos distintos

**Directorio de trabajo para todos los agentes de esta ola:**
`c:/Users/Usuario/Documents/Proyectos/ISO -conjunto/iso18091-gobierno/`

---

### Agente A — Configurar edición gobierno en middleware y env

**Puede ejecutarse en paralelo con:** Agente B, Agente C
**Depende de:** Ola 1 completa

#### Objetivo
Forzar que el proyecto compile y corra como `edition=government` por defecto: middleware redirige a `/gobierno/panel` al hacer login, y las rutas CRM/HSE/dealer quedan fuera del flujo normal.

#### Archivos a crear
- `.env.gobierno.example` — variables de entorno específicas para el gobierno edition

#### Archivos a modificar
- `src/middleware.ts` — asegurarse que la lógica de `GOVERNMENT_PANEL_ROUTE` es el default para todos los usuarios en este fork
- `.env.example` — agregar variable `NEXT_PUBLIC_EDITION=government` (y eliminar variables irrelevantes como `NEXT_PUBLIC_AGROBICIUFA_WHATSAPP`, `NEXT_PUBLIC_CLIENTE_APK_URL`, `DEALER_PUBLIC_ORGANIZATION_ID`)

#### Prompt completo para el agente

Estás trabajando en el directorio `c:/Users/Usuario/Documents/Proyectos/ISO -conjunto/iso18091-gobierno/`. Este es un fork de `9001app-firebase` configurado exclusivamente para la edición gobierno local ISO 18091.

Lee primero estos archivos:
- `src/middleware.ts`
- `.env.example`

**Tarea 1 — Crear `.env.gobierno.example`**

Crea el archivo `.env.gobierno.example` en la raíz del proyecto con el siguiente contenido (es la guía de variables para el deployer):

```env
# ============================================
# iso18091-gobierno — Variables de entorno
# Copia a .env.local y completa los valores
# ============================================

# Firebase Admin
FIREBASE_PROJECT_ID=tu-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@tu-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=tu-project.appspot.com

# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# App URL
NEXT_PUBLIC_APP_URL=https://tu-dominio-gobierno.vercel.app

# Edición hardcodeada — NO cambiar
NEXT_PUBLIC_EDITION=government

# AI Core
ANTHROPIC_API_KEY=
GROQ_API_KEY=

# Sentry (opcional)
SENTRY_DSN=

# Rate limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
ENABLE_STRUCTURED_LOGGING=true

# Navegación dinámica (gobierno siempre usa nav dinámica por capabilities)
NEXT_PUBLIC_USE_DYNAMIC_NAV=true

# AI Unificado
ENABLE_UNIFIED_AI_CHAT_CORE=true
```

**Tarea 2 — Modificar `src/middleware.ts`**

En el middleware actual, existe la constante:
```typescript
const GOVERNMENT_PANEL_ROUTE = '/gobierno/panel';
```

Agrega al inicio del archivo (después de los imports), una constante que indica que este fork siempre es edición gobierno:
```typescript
// iso18091-gobierno: este fork es siempre edición gobierno
const IS_GOVERNMENT_EDITION = process.env.NEXT_PUBLIC_EDITION === 'government' || true;
```

Luego, en la lógica de redirección post-login, si existe un bloque que redirige según `edition` del token, asegúrate de que cuando `IS_GOVERNMENT_EDITION` es true, la ruta default sea `/gobierno/panel` y no `/` o `/dashboard`.

Busca en el middleware cualquier condición de `ENTERPRISE_HOME_ROUTES` que podría mandar al usuario a `/` o `/dashboard` y agrega que si `IS_GOVERNMENT_EDITION`, redirija a `/gobierno/panel` en su lugar.

**Tarea 3 — Limpiar `.env.example`**

En el `.env.example` existente, agrega al principio del archivo:
```
# ⚠️  Para este fork gobierno, usa .env.gobierno.example como referencia
# NEXT_PUBLIC_EDITION=government  ← debe estar definida siempre
```

Y agrega la línea:
```
NEXT_PUBLIC_EDITION=government
```

Después del bloque `# Application Configuration`.

**NO hacer:** No borres rutas CRM ni código de procesos. No toques `next.config.js` ni `firebase.json`. No modifiques archivos de tipos.

**Criterio de éxito:** El archivo `.env.gobierno.example` existe con todas las variables. El `middleware.ts` compila (`npx tsc --noEmit` sin errores nuevos en ese archivo). El `.env.example` tiene la variable `NEXT_PUBLIC_EDITION`.

---

### Agente B — Metadatos del proyecto (package.json, README, firebase.json)

**Puede ejecutarse en paralelo con:** Agente A, Agente C
**Depende de:** Ola 1 completa

#### Objetivo
Renombrar el proyecto en todos los metadatos para que quede identificado como `iso18091-gobierno`, distinto del proyecto padre.

#### Archivos a modificar
- `package.json` — cambiar `name` y agregar descripción
- `README.md` (si existe) — actualizar para reflejar que es el fork gobierno
- `firebase.json` — actualizar `hosting.site` si está definido
- `.firebaserc` — actualizar project alias si corresponde
- `vercel.json` — si existe, actualizar `name`
- `next.config.js` (o `next.config.mjs`) — agregar comentario de identificación

#### Prompt completo para el agente

Estás trabajando en el directorio `c:/Users/Usuario/Documents/Proyectos/ISO -conjunto/iso18091-gobierno/`. Este es un fork de `9001app-firebase`.

Lee estos archivos antes de modificar:
- `package.json`
- `firebase.json`
- `.firebaserc`
- `next.config.js` (o `next.config.mjs` si no existe el primero)
- `README.md` (si existe)
- `vercel.json` (si existe)

**Cambios exactos a realizar:**

**package.json:**
- Cambiar `"name": "9001app-firebase"` (o el nombre actual) por `"name": "iso18091-gobierno"`
- Si existe `"description"`, reemplazarla por `"Don Cándido — Edición Gobierno Local ISO 18091 | SaaS de gestión municipal"`
- Si existe `"homepage"`, dejarla vacía o eliminarla (el dominio se define luego)

**firebase.json:**
- Si existe una clave `"hosting"` con un `"site"` definido, cámbiala a `"iso18091-gobierno"` para evitar colisión con el proyecto padre.
- Deja el resto del firebase.json exactamente igual (Firestore rules, Storage rules, etc. son idénticos — apuntan al mismo Firebase project).

**.firebaserc:**
- Si existe, cambiar el alias `"default"` para que apunte al Firebase project ID correcto.
- Si el firebase project es el mismo que el padre (`app-4b05c`), déjalo igual — solo estamos cambiando el frontend, la data es la misma.
- Agrega un comentario al final del archivo (fuera del JSON, en una línea separada):
  ```
  // iso18091-gobierno — fork de 9001app-firebase — mismo Firebase project
  ```

**vercel.json** (solo si existe):
- Si tiene una clave `"name"`, cámbiala a `"iso18091-gobierno"`.

**next.config.js / next.config.mjs:**
- Agrega al principio del archivo (en comentario):
  ```js
  // iso18091-gobierno — Don Cándido Edición Gobierno Local ISO 18091
  // Fork de 9001app-firebase — https://github.com/Sergiocharata1977/iso18091-gobierno
  ```

**README.md:**
- Si existe, reemplaza TODO el contenido por:
  ```markdown
  # iso18091-gobierno — Don Cándido Gobierno Local

  Fork de `9001app-firebase` configurado exclusivamente para la **edición gobierno local ISO 18091**.

  ## Stack
  Next.js 14 + Firebase + TypeScript. Edición: `government`.

  ## Setup
  1. Copiar `.env.gobierno.example` a `.env.local` y completar valores
  2. `npm install`
  3. `npm run dev`

  ## Deploy
  Vercel + Firebase (mismo proyecto Firebase que `9001app-firebase`).

  ## Gobierno Local
  Módulos activos: ISO 9001 core + ISO 18091 + Ciudadanos + Expedientes + Servicios + Transparencia + Control Interno + Madurez Municipal.
  ```
- Si no existe README.md, créalo con el contenido de arriba.

**NO hacer:** No toques `src/` en ningún archivo. No modifiques `package-lock.json`. No cambies las dependencias npm. No toques `firestore.rules` ni `storage.rules`.

**Criterio de éxito:** `package.json` tiene `"name": "iso18091-gobierno"`. `README.md` existe con el contenido gobierno. Los archivos firebase.json y .firebaserc no tienen errores de sintaxis JSON.

---

### Agente C — Configurar pack_gov como edición default en plugins config

**Puede ejecutarse en paralelo con:** Agente A, Agente B
**Depende de:** Ola 1 completa

#### Objetivo
Asegurar que en este fork el `pack_gov` esté configurado como plugin "siempre activo" (preinstalado) para todos los tenants y que el onboarding/capabilities module lo instale por defecto.

#### Archivos a leer (NO modificar)
- `src/config/plugins/index.ts` — entender la estructura del catálogo
- `src/config/plugins/pack_gov.manifest.ts` — ver el manifest actual
- `src/lib/plugins/runtimeFlags.ts` — ver isDynamicNavEnabled

#### Archivos a crear
- `src/config/plugins/gobierno-edition-defaults.ts` — exporta la lista de capabilities y plugins que siempre están activos en esta edición

#### Archivos a modificar
- `src/config/plugins/pack_gov.manifest.ts` — en el campo `compatibility.tenant_types_allowed`, agregar `['government']` si está vacío

#### Prompt completo para el agente

Estás trabajando en `c:/Users/Usuario/Documents/Proyectos/ISO -conjunto/iso18ohl-gobierno/` (fork de `9001app-firebase` para gobierno).

Lee primero:
- `src/config/plugins/index.ts`
- `src/config/plugins/pack_gov.manifest.ts`
- `src/lib/plugins/runtimeFlags.ts`

**Tarea 1 — Crear `src/config/plugins/gobierno-edition-defaults.ts`**

Crea este archivo:
```typescript
/**
 * iso18091-gobierno — Plugins y capabilities activos por defecto
 * en la edición gobierno local.
 *
 * Estos se instalan automáticamente para cualquier organización
 * que se registre en este deployment.
 */

/** Plugin IDs que se marcan como siempre instalados en este fork */
export const GOBIERNO_EDITION_DEFAULT_PLUGINS: string[] = [
  'pack_gov',
  'gov_ciudadano_360',
  'gov_expedientes',
  'gov_service_catalog',
  'gov_transparencia',
  'gov_participacion',
  'gov_maturity_18091',
];

/** Capabilities legacy que se activan por defecto en este fork */
export const GOBIERNO_EDITION_DEFAULT_CAPABILITIES: string[] = [
  'gov_ciudadano_360',
  'gov_expedientes',
  'gov_service_catalog',
  'gov_transparencia',
  'gov_participacion',
  'gov_maturity_18091',
];

/**
 * Capabilities que NO deben mostrarse en el nav de gobierno local.
 * (Existen en el código pero no son relevantes para esta edición.)
 */
export const GOBIERNO_EDITION_HIDDEN_CAPABILITIES: string[] = [
  'crm',
  'crm_risk_scoring',
  'crm_whatsapp_inbox',
  'dealer_solicitudes',
  'contabilidad_central',
];

/** Identificador de edición de este fork */
export const EDITION = 'government' as const;
```

**Tarea 2 — Actualizar `src/config/plugins/pack_gov.manifest.ts`**

En el campo `compatibility.tenant_types_allowed`, si está como array vacío `[]`, reemplazarlo por `['government']`. Si ya tiene valores, solo agregar `'government'` si no está.

También en el campo `compatibility.deployment_modes`, si solo tiene `['shared_saas']`, agregar `'dedicated_government'` para documentar que este pack corre en deployment dedicado:
```typescript
deployment_modes: ['shared_saas', 'dedicated_government'],
```

**Tarea 3 — En `src/config/plugins/index.ts`**

Al final del archivo, agrega una línea de re-export:
```typescript
export { GOBIERNO_EDITION_DEFAULT_PLUGINS, GOBIERNO_EDITION_DEFAULT_CAPABILITIES, GOBIERNO_EDITION_HIDDEN_CAPABILITIES, EDITION as GOBIERNO_EDITION } from './gobierno-edition-defaults';
```

**NO hacer:** No modifiques otros manifests de plugins. No toques `runtimeFlags.ts`. No elimines ningún plugin del catálogo. No modifiques tipos de TypeScript existentes.

**Criterio de éxito:** El archivo `gobierno-edition-defaults.ts` existe sin errores TypeScript. `npx tsc --noEmit` no reporta nuevos errores. `src/config/plugins/index.ts` exporta el nuevo módulo.

---

## Ola 3 — Deploy a Vercel
> Ejecutar SOLO después de que Ola 2 esté completa y haya push a GitHub

### Agente A — Crear proyecto Vercel y primer deploy

**Puede ejecutarse en paralelo con:** Es el único agente de esta ola
**Depende de:** Ola 2 completa (y código commiteado y pusheado al repo)

#### Objetivo
Crear el proyecto `iso18091-gobierno` en Vercel (cuenta del team `team_1Qiu4kWoC2qA9SP4mKibkWAB`), vinculado al repo GitHub `Sergiocharata1977/iso18091-gobierno`, configurar variables de entorno mínimas y lanzar el primer deploy.

#### Archivos a crear
- `reports/113_DEPLOY_GOBIERNO_VERCEL_2026-04-08.md` — documento de evidencia del deploy (en el repo `iso18091-gobierno`)

#### Archivos a modificar
- `.vercel/project.json` — se regenera automáticamente con el nuevo projectId al hacer `vercel link`

#### Prompt completo para el agente

Estás en el directorio `c:/Users/Usuario/Documents/Proyectos/ISO -conjunto/iso18091-gobierno/`. Tienes `vercel` CLI y `gh` CLI disponibles. El repo ya está en GitHub: `Sergiocharata1977/iso18091-gobierno`. El team Vercel es `team_1Qiu4kWoC2qA9SP4mKibkWAB`.

**Paso 1 — Eliminar la configuración Vercel del proyecto padre (si se copió)**
```bash
rm -rf .vercel
```
Esto asegura que no se reutilice el `projectId` del padre (`prj_QPS7RGLpFDYVUycqCJO9kXQRfQ53`).

**Paso 2 — Hacer commit de los cambios de Ola 2**

Antes de linkear Vercel, verifica que los cambios de Ola 2 están commiteados:
```bash
git status
git add src/config/plugins/gobierno-edition-defaults.ts
git add src/config/plugins/pack_gov.manifest.ts
git add src/config/plugins/index.ts
git add src/middleware.ts
git add .env.gobierno.example
git add .env.example
git add package.json
git add README.md
git add firebase.json
git add .firebaserc
git add next.config.js
# (agregar vercel.json si existe)
git commit -m "feat: configure gobierno local ISO 18091 edition defaults"
git push origin main
```

**Paso 3 — Crear y linkear proyecto Vercel**

```bash
vercel link --project iso18091-gobierno --yes
```

Si el proyecto no existe todavía en Vercel, usa:
```bash
vercel link --yes
```
Vercel te preguntará si crear nuevo proyecto → responde `y`, nombre: `iso18091-gobierno`, scope: seleccionar el team `team_1Qiu4kWoC2qA9SP4mKibkWAB`.

**Paso 4 — Configurar variables de entorno MÍNIMAS en Vercel**

Las variables de producción reales las debe poner el usuario. Configura solo las de "edición":
```bash
vercel env add NEXT_PUBLIC_EDITION production
# Cuando pregunte el valor, ingresa: government

vercel env add NEXT_PUBLIC_USE_DYNAMIC_NAV production
# Valor: true

vercel env add NODE_ENV production
# Valor: production
```

> ⚠️ Las variables Firebase (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, etc.) las debe configurar el usuario manualmente en el dashboard de Vercel porque contienen secretos. No las pases como argumento en CLI.

**Paso 5 — Primer deploy (preview para verificar build)**
```bash
vercel deploy --yes
```

Si el build falla por falta de variables de entorno Firebase, es esperado. Registra el error en el documento de evidencia.

**Paso 6 — Obtener la URL del proyecto**
```bash
vercel project ls | grep iso18091
vercel inspect --environment production
```

**Paso 7 — Crear documento de evidencia**

Crea el archivo `reports/113_DEPLOY_GOBIERNO_VERCEL_2026-04-08.md` con:
```markdown
# Deploy iso18091-gobierno — Evidencia

**Fecha:** 2026-04-08
**GitHub:** https://github.com/Sergiocharata1977/iso18091-gobierno
**Vercel Project:** iso18091-gobierno
**Team Vercel:** team_1Qiu4kWoC2qA9SP4mKibkWAB

## Estado del primer deploy
[pegar output de `vercel deploy`]

## URL de preview
[pegar URL]

## Variables de entorno configuradas
- [x] NEXT_PUBLIC_EDITION=government
- [x] NEXT_PUBLIC_USE_DYNAMIC_NAV=true
- [ ] FIREBASE_PROJECT_ID — pendiente (configurar en Vercel dashboard)
- [ ] FIREBASE_CLIENT_EMAIL — pendiente
- [ ] FIREBASE_PRIVATE_KEY — pendiente
- [ ] FIREBASE_STORAGE_BUCKET — pendiente
- [ ] NEXT_PUBLIC_FIREBASE_API_KEY — pendiente
- [ ] NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN — pendiente
- [ ] NEXT_PUBLIC_FIREBASE_PROJECT_ID — pendiente
- [ ] ANTHROPIC_API_KEY — pendiente

## Próximos pasos
1. Configurar variables Firebase en Vercel dashboard
2. Configurar dominio personalizado (ej: gobierno.doncandidoia.com)
3. Registrar primer tenant gobierno con `edition=government`
4. Ejecutar Ola 2-4 del plan 110 (Monitor ISO 18091 UI web + Android)
```

**Criterio de éxito:** `.vercel/project.json` tiene un `projectId` DISTINTO al del proyecto padre (`prj_QPS7RGLpFDYVUycqCJO9kXQRfQ53`). El repo aparece en Vercel dashboard. El documento de evidencia existe y tiene la URL de preview.

---

## Ola 4 — Verificación final
> Ejecutar SOLO después de que Ola 3 esté completa

### Agente A — Verificación de la bifurcación

**Único agente de esta ola**
**Depende de:** Ola 3 completa

#### Archivos a crear
- `reports/114_QA_BIFURCACION_GOBIERNO_2026-04-08.md` — checklist de verificación

#### Prompt completo para el agente

Estás en `c:/Users/Usuario/Documents/Proyectos/ISO -conjunto/iso18091-gobierno/`. El proyecto ya fue bifurcado, configurado y deployado a Vercel.

Verifica CADA punto de la siguiente checklist y documenta el resultado en `reports/114_QA_BIFURCACION_GOBIERNO_2026-04-08.md`:

**1. Repositorio**
- [ ] `git remote -v` muestra `Sergiocharata1977/iso18091-gobierno` (NO `9001app-v8`)
- [ ] `gh repo view` confirma que el repo es público y tiene la descripción correcta
- [ ] `.vercel/project.json` tiene un `projectId` distinto al padre

**2. Identidad del proyecto**
- [ ] `package.json` tiene `"name": "iso18091-gobierno"`
- [ ] `README.md` describe el proyecto como edición gobierno
- [ ] `.env.gobierno.example` existe en la raíz

**3. Configuración de edición**
- [ ] `src/config/plugins/gobierno-edition-defaults.ts` existe
- [ ] `GOBIERNO_EDITION_DEFAULT_PLUGINS` incluye `pack_gov`
- [ ] `src/middleware.ts` tiene la constante `IS_GOVERNMENT_EDITION`
- [ ] `.env.example` tiene la variable `NEXT_PUBLIC_EDITION=government`

**4. TypeScript**
Ejecuta: `npx tsc --noEmit`
- [ ] Sin errores de compilación (o los mismos errores que tenía el proyecto padre — no se introdujeron nuevos)

**5. Vercel**
- [ ] Proyecto `iso18091-gobierno` aparece en dashboard Vercel
- [ ] Variables `NEXT_PUBLIC_EDITION` y `NEXT_PUBLIC_USE_DYNAMIC_NAV` configuradas
- [ ] URL de preview accesible (puede fallar el login por falta de Firebase vars — eso es esperado)

**6. Gobierno features intactas**
- [ ] `src/app/(dashboard)/gobierno/` existe con todos los subdirectorios (ciudadanos, expedientes, madurez, panel, servicios, transparencia, control-interno)
- [ ] `src/app/api/gobierno/` tiene todos los routes
- [ ] `src/lib/gov/` tiene monitor-assembler, madurez, maturity-dimensions, kpi-templates

**7. Plan 110 pendiente**
- [ ] Documentar en el QA que las Olas 2-4 del plan 110 (Monitor UI web + Android) son el siguiente paso en ESTE nuevo repo

Escribe el documento con los resultados de cada check (✅ o ❌ con nota).

---

## Verificación final del plan completo

- [ ] Existe la carpeta `iso18091-gobierno` en `c:/Users/Usuario/Documents/Proyectos/ISO -conjunto/`
- [ ] GitHub repo `Sergiocharata1977/iso18091-gobierno` es visible y tiene código
- [ ] `.vercel/project.json` del nuevo repo tiene `projectId` distinto al padre
- [ ] `package.json` tiene `name: iso18091-gobierno`
- [ ] `src/config/plugins/gobierno-edition-defaults.ts` existe con los plugins gobierno
- [ ] `src/middleware.ts` tiene `IS_GOVERNMENT_EDITION` flag
- [ ] Variables Vercel: `NEXT_PUBLIC_EDITION=government` configurada
- [ ] El plan 110 (Monitor 18091 UI web + Android) está referenciado como siguiente paso en el nuevo repo

---

## Post-setup: variables Firebase a configurar manualmente

Después de completar el plan, el usuario debe ir al **Vercel Dashboard → iso18091-gobierno → Settings → Environment Variables** y agregar:

| Variable | Valor |
|----------|-------|
| `FIREBASE_PROJECT_ID` | mismo que `9001app-firebase` |
| `FIREBASE_CLIENT_EMAIL` | mismo service account |
| `FIREBASE_PRIVATE_KEY` | mismo private key |
| `FIREBASE_STORAGE_BUCKET` | mismo bucket |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | mismo API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | mismo auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | mismo project ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | mismo app ID |
| `ANTHROPIC_API_KEY` | misma o distinta clave según preferencia |
| `NEXT_PUBLIC_APP_URL` | URL del nuevo proyecto (ej: `https://iso18091-gobierno.vercel.app`) |

> ⚠️ Usar el **mismo Firebase project** (`app-4b05c`) permite que los tenants `edition=government` ya existentes en producción accedan directamente con sus credenciales. No es necesario migrar datos.

---

## Nota estratégica

Este fork es el punto de partida para la **App Android Municipal** mencionada en el plan 110. Una vez que este repo tenga su propio ciclo de vida, el flavor `government` del Android puede separarse también como app independiente. Ver `reports/110_PLAN_OLAS_ISO18091_GOBIERNO_2026-04-08.md` nota final.
