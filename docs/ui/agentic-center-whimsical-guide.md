# Centro Agéntico — Guía Whimsical + Mermaid

Guía para el equipo de producto y diseño sobre cuándo y cómo usar cada herramienta visual.

---

## Cuándo usar Whimsical

Usar Whimsical para trabajo de exploración visual y comunicación entre producto, diseño e ingeniería:

- **Wireframes de pantallas** — bocetos rápidos de layouts, jerarquía de componentes, variantes de UI antes de implementar
- **Flujos de usuario** — pantallas conectadas con flechas, happy path + edge cases, validación con el equipo de producto
- **Diagramas de arquitectura de producto** — relaciones entre módulos, flujos multi-actor, presentaciones ejecutivas o demos de inversor

Whimsical es la fuente de verdad visual compartida con stakeholders no técnicos.

---

## Cuándo usar Mermaid

Usar Mermaid cuando el diagrama debe vivir junto al código o dentro de la app:

- **Documentación técnica** — diagramas en archivos `.md` del repo (`docs/`, `content/docs/`, `reports/`)
- **Diagramas embebidos en el chat de Don Cándido** — cualquier respuesta del asistente que incluya un bloque ` ```mermaid ` se renderiza automáticamente con el componente `MermaidDiagram`
- **Cualquier diagrama que deba renderizarse sin abrir otra app** — el componente usa `mermaid.ink` como renderer, sin dependencias adicionales

Mermaid es la fuente de verdad para diagramas técnicos versionados en git.

---

## Cómo importar un diagrama Mermaid a Whimsical

Whimsical importa Mermaid nativamente desde el editor de boards. Pasos:

1. **Generar el diagrama Mermaid** — en el chat de Don Cándido (el asistente genera bloques Mermaid en sus respuestas) o directamente en un archivo `.md` del repo
2. **Copiar el código** — usar el botón "Copiar código" del componente `MermaidDiagram` en el chat, o copiar manualmente el bloque entre las marcas ` ```mermaid ` y ` ``` `
3. **Importar en Whimsical** — nuevo board → barra lateral Insert (o `+`) → Mermaid → pegar el código → confirmar

El diagrama queda como objeto editable dentro del board de Whimsical y se puede ajustar visualmente sin perder el vínculo con el código original.

---

## Convenciones de boards para el Centro Agéntico

### Nombre del board

```
[DC] Centro Agéntico — {tipo}
```

Ejemplos:
- `[DC] Centro Agéntico — Layout pantalla`
- `[DC] Centro Agéntico — Flujo caso demo`
- `[DC] Centro Agéntico — Arquitectura componentes`
- `[DC] Centro Agéntico — Flujo capacitación vencida`

### Paleta de colores canónica

| Color | Hex | Uso |
|---|---|---|
| Indigo | `#4F46E5` | Componentes IA (AgentWorkerService, SagaService, DirectAction, IA) |
| Verde | `#16A34A` | Acciones confirmadas / resultados exitosos / audit trail |
| Amarillo | `#CA8A04` | Pendientes / esperando confirmación humana / human-in-the-loop |
| Gris | `#6B7280` | Sistema / infraestructura / Firestore / componentes no-IA |

---

## Flujo de trabajo recomendado

1. **Boceto rápido en Whimsical** — definir el layout, los bloques principales y la jerarquía visual sin preocuparse por detalles de datos
2. **Refinamiento de flujos de datos en Mermaid** — una vez claro el flujo, formalizarlo en un diagrama Mermaid (`sequenceDiagram` para flujos temporales, `graph` para relaciones entre componentes); el diagrama se embebe en los docs del repo
3. **Diseño final en Whimsical** — importar el Mermaid como base, ajustar la presentación visual, agregar anotaciones para handoff a ingeniería

Este flujo evita la duplicación: Mermaid es el contrato técnico, Whimsical es la vista para comunicación.
