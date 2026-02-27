import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import WebSocket from "ws";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { WS_PORT, MSG, ROLE, TIMEOUT } from "./protocol.mjs";

// Use local WS for broker management, but connect via localhost for commands
const WS_URL = `ws://localhost:${WS_PORT}`;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── State ──────────────────────────────────────────────────

let ws = null;
let channelId = null;
let peerConnected = false;
const pendingRequests = new Map(); // id → { resolve, reject, timer }
let msgCounter = 0;

function log(msg) {
  console.error("[mcp-server] " + msg);
}

// ─── Broker Management ──────────────────────────────────────

async function ensureBroker() {
  // Try connecting to see if broker is running
  return new Promise((resolve) => {
    const testWs = new WebSocket(WS_URL);
    const timeout = setTimeout(() => {
      try { testWs.close(); } catch (e) { /* ignore */ }
      startBroker();
      resolve();
    }, TIMEOUT.BROKER_STARTUP);

    testWs.on("open", () => {
      clearTimeout(timeout);
      testWs.close();
      log("broker already running");
      resolve();
    });

    testWs.on("error", () => {
      clearTimeout(timeout);
      startBroker();
      resolve();
    });
  });
}

function startBroker() {
  log("starting broker...");
  const brokerPath = join(__dirname, "ws-broker.mjs");
  const child = spawn("node", [brokerPath], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  log("broker spawned (pid: " + child.pid + ")");
}

// ─── WebSocket Connection ───────────────────────────────────

function connectToChannel(channel) {
  return new Promise((resolve, reject) => {
    channelId = channel;
    peerConnected = false;

    if (ws) {
      try { ws.close(); } catch (e) { /* ignore */ }
    }

    ws = new WebSocket(WS_URL);

    const connectTimeout = setTimeout(() => {
      reject(new Error("Connection timeout"));
      try { ws.close(); } catch (e) { /* ignore */ }
    }, 10000);

    ws.on("open", () => {
      ws.send(JSON.stringify({
        type: MSG.REGISTER,
        role: ROLE.CONTROLLER,
        channel: channelId,
      }));
    });

    ws.on("message", (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch (e) {
        return;
      }

      if (msg.type === MSG.REGISTERED) {
        clearTimeout(connectTimeout);
        peerConnected = msg.peerConnected;
        log("registered on " + channelId + " (peer: " + peerConnected + ")");
        resolve({ channel: channelId, peerConnected });
        return;
      }

      if (msg.type === MSG.PEER_CONNECTED) {
        peerConnected = true;
        log("plugin connected on " + channelId);
        return;
      }

      if (msg.type === MSG.PEER_DISCONNECTED) {
        peerConnected = false;
        log("plugin disconnected from " + channelId);
        return;
      }

      if (msg.type === MSG.COMMAND_RESPONSE) {
        const pending = pendingRequests.get(msg.id);
        if (pending) {
          clearTimeout(pending.timer);
          pendingRequests.delete(msg.id);
          if (msg.error) {
            pending.reject(new Error(msg.error));
          } else {
            pending.resolve(msg.result);
          }
        }
        return;
      }

      if (msg.type === MSG.ERROR) {
        // If it has an id, it's a response to a specific command
        if (msg.id) {
          const pending = pendingRequests.get(msg.id);
          if (pending) {
            clearTimeout(pending.timer);
            pendingRequests.delete(msg.id);
            pending.reject(new Error(msg.message || msg.code));
          }
        } else {
          log("broker error: " + (msg.message || msg.code));
        }
        return;
      }
    });

    ws.on("close", () => {
      log("disconnected from broker");
      peerConnected = false;
      // Reject all pending requests
      for (const [id, pending] of pendingRequests) {
        clearTimeout(pending.timer);
        pending.reject(new Error("WebSocket disconnected"));
      }
      pendingRequests.clear();
    });

    ws.on("error", (err) => {
      clearTimeout(connectTimeout);
      reject(new Error("WebSocket error: " + err.message));
    });
  });
}

function sendCommand(action, params, timeout) {
  return new Promise((resolve, reject) => {
    if (!ws || ws.readyState !== 1) {
      reject(new Error("Not connected to Figma. Start the plugin in Figma and call connect_to_figma with the channel ID."));
      return;
    }

    msgCounter++;
    const id = "msg_" + Date.now() + "_" + msgCounter;
    const timeoutMs = timeout || TIMEOUT.COMMAND;

    const timer = setTimeout(() => {
      pendingRequests.delete(id);
      reject(new Error("Command timed out after " + (timeoutMs / 1000) + "s"));
    }, timeoutMs);

    pendingRequests.set(id, { resolve, reject, timer });

    ws.send(JSON.stringify({
      type: MSG.COMMAND,
      id: id,
      action: action,
      params: params || {},
    }));
  });
}

// ─── MCP Server ─────────────────────────────────────────────

const server = new McpServer({
  name: "figma-bridge",
  version: "1.0.0",
});

// Helper to format tool results
function ok(data) {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function err(msg) {
  return { content: [{ type: "text", text: "Error: " + msg }], isError: true };
}

// --- Tools ---

server.tool(
  "connect_to_figma",
  "Connect to a Figma plugin instance via channel ID. Run the plugin in Figma first — it will show the channel ID.",
  { channelId: z.string().describe("Channel ID shown by the Figma plugin (e.g. ch_abc12345)") },
  async ({ channelId: ch }) => {
    try {
      await ensureBroker();
      // Small delay to let broker start
      await new Promise((r) => setTimeout(r, 500));
      const result = await connectToChannel(ch);
      return ok(result);
    } catch (e) {
      return err(e.message);
    }
  }
);

server.tool(
  "create_frame",
  "Create a frame in Figma. Supports auto-layout, fills, padding, corner radius.",
  {
    name: z.string().optional().describe("Frame name"),
    parentId: z.string().optional().describe("Parent node ID. Defaults to current page."),
    x: z.number().optional().describe("X position"),
    y: z.number().optional().describe("Y position"),
    width: z.number().optional().describe("Width in pixels"),
    height: z.number().optional().describe("Height in pixels"),
    fills: z.string().optional().describe("Fill color as hex string (e.g. #FFFFFF)"),
    layoutMode: z.enum(["NONE", "HORIZONTAL", "VERTICAL"]).optional().describe("Auto-layout direction"),
    itemSpacing: z.number().optional().describe("Gap between children"),
    padding: z.number().optional().describe("Uniform padding on all sides"),
    paddingTop: z.number().optional(),
    paddingBottom: z.number().optional(),
    paddingLeft: z.number().optional(),
    paddingRight: z.number().optional(),
    primaryAxisAlignItems: z.enum(["MIN", "CENTER", "MAX", "SPACE_BETWEEN"]).optional(),
    counterAxisAlignItems: z.enum(["MIN", "CENTER", "MAX"]).optional(),
    cornerRadius: z.number().optional(),
    clipsContent: z.boolean().optional(),
    layoutSizingHorizontal: z.enum(["FIXED", "HUG", "FILL"]).optional(),
    layoutSizingVertical: z.enum(["FIXED", "HUG", "FILL"]).optional(),
    strokes: z.string().optional().describe("Stroke color as hex string"),
    strokeWeight: z.number().optional(),
    opacity: z.number().optional(),
  },
  async (params) => {
    try {
      const result = await sendCommand("create_frame", params);
      return ok(result);
    } catch (e) {
      return err(e.message);
    }
  }
);

server.tool(
  "create_rectangle",
  "Create a rectangle in Figma.",
  {
    name: z.string().optional().describe("Rectangle name"),
    parentId: z.string().optional().describe("Parent node ID"),
    x: z.number().optional(),
    y: z.number().optional(),
    width: z.number().optional().describe("Width in pixels"),
    height: z.number().optional().describe("Height in pixels"),
    fills: z.string().optional().describe("Fill color as hex"),
    cornerRadius: z.number().optional(),
    strokes: z.string().optional().describe("Stroke color as hex"),
    strokeWeight: z.number().optional(),
    opacity: z.number().optional(),
    layoutSizingHorizontal: z.enum(["FIXED", "HUG", "FILL"]).optional(),
    layoutSizingVertical: z.enum(["FIXED", "HUG", "FILL"]).optional(),
  },
  async (params) => {
    try {
      const result = await sendCommand("create_rectangle", params);
      return ok(result);
    } catch (e) {
      return err(e.message);
    }
  }
);

server.tool(
  "create_text",
  "Create a text node in Figma.",
  {
    content: z.string().describe("Text content"),
    parentId: z.string().optional().describe("Parent node ID"),
    name: z.string().optional().describe("Node name"),
    x: z.number().optional(),
    y: z.number().optional(),
    fontSize: z.number().optional().describe("Font size in pixels"),
    color: z.string().optional().describe("Text color as hex"),
    textAlignHorizontal: z.enum(["LEFT", "CENTER", "RIGHT", "JUSTIFIED"]).optional(),
    textAlignVertical: z.enum(["TOP", "CENTER", "BOTTOM"]).optional(),
    textAutoResize: z.enum(["NONE", "WIDTH_AND_HEIGHT", "HEIGHT", "TRUNCATE"]).optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    layoutSizingHorizontal: z.enum(["FIXED", "HUG", "FILL"]).optional(),
    layoutSizingVertical: z.enum(["FIXED", "HUG", "FILL"]).optional(),
  },
  async (params) => {
    try {
      const result = await sendCommand("create_text", params);
      return ok(result);
    } catch (e) {
      return err(e.message);
    }
  }
);

server.tool(
  "create_ellipse",
  "Create an ellipse/circle in Figma.",
  {
    name: z.string().optional(),
    parentId: z.string().optional().describe("Parent node ID"),
    x: z.number().optional(),
    y: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    fills: z.string().optional().describe("Fill color as hex"),
    strokes: z.string().optional().describe("Stroke color as hex"),
    strokeWeight: z.number().optional(),
    opacity: z.number().optional(),
  },
  async (params) => {
    try {
      const result = await sendCommand("create_ellipse", params);
      return ok(result);
    } catch (e) {
      return err(e.message);
    }
  }
);

server.tool(
  "modify_node",
  "Modify properties of an existing Figma node.",
  {
    nodeId: z.string().describe("ID of the node to modify"),
    name: z.string().optional(),
    x: z.number().optional(),
    y: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    fills: z.string().optional().describe("Fill color as hex"),
    strokes: z.string().optional().describe("Stroke color as hex"),
    strokeWeight: z.number().optional(),
    cornerRadius: z.number().optional(),
    opacity: z.number().optional(),
    visible: z.boolean().optional(),
    characters: z.string().optional().describe("New text content (text nodes only)"),
    layoutMode: z.enum(["NONE", "HORIZONTAL", "VERTICAL"]).optional(),
    itemSpacing: z.number().optional(),
    padding: z.number().optional(),
    paddingTop: z.number().optional(),
    paddingBottom: z.number().optional(),
    paddingLeft: z.number().optional(),
    paddingRight: z.number().optional(),
    primaryAxisAlignItems: z.enum(["MIN", "CENTER", "MAX", "SPACE_BETWEEN"]).optional(),
    counterAxisAlignItems: z.enum(["MIN", "CENTER", "MAX"]).optional(),
    layoutSizingHorizontal: z.enum(["FIXED", "HUG", "FILL"]).optional(),
    layoutSizingVertical: z.enum(["FIXED", "HUG", "FILL"]).optional(),
  },
  async (params) => {
    try {
      const result = await sendCommand("modify_node", params);
      return ok(result);
    } catch (e) {
      return err(e.message);
    }
  }
);

server.tool(
  "delete_node",
  "Delete a node from the Figma canvas.",
  {
    nodeId: z.string().describe("ID of the node to delete"),
  },
  async (params) => {
    try {
      const result = await sendCommand("delete_node", params);
      return ok(result);
    } catch (e) {
      return err(e.message);
    }
  }
);

server.tool(
  "get_node",
  "Get properties and children of a Figma node.",
  {
    nodeId: z.string().describe("ID of the node to inspect"),
  },
  async (params) => {
    try {
      const result = await sendCommand("get_node", params);
      return ok(result);
    } catch (e) {
      return err(e.message);
    }
  }
);

server.tool(
  "get_page_structure",
  "Get the tree structure of the current Figma page.",
  {
    depth: z.number().optional().describe("Max depth to traverse (default: 2)"),
  },
  async (params) => {
    try {
      const result = await sendCommand("get_page_structure", params);
      return ok(result);
    } catch (e) {
      return err(e.message);
    }
  }
);

server.tool(
  "set_variable",
  "Create or update a Figma variable.",
  {
    name: z.string().describe("Variable name (e.g. primary/600)"),
    collection: z.string().optional().describe("Collection name (default: Colors)"),
    type: z.enum(["COLOR", "FLOAT", "STRING", "BOOLEAN"]).optional().describe("Variable type (default: COLOR)"),
    value: z.union([z.string(), z.number(), z.boolean()]).describe("Variable value. For COLOR type use hex string."),
  },
  async (params) => {
    try {
      const result = await sendCommand("set_variable", params);
      return ok(result);
    } catch (e) {
      return err(e.message);
    }
  }
);

server.tool(
  "build_component",
  "Build a pre-defined design system component section.",
  {
    component: z.enum(["button", "buttons", "card", "cards", "horizontal_card", "horizontal_cards", "colors", "typography", "spacing", "inputs", "form_inputs", "forms"]).describe("Component to build"),
    parentId: z.string().optional().describe("Parent node ID to append to"),
    layoutSizingHorizontal: z.enum(["FIXED", "HUG", "FILL"]).optional(),
    layoutSizingVertical: z.enum(["FIXED", "HUG", "FILL"]).optional(),
  },
  async (params) => {
    try {
      const result = await sendCommand("build_component", params, TIMEOUT.COMMAND_LONG);
      return ok(result);
    } catch (e) {
      return err(e.message);
    }
  }
);

server.tool(
  "scroll_to_node",
  "Scroll the Figma viewport to center on a specific node.",
  {
    nodeId: z.string().describe("ID of the node to scroll to"),
  },
  async (params) => {
    try {
      const result = await sendCommand("scroll_to_node", params);
      return ok(result);
    } catch (e) {
      return err(e.message);
    }
  }
);

server.tool(
  "build_design_system",
  "Build the complete design system (variables + all visual components). This replaces any existing 'Design System' frame.",
  {},
  async () => {
    try {
      const result = await sendCommand("build_design_system", {}, TIMEOUT.COMMAND_LONG);
      return ok(result);
    } catch (e) {
      return err(e.message);
    }
  }
);

// ─── Start ──────────────────────────────────────────────────

async function main() {
  log("starting MCP server...");

  // Auto-start broker
  await ensureBroker();

  const transport = new StdioServerTransport();
  await server.connect(transport);
  log("MCP server running");
}

main().catch((e) => {
  log("fatal: " + e.message);
  process.exit(1);
});
