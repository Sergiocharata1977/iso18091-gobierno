# Rollout Checklist UI/UX - Ola 4

Fecha base: 2026-04-08
Alcance: consolidacion visual de componentes transversales y QA visual/responsive.

## 1) Baseline de componentes base

- [x] `Input`: tokens semanticos para borde, fondo, texto, focus ring y estados disabled/invalid.
- [x] `Select`: trigger alineado con `Input`, content usando `popover/border`, estados checked/focus.
- [x] `Dialog`: overlay y superficie armonizados con `card/card-border`, densidad responsive.
- [x] `Table`: mejor contraste, encabezado mas legible y filas con hover/selected consistentes.
- [x] `Tabs`: navegacion secundaria con lista responsive horizontal y estado activo claro.

## 2) Verificacion visual desktop

- [ ] Login: campos, botones y mensajes usan la misma jerarquia visual del dashboard.
- [ ] Dashboard shell: tablas, tabs y dialogs mantienen consistencia de espaciado y contraste.
- [ ] Navegacion principal: labels activos/inactivos coherentes con tokens de estado.
- [ ] Modales: overlay, superficie y tipografia alineados con el sistema.

## 3) Verificacion visual mobile

- [ ] Touch targets >= 44px en controles interactivos criticos.
- [ ] `TabsList` permite scroll horizontal sin cortar labels.
- [ ] Formularios mantienen foco visible y contraste en teclado virtual.
- [ ] Tablas no rompen layout: overflow horizontal controlado.

## 4) Accesibilidad base

- [x] Focus visible en `Input`, `Select`, `Tabs`.
- [x] Estado `aria-invalid` visible en `Input`.
- [ ] Revisar contraste final en pantallas de negocio con contenido real.
- [ ] Verificar navegacion por teclado en dialogs con casos largos.

## 5) Dark mode y deuda de compatibilidad

- [x] Componentes de alcance Ola 4 sin dependencia de clases hardcodeadas `gray/white`.
- [ ] Reducir capa de compatibilidad global (`.dark .bg-white`, `.dark .text-gray-*`) en olas futuras.
- [ ] Migrar componentes UI restantes con hardcodes para bajar parches globales.

## 6) Criterio de salida Ola 4

- [ ] Desktop y mobile comparten jerarquia, labels y estados activos.
- [ ] Login, dashboard y shell se perciben un mismo producto.
- [ ] Baseline robusto listo para extender a RRHH, CRM, SGC y Gobierno.

## Evidencia recomendada

- Capturas comparativas antes/despues: login, dashboard, tabla principal, modal y tabs.
- Lista de incidencias visuales por modulo con severidad (`alta/media/baja`).
- Registro de componentes migrados vs pendientes (ver `component-adoption-map.md`).
