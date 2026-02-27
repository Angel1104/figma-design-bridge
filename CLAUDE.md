# Claude Code — Figma Design Bridge

## Auto-start broker

At the start of every session, run the broker if it's not already running:

```bash
bash /Users/angel/figma/mcp-bridge/start.sh
```

## Connect to Figma

1. User runs the plugin in Figma Desktop (Plugins > Development > Design System Bridge)
2. User provides the channel ID (e.g. `ch_xxxxxxxx`)
3. Call `connect_to_figma` with the channel ID

## Available MCPs

### figma-bridge (read-write)
- `connect_to_figma` — connect via channel ID
- `create_frame`, `create_rectangle`, `create_text`, `create_ellipse` — create nodes
- `modify_node`, `delete_node` — modify/delete nodes
- `get_node`, `get_page_structure` — read nodes
- `set_variable` — create/update Figma variables
- `build_component` — build design system component (button, card, horizontal_card, colors, typography, spacing, inputs)
- `build_design_system` — rebuild full design system
- `scroll_to_node` — scroll viewport

### figma-desktop (read-only)
- `get_screenshot`, `get_design_context`, `get_metadata`, `get_variable_defs`

## Design System Tokens

All colors, spacing, radii, and typography are defined in:
- `figma-tokens.json` — source of truth
- `tokens.css` — auto-generated CSS custom properties
- `components.css` — component styles using tokens

## Figma Plugin Rules

When editing `figma-plugin/code.js`:
- NO spread operator (`{...obj}`) — use manual assignment
- NO optional chaining (`?.`) — use ternary
- NO nullish coalescing (`??`) — use ternary
- `layoutSizingHorizontal = "FILL"` must be set AFTER `appendChild()`
- Font loading: try document default → Inter → Roboto → Arial
- Plugin UI uses HTTP polling (NOT WebSocket — blocked by Figma sandbox)
