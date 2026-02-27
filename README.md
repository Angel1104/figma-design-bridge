# Figma Design System Bridge

Control your Figma designs directly from Claude Code. Create frames, text, shapes, and full design system components without leaving the terminal.

## Architecture

```
Claude Code <--(stdio)--> MCP Server <--(WebSocket)--> Broker <--(HTTP polling)--> Plugin UI <--(postMessage)--> Plugin code.js --> Figma API
```

### Why 3 pieces?

Figma plugins have **two separate contexts**:
- `code.js` — Access to Figma API, but **cannot** make network requests
- `ui.html` — Can make HTTP requests, but **no** access to Figma API

They communicate via `postMessage`. The broker bridges the gap between Claude Code (via MCP) and the plugin.

## Quick Start

### 1. Install dependencies

```bash
cd mcp-bridge
npm install
```

### 2. Start the broker

```bash
bash mcp-bridge/start.sh
```

This starts the broker in the background on `localhost:18765`. The script is idempotent — it won't start a second instance if one is already running.

### 3. Load the plugin in Figma

1. **Figma Desktop** > Plugins > Development > Import plugin from manifest
2. Select `figma-plugin/manifest.json`
3. Run the plugin — it will show: `Bridge connected! Channel: ch_xxxxxxxx`

### 4. Connect from Claude Code

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "figma-bridge": {
      "command": "node",
      "args": ["<path>/mcp-bridge/mcp-server.mjs"]
    }
  }
}
```

Then tell Claude Code:
> Connect to Figma channel ch_xxxxxxxx

## MCP Tools

| Tool | Description |
|---|---|
| `connect_to_figma` | Connect to plugin via channel ID |
| `create_frame` | Create frame with auto-layout |
| `create_rectangle` | Create rectangle |
| `create_text` | Create text node |
| `create_ellipse` | Create ellipse/circle |
| `modify_node` | Modify any node property |
| `delete_node` | Delete a node |
| `get_node` | Read node properties |
| `get_page_structure` | Get page tree structure |
| `set_variable` | Create/update Figma variables |
| `build_component` | Build design system component |
| `scroll_to_node` | Scroll viewport to node |
| `build_design_system` | Build complete design system |

## Design System

Included design system with CSS tokens and Figma variables:

- **Colors**: Primary (50-900), Neutral, Semantic (success, warning, error, info)
- **Typography**: 8 scales (xs to 4xl)
- **Spacing**: 10 steps (4px to 64px)
- **Components**: Buttons (4 variants, 3 sizes), Cards (vertical + horizontal), Badges, Form inputs (text, email, password, number, date, textarea, select, checkbox, radio, toggle)

### Files

| File | Purpose |
|---|---|
| `tokens.css` | CSS custom properties (auto-generated) |
| `components.css` | Component styles |
| `index.html` | Visual showcase |
| `figma-tokens.json` | Figma <-> CSS mapping (source of truth) |
| `sync-figma.js` | Generates tokens.css from JSON |

## Complementary MCPs

Works alongside the official Figma Desktop MCP:

- **figma-desktop** (read-only): screenshots, metadata, variables, design context
- **figma-bridge** (read-write): create, modify, delete nodes and variables

## Project Structure

```
figma/
├── tokens.css                  # Auto-generated CSS tokens
├── components.css              # Component styles
├── index.html                  # Visual showcase
├── figma-tokens.json           # Token mapping (source of truth)
├── sync-figma.js               # JSON -> CSS generator
├── figma-plugin/
│   ├── manifest.json           # Plugin config
│   ├── code.js                 # Persistent bridge + builders
│   └── ui.html                 # HTTP polling client
├── mcp-bridge/
│   ├── package.json            # Dependencies
│   ├── protocol.mjs            # Shared constants
│   ├── ws-broker.mjs           # HTTP + WebSocket broker
│   ├── mcp-server.mjs          # MCP server (13 tools)
│   └── start.sh                # Broker startup script
└── docs/
    ├── 01-paso-a-paso.md       # Step-by-step history
    ├── 02-instrucciones-para-chat.md  # Instructions for AI chats
    ├── 03-como-lo-hicimos.md   # Technical details
    ├── 04-estado-actual.md     # Current inventory
    └── 05-mcp-bridge.md        # Bridge documentation
```

## Figma Plugin Sandbox Rules

When modifying plugin code, remember:
- **No** spread operator (`{...obj}`) — use manual assignment
- **No** optional chaining (`obj?.prop`) — use ternary
- **No** nullish coalescing (`val ?? def`) — use ternary
- `layoutSizingHorizontal = "FILL"` must be set **after** `appendChild()`
- Font loading requires try-catch fallback chain

## CLAUDE.md

The project includes a `CLAUDE.md` file that Claude Code reads automatically at the start of each session. It contains instructions to auto-start the broker, connect to the plugin, and all the rules for the Figma plugin sandbox.

## License

MIT
