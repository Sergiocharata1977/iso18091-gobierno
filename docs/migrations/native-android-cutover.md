# Native Android Cutover Checklist

Fecha de corte: 2026-04-08

## Objetivo
Dejar explicito que el canal mobile oficial es Android nativo por flavor, sin dependencia operativa de rutas hibridas Capacitor.

## 1) Que se depreco

- [x] `capacitor.config.ts` marcado como deprecado (ruta legacy `app-vendedor`)
- [x] `capacitor.config.cliente.ts` marcado como deprecado (ruta legacy `app-cliente`)
- [x] README actualizado: canal oficial mobile = Android nativo por flavor (`crm` / `operaciones`)

## 2) Que se retiro

- [x] Scripts de `package.json` exclusivos de Capacitor (`cap sync`, `cap build`, etc.)
  - Estado al 2026-04-08: no habia scripts `cap*` para retirar

## 3) Build oficial por flavor (Android nativo)

Precondicion: ejecutar desde `android/`.

```bash
./gradlew assembleCrmRelease
./gradlew assembleOperacionesRelease
```

En Windows PowerShell:

```powershell
.\gradlew.bat assembleCrmRelease
.\gradlew.bat assembleOperacionesRelease
```

## 4) Criterio de verificacion rapida (2 minutos)

- [ ] Un desarrollador nuevo identifica que no se usa Capacitor para releases oficiales
- [ ] Queda claro que `crm` y `operaciones` son los APK oficiales
- [ ] Existen comandos de build por flavor documentados y ejecutables
