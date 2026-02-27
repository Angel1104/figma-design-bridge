// Shared constants and helpers for the Figma MCP Bridge

export const WS_PORT = 18765;
export const WS_URL = `ws://localhost:${WS_PORT}`;

// Message types
export const MSG = {
  REGISTER: "register",
  REGISTERED: "registered",
  COMMAND: "command",
  COMMAND_RESPONSE: "command-response",
  HEARTBEAT: "heartbeat",
  ERROR: "error",
  PEER_CONNECTED: "peer-connected",
  PEER_DISCONNECTED: "peer-disconnected",
};

// Roles
export const ROLE = {
  CONTROLLER: "controller",
  PLUGIN: "plugin",
};

// Error codes
export const ERR = {
  PEER_NOT_CONNECTED: "PEER_NOT_CONNECTED",
  INVALID_MESSAGE: "INVALID_MESSAGE",
  UNKNOWN_CHANNEL: "UNKNOWN_CHANNEL",
  CHANNEL_ROLE_TAKEN: "CHANNEL_ROLE_TAKEN",
};

// Timeouts (ms)
export const TIMEOUT = {
  COMMAND: 15000,
  COMMAND_LONG: 30000,
  HEARTBEAT: 30000,
  BROKER_STARTUP: 3000,
};

// Generate a random channel ID
export function generateChannelId() {
  var chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  var id = "ch_";
  for (var i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// Generate a unique message ID
let msgCounter = 0;
export function generateMsgId() {
  msgCounter++;
  return "msg_" + Date.now() + "_" + msgCounter;
}
