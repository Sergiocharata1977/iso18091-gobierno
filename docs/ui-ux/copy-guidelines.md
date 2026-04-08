# Guía de copy 9001app

## Objetivo
Definir un lenguaje claro, profesional y consistente para la shell principal, los módulos y los mensajes visibles del producto.

## Principios
- Escribir en español neutro.
- Priorizar frases breves, directas y orientadas a la acción.
- Mantener una sola etiqueta por concepto en toda la plataforma.
- Evitar tecnicismos si no aportan contexto.
- Usar mayúsculas solo en inicios de frase, nombres propios y nombres oficiales de módulos.

## Tono
- Profesional, claro y confiable.
- Cercano sin caer en informalidad.
- Específico en errores, advertencias y confirmaciones.
- Sobrio en cargas y estados intermedios.

## Reglas base
- Preferir verbos de acción: `Ingresar`, `Guardar`, `Continuar`, `Revisar`.
- Evitar signos de exclamación salvo en mensajes excepcionales.
- No usar inglés visible si existe una etiqueta funcional en español.
- No mezclar variantes para el mismo término. Elegir una y sostenerla.
- Evitar frases genéricas como `Algo salió mal` cuando se pueda dar más contexto.

## Terminología oficial
- `Acceso` para la entrada autenticada a la plataforma.
- `Configuración` para ajustes del sistema y preferencias.
- `Documentación` para manuales, guías y referencias.
- `Gestión` para operaciones administrativas u operativas.
- `Organización` para la entidad cliente.
- `Planificación` para estrategia, seguimiento y revisión.
- `Hallazgos y acciones` como fórmula estándar para el módulo de mejora.
- `Dashboard` solo cuando forme parte del nombre funcional ya instalado en producto.
- `Super Admin` se mantiene como nombre de rol.

## Convenciones por tipo de mensaje
### Cargas
- Formato: verbo en gerundio + objeto concreto.
- Ejemplos: `Verificando sesión...`, `Cargando panel...`, `Redirigiendo al acceso...`

### Errores
- Estructura: qué pasó + qué puede hacer la persona.
- Ejemplos:
  - `No pudimos iniciar sesión. Verifica tus datos.`
  - `No pudimos guardar los cambios. Intenta nuevamente.`
  - `No tienes acceso a este módulo.`

### Vacíos
- Estructura: estado actual + siguiente paso sugerido.
- Ejemplos:
  - `Todavía no hay registros.`
  - `Crea el primer documento para comenzar.`

### Confirmaciones
- Estructura: resultado logrado + impacto inmediato si aporta valor.
- Ejemplos:
  - `Cambios guardados.`
  - `El documento quedó disponible para el equipo.`
  - `Solicitud enviada.`

### Labels y botones
- Usar un solo verbo o un sintagma breve.
- Ejemplos: `Guardar cambios`, `Crear registro`, `Ver detalles`, `Solicitar acceso`

## Login y autenticación
- Título principal: `Bienvenido de nuevo`.
- Texto de apoyo: `Ingresa tus credenciales para acceder a la plataforma.`
- Campos: `Correo electrónico`, `Contraseña`.
- Estados: `Verificando sesión...`, `Ingresando...`, `Redirigiendo...`
- Errores: evitar mensajes técnicos sin contexto visible.

## Navegación y módulos
- Usar nombres consistentes entre sidebar, mobile nav y accesos directos.
- Preferir nombres funcionales cortos: `Noticias`, `Mensajes`, `Procesos`, `Configuración`.
- En agrupadores, priorizar lectura operacional: `Dirección`, `Procesos de apoyo`, `Procesos operativos`.
- Evitar alternar entre singular y plural si representan el mismo módulo.

## Checklist de revisión
- No hay caracteres rotos ni mojibake.
- No hay mezcla innecesaria entre español e inglés.
- Cada mensaje indica con claridad qué está pasando.
- Cada error orienta una acción posible.
- Los nombres de módulos coinciden en navegación, accesos y pantallas.
