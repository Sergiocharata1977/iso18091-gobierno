# 9001app - Sistema de Gestión ISO 9001

Sistema integral de gestión de calidad basado en la norma ISO 9001, con módulos para auditorías, hallazgos, acciones correctivas, gestión documental y más.

## 🚀 Últimas Actualizaciones (30/12/2025)

### ✅ Módulo de Gestión de Calidad (30 Dic 2025)

- **Objetivos de Calidad**: CRUD completo con código automático `OBJ-[PROCESO]-[SEC]`
- **Indicadores**: KPIs con fórmulas, metas y responsables `IND-[OBJ]-[SEC]`
- **Mediciones**: Registro de valores con evidencias `MED-[IND]-[YYYYMMDD]`
- **Jerarquía Completa**: Proceso → Objetivos → Indicadores → Mediciones
- **Dialogs Simplificados**: Creación rápida con campos esenciales
- **Single Views**: Edición inline de todos los campos
- **APIs Admin SDK**: Migración completa a Firebase Admin
- **Menú Reorganizado**: Calidad integrado en desplegable de Procesos
- **UX Mejorada**: Tarjetas clickeables, mejor espaciado visual

### ✅ Centro Principal Unificado (26 Dic 2025)

- **Vista Principal**: `/noticias` es ahora la pantalla de inicio por defecto
- **Tabs Horizontales**: Noticias, Madurez Org, Mini Copilot integrados en una sola vista
- **Navegación Simplificada**: Dashboard, Madurez y Mini Copiloto removidos del sidebar
- **Comentarios Inline (Facebook-style)**: Expandibles directamente en cada post
- **Eliminar Comentarios**: Botón visible al hover para autor/admin

### ✅ Auditorías (23/12/2025)

- **Comentarios Iniciales**: Campo para observaciones previas a la ejecución
- **Informe Final del Auditor**: Conclusiones y recomendaciones
- **Cierre Automático con PDF**: Generación de informe y archivado en ABM Documentos
- **Validaciones de Cierre**: Verificación de puntos evaluados e informe completo

## 📋 Módulos Principales

### 🏠 Centro Principal (Vista por Defecto)

La ruta `/noticias` es la pantalla de inicio. Contiene tabs:

- **📰 Noticias**: Feed con comentarios inline, reacciones, compartir
- **📊 Madurez Org**: Diagnóstico de madurez ISO 9001
- **🤖 Mini Copilot**: Panel de automatización MCP

### 📊 Puntos de Norma

Mapeo completo de requisitos ISO 9001:2015 con tabs:

- **Dashboard**: Cumplimiento global por capítulo
- **Matriz de Cumplimiento**: Estado detallado de cada punto
- **Análisis de Gaps**: Identificación de brechas
- **Gestión**: Administración de puntos

### Auditorías Internas

- Planificación y ejecución de auditorías ISO 9001
- Evaluación de puntos de norma (CF, NCM, NCm, OM, R, F)
- Generación automática de informes PDF
- Archivado en sistema de documentos

### Hallazgos

- Registro de no conformidades y oportunidades de mejora
- Fuentes múltiples: auditorías, encuestas, declaraciones, inspecciones
- Vinculación con puntos de norma
- Estados: registrado, en_tratamiento, cerrado

### Acciones Correctivas/Preventivas

- Planificación y ejecución de acciones
- Seguimiento por fases
- Vinculación con hallazgos
- Control de eficacia

### Gestión Documental

- ABM de documentos del sistema
- Control de versiones
- Aprobación y distribución
- Archivado de informes de auditoría

### CRM y Riesgo Crediticio

- Gestión de clientes con Kanban unificado
- Análisis de riesgo crediticio (Situación Patrimonial, Estado de Resultados)
- Filtros por Vendedor, Tipo, Zona
- App Vendedor PWA (offline-first)

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 14, React, TypeScript, TailwindCSS
- **Backend**: Next.js API Routes, Firebase Admin SDK
- **Base de Datos**: Firebase Firestore
- **Autenticación**: Firebase Auth
- **Storage**: Firebase Storage
- **UI Components**: Radix UI, Lucide Icons

## 📱 Canal Mobile Oficial (desde 2026-04-08)

- **Canal oficial**: Android nativo por flavor (`crm` y `operaciones`)
- **APK CRM oficial**: build del flavor `crm` (`assembleCrmRelease`)
- **APK Operaciones oficial**: build del flavor `operaciones` (`assembleOperacionesRelease`)
- **Estado de rutas híbridas**: `app-vendedor` y `app-cliente` quedan deprecadas
- **Referencia de corte**: `docs/migrations/native-android-cutover.md`

## 📦 Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de Firebase

# Ejecutar en desarrollo
npm run dev

# Build para producción
npm run build
```

## 🔑 Variables de Entorno

```env
# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (Service Account)
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
```

Nota comercial: la fuente de verdad objetivo para acceso comercial y facturacion es la organizacion (`organizations/{orgId}/meta/billing` y `organizations/{orgId}/contracted_systems`). Los campos `planType` y `billing_status` en `users` deben tratarse como compatibilidad legacy mientras se completa la migracion post-federado.

## 📁 Estructura del Proyecto

```
src/
├── app/                    # Next.js App Router
│   ├── (dashboard)/       # Rutas protegidas
│   │   ├── auditorias/    # Módulo de auditorías
│   │   ├── hallazgos/     # Módulo de hallazgos
│   │   ├── acciones/      # Módulo de acciones
│   │   ├── documentos/    # Gestión documental
│   │   └── crm/           # CRM y scoring
│   └── api/               # API Routes
├── components/            # Componentes React
│   ├── audits/           # Componentes de auditorías
│   ├── findings/         # Componentes de hallazgos
│   ├── actions/          # Componentes de acciones
│   └── ui/               # Componentes UI base
├── lib/                  # Utilidades y configuración
│   ├── firebase/         # Firebase config
│   └── sdk/              # Services y validaciones
├── types/                # TypeScript types
└── services/             # Servicios de negocio
```

## 🔄 Flujo de Trabajo - Auditorías

1. **Planificación**: Crear auditoría con tipo, alcance y auditor líder
2. **Agregar Puntos**: Seleccionar puntos de norma a evaluar
3. **Evaluación**: Marcar conformidad de cada punto (CF/NCM/NCm/OM/R/F)
4. **Comentarios**: Agregar observaciones iniciales e informe final
5. **Cierre**: Validar y cerrar auditoría (genera PDF automáticamente)
6. **Hallazgos**: Crear hallazgos desde no conformidades detectadas

## 📊 Próximas Funcionalidades

- [ ] Chat IA en Landing Page
- [ ] Integración Puntos de Norma en Centro Principal (tabs adicionales)
- [ ] Integración Don Juan GIS
- [ ] WhatsApp Automatización (templates y notificaciones)
- [ ] MCP Chrome Extension MVP
- [ ] Dashboard de indicadores de calidad

## 🤝 Contribución

Este es un proyecto privado. Para contribuir, contacta al administrador del repositorio.

## 📄 Licencia

Propietario: Los Señores del Agro S.A.
Todos los derechos reservados.

---

**Última actualización**: 30 de diciembre de 2025
