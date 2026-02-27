#!/bin/bash
# Start the Figma MCP Bridge broker
# Run this before using the bridge from Claude Code

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=18765

# Check if broker is already running
if lsof -i :$PORT >/dev/null 2>&1; then
  echo "[broker] already running on port $PORT"
  exit 0
fi

# Start broker in background
nohup node "$SCRIPT_DIR/ws-broker.mjs" > /tmp/figma-broker.log 2>&1 &
BROKER_PID=$!

# Wait and verify
sleep 1
if lsof -i :$PORT >/dev/null 2>&1; then
  echo "[broker] started on port $PORT (PID: $BROKER_PID)"
else
  echo "[broker] failed to start — check /tmp/figma-broker.log"
  exit 1
fi
