# Component Adoption Map - Ola 4

Fecha de corte: 2026-04-08
Repositorio: `9001app-firebase`

## Alcance aplicado en esta ola

### Componentes alineados (baseline actualizado)

- `src/components/ui/input.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/table.tsx`
- `src/components/ui/tabs.tsx`

Ajustes aplicados:

- Tokens semanticos para color/superficie/borde/focus.
- Mejor coherencia de densidad y espaciado entre controles base.
- Estados hover/focus/active/disabled mas consistentes.
- Mejor comportamiento responsive en tabs y tablas.

## Componentes ya alineados en olas previas (detectados)

- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/sheet.tsx` (parcial; pendiente overlay hardcodeado)
- `src/components/ui/PageHeader.tsx`
- `src/components/ui/SectionHeader.tsx`

## Pendientes de migracion prioritaria (UI transversal)

Pendientes detectados por uso de colores utilitarios hardcodeados o estilos legacy:

- `src/components/ui/textarea.tsx` (misma deuda que `input` antes de Ola 4)
- `src/components/ui/alert-dialog.tsx` (overlay hardcodeado)
- `src/components/ui/switch.tsx` (thumb hardcodeado en blanco)
- `src/components/ui/ViewToggle.tsx` (slate hardcodeado)
- `src/components/ui/unified-kanban.tsx` (gray hardcodeado en textos/estados)
- `src/components/ui/AIAssistButton.tsx` (slate/white hardcodeado)
- `src/components/ui/ProcessMap.tsx` (gradientes y paleta fija)

## Recomendacion de secuencia (post Ola 4)

1. Migrar `textarea`, `alert-dialog`, `switch` para cerrar brecha en form controls.
2. Migrar `ViewToggle` y `unified-kanban` para homogeneizar dashboards/listados.
3. Resolver componentes de branding fuerte (`AIAssistButton`, `ProcessMap`) con tokens tematicos.
4. Eliminar gradualmente reglas de compatibilidad global dark mode cuando baje deuda hardcodeada.

## Impacto esperado

- Menos parches globales de dark mode.
- Mayor consistencia visual entre Auth, Shell y modulos de negocio.
- Base mas estable para escalar rediseño en RRHH, CRM, SGC y Gobierno.
