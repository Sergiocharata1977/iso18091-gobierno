---
title: "Apps Android — Don Cándido CRM y Operaciones"
slug: "app-vendedor/vision-general"
module: "app-vendedor"
screen: "/app-vendedor"
summary: "Dos apps nativas Android para vendedores (CRM) y personal de campo (Operaciones). Instalables desde APK sin Play Store."
roles: ["admin", "gerente", "operario"]
tags: ["app-vendedor", "mobile", "android", "crm", "operaciones", "dealer", "solicitudes"]
relatedRoutes: ["/app-vendedor", "/app-vendedor/clientes", "/app-vendedor/solicitudes", "/perfil"]
entity: "vendedor"
order: 10
status: "active"
category: "usuario"
lastValidated: "2026-04-03"
---

## Qué son

Don Cándido tiene **dos apps Android nativas** construidas con Kotlin + Jetpack Compose. Son apps instalables (APK) que funcionan conectadas a la misma plataforma web (`doncandidoia.com`).

| App | Package | Para quién |
|-----|---------|-----------|
| **Don Cándido CRM** | `com.doncandido.vendedor` | Vendedores: gestión comercial |
| **Don Cándido Operaciones** | `com.doncandido.vendedor.operaciones` | Técnicos y personal de campo |

Ambas apps comparten la misma base de código pero tienen navegación, pantallas y funcionalidad distintas según el rol.

---

## App CRM — Para vendedores

### Pantallas

| Pantalla | Qué hace |
|----------|----------|
| **Inicio** | Dashboard con oportunidades activas, acciones pendientes y barra de meta mensual |
| **Clientes** | Lista con búsqueda, filtros por estado (Todos / Activos / Potenciales), detalle por cliente |
| **Pipeline** | Oportunidades comerciales agrupadas por etapa |
| **Acciones** | Llamadas, reuniones y visitas. Filtros: Todas / Pendientes / En progreso / Completado |
| **Perfil** | Datos del usuario, organización y cerrar sesión |

### Cómo acceder

1. Instalar el APK (enviado por el administrador o disponible en el servidor)
2. Ingresar con email y contraseña corporativos
3. La app carga automáticamente los datos del CRM de la organización

---

## App Operaciones — Para técnicos y campo

### Pantallas

| Pantalla | Qué hace |
|----------|----------|
| **Inicio** | Panel con KPIs del día: solicitudes totales, en progreso, pendientes, órdenes de compra. Agenda de trabajo inmediato |
| **Solicitudes** | Lista de solicitudes de servicio y repuestos. Filtros por estado. Cambiar estado desde el celular |
| **Compras** | Órdenes de compra activas |
| **Catálogo** | Productos y repuestos disponibles |
| **Mapa** | Clientes georreferenciados en campo |
| **Perfil** | Perfil operativo, organización y logout |

### Módulos activos según la organización

La app Operaciones requiere el plugin **`dealer_solicitudes`** instalado en la organización. Los módulos que aparecen en la barra inferior dependen de los feature flags del bootstrap:

- `solicitudes` → activa sección Solicitudes
- `compras` → activa sección Compras
- `catalogo` → activa sección Catálogo
- `mapa_clientes` → activa sección Mapa

---

## Instalación sin Play Store

Las apps se distribuyen como APK de debug y se instalan manualmente:

1. **Habilitar fuentes desconocidas** en el celular: Ajustes → Seguridad → Instalar apps desconocidas
2. Recibir el APK por WhatsApp o email
3. Abrir el archivo APK e instalar
4. La app solicita confirmación de instalación

Para instalar vía cable USB (modo desarrollador):
```bash
adb install app-crm-prod-debug.apk
adb install app-operaciones-prod-debug.apk
```

---

## Login — Credenciales

Los usuarios deben tener contraseña configurada en Firebase Auth. Los usuarios se crean desde el panel de administración de la plataforma web.

**Credenciales de prueba (org Agro Biciuffa):**
- `admin@agrobiciufa.com` / `Candido2024!`
- `cristian@empresa.com` / `Candido2024!`

---

## Diseño visual

Ambas apps usan el mismo design system que la plataforma web:

- **Color primario:** `#1A2B4A` (navy oscuro)
- **Color acento:** `#E65100` (naranja — operaciones CASE)
- **Fondo:** `#F4F5F7` (gris muy claro)
- Cards blancas con sombra suave, esquinas redondeadas
- Badges de estado con colores semánticos: azul=En Curso, ámbar=Pendiente, verde=Completado, naranja=Urgente

---

## Funcionamiento offline

La App Operaciones es **offline-first**:

- Los datos se guardan en Room (SQLite local)
- Las acciones realizadas sin conexión se encolan en `SyncQueueEntity`
- Cuando se recupera la conexión, WorkManager procesa la cola automáticamente
- Un badge en la barra superior muestra la cantidad de acciones pendientes de sincronizar

---

## Errores frecuentes

| Error | Causa | Solución |
|-------|-------|----------|
| "No se pudo iniciar sesión" | Usuario sin contraseña en Firebase Auth | El admin debe restablecer la contraseña desde la plataforma web |
| La app cierra al abrir | Falta `google-services.json` en el build | Solo afecta builds de desarrollo; las APKs distribuidas ya lo incluyen |
| Módulos no aparecen en la barra | Plugin no instalado en la org | Verificar en Admin → Plugins que `dealer_solicitudes` esté activo |
| HTTP 500 en Mapa | Error en el servidor de producción | Contactar soporte técnico |

---

## Documentos relacionados

- [Don Cándido por WhatsApp](../don-candido/whatsapp.md)
- [Solicitudes dealer — Flujo y estados](../dealer/solicitudes-flujo.md)
- [App Cliente — Vision general](../app-cliente/vision-general.md)
