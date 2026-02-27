#!/usr/bin/env node

/**
 * Figma → CSS Token Sync
 *
 * This script is designed to work WITH Claude Code + Figma MCP.
 * It reads figma-tokens.json and generates an updated tokens.css
 * based on the current values (either from Figma sync or manual edits).
 *
 * Usage:
 *   node sync-figma.js                  → Generate tokens.css from figma-tokens.json
 *   node sync-figma.js --diff           → Show what would change
 *   node sync-figma.js --from-figma     → Placeholder: update JSON from Figma variables
 */

const fs = require("fs");
const path = require("path");

const TOKENS_JSON = path.join(__dirname, "figma-tokens.json");
const TOKENS_CSS = path.join(__dirname, "tokens.css");

function loadTokens() {
  const raw = fs.readFileSync(TOKENS_JSON, "utf-8");
  return JSON.parse(raw);
}

function generateCSS(data) {
  const lines = [];

  lines.push("/* ============================================");
  lines.push("   DESIGN SYSTEM TOKENS");
  lines.push("   Auto-generated from figma-tokens.json");
  lines.push(`   Last sync: ${new Date().toISOString()}`);
  lines.push("   ============================================ */");
  lines.push("");
  lines.push(":root {");

  // Colors
  for (const [groupName, group] of Object.entries(data.colors)) {
    lines.push("");
    lines.push(`  /* --- Colors: ${groupName} --- */`);
    for (const [cssVar, token] of Object.entries(group.tokens)) {
      lines.push(`  ${cssVar}: ${token.value};`);
    }
  }

  // Typography
  lines.push("");
  lines.push("  /* --- Typography --- */");
  lines.push("");
  lines.push("  --font-family-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;");
  lines.push("  --font-family-mono: 'JetBrains Mono', 'Fira Code', monospace;");
  lines.push("");

  for (const [cssVar, token] of Object.entries(data.typography.tokens)) {
    lines.push(`  ${cssVar}: ${token.value};`);
  }

  lines.push("");
  lines.push("  /* Font Weights */");
  lines.push("  --font-weight-regular: 400;");
  lines.push("  --font-weight-medium: 500;");
  lines.push("  --font-weight-semibold: 600;");
  lines.push("  --font-weight-bold: 700;");
  lines.push("");
  lines.push("  /* Line Heights */");
  lines.push("  --line-height-tight: 1.25;");
  lines.push("  --line-height-normal: 1.5;");
  lines.push("  --line-height-relaxed: 1.75;");

  // Spacing
  lines.push("");
  lines.push("  /* --- Spacing --- */");
  for (const [cssVar, token] of Object.entries(data.spacing.tokens)) {
    lines.push(`  ${cssVar}: ${token.value};`);
  }

  // Radii
  lines.push("");
  lines.push("  /* --- Border Radius --- */");
  for (const [cssVar, token] of Object.entries(data.radii.tokens)) {
    lines.push(`  ${cssVar}: ${token.value};`);
  }

  // Shadows (not tokenized in Figma typically)
  lines.push("");
  lines.push("  /* --- Shadows --- */");
  lines.push("  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);");
  lines.push("  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);");
  lines.push("  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);");
  lines.push("  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);");

  // Transitions
  lines.push("");
  lines.push("  /* --- Transitions --- */");
  lines.push("  --transition-fast: 150ms ease;");
  lines.push("  --transition-base: 200ms ease;");
  lines.push("  --transition-slow: 300ms ease;");

  lines.push("}");
  lines.push("");

  return lines.join("\n");
}

function diffTokens() {
  const data = loadTokens();
  const newCSS = generateCSS(data);

  if (fs.existsSync(TOKENS_CSS)) {
    const oldCSS = fs.readFileSync(TOKENS_CSS, "utf-8");
    if (oldCSS.trim() === newCSS.trim()) {
      console.log("✓ No changes — tokens.css is up to date.");
      return;
    }
    console.log("Changes detected. Run without --diff to apply.");

    // Simple line-by-line diff
    const oldLines = oldCSS.split("\n");
    const newLines = newCSS.split("\n");
    const maxLen = Math.max(oldLines.length, newLines.length);

    for (let i = 0; i < maxLen; i++) {
      const o = oldLines[i] || "";
      const n = newLines[i] || "";
      if (o !== n) {
        if (o) console.log(`  - ${o}`);
        if (n) console.log(`  + ${n}`);
      }
    }
  } else {
    console.log("tokens.css does not exist yet. Run without --diff to create it.");
  }
}

function syncFromFigma() {
  console.log("────────────────────────────────────────────");
  console.log("  Figma → Code Sync");
  console.log("────────────────────────────────────────────");
  console.log("");
  console.log("To sync from Figma, ask Claude Code:");
  console.log("");
  console.log('  "Read the Figma variables and update');
  console.log('   figma-tokens.json with the current values"');
  console.log("");
  console.log("Claude will use the Figma MCP to:");
  console.log("  1. Read get_variable_defs from your Figma file");
  console.log("  2. Map Figma variables → figma-tokens.json");
  console.log("  3. Run this script to regenerate tokens.css");
  console.log("");
  console.log("────────────────────────────────────────────");
}

// CLI
const args = process.argv.slice(2);

if (args.includes("--diff")) {
  diffTokens();
} else if (args.includes("--from-figma")) {
  syncFromFigma();
} else {
  const data = loadTokens();
  const css = generateCSS(data);
  fs.writeFileSync(TOKENS_CSS, css, "utf-8");

  // Count tokens
  let count = 0;
  for (const group of Object.values(data.colors)) count += Object.keys(group.tokens).length;
  count += Object.keys(data.typography.tokens).length;
  count += Object.keys(data.spacing.tokens).length;
  count += Object.keys(data.radii.tokens).length;

  // Update last sync
  data.meta.lastSync = new Date().toISOString();
  fs.writeFileSync(TOKENS_JSON, JSON.stringify(data, null, 2) + "\n", "utf-8");

  console.log(`✓ Generated tokens.css (${count} tokens synced)`);
}
