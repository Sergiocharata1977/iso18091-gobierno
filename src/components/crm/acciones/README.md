# CRM acciones/

Esta carpeta contiene componentes de visualizacion y captura para la pantalla de acciones CRM:

- `AccionesGrid`
- `AccionesKanban`
- `AccionesList`
- `NuevaAccionForm`

Rol funcional:

- Renderizan listados/tableros de acciones.
- Exponen formularios y callbacks para crear/eliminar acciones.

Relacion con `../actions/`:

- `acciones/` es UI de vistas principales de acciones.
- `actions/` provee componentes auxiliares reutilizables (badge de tipo, timeline, modal y widget de pendientes).
- No hay duplicacion funcional directa; ambos directorios son complementarios.
