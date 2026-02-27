# Cómo lo Hicimos: Detalles Técnicos

## Arquitectura

```
┌──────────────────┐     ┌───────────────────┐     ┌─────────────┐
│  figma-tokens.json│────▶│   sync-figma.js   │────▶│  tokens.css │
│  (fuente verdad) │     │  (generador CSS)  │     │  (output)   │
└──────────────────┘     └───────────────────┘     └─────────────┘
        │                                                  │
        │                                                  ▼
        │                                          ┌─────────────┐
        │                                          │components.css│
        │                                          └─────────────┘
        │                                                  │
        ▼                                                  ▼
┌──────────────────┐                              ┌─────────────┐
│  figma-plugin/   │                              │  index.html │
│  code.js         │──────▶ Figma Canvas          │  (showcase) │
│  (genera todo)   │       + Variables            └─────────────┘
└──────────────────┘
```

## Design Tokens

### Convención de nombres

Los tokens siguen una convención compartida entre Figma y CSS:

| Figma Variable | CSS Custom Property | Tipo |
|---|---|---|
| `primary/600` | `--color-primary-600` | COLOR |
| `neutral/white` | `--color-neutral-0` | COLOR |
| `semantic/error` | `--color-error` | COLOR |
| `spacing/4` | `--space-4` | FLOAT |
| `radius/md` | `--radius-md` | FLOAT |
| `fontSize/lg` | `--font-size-lg` | FLOAT |

### Paleta de colores

**Primary (Indigo)**: Escala de 50 (más claro) a 900 (más oscuro)
- Uso principal: acciones, links, elementos interactivos
- Base: `primary/600` (#4F46E5)

**Neutral (Gray)**: White + escala de 50 a 900
- Uso: texto, fondos, bordes, separadores

**Semantic**: success (#10B981), warning (#F59E0B), error (#EF4444), info (#3B82F6)

## Plugin de Figma

### Estructura del plugin

```
figma-plugin/
├── manifest.json    ← Configuración: nombre, API version, editorType
└── code.js          ← Todo el código en un solo archivo
```

### manifest.json

```json
{
  "name": "Design System Token Generator",
  "id": "design-system-token-generator",
  "api": "1.0.0",
  "main": "code.js",
  "editorType": ["figma", "dev"]   ← "dev" es obligatorio
}
```

### Flujo de ejecución del plugin

```
main()
  ├── loadFonts()              ← Busca fuente default, fallback a Inter/Roboto/Arial
  ├── ensureVariables()        ← Crea/actualiza 48 variables en 4 colecciones
  │   ├── Colors (25 vars)
  │   ├── Spacing (10 vars)
  │   ├── Radii (5 vars)
  │   └── Typography (8 vars)
  ├── cleanup()                ← Elimina frames "Design System" anteriores
  └── build()                  ← Construye componentes visuales
      ├── Header
      ├── buildColorsSection()
      ├── buildTypographySection()
      ├── buildButtonsSection()
      ├── buildCardsSection()
      ├── buildHorizontalCardsSection()
      └── buildSpacingSection()
```

### API de Figma usada

**Variables:**
- `figma.variables.createVariableCollection(name)` — Crear colección
- `figma.variables.createVariable(name, collection, type)` — Crear variable
- `figma.variables.getLocalVariableCollections()` — Listar colecciones existentes
- `figma.variables.getLocalVariables(type)` — Listar variables por tipo
- `variable.setValueForMode(modeId, value)` — Setear valor

**Nodos:**
- `figma.createFrame()` — Crear frame (con auto-layout)
- `figma.createRectangle()` — Crear rectángulo
- `figma.createEllipse()` — Crear elipse
- `figma.createText()` — Crear texto (requiere `loadFontAsync` previo)

**Layout:**
- `frame.layoutMode = "VERTICAL" | "HORIZONTAL"` — Activar auto-layout
- `frame.layoutSizingHorizontal = "HUG" | "FILL"` — Solo tras appendChild
- `frame.itemSpacing` — Gap entre hijos
- `frame.paddingTop/Bottom/Left/Right` — Padding

### Problemas resueltos

| Problema | Causa | Solución |
|---|---|---|
| `Manifest error: editorType does not include "dev"` | Faltaba `"dev"` en array | Agregar `"dev"` a `editorType` |
| Plugin se cuelga al cargar | `figma.loadFontAsync` con fuente inexistente | Try-catch con fallback a fonts del documento |
| `Unexpected token ...` | Sandbox no soporta spread | Usar asignación manual de propiedades |
| `Unexpected token .` (optional chaining) | Sandbox no soporta `?.` | Usar ternario explícito |
| `set_layoutSizingHorizontal: not auto-layout child` | Setear sizing antes de appendChild | Hacer appendChild primero, luego setear sizing |

## Script de Sincronización

### `sync-figma.js`

```bash
node sync-figma.js              # Genera tokens.css desde JSON
node sync-figma.js --diff       # Muestra cambios sin aplicar
node sync-figma.js --from-figma # Instrucciones para sync desde Figma
```

Lee `figma-tokens.json`, itera sobre todas las categorías (colors, typography, spacing, radii), y genera `tokens.css` con CSS custom properties dentro de `:root {}`.
