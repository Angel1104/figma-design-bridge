# Estado Actual del Design System

> Última actualización: 2026-02-27

## Inventario de Tokens (48 total)

### Colors — 25 variables
| Colección | Variables | Tipo |
|---|---|---|
| Primary | 50, 100, 200, 300, 400, 500, 600, 700, 800, 900 | COLOR |
| Neutral | white, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900 | COLOR |
| Semantic | success, warning, error, info | COLOR |

### Spacing — 10 variables
| Variable | Valor |
|---|---|
| spacing/1 → spacing/16 | 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px |

### Radii — 5 variables
| Variable | Valor |
|---|---|
| radius/sm, md, lg, xl, full | 4px, 8px, 12px, 16px, 9999px |

### Typography — 8 variables
| Variable | Valor |
|---|---|
| fontSize/xs → fontSize/4xl | 12px, 14px, 16px, 18px, 20px, 24px, 30px, 36px |

## Inventario de Componentes

### En código (CSS)
- [x] Typography classes (heading-1 a heading-4, body-lg, body-base, body-sm, caption)
- [x] Button: primary, secondary, ghost, danger
- [x] Button sizes: sm, default, lg
- [x] Button states: hover, active, disabled, focus-visible
- [x] Card vertical (imagen, tag, título, descripción, footer con avatar)
- [x] Card horizontal (imagen izquierda, contenido derecha)
- [x] Badge: primary, success, warning, error
- [x] Form inputs: text, email, password, number, date
- [x] Textarea
- [x] Select / Dropdown
- [x] Input states: default, error, success, disabled, sizes (sm, default, lg)
- [x] Checkbox
- [x] Radio button
- [x] Toggle / Switch
- [x] Search input

### En Figma (Plugin)
- [x] Header del design system
- [x] Color swatches: primary (10), neutral (11), semantic (4)
- [x] Escala tipográfica (8 niveles)
- [x] Botones: 4 variantes + 3 tamaños
- [x] Cards verticales (3)
- [x] Cards horizontales (2)
- [x] Form inputs: text (default, required, disabled), states (error, success, filled), types (email, password, select, textarea, number, search)
- [x] Checkboxes, Radio buttons, Toggles
- [x] Escala de spacing (10 niveles con barras)

### Pantallas construidas via Bridge
- [x] Login Screen (email, password, remember me, login button, Google OAuth, sign up link)

### Pendientes / Ideas futuras
- [ ] Modal / Dialog
- [ ] Toast / Notification
- [ ] Tabs / Navigation
- [ ] Avatar component
- [ ] Dark mode (second mode in Figma variables)
- [ ] Responsive breakpoints

## MCP Bridge

| Componente | Archivo | Descripción |
|---|---|---|
| Protocolo | `mcp-bridge/protocol.mjs` | Constantes compartidas |
| Broker | `mcp-bridge/ws-broker.mjs` | HTTP polling + WebSocket en `localhost:18765` |
| MCP Server | `mcp-bridge/mcp-server.mjs` | 13 tools MCP via stdio |
| Plugin UI | `figma-plugin/ui.html` | HTTP polling client (relay) |
| Startup | `mcp-bridge/start.sh` | Script para iniciar el broker |

13 tools disponibles: `connect_to_figma`, `create_frame`, `create_rectangle`, `create_text`, `create_ellipse`, `modify_node`, `delete_node`, `get_node`, `get_page_structure`, `set_variable`, `build_component`, `scroll_to_node`, `build_design_system`

**Nota**: El plugin usa HTTP polling (no WebSocket) porque Figma bloquea `ws://` desde el sandbox del plugin.

## Archivos del Proyecto

| Archivo | Propósito | Auto-generado |
|---|---|---|
| `CLAUDE.md` | Instrucciones auto para Claude Code | No |
| `tokens.css` | CSS custom properties | Sí (via sync-figma.js) |
| `components.css` | Estilos de componentes | No (edición manual) |
| `index.html` | Showcase visual | No (edición manual) |
| `figma-tokens.json` | Mapeo Figma ↔ CSS | No (fuente de verdad) |
| `sync-figma.js` | Generador de tokens.css | No |
| `figma-plugin/manifest.json` | Config del plugin (con ui, networkAccess) | No |
| `figma-plugin/code.js` | Plugin persistente (bridge + builders) | No |
| `figma-plugin/ui.html` | HTTP polling client del plugin | No |
| `mcp-bridge/protocol.mjs` | Constantes del protocolo | No |
| `mcp-bridge/ws-broker.mjs` | Broker HTTP + WebSocket | No |
| `mcp-bridge/mcp-server.mjs` | MCP server (13 tools) | No |
| `mcp-bridge/start.sh` | Script de inicio del broker | No |

## Cómo seguir

Para agregar componentes nuevos, decirle al chat:
> "Agrega [componente] al design system"

El chat actualizará CSS + plugin. Con el bridge activo, Claude Code puede crear el componente directamente en Figma.

Para construir pantallas nuevas en Figma:
> "Construye una pantalla de registro en Figma usando nuestro design system"

Claude Code usará el figma-bridge para crear frames, textos, botones, etc. directamente.
