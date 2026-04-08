# Plan Olas — Android Apps Comerciales (CRM + Operaciones)

**Fecha:** 2026-04-08
**Alcance:** Completar y consolidar las dos apps Android nativas comerciales ya existentes: variante `crm` y variante `operaciones`.
**Proyectos afectados:** `9001app-firebase` → `android/app/`
**Fuera de scope:** app Android para municipios/gobierno (ver plan 110).

---

## Estado al 2026-04-08

### Ya implementado (no tocar salvo los pendientes abajo)
- `CrmNativeApp.kt` — grafo de navegación CRM completo
- `OperacionesNativeApp.kt` — grafo de navegación Operaciones completo
- `CrmApiService.kt`, `OperacionesApiService.kt` — servicios Retrofit
- Módulos: Clientes, Oportunidades, Acciones, Operaciones, Solicitudes, Compras, Mapa
- `OperacionesFirebaseMessagingService.kt` + `OperacionesSyncWorker.kt` (sync y notificaciones)
- `AgenticApiService.kt` + `AgenticSummaryDto.kt` (alertas IA en HomeScreen)
- Flavor `crm` en `build.gradle`
- Routing `APP_VARIANT` en `MainActivity.kt`

### Pendiente (scope de este plan)
1. Flavor `operaciones` como target gradle independiente (hoy solo existe `crm` y `government`)
2. Retiro controlado de apps híbridas Capacitor (`app-vendedor`, `app-cliente`)
3. Tests unitarios de repositorios Android (CRM y Operaciones)

---

## Resumen de olas

| Ola | Agentes | Paralelos | Dependen de |
|-----|---------|-----------|-------------|
| 1   | A, B    | Sí        | Nada        |
| 2   | A       | Solo      | Ola 1       |

---

## Ola 1 — Flavor independiente + retiro de híbridas
> Ejecutar Agente A + Agente B en PARALELO

### Agente A — Flavor `operaciones` en build.gradle
**Puede ejecutarse en paralelo con:** Agente B
**Depende de:** nada

#### Objetivo
El `build.gradle` tiene flavors `crm` y `government` pero no `operaciones` como flavor autónomo. `OperacionesNativeApp.kt` existe pero se accede solo por `APP_VARIANT` sin APK propio. Formalizar `operaciones` como producto con `applicationId`, `versionName` y `buildConfigField` propios.

#### Archivos a modificar
- `android/app/build.gradle` — agregar flavor `operaciones` con `applicationIdSuffix ".operaciones"`, `versionNameSuffix "-operaciones"` y `buildConfigField "String", "APP_VARIANT", "\"operaciones\""`
- `android/app/src/main/java/com/doncandido/vendedor/MainActivity.kt` — confirmar que el `when (BuildConfig.APP_VARIANT)` cubre `"crm"`, `"operaciones"` y `"government"`

#### Prompt completo para el agente
Lee `android/app/build.gradle` y `android/app/src/main/java/com/doncandido/vendedor/MainActivity.kt`. El archivo gradle ya tiene flavors `crm` y `government` con la misma estructura (`applicationIdSuffix`, `versionNameSuffix`, `buildConfigField APP_VARIANT`). Agrega un flavor `operaciones` con el mismo patrón, sufijo `.operaciones` y valor `"operaciones"`. Verifica que `MainActivity.kt` tiene el `when (BuildConfig.APP_VARIANT)` con los tres casos; si le falta `"operaciones"`, agrégalo apuntando a `OperacionesNativeApp()`. No cambies nada más. Criterio de éxito: `./gradlew assembleCrmRelease`, `./gradlew assembleOperacionesRelease` y `./gradlew assembleGovernmentRelease` son targets válidos independientes.

---

### Agente B — Retiro controlado de apps híbridas
**Puede ejecutarse en paralelo con:** Agente A
**Depende de:** nada

#### Objetivo
Eliminar la ambigüedad sobre cuál es el canal mobile oficial. Las rutas Capacitor (`app-vendedor`, `app-cliente`) deben quedar marcadas como deprecadas sin romper el build Next.js.

#### Archivos a crear
- `docs/migrations/native-android-cutover.md` — checklist de corte: qué se deprecó, qué se retiró, cómo hacer un build nativo por flavor

#### Archivos a modificar
- `package.json` — eliminar o marcar deprecados scripts `cap sync`, `cap build` u otros exclusivos de Capacitor
- `capacitor.config.ts` — agregar comentario de deprecación en la cabecera
- `capacitor.config.cliente.ts` — ídem
- `README.md` — actualizar sección mobile indicando que el canal oficial es Android nativo por flavor (`crm` / `operaciones`)

#### Prompt completo para el agente
Antes de tocar nada, lee `package.json`, `capacitor.config.ts`, `capacitor.config.cliente.ts` y `README.md`. Lista todas las referencias a `app-vendedor`, `app-cliente` o Capacitor en esos archivos. Si un script en `package.json` es exclusivo de Capacitor (ej. `cap sync`, `cap build`), elimínalo. En los archivos `capacitor.config.*.ts` agrega como primera línea `// DEPRECATED 2026-04-08 — Canal mobile oficial: Android nativo por flavor. Ver docs/migrations/native-android-cutover.md` sin borrar el código. Actualiza el README en la sección mobile. Crea el checklist. No toques `android/`, `src/app/` ni ningún archivo fuera de los mencionados. Criterio de éxito: un desarrollador nuevo identifica en 2 minutos cuál es el APK oficial de cada variante comercial.

---

## Ola 2 — Tests unitarios de repositorios
> Ejecutar SOLO después de que Ola 1 esté completa

### Agente A — Tests repos CRM y Operaciones
**Puede ejecutarse en paralelo:** es el único de esta ola
**Depende de:** Ola 1 completa

#### Objetivo
Cobertura básica de tests unitarios para `ClienteRepository`, `OportunidadRepository` y `OperacionesRepository` con mocks de Retrofit y Room.

#### Archivos a crear
- `android/app/src/test/java/com/doncandido/vendedor/repository/ClienteRepositoryTest.kt`
- `android/app/src/test/java/com/doncandido/vendedor/repository/OportunidadRepositoryTest.kt`
- `android/app/src/test/java/com/doncandido/vendedor/repository/OperacionesRepositoryTest.kt`

#### Prompt completo para el agente
Lee `android/app/build.gradle` para verificar qué librería de mocking ya está en el proyecto (MockK o Mockito). Lee `android/app/src/main/java/com/doncandido/vendedor/data/repository/ClienteRepository.kt`, `OportunidadRepository.kt`, `OperacionesRepository.kt` y sus DTOs correspondientes. Escribe tests JUnit 4 que cubran: mapeo DTO→Entity→Model, comportamiento ante error de red (`Resource.Error`), y cache local si existe lógica Room relevante. No uses Robolectric si no está en el proyecto. Criterio de éxito: `./gradlew test` pasa sin errores para los tres archivos.

---

## Verificación final
- [ ] Flavor `operaciones` existe como target gradle independiente de `crm`
- [ ] `MainActivity.kt` enruta correctamente los tres flavors (`crm`, `operaciones`, `government`)
- [ ] `capacitor.config.ts` y `capacitor.config.cliente.ts` marcados deprecados
- [ ] Scripts Capacitor eliminados o marcados en `package.json`
- [ ] `docs/migrations/native-android-cutover.md` existe
- [ ] Tests de repos CRM y Operaciones pasan con `./gradlew test`
