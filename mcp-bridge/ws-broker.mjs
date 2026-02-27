import { createServer } from "http";
import { WebSocketServer } from "ws";
import { WS_PORT, MSG, ROLE, ERR, TIMEOUT } from "./protocol.mjs";

// Channel store: channelId → { controller: ws|null, plugin: ws|null }
const channels = new Map();

// Map ws → { channel, role } for cleanup on disconnect
const wsInfo = new Map();

// ─── HTTP Polling for Figma plugin (can't use WebSocket from sandbox) ───

// Per-channel message queues: channelId → { toPlugin: [], toController: [] }
const httpQueues = new Map();
// Per-channel plugin registration tracking
const httpPlugins = new Set();

function getQueue(channel) {
  if (!httpQueues.has(channel)) {
    httpQueues.set(channel, { toPlugin: [], toController: [] });
  }
  return httpQueues.get(channel);
}

function handleHttpRequest(req, res) {
  // CORS headers for Figma plugin
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, "http://localhost");
  const path = url.pathname;

  // Health check
  if (path === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  // Plugin registers: POST /register { channel }
  if (path === "/register" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        const channel = data.channel;
        if (!channel) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "channel required" }));
          return;
        }
        httpPlugins.add(channel);
        getQueue(channel); // ensure queue exists

        // Check if controller (WS) is connected to this channel
        const ch = channels.get(channel);
        const peerConnected = ch && ch.controller && ch.controller.readyState === 1;

        // Notify WS controller that plugin connected
        if (peerConnected) {
          ch.controller.send(JSON.stringify({ type: MSG.PEER_CONNECTED, channel: channel }));
        }

        console.error("[broker] HTTP plugin registered on " + channel + " (ws-peer: " + peerConnected + ")");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ registered: true, channel: channel, peerConnected: peerConnected }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "invalid JSON" }));
      }
    });
    return;
  }

  // Plugin polls for commands: GET /poll?channel=xxx
  if (path === "/poll" && req.method === "GET") {
    const channel = url.searchParams.get("channel");
    if (!channel) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "channel required" }));
      return;
    }
    const queue = getQueue(channel);
    const messages = queue.toPlugin.splice(0);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ messages: messages }));
    return;
  }

  // Plugin sends responses: POST /send { channel, message }
  if (path === "/send" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        const channel = data.channel;
        const message = data.message;

        // Forward to WS controller
        const ch = channels.get(channel);
        if (ch && ch.controller && ch.controller.readyState === 1) {
          ch.controller.send(JSON.stringify(message));
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ sent: true }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "invalid JSON" }));
      }
    });
    return;
  }

  // Default
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("figma-bridge-broker");
}

const httpServer = createServer(handleHttpRequest);
const wss = new WebSocketServer({ server: httpServer });

httpServer.listen(WS_PORT, "0.0.0.0", () => {
  console.error(`[broker] listening on http://localhost:${WS_PORT}`);
});

