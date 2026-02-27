# MCP Bridge: Control Figma desde Claude Code

## Arquitectura

```
Claude Code ←(stdio)→ MCP Server ←(WebSocket)→ WS Broker ←(WebSocket)→ Plugin UI ←(postMessage)→ Plugin code.js → Figma API
```

### Componentes

| Componente | Archivo | Puerto/Protocolo |
|---|---|---|
| MCP Server | `mcp-bridge/mcp-server.mjs` | stdio (JSON-RPC) |
| WS Broker | `mcp-bridge/ws-broker.mjs` | `ws://localhost:18765` |
| Plugin code | `figma-plugin/code.js` | Figma Plugin API |
| Plugin UI | `figma-plugin/ui.html` | WebSocket client |
| Protocolo | `mcp-bridge/protocol.mjs` | Constantes compartidas |

### Por qué 3 piezas

Los plugins de Figma tienen 2 contextos separados:
- **`code.js`** — Acceso a la API de Figma, pero **NO puede hacer network requests**
- **`ui.html`** — Puede abrir WebSockets, pero **NO tiene acceso a la API de Figma**
- Se comunican vía `figma.ui.postMessage()` y `parent.postMessage()`

El broker existe porque el MCP Server y el plugin se inician independientemente y necesitan encontrarse vía un channel ID compartido.

## Uso

### 1. Iniciar el plugin en Figma

1. En Figma Desktop: **Plugins > Development > Import plugin from manifest**
2. Seleccionar `figma-plugin/manifest.json`
3. Ejecutar el plugin: **Plugins > Development > Design System Bridge**
4. El plugin mostrará: `Bridge connected! Channel: ch_xxxxxxxx`
5. Copiar el channel ID

### 2. Conectar desde Claude Code

Después de reiniciar Claude Code (para cargar el MCP):

```
Conecta a Figma con el canal ch_xxxxxxxx
```

Claude Code llamará `connect_to_figma` automáticamente.

### 3. Crear contenido

```
Crea un frame con un título "Login" y un botón primary
```

Claude Code usará `create_frame`, `create_text`, etc.

## Tools MCP disponibles

| Tool | Descripción |
|---|---|
| `connect_to_figma` | Conectar al plugin vía channel ID |
| `create_frame` | Crear frame con auto-layout |
| `create_rectangle` | Crear rectángulo |
| `create_text` | Crear texto |
| `create_ellipse` | Crear elipse |
| `modify_node` | Modificar propiedades de un nodo existente |
| `delete_node` | Eliminar nodo |
| `get_node` | Leer propiedades de un nodo |
| `get_page_structure` | Árbol de la página actual |
| `set_variable` | Crear/actualizar variable de Figma |
| `build_component` | Construir componente del design system |
| `scroll_to_node` | Scroll viewport a un nodo |
| `build_design_system` | Ejecutar builder completo del DS |

## Complementariedad con MCP existente

Los 2 MCPs trabajan juntos:
- **figma-desktop** (solo lectura): `get_screenshot`, `get_design_context`, `get_metadata`, `get_variable_defs`
- **figma-bridge** (lectura/escritura): `create_frame`, `modify_node`, `build_component`, etc.

## Protocolo WebSocket

```
Registro:     { type: "register", role: "controller"|"plugin", channel: "ch_xxx" }
Confirmación: { type: "registered", channel: "ch_xxx", peerConnected: true|false }
Comando:      { type: "command", id: "msg_1", action: "create_frame", params: {...} }
Respuesta:    { type: "command-response", id: "msg_1", result: {...}, error: null }
Heartbeat:    { type: "heartbeat" }
Error:        { type: "error", code: "PEER_NOT_CONNECTED", message: "..." }
```

## Troubleshooting

| Problema | Causa | Solución |
|---|---|---|
| "Not connected to Figma" | Plugin no está ejecutándose | Ejecutar plugin en Figma, llamar `connect_to_figma` |
| "Command timed out" | Plugin colgado o broker caído | Reiniciar plugin y broker |
| "PEER_NOT_CONNECTED" | Controller o plugin no están en el canal | Verificar channel ID |
| Plugin no conecta al broker | Broker no está corriendo | El MCP server lo auto-inicia, o ejecutar `node mcp-bridge/ws-broker.mjs` |
| "CHANNEL_ROLE_TAKEN" | Ya hay un controller/plugin en ese canal | Reiniciar plugin para generar nuevo channel |
| Plugin muestra "Max reconnect" | Broker no disponible | Verificar que el broker esté corriendo |

## Desarrollo

### Ejecutar broker manualmente
```bash
node mcp-bridge/ws-broker.mjs
```

### Verificar que el MCP server se registra
Reiniciar Claude Code — debería aparecer `figma-bridge` en los MCP servers disponibles.
