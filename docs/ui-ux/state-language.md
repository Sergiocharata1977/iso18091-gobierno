# Catálogo de estados semánticos

## Objetivo
Definir cómo se nombran y presentan los estados visibles del producto para que todas las vistas comuniquen con el mismo criterio.

## Estados globales
### Inicialización
- Uso: carga de app, sesión, permisos o contexto base.
- Copy recomendado: `Preparando la plataforma...`

### Cargando
- Uso: obtención de datos o render dependiente de fetch.
- Copy recomendado: `Cargando {recurso}...`

### Verificando
- Uso: validación de sesión, permisos, identidad o reglas previas.
- Copy recomendado: `Verificando sesión...`

### Redirigiendo
- Uso: cambios automáticos de ruta por sesión, rol o flujo.
- Copy recomendado: `Redirigiendo al acceso...`

### Éxito
- Uso: guardado, creación, actualización, envío o validación.
- Copy recomendado: `Cambios guardados.` o `Acción completada.`

### Advertencia
- Uso: situación recuperable, incompleta o fuera de recomendación.
- Copy recomendado: `Revisa los datos antes de continuar.`

### Error
- Uso: fallas de autenticación, red, validación o permisos.
- Copy recomendado: `No pudimos completar la acción. Intenta nuevamente.`

### Sin datos
- Uso: listas, tableros o módulos sin contenido cargado todavía.
- Copy recomendado: `Todavía no hay información disponible.`

### Sin resultados
- Uso: búsquedas o filtros sin coincidencias.
- Copy recomendado: `No encontramos resultados con esos criterios.`

### Bloqueado por permisos
- Uso: funciones o módulos no habilitados para el rol o plan actual.
- Copy recomendado: `No tienes acceso a este módulo.`

## Reglas de construcción
- Nombrar el estado por intención, no por implementación técnica.
- El texto principal debe responder qué pasa ahora.
- El texto secundario debe orientar el siguiente paso cuando aplique.
- Los estados de carga y redirección deben ser breves.
- Los estados de error deben evitar culpar a la persona usuaria.
- Los estados visibles deben reutilizar frases estables, no improvisadas por pantalla.

## Patrones por componente
### Shell principal
- `Verificando sesión...`
- `Redirigiendo al acceso...`

### Formularios
- `Guardando cambios...`
- `No pudimos guardar los cambios. Revisa los campos e intenta nuevamente.`

### Tablas y listados
- `Cargando registros...`
- `Todavía no hay registros.`
- `No encontramos resultados con este filtro.`

### Confirmaciones
- `Cambios guardados.`
- `Registro creado correctamente.`
- `Solicitud enviada.`

## Semáforo semántico
- `Info`: contexto neutral o carga en curso.
- `Éxito`: acción completada correctamente.
- `Advertencia`: atención requerida, pero con posibilidad de continuar.
- `Error`: bloqueo, fallo o imposibilidad de completar la tarea.
