# Paso a Paso: Design System Figma ↔ Código

## Sesión 1 — Creación del Design System

### Paso 1: Crear el Design System en código (CSS)

Se crearon dos archivos base:

- **`tokens.css`** — Design tokens como CSS custom properties:
  - Colores: primary (50-900), neutral (white, 50-900), semánticos (success, warning, error, info)
  - Tipografía: font sizes (xs-4xl), weights (regular-bold), line heights
  - Spacing: escala de 4px a 64px
  - Border radius, shadows, transitions

- **`components.css`** — Estilos de componentes:
  - Typography classes (heading-1 a heading-4, body-lg, body-base, body-sm, caption)
  - Buttons (primary, secondary, ghost, danger) con 3 tamaños
  - Cards verticales y horizontales con imagen, tag, título, descripción, footer
  - Badges (primary, success, warning, error)

- **`index.html`** — Página de showcase visual con todos los componentes

### Paso 2: Crear el sistema de mapeo Figma ↔ CSS

- **`figma-tokens.json`** — Archivo JSON que mapea nombres de variables de Figma a CSS custom properties
  - Cada token tiene: `figmaName` (nombre en Figma) y `value` (valor CSS)
  - Organizado por colecciones: Colors, Typography, Spacing, Radii

- **`sync-figma.js`** — Script Node.js que:
  - Lee `figma-tokens.json` y genera `tokens.css` automáticamente
  - Soporta `--diff` para ver cambios sin aplicar
  - Actualiza timestamp de última sincronización

### Paso 3: Conectar con Figma via Plugin

Se creó un plugin de Figma (`figma-plugin/`) que:

1. **Crea 48 variables** en 4 colecciones:
   - Colors (25 variables de color)
   - Spacing (10 variables numéricas)
   - Radii (5 variables numéricas)
   - Typography (8 variables numéricas)

2. **Genera componentes visuales** en el canvas:
   - Header con título del design system
   - Swatches de color (primary, neutral, semantic)
   - Escala tipográfica completa
   - Botones (variantes + tamaños)
   - Cards verticales (3 cards)
   - Cards horizontales (2 cards)
   - Escala de spacing con barras visuales

### Paso 4: Debugging del plugin

Problemas encontrados y soluciones:
- `editorType` en manifest.json necesitaba incluir `"dev"`
- El sandbox de Figma NO soporta: spread operator (`...`), optional chaining (`?.`)
- `layoutSizingHorizontal = "FILL"` requiere que el nodo ya sea hijo de un auto-layout frame (hacer `appendChild` primero)
- Font loading: buscar la fuente default del documento en vez de asumir "Inter"

### Paso 5: Agregar componentes nuevos (horizontal cards)

Flujo establecido para agregar componentes:
1. Actualizar `components.css` con los nuevos estilos
2. Actualizar `index.html` con el showcase
3. Actualizar el plugin (`code.js`) con la función de construcción
4. Ejecutar el plugin en Figma (1 click)

## Sesión 2 — MCP Bridge (control remoto de Figma)

### Paso 6: Investigación de automatización

Se investigó cómo automatizar la creación de diseños en Figma desde Claude Code:
- El MCP de Figma Desktop es **solo lectura** (screenshots, metadata, variables)
- La feature oficial "Code to Canvas" solo existe en el MCP remoto
- El proyecto `claude-talk-to-figma-mcp` demostró el patrón Plugin + WebSocket

### Paso 7: Construir el MCP Bridge

Se creó un sistema de 3 piezas para que Claude Code pueda crear y modificar diseños directamente:

```
Claude Code ←(stdio)→ MCP Server ←(WebSocket)→ WS Broker ←(WebSocket)→ Plugin UI ←(postMessage)→ Plugin code.js → Figma API
```

Archivos creados:
- **`mcp-bridge/protocol.mjs`** — Constantes compartidas (puerto, tipos de mensaje, etc.)
- **`mcp-bridge/ws-broker.mjs`** — WebSocket broker en `localhost:18765` con canales y heartbeat
- **`mcp-bridge/mcp-server.mjs`** — MCP server (13 tools) que auto-inicia el broker
- **`figma-plugin/ui.html`** — WebSocket client en el thread UI del plugin
- **`figma-plugin/code.js`** — Reestructurado: bridge persistente con 13 command handlers + todos los builders existentes
- **`figma-plugin/manifest.json`** — Actualizado con `ui` y `networkAccess`
- **`docs/05-mcp-bridge.md`** — Documentación completa del bridge

### Paso 8: Upgrade del plugin

El plugin pasó de one-shot (ejecutar y cerrar) a persistente:
- Se abre la UI hidden (1x1 px) para acceso a WebSocket
- El plugin escucha comandos indefinidamente
- Cada comando se ejecuta y la respuesta se envía de vuelta
- Mantiene todos los builders existentes como comandos invocables
