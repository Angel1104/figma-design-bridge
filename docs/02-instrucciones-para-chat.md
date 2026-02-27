# Instrucciones para cualquier Chat de Claude Code

## Contexto del Proyecto

Este es un design system que vive en dos lugares simultáneamente:
- **Código**: CSS custom properties + componentes (`tokens.css`, `components.css`, `index.html`)
- **Figma**: Variables + componentes visuales generados por un plugin

Están conectados a través de:
- `figma-tokens.json` — Fuente de verdad del mapeo Figma ↔ CSS
- `sync-figma.js` — Script que regenera `tokens.css` desde el JSON
- `figma-plugin/code.js` — Plugin que crea/actualiza todo en Figma

## MCPs de Figma

### figma-desktop (solo lectura)
- `get_design_context` — Leer contexto de diseño de un nodo
- `get_screenshot` — Captura de pantalla de un nodo
- `get_variable_defs` — Variables aplicadas a un nodo
- `get_metadata` — Estructura XML de nodos

### figma-bridge (lectura/escritura)
- `connect_to_figma` — Conectar al plugin vía channel ID
- `create_frame`, `create_rectangle`, `create_text`, `create_ellipse` — Crear nodos
- `modify_node`, `delete_node` — Modificar/eliminar nodos
- `get_node`, `get_page_structure` — Leer nodos
- `set_variable` — Crear/actualizar variables
- `build_component` — Construir componentes del design system
- `build_design_system` — Ejecutar builder completo
- `scroll_to_node` — Scroll viewport

**IMPORTANTE**: Para usar figma-bridge, primero el usuario debe ejecutar el plugin en Figma y darte el channel ID. Luego llama `connect_to_figma`.

## Flujo de Trabajo

### Para agregar un componente nuevo:

1. **Actualizar el CSS** (`components.css`):
   - Agregar los estilos del nuevo componente
   - Usar exclusivamente CSS custom properties de `tokens.css`

2. **Actualizar el showcase** (`index.html`):
   - Agregar ejemplos del nuevo componente en la sección correspondiente

3. **Actualizar el plugin** (`figma-plugin/code.js`):
   - Crear una función `buildNuevoComponente()` siguiendo el patrón existente
   - Agregar como case en `handleCommand()` bajo `build_component`
   - Agregar la llamada en `buildFullDesignSystem()` dentro del frame `master`

4. **Crear en Figma** (dos opciones):
   - **Via bridge**: Llamar `build_component` o `build_design_system` desde Claude Code
   - **Manual**: El usuario ejecuta el plugin en Figma (1 click)

5. **Verificar en Figma**:
   - Usar `get_screenshot` (figma-desktop) para verificar el resultado

### Para sincronizar tokens de Figma → Código:

1. Leer variables de Figma con `get_variable_defs`
2. Actualizar `figma-tokens.json` con los nuevos valores
3. Ejecutar `node sync-figma.js` para regenerar `tokens.css`

### Para sincronizar tokens de Código → Figma:

1. Actualizar `figma-tokens.json` con los nuevos valores
2. Ejecutar `node sync-figma.js`
3. Actualizar el plugin con los nuevos valores
4. El usuario ejecuta el plugin

## Restricciones del Plugin de Figma

El sandbox de plugins de Figma tiene limitaciones de JavaScript:

```
NO soportado:
- Spread operator en objetos: { ...obj, a: 1 }         → usar Object.assign o manual
- Optional chaining: obj?.prop                          → usar ternario: obj ? obj.prop : null
- Nullish coalescing: val ?? default                    → usar ternario

SÍ soportado:
- const, let, for...of
- Arrow functions: (x) => x
- Template literals: `text ${var}`
- Destructuring: const { a, b } = obj
- Async/await
- .find(), .filter(), .map()
```

### Reglas críticas del plugin:

- `layoutSizingHorizontal = "FILL"` solo funciona DESPUÉS de `appendChild` al parent auto-layout
- Cargar fuentes con `figma.loadFontAsync()` antes de crear textos
- Buscar la fuente default del documento, no asumir "Inter"
- Usar `getOrCreateCollection/Variable` para evitar duplicados al re-ejecutar
- `manifest.json` debe incluir `"dev"` en `editorType`

## Estructura del Proyecto

```
figma/
├── tokens.css              ← Auto-generado por sync-figma.js
├── components.css          ← Estilos de componentes (editar manualmente)
├── index.html              ← Showcase visual del design system
├── figma-tokens.json       ← Mapeo Figma ↔ CSS (fuente de verdad)
├── sync-figma.js           ← Script de sincronización JSON → CSS
├── figma-plugin/
│   ├── manifest.json       ← Manifiesto del plugin (con ui y networkAccess)
│   ├── code.js             ← Plugin persistente (bridge + builders)
│   └── ui.html             ← WebSocket client (relay broker ↔ code.js)
├── mcp-bridge/
│   ├── package.json        ← Dependencias del bridge
│   ├── protocol.mjs        ← Constantes compartidas
│   ├── ws-broker.mjs       ← WebSocket broker (localhost:18765)
│   └── mcp-server.mjs      ← MCP server (stdio, 13 tools)
└── docs/
    ├── 01-paso-a-paso.md   ← Cronología de lo que hicimos
    ├── 02-instrucciones-para-chat.md  ← ESTE ARCHIVO
    ├── 03-como-lo-hicimos.md          ← Detalles técnicos
    ├── 04-estado-actual.md            ← Qué tenemos hoy
    └── 05-mcp-bridge.md              ← Documentación del bridge
```

## Documentación

Cuando hagas cambios, actualiza:
- `docs/01-paso-a-paso.md` — Agregar el nuevo paso
- `docs/04-estado-actual.md` — Actualizar el inventario de componentes
