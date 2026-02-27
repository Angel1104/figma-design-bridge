# Instrucciones para cualquier Chat de Claude Code

## Contexto del Proyecto

Este es un design system que vive en dos lugares simultáneamente:
- **Código**: CSS custom properties + componentes (`tokens.css`, `components.css`, `index.html`)
- **Figma**: Variables + componentes visuales generados por un plugin

Están conectados a través de:
- `figma-tokens.json` — Fuente de verdad del mapeo Figma ↔ CSS
- `sync-figma.js` — Script que regenera `tokens.css` desde el JSON
- `figma-plugin/code.js` — Plugin que crea/actualiza todo en Figma

## MCP de Figma

Estás conectado al MCP de Figma Desktop con estas herramientas:
- `get_design_context` — Leer contexto de diseño de un nodo
- `get_screenshot` — Captura de pantalla de un nodo
- `get_variable_defs` — Variables aplicadas a un nodo
- `get_metadata` — Estructura XML de nodos

**IMPORTANTE**: El MCP es SOLO LECTURA. No puedes crear ni modificar contenido en Figma directamente.

## Flujo de Trabajo

### Para agregar un componente nuevo:

1. **Actualizar el CSS** (`components.css`):
   - Agregar los estilos del nuevo componente
   - Usar exclusivamente CSS custom properties de `tokens.css`

2. **Actualizar el showcase** (`index.html`):
   - Agregar ejemplos del nuevo componente en la sección correspondiente

3. **Actualizar el plugin** (`figma-plugin/code.js`):
   - Crear una función `buildNuevoComponente()` siguiendo el patrón existente
   - Agregar la llamada en `main()` dentro del frame `master`
   - El usuario ejecuta el plugin manualmente (1 click)

4. **Verificar en Figma**:
   - Pedir al usuario que seleccione el frame "Design System"
   - Usar `get_screenshot` para verificar el resultado

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
│   ├── manifest.json       ← Manifiesto del plugin
│   └── code.js             ← Código del plugin (genera todo en Figma)
└── docs/
    ├── 01-paso-a-paso.md   ← Cronología de lo que hicimos
    ├── 02-instrucciones-para-chat.md  ← ESTE ARCHIVO
    ├── 03-como-lo-hicimos.md          ← Detalles técnicos
    └── 04-estado-actual.md            ← Qué tenemos hoy
```

## Documentación

Cuando hagas cambios, actualiza:
- `docs/01-paso-a-paso.md` — Agregar el nuevo paso
- `docs/04-estado-actual.md` — Actualizar el inventario de componentes
