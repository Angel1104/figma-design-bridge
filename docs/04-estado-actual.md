# Estado Actual del Design System

> Última actualización: 2026-02-26

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

### En Figma (Plugin)
- [x] Header del design system
- [x] Color swatches: primary (10), neutral (11), semantic (4)
- [x] Escala tipográfica (8 niveles)
- [x] Botones: 4 variantes + 3 tamaños
- [x] Cards verticales (3)
- [x] Cards horizontales (2)
- [x] Escala de spacing (10 niveles con barras)

### Pendientes / Ideas futuras
- [ ] Input fields (text, email, password)
- [ ] Select / Dropdown
- [ ] Checkbox / Radio
- [ ] Toggle switch
- [ ] Modal / Dialog
- [ ] Toast / Notification
- [ ] Tabs / Navigation
- [ ] Avatar component
- [ ] Dark mode (second mode in Figma variables)
- [ ] Responsive breakpoints

## Archivos del Proyecto

| Archivo | Propósito | Auto-generado |
|---|---|---|
| `tokens.css` | CSS custom properties | Sí (via sync-figma.js) |
| `components.css` | Estilos de componentes | No (edición manual) |
| `index.html` | Showcase visual | No (edición manual) |
| `figma-tokens.json` | Mapeo Figma ↔ CSS | No (fuente de verdad) |
| `sync-figma.js` | Generador de tokens.css | No |
| `figma-plugin/manifest.json` | Config del plugin | No |
| `figma-plugin/code.js` | Generador de Figma | No (se actualiza por chat) |

## Cómo seguir

Para agregar componentes nuevos, decirle al chat:
> "Agrega [componente] al design system"

El chat actualizará CSS + plugin, el usuario ejecuta el plugin en Figma.