wss.on("connection", (ws) => {
  let registered = false;

  ws.isAlive = true;
  ws.on("pong", () => { ws.isAlive = true; });

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch (e) {
      console.error("[broker] invalid JSON, ignoring");
      return;
    }

    // Heartbeat — just acknowledge
    if (msg.type === MSG.HEARTBEAT) {
      return;
    }

    // Registration
    if (msg.type === MSG.REGISTER) {
      const { role, channel } = msg;

      if (!channel || (role !== ROLE.CONTROLLER && role !== ROLE.PLUGIN)) {
        ws.send(JSON.stringify({
          type: MSG.ERROR,
          code: ERR.INVALID_MESSAGE,
          message: "register requires valid role and channel",
        }));
        return;
      }

      // Create channel if it doesn't exist
      if (!channels.has(channel)) {
        channels.set(channel, { controller: null, plugin: null });
      }

      const ch = channels.get(channel);

      // Check if role slot is already taken by a different ws
      if (ch[role] && ch[role] !== ws && ch[role].readyState === 1) {
        ws.send(JSON.stringify({
          type: MSG.ERROR,
          code: ERR.CHANNEL_ROLE_TAKEN,
          message: `Role "${role}" already taken on channel ${channel}`,
        }));
        return;
      }

      // Register
      ch[role] = ws;
      wsInfo.set(ws, { channel, role });
      registered = true;

      const peerRole = role === ROLE.CONTROLLER ? ROLE.PLUGIN : ROLE.CONTROLLER;
      // Check WS peer or HTTP plugin
      const wsPeerConnected = ch[peerRole] !== null && ch[peerRole].readyState === 1;
      const httpPeerConnected = peerRole === ROLE.PLUGIN && httpPlugins.has(channel);
      const peerConnected = wsPeerConnected || httpPeerConnected;

      ws.send(JSON.stringify({
        type: MSG.REGISTERED,
        channel,
        peerConnected,
      }));

      // Notify peer if they're connected (only via WS; HTTP plugins get notified on next poll)
      if (wsPeerConnected) {
        ch[peerRole].send(JSON.stringify({
          type: MSG.PEER_CONNECTED,
          channel,
        }));
      }

      console.error(`[broker] ${role} registered on ${channel} (peer: ${peerConnected})`);
      return;
    }

    // All other messages require registration
    if (!registered) {
      ws.send(JSON.stringify({
        type: MSG.ERROR,
        code: ERR.INVALID_MESSAGE,
        message: "must register first",
      }));
      return;
    }

    // Forward command / command-response to peer
    if (msg.type === MSG.COMMAND || msg.type === MSG.COMMAND_RESPONSE) {
      const info = wsInfo.get(ws);
      if (!info) return;

      const ch = channels.get(info.channel);
      if (!ch) return;

      const peerRole = info.role === ROLE.CONTROLLER ? ROLE.PLUGIN : ROLE.CONTROLLER;

      // If controller sending command to plugin, check HTTP plugin first
      if (info.role === ROLE.CONTROLLER && msg.type === MSG.COMMAND && httpPlugins.has(info.channel)) {
        const queue = getQueue(info.channel);
        queue.toPlugin.push(msg);
        return;
      }

      // WS peer
      const peer = ch[peerRole];
      if (!peer || peer.readyState !== 1) {
        // Check if HTTP plugin is registered
        if (peerRole === ROLE.PLUGIN && httpPlugins.has(info.channel)) {
          const queue = getQueue(info.channel);
          queue.toPlugin.push(msg);
          return;
        }
        ws.send(JSON.stringify({
          type: MSG.ERROR,
          code: ERR.PEER_NOT_CONNECTED,
          message: `Peer (${peerRole}) not connected on channel ${info.channel}`,
          id: msg.id || null,
        }));
        return;
      }

      peer.send(JSON.stringify(msg));
      return;
    }
  });

  ws.on("close", () => {
    const info = wsInfo.get(ws);
    if (info) {
      const ch = channels.get(info.channel);
      if (ch) {
        ch[info.role] = null;

        // Notify peer about disconnection
        const peerRole = info.role === ROLE.CONTROLLER ? ROLE.PLUGIN : ROLE.CONTROLLER;
        const peer = ch[peerRole];
        if (peer && peer.readyState === 1) {
          peer.send(JSON.stringify({
            type: MSG.PEER_DISCONNECTED,
            channel: info.channel,
          }));
        }

        // Clean up empty channels
        if (!ch.controller && !ch.plugin) {
          channels.delete(info.channel);
        }
      }
      wsInfo.delete(ws);
      console.error(`[broker] ${info.role} disconnected from ${info.channel}`);
    }
  });

  ws.on("error", (err) => {
    console.error("[broker] ws error:", err.message);
  });
});

// Heartbeat: ping every 30s, terminate dead connections
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      const info = wsInfo.get(ws);
      console.error("[broker] terminating dead connection:", info ? `${info.role}@${info.channel}` : "unregistered");
      ws.terminate();
      return;
    }
    ws.isAlive = false;
    ws.ping();
  });
}, TIMEOUT.HEARTBEAT);

wss.on("close", () => {
  clearInterval(heartbeatInterval);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.error("[broker] shutting down");
  wss.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.error("[broker] shutting down");
  wss.close();
  process.exit(0);
});
