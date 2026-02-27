// Design System Bridge — Figma Plugin (v4 - persistent bridge mode)
// Supports two modes:
// 1. Bridge mode: persistent listener via WebSocket (ui.html relay)
// 2. One-shot mode: build full design system and close (legacy)

// ─── Utilities ──────────────────────────────────────────────

function hexToRgb(hex) {
  var h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255,
  };
}

function hexToFigmaColor(hex) {
  var rgb = hexToRgb(hex);
  return { r: rgb.r, g: rgb.g, b: rgb.b, a: 1 };
}

function solidPaint(hex) {
  return [{ type: "SOLID", color: hexToRgb(hex) }];
}

// ─── Token Data ──────────────────────────────────────────────

var COLORS = {
  "primary/50": "#EEF2FF", "primary/100": "#E0E7FF", "primary/200": "#C7D2FE",
  "primary/300": "#A5B4FC", "primary/400": "#818CF8", "primary/500": "#6366F1",
  "primary/600": "#4F46E5", "primary/700": "#4338CA", "primary/800": "#3730A3",
  "primary/900": "#312E81",
  "neutral/white": "#FFFFFF", "neutral/50": "#F9FAFB", "neutral/100": "#F3F4F6",
  "neutral/200": "#E5E7EB", "neutral/300": "#D1D5DB", "neutral/400": "#9CA3AF",
  "neutral/500": "#6B7280", "neutral/600": "#4B5563", "neutral/700": "#374151",
  "neutral/800": "#1F2937", "neutral/900": "#111827",
  "semantic/success": "#10B981", "semantic/warning": "#F59E0B",
  "semantic/error": "#EF4444", "semantic/info": "#3B82F6",
};

var SPACING = {
  "spacing/1": 4, "spacing/2": 8, "spacing/3": 12, "spacing/4": 16,
  "spacing/5": 20, "spacing/6": 24, "spacing/8": 32, "spacing/10": 40,
  "spacing/12": 48, "spacing/16": 64,
};

var RADII = {
  "radius/sm": 4, "radius/md": 8, "radius/lg": 12, "radius/xl": 16, "radius/full": 9999,
};

var FONT_SIZES = {
  "fontSize/xs": 12, "fontSize/sm": 14, "fontSize/base": 16, "fontSize/lg": 18,
  "fontSize/xl": 20, "fontSize/2xl": 24, "fontSize/3xl": 30, "fontSize/4xl": 36,
};

// ─── Variables ───────────────────────────────────────────────

function getOrCreateCollection(name) {
  var existing = figma.variables.getLocalVariableCollections().find(function(c) { return c.name === name; });
  if (existing) return existing;
  return figma.variables.createVariableCollection(name);
}

function getOrCreateVariable(name, collection, type) {
  var existing = figma.variables.getLocalVariables(type)
    .find(function(v) { return v.name === name && v.variableCollectionId === collection.id; });
  if (existing) return existing;
  return figma.variables.createVariable(name, collection, type);
}

function ensureVariables() {
  var colorsCol = getOrCreateCollection("Colors");
  var cMode = colorsCol.modes[0].modeId;
  for (var cKey of Object.keys(COLORS)) {
    getOrCreateVariable(cKey, colorsCol, "COLOR").setValueForMode(cMode, hexToFigmaColor(COLORS[cKey]));
  }

  var spacingCol = getOrCreateCollection("Spacing");
  var sMode = spacingCol.modes[0].modeId;
  for (var sKey of Object.keys(SPACING)) {
    getOrCreateVariable(sKey, spacingCol, "FLOAT").setValueForMode(sMode, SPACING[sKey]);
  }

  var radiiCol = getOrCreateCollection("Radii");
  var rMode = radiiCol.modes[0].modeId;
  for (var rKey of Object.keys(RADII)) {
    getOrCreateVariable(rKey, radiiCol, "FLOAT").setValueForMode(rMode, RADII[rKey]);
  }

  var typoCol = getOrCreateCollection("Typography");
  var tMode = typoCol.modes[0].modeId;
  for (var tKey of Object.keys(FONT_SIZES)) {
    getOrCreateVariable(tKey, typoCol, "FLOAT").setValueForMode(tMode, FONT_SIZES[tKey]);
  }
}

// ─── Text helper ────────────────────────────────────────────

var DEFAULT_FONT = null;

async function loadDefaultFont() {
  try {
    var existingText = figma.currentPage.findOne(function(n) { return n.type === "TEXT"; });
    DEFAULT_FONT = existingText ? existingText.fontName : { family: "Inter", style: "Regular" };
    await figma.loadFontAsync(DEFAULT_FONT);
  } catch (e) {
    try {
      DEFAULT_FONT = { family: "Roboto", style: "Regular" };
      await figma.loadFontAsync(DEFAULT_FONT);
    } catch (e2) {
      DEFAULT_FONT = { family: "Arial", style: "Regular" };
      await figma.loadFontAsync(DEFAULT_FONT);
    }
  }
}

function createText(content, size, color) {
  var node = figma.createText();
  if (DEFAULT_FONT) node.fontName = DEFAULT_FONT;
  node.characters = content;
  node.fontSize = size;
  node.fills = solidPaint(color);
  return node;
}

function createSectionTitle(text) {
  var t = createText(text, 12, "#4F46E5");
  t.letterSpacing = { value: 10, unit: "PERCENT" };
  t.textCase = "UPPER";
  return t;
}

// ─── Color Swatches ──────────────────────────────────────────

function buildColorSwatch(name, hex) {
  var frame = figma.createFrame();
  frame.name = name;
  frame.layoutMode = "VERTICAL";
  frame.counterAxisAlignItems = "CENTER";
  frame.itemSpacing = 8;
  frame.fills = [];
  frame.layoutSizingHorizontal = "HUG";
  frame.layoutSizingVertical = "HUG";

  var swatch = figma.createRectangle();
  swatch.resize(72, 72);
  swatch.cornerRadius = 12;
  swatch.fills = solidPaint(hex);
  if (hex === "#FFFFFF") {
    swatch.strokes = solidPaint("#E5E7EB");
    swatch.strokeWeight = 1;
  }

  frame.appendChild(swatch);
  frame.appendChild(createText(name.split("/")[1] || name, 11, "#374151"));
  frame.appendChild(createText(hex, 10, "#9CA3AF"));
  return frame;
}

function buildColorRow(title, subset) {
  var row = figma.createFrame();
  row.name = title;
  row.layoutMode = "HORIZONTAL";
  row.itemSpacing = 16;
  row.fills = [];
  row.layoutSizingHorizontal = "HUG";
  row.layoutSizingVertical = "HUG";

  for (var name of Object.keys(subset)) {
    row.appendChild(buildColorSwatch(name, subset[name]));
  }
  return row;
}

function buildColorsSection() {
  var s = figma.createFrame();
  s.name = "Colors";
  s.layoutMode = "VERTICAL";
  s.itemSpacing = 32;
  s.fills = [];
  s.layoutSizingHorizontal = "HUG";
  s.layoutSizingVertical = "HUG";

  var groups = { "Primary": "primary/", "Neutral": "neutral/", "Semantic": "semantic/" };
  for (var label of Object.keys(groups)) {
    var prefix = groups[label];
    s.appendChild(createSectionTitle("Colors — " + label));
    var subset = {};
    for (var k of Object.keys(COLORS)) {
      if (k.startsWith(prefix)) subset[k] = COLORS[k];
    }
    s.appendChild(buildColorRow(label, subset));
  }
  return s;
}

// ─── Typography ──────────────────────────────────────────────

function buildTypographySection() {
  var s = figma.createFrame();
  s.name = "Typography";
  s.layoutMode = "VERTICAL";
  s.itemSpacing = 24;
  s.fills = [];
  s.layoutSizingHorizontal = "HUG";
  s.layoutSizingVertical = "HUG";

  s.appendChild(createSectionTitle("Typography"));

  var styles = [
    { label: "Heading 1 — 36px Bold", size: 36 },
    { label: "Heading 2 — 30px Bold", size: 30 },
    { label: "Heading 3 — 24px Semibold", size: 24 },
    { label: "Heading 4 — 20px Semibold", size: 20 },
    { label: "Body Large — 18px Regular", size: 18 },
    { label: "Body Base — 16px Regular", size: 16 },
    { label: "Body Small — 14px Regular", size: 14 },
    { label: "Caption — 12px Medium", size: 12 },
  ];

  for (var st of styles) {
    var row = figma.createFrame();
    row.name = st.label;
    row.layoutMode = "VERTICAL";
    row.itemSpacing = 4;
    row.fills = [];
    row.layoutSizingHorizontal = "HUG";
    row.layoutSizingVertical = "HUG";
    row.appendChild(createText(st.label.split(" — ")[0], st.size, "#111827"));
    row.appendChild(createText(st.label, 11, "#9CA3AF"));
    s.appendChild(row);
  }
  return s;
}

// ─── Buttons ─────────────────────────────────────────────────

function buildBtn(label, bg, textColor, border, padH, padV, radius) {
  var btn = figma.createFrame();
  btn.name = "btn-" + label.toLowerCase();
  btn.layoutMode = "HORIZONTAL";
  btn.primaryAxisAlignItems = "CENTER";
  btn.counterAxisAlignItems = "CENTER";
  btn.paddingLeft = padH; btn.paddingRight = padH;
  btn.paddingTop = padV; btn.paddingBottom = padV;
  btn.cornerRadius = radius;
  btn.fills = solidPaint(bg);
  if (border) { btn.strokes = solidPaint(border); btn.strokeWeight = 2; }
  btn.appendChild(createText(label, 14, textColor));
  btn.layoutSizingHorizontal = "HUG";
  btn.layoutSizingVertical = "HUG";
  return btn;
}

function buildButtonsSection() {
  var s = figma.createFrame();
  s.name = "Buttons";
  s.layoutMode = "VERTICAL";
  s.itemSpacing = 24;
  s.fills = [];
  s.layoutSizingHorizontal = "HUG";
  s.layoutSizingVertical = "HUG";

  s.appendChild(createSectionTitle("Buttons"));
  s.appendChild(createText("Variants", 13, "#6B7280"));

  var vRow = figma.createFrame();
  vRow.name = "Variants";
  vRow.layoutMode = "HORIZONTAL";
  vRow.itemSpacing = 16;
  vRow.fills = [];
  vRow.layoutSizingHorizontal = "HUG";
  vRow.layoutSizingVertical = "HUG";
  vRow.appendChild(buildBtn("Primary", "#4F46E5", "#FFFFFF", null, 24, 12, 8));
  vRow.appendChild(buildBtn("Secondary", "#FFFFFF", "#374151", "#D1D5DB", 24, 12, 8));
  vRow.appendChild(buildBtn("Ghost", "#EEF2FF", "#4F46E5", null, 24, 12, 8));
  vRow.appendChild(buildBtn("Danger", "#EF4444", "#FFFFFF", null, 24, 12, 8));
  s.appendChild(vRow);

  s.appendChild(createText("Sizes", 13, "#6B7280"));

  var sRow = figma.createFrame();
  sRow.name = "Sizes";
  sRow.layoutMode = "HORIZONTAL";
  sRow.itemSpacing = 16;
  sRow.counterAxisAlignItems = "CENTER";
  sRow.fills = [];
  sRow.layoutSizingHorizontal = "HUG";
  sRow.layoutSizingVertical = "HUG";
  sRow.appendChild(buildBtn("Small", "#4F46E5", "#FFFFFF", null, 16, 8, 4));
  sRow.appendChild(buildBtn("Default", "#4F46E5", "#FFFFFF", null, 24, 12, 8));
  sRow.appendChild(buildBtn("Large", "#4F46E5", "#FFFFFF", null, 32, 16, 12));
  s.appendChild(sRow);

  return s;
}

// ─── Cards ───────────────────────────────────────────────────

function buildCard(title, desc, tag, initials, author) {
  var card = figma.createFrame();
  card.name = "card-" + title.toLowerCase().replace(/\s/g, "-");
  card.layoutMode = "VERTICAL";
  card.cornerRadius = 16;
  card.fills = solidPaint("#FFFFFF");
  card.strokes = solidPaint("#E5E7EB");
  card.strokeWeight = 1;
  card.resize(320, 1);
  card.layoutSizingVertical = "HUG";
  card.clipsContent = true;

  var img = figma.createRectangle();
  img.name = "card-image";
  img.resize(320, 180);
  img.fills = [{
    type: "GRADIENT_LINEAR",
    gradientStops: [
      { position: 0, color: { r: 0.93, g: 0.95, b: 1, a: 1 } },
      { position: 1, color: { r: 0.78, g: 0.82, b: 0.99, a: 1 } },
    ],
    gradientTransform: [[0.7, 0.7, 0], [-0.7, 0.7, 0.3]],
  }];
  card.appendChild(img);

  var body = figma.createFrame();
  body.name = "card-body";
  body.layoutMode = "VERTICAL";
  body.itemSpacing = 8;
  body.paddingTop = 24; body.paddingBottom = 24;
  body.paddingLeft = 24; body.paddingRight = 24;
  body.fills = [];

  var tagF = figma.createFrame();
  tagF.name = "tag";
  tagF.layoutMode = "HORIZONTAL";
  tagF.paddingLeft = 12; tagF.paddingRight = 12;
  tagF.paddingTop = 4; tagF.paddingBottom = 4;
  tagF.cornerRadius = 9999;
  tagF.fills = solidPaint("#EEF2FF");
  tagF.layoutSizingHorizontal = "HUG";
  tagF.layoutSizingVertical = "HUG";
  tagF.appendChild(createText(tag, 12, "#4338CA"));
  body.appendChild(tagF);

  body.appendChild(createText(title, 20, "#111827"));

  var d = createText(desc, 14, "#6B7280");
  d.resize(272, 1);
  d.textAutoResize = "HEIGHT";
  body.appendChild(d);

  var cta = buildBtn("Ver detalles", "#4F46E5", "#FFFFFF", null, 16, 8, 6);
  body.appendChild(cta);

  card.appendChild(body);
  body.layoutSizingHorizontal = "FILL";
  body.layoutSizingVertical = "HUG";

  var footer = figma.createFrame();
  footer.name = "card-footer";
  footer.layoutMode = "HORIZONTAL";
  footer.primaryAxisAlignItems = "SPACE_BETWEEN";
  footer.counterAxisAlignItems = "CENTER";
  footer.paddingTop = 16; footer.paddingBottom = 16;
  footer.paddingLeft = 24; footer.paddingRight = 24;
  footer.fills = [];

  var avatarGroup = figma.createFrame();
  avatarGroup.layoutMode = "HORIZONTAL";
  avatarGroup.itemSpacing = 10;
  avatarGroup.counterAxisAlignItems = "CENTER";
  avatarGroup.fills = [];
  avatarGroup.layoutSizingHorizontal = "HUG";
  avatarGroup.layoutSizingVertical = "HUG";

  var circle = figma.createEllipse();
  circle.resize(32, 32);
  circle.fills = solidPaint("#E0E7FF");

  avatarGroup.appendChild(circle);
  avatarGroup.appendChild(createText(author, 13, "#374151"));
  footer.appendChild(avatarGroup);
  footer.appendChild(createText("Feb 2026", 12, "#9CA3AF"));

  card.appendChild(footer);
  footer.layoutSizingHorizontal = "FILL";
  footer.layoutSizingVertical = "HUG";
  return card;
}

function buildCardsSection() {
  var s = figma.createFrame();
  s.name = "Cards";
  s.layoutMode = "VERTICAL";
  s.itemSpacing = 32;
  s.fills = [];
  s.layoutSizingHorizontal = "HUG";
  s.layoutSizingVertical = "HUG";

  s.appendChild(createSectionTitle("Cards"));

  var row = figma.createFrame();
  row.name = "Cards Row";
  row.layoutMode = "HORIZONTAL";
  row.itemSpacing = 24;
  row.fills = [];
  row.layoutSizingHorizontal = "HUG";
  row.layoutSizingVertical = "HUG";

  row.appendChild(buildCard("Design Tokens", "Sistema de tokens unificado para consistencia visual.", "Design", "DS", "Design System"));
  row.appendChild(buildCard("UI Components", "Biblioteca de componentes reutilizables.", "Components", "UI", "UI Team"));
  row.appendChild(buildCard("Brand Guidelines", "Guías de marca, colores y tipografía.", "Guidelines", "BR", "Brand Team"));
  s.appendChild(row);
  return s;
}

// ─── Horizontal Cards ────────────────────────────────────────

function buildHorizontalCard(title, desc, tag, initials, author) {
  var card = figma.createFrame();
  card.name = "card-h-" + title.toLowerCase().replace(/\s/g, "-");
  card.layoutMode = "HORIZONTAL";
  card.cornerRadius = 16;
  card.fills = solidPaint("#FFFFFF");
  card.strokes = solidPaint("#E5E7EB");
  card.strokeWeight = 1;
  card.resize(640, 1);
  card.layoutSizingVertical = "HUG";
  card.clipsContent = true;

  var img = figma.createRectangle();
  img.name = "card-image";
  img.resize(240, 220);
  img.fills = [{
    type: "GRADIENT_LINEAR",
    gradientStops: [
      { position: 0, color: { r: 0.93, g: 0.95, b: 1, a: 1 } },
      { position: 1, color: { r: 0.78, g: 0.82, b: 0.99, a: 1 } },
    ],
    gradientTransform: [[0.7, 0.7, 0], [-0.7, 0.7, 0.3]],
  }];
  card.appendChild(img);

  var content = figma.createFrame();
  content.name = "card-content";
  content.layoutMode = "VERTICAL";
  content.itemSpacing = 8;
  content.paddingTop = 24; content.paddingBottom = 24;
  content.paddingLeft = 24; content.paddingRight = 24;
  content.fills = [];
  content.primaryAxisAlignItems = "CENTER";

  var tagF = figma.createFrame();
  tagF.name = "tag";
  tagF.layoutMode = "HORIZONTAL";
  tagF.paddingLeft = 12; tagF.paddingRight = 12;
  tagF.paddingTop = 4; tagF.paddingBottom = 4;
  tagF.cornerRadius = 9999;
  tagF.fills = solidPaint("#EEF2FF");
  tagF.layoutSizingHorizontal = "HUG";
  tagF.layoutSizingVertical = "HUG";
  tagF.appendChild(createText(tag, 12, "#4338CA"));
  content.appendChild(tagF);

  content.appendChild(createText(title, 20, "#111827"));

  var d = createText(desc, 14, "#6B7280");
  d.resize(340, 1);
  d.textAutoResize = "HEIGHT";
  content.appendChild(d);

  var btnRow = figma.createFrame();
  btnRow.name = "actions";
  btnRow.layoutMode = "HORIZONTAL";
  btnRow.itemSpacing = 12;
  btnRow.fills = [];
  btnRow.layoutSizingHorizontal = "HUG";
  btnRow.layoutSizingVertical = "HUG";
  btnRow.paddingTop = 8;
  btnRow.appendChild(buildBtn("Explorar", "#4F46E5", "#FFFFFF", null, 16, 8, 6));
  btnRow.appendChild(buildBtn("Docs", "#FFFFFF", "#374151", "#D1D5DB", 16, 8, 6));
  content.appendChild(btnRow);

  card.appendChild(content);
  content.layoutSizingHorizontal = "FILL";
  content.layoutSizingVertical = "HUG";

  return card;
}

function buildHorizontalCardsSection() {
  var s = figma.createFrame();
  s.name = "Horizontal Cards";
  s.layoutMode = "VERTICAL";
  s.itemSpacing = 24;
  s.fills = [];
  s.layoutSizingHorizontal = "HUG";
  s.layoutSizingVertical = "HUG";

  s.appendChild(createSectionTitle("Cards — Horizontal"));

  s.appendChild(buildHorizontalCard(
    "Sistema de Tokens",
    "Mantén consistencia visual en toda la plataforma con un sistema de tokens unificado que conecta diseño y código.",
    "Featured", "DS", "Design System"
  ));
  s.appendChild(buildHorizontalCard(
    "Componentes UI",
    "Biblioteca de componentes reutilizables con variantes, estados y accesibilidad integrada desde el inicio.",
    "New", "UI", "UI Team"
  ));

  return s;
}

// ─── Spacing ─────────────────────────────────────────────────

function buildSpacingSection() {
  var s = figma.createFrame();
  s.name = "Spacing";
  s.layoutMode = "VERTICAL";
  s.itemSpacing = 12;
  s.fills = [];
  s.layoutSizingHorizontal = "HUG";
  s.layoutSizingVertical = "HUG";

  s.appendChild(createSectionTitle("Spacing Scale"));

  for (var name of Object.keys(SPACING)) {
    var value = SPACING[name];
    var row = figma.createFrame();
    row.layoutMode = "HORIZONTAL";
    row.itemSpacing = 16;
    row.counterAxisAlignItems = "CENTER";
    row.fills = [];
    row.layoutSizingHorizontal = "HUG";
    row.layoutSizingVertical = "HUG";

    var label = createText(name, 12, "#9CA3AF");
    label.resize(100, label.height);

    var bar = figma.createRectangle();
    bar.resize(value, 12);
    bar.cornerRadius = 2;
    bar.fills = solidPaint("#818CF8");

    row.appendChild(label);
    row.appendChild(bar);
    row.appendChild(createText(value + "px", 12, "#6B7280"));
    s.appendChild(row);
  }
  return s;
}

// ─── Full Design System Builder ─────────────────────────────

async function buildFullDesignSystem() {
  await loadDefaultFont();
  ensureVariables();

  var page = figma.currentPage;

  // Clean up previous runs
  var children = page.children.slice();
  for (var i = 0; i < children.length; i++) {
    var child = children[i];
    if (child.name === "Design System" || child.name === "Frame 1") {
      child.remove();
    }
  }

  var master = figma.createFrame();
  master.name = "Design System";
  master.layoutMode = "VERTICAL";
  master.itemSpacing = 80;
  master.paddingTop = 64; master.paddingBottom = 64;
  master.paddingLeft = 64; master.paddingRight = 64;
  master.fills = solidPaint("#FFFFFF");

  // Header
  var header = figma.createFrame();
  header.name = "Header";
  header.layoutMode = "VERTICAL";
  header.itemSpacing = 16;
  header.fills = [];
  header.layoutSizingHorizontal = "HUG";
  header.layoutSizingVertical = "HUG";
  header.appendChild(createText("DESIGN SYSTEM", 12, "#4F46E5"));
  header.appendChild(createText("Design System", 36, "#111827"));
  header.appendChild(createText("Tokens, tipografia, botones y componentes.", 18, "#6B7280"));
  master.appendChild(header);

  // Divider
  var divider = figma.createRectangle();
  divider.resize(960, 1);
  divider.fills = solidPaint("#E5E7EB");
  master.appendChild(divider);

  // Sections
  master.appendChild(buildColorsSection());
  master.appendChild(buildTypographySection());
  master.appendChild(buildButtonsSection());
  master.appendChild(buildCardsSection());
  master.appendChild(buildHorizontalCardsSection());
  master.appendChild(buildSpacingSection());

  master.layoutSizingHorizontal = "HUG";
  master.layoutSizingVertical = "HUG";
  master.x = 0;
  master.y = 0;

  figma.viewport.scrollAndZoomIntoView([master]);
  return { nodeId: master.id, name: master.name };
}

// ─── Bridge Command Handlers ────────────────────────────────

function findNodeById(id) {
  return figma.getNodeById(id);
}

function getParentNode(parentId) {
  if (parentId) {
    var node = figma.getNodeById(parentId);
    if (node) return node;
  }
  return figma.currentPage;
}

function serializeNode(node) {
  var result = {
    id: node.id,
    name: node.name,
    type: node.type,
  };
  if (node.x !== undefined) result.x = node.x;
  if (node.y !== undefined) result.y = node.y;
  if (node.width !== undefined) result.width = node.width;
  if (node.height !== undefined) result.height = node.height;
  if (node.fills !== undefined) result.fills = node.fills;
  if (node.cornerRadius !== undefined) result.cornerRadius = node.cornerRadius;
  if (node.layoutMode !== undefined) result.layoutMode = node.layoutMode;
  if (node.children) result.childCount = node.children.length;
  return result;
}

function applyCommonProps(node, params) {
  if (params.name) node.name = params.name;
  if (params.x !== undefined) node.x = params.x;
  if (params.y !== undefined) node.y = params.y;
  if (params.width !== undefined && params.height !== undefined) {
    node.resize(params.width, params.height);
  }
  if (params.fills) {
    if (typeof params.fills === "string") {
      node.fills = solidPaint(params.fills);
    } else {
      node.fills = params.fills;
    }
  }
  if (params.strokes) {
    if (typeof params.strokes === "string") {
      node.strokes = solidPaint(params.strokes);
    } else {
      node.strokes = params.strokes;
    }
  }
  if (params.strokeWeight !== undefined) node.strokeWeight = params.strokeWeight;
  if (params.opacity !== undefined) node.opacity = params.opacity;
  if (params.cornerRadius !== undefined) node.cornerRadius = params.cornerRadius;
  if (params.clipsContent !== undefined) node.clipsContent = params.clipsContent;
  if (params.visible !== undefined) node.visible = params.visible;
}

function applyLayoutProps(frame, params) {
  if (params.layoutMode) frame.layoutMode = params.layoutMode;
  if (params.itemSpacing !== undefined) frame.itemSpacing = params.itemSpacing;
  if (params.paddingTop !== undefined) frame.paddingTop = params.paddingTop;
  if (params.paddingBottom !== undefined) frame.paddingBottom = params.paddingBottom;
  if (params.paddingLeft !== undefined) frame.paddingLeft = params.paddingLeft;
  if (params.paddingRight !== undefined) frame.paddingRight = params.paddingRight;
  if (params.padding !== undefined) {
    frame.paddingTop = params.padding;
    frame.paddingBottom = params.padding;
    frame.paddingLeft = params.padding;
    frame.paddingRight = params.padding;
  }
  if (params.primaryAxisAlignItems) frame.primaryAxisAlignItems = params.primaryAxisAlignItems;
  if (params.counterAxisAlignItems) frame.counterAxisAlignItems = params.counterAxisAlignItems;
  if (params.primaryAxisSizingMode) frame.primaryAxisSizingMode = params.primaryAxisSizingMode;
  if (params.counterAxisSizingMode) frame.counterAxisSizingMode = params.counterAxisSizingMode;
}

async function handleCommand(msg) {
  var action = msg.action;
  var params = msg.params || {};
  var result = null;

  switch (action) {

    case "ping": {
      result = { status: "ok", timestamp: Date.now() };
      break;
    }

    case "create_frame": {
      var frame = figma.createFrame();
      applyCommonProps(frame, params);
      applyLayoutProps(frame, params);

      var parent = getParentNode(params.parentId);
      parent.appendChild(frame);

      // layoutSizing AFTER appendChild
      if (params.layoutSizingHorizontal) frame.layoutSizingHorizontal = params.layoutSizingHorizontal;
      if (params.layoutSizingVertical) frame.layoutSizingVertical = params.layoutSizingVertical;

      result = serializeNode(frame);
      break;
    }

    case "create_rectangle": {
      var rect = figma.createRectangle();
      if (params.width && params.height) rect.resize(params.width, params.height);
      applyCommonProps(rect, params);

      var rectParent = getParentNode(params.parentId);
      rectParent.appendChild(rect);

      if (params.layoutSizingHorizontal) rect.layoutSizingHorizontal = params.layoutSizingHorizontal;
      if (params.layoutSizingVertical) rect.layoutSizingVertical = params.layoutSizingVertical;

      result = serializeNode(rect);
      break;
    }

    case "create_ellipse": {
      var ellipse = figma.createEllipse();
      if (params.width && params.height) ellipse.resize(params.width, params.height);
      applyCommonProps(ellipse, params);

      var ellipseParent = getParentNode(params.parentId);
      ellipseParent.appendChild(ellipse);

      if (params.layoutSizingHorizontal) ellipse.layoutSizingHorizontal = params.layoutSizingHorizontal;
      if (params.layoutSizingVertical) ellipse.layoutSizingVertical = params.layoutSizingVertical;

      result = serializeNode(ellipse);
      break;
    }

    case "create_text": {
      await loadDefaultFont();

      var textNode = figma.createText();
      if (DEFAULT_FONT) textNode.fontName = DEFAULT_FONT;
      textNode.characters = params.content || params.characters || "Text";
      if (params.fontSize) textNode.fontSize = params.fontSize;
      if (params.color) textNode.fills = solidPaint(params.color);
      if (params.textAlignHorizontal) textNode.textAlignHorizontal = params.textAlignHorizontal;
      if (params.textAlignVertical) textNode.textAlignVertical = params.textAlignVertical;
      if (params.textAutoResize) textNode.textAutoResize = params.textAutoResize;
      if (params.letterSpacing) textNode.letterSpacing = params.letterSpacing;
      if (params.lineHeight) textNode.lineHeight = params.lineHeight;
      if (params.textCase) textNode.textCase = params.textCase;
      if (params.name) textNode.name = params.name;
      if (params.x !== undefined) textNode.x = params.x;
      if (params.y !== undefined) textNode.y = params.y;
      if (params.width && params.height) textNode.resize(params.width, params.height);

      var textParent = getParentNode(params.parentId);
      textParent.appendChild(textNode);

      if (params.layoutSizingHorizontal) textNode.layoutSizingHorizontal = params.layoutSizingHorizontal;
      if (params.layoutSizingVertical) textNode.layoutSizingVertical = params.layoutSizingVertical;

      result = serializeNode(textNode);
      break;
    }

    case "modify_node": {
      var modNode = findNodeById(params.nodeId);
      if (!modNode) {
        return { error: "Node not found: " + params.nodeId };
      }
      applyCommonProps(modNode, params);
      if (modNode.type === "FRAME") {
        applyLayoutProps(modNode, params);
      }
      if (params.layoutSizingHorizontal) modNode.layoutSizingHorizontal = params.layoutSizingHorizontal;
      if (params.layoutSizingVertical) modNode.layoutSizingVertical = params.layoutSizingVertical;
      if (params.characters !== undefined && modNode.type === "TEXT") {
        await loadDefaultFont();
        modNode.characters = params.characters;
      }
      result = serializeNode(modNode);
      break;
    }

    case "delete_node": {
      var delNode = findNodeById(params.nodeId);
      if (!delNode) {
        return { error: "Node not found: " + params.nodeId };
      }
      var delName = delNode.name;
      delNode.remove();
      result = { deleted: true, name: delName };
      break;
    }

    case "get_node": {
      var getNode = findNodeById(params.nodeId);
      if (!getNode) {
        return { error: "Node not found: " + params.nodeId };
      }
      var nodeInfo = serializeNode(getNode);
      if (getNode.children) {
        nodeInfo.children = [];
        for (var ci = 0; ci < getNode.children.length; ci++) {
          nodeInfo.children.push(serializeNode(getNode.children[ci]));
        }
      }
      result = nodeInfo;
      break;
    }

    case "get_page_structure": {
      var page = figma.currentPage;
      var depth = params.depth || 2;

      function walkTree(node, currentDepth) {
        var info = { id: node.id, name: node.name, type: node.type };
        if (node.children && currentDepth < depth) {
          info.children = [];
          for (var wi = 0; wi < node.children.length; wi++) {
            info.children.push(walkTree(node.children[wi], currentDepth + 1));
          }
        } else if (node.children) {
          info.childCount = node.children.length;
        }
        return info;
      }

      result = walkTree(page, 0);
      break;
    }

    case "set_variable": {
      var collection = getOrCreateCollection(params.collection || "Colors");
      var modeId = collection.modes[0].modeId;
      var varType = params.type || "COLOR";
      var variable = getOrCreateVariable(params.name, collection, varType);
      var val = params.value;
      if (varType === "COLOR" && typeof val === "string") {
        val = hexToFigmaColor(val);
      }
      variable.setValueForMode(modeId, val);
      result = { variableId: variable.id, name: variable.name, collection: collection.name };
      break;
    }

    case "build_component": {
      await loadDefaultFont();
      var component = params.component;
      var built = null;

      if (component === "button" || component === "buttons") {
        built = buildButtonsSection();
      } else if (component === "card" || component === "cards") {
        built = buildCardsSection();
      } else if (component === "horizontal_card" || component === "horizontal_cards") {
        built = buildHorizontalCardsSection();
      } else if (component === "colors") {
        built = buildColorsSection();
      } else if (component === "typography") {
        built = buildTypographySection();
      } else if (component === "spacing") {
        built = buildSpacingSection();
      } else {
        return { error: "Unknown component: " + component + ". Available: button, card, horizontal_card, colors, typography, spacing" };
      }

      var compParent = getParentNode(params.parentId);
      compParent.appendChild(built);
      if (params.layoutSizingHorizontal) built.layoutSizingHorizontal = params.layoutSizingHorizontal;
      if (params.layoutSizingVertical) built.layoutSizingVertical = params.layoutSizingVertical;

      result = serializeNode(built);
      break;
    }

    case "scroll_to_node": {
      var scrollNode = findNodeById(params.nodeId);
      if (!scrollNode) {
        return { error: "Node not found: " + params.nodeId };
      }
      figma.viewport.scrollAndZoomIntoView([scrollNode]);
      result = { scrolled: true, nodeId: scrollNode.id };
      break;
    }

    case "build_design_system": {
      var dsResult = await buildFullDesignSystem();
      result = dsResult;
      break;
    }

    default: {
      return { error: "Unknown action: " + action };
    }
  }

  return { result: result };
}

// ─── Bridge Mode ────────────────────────────────────────────

function startBridge() {
  // Show UI for WebSocket access — visible so user can see channel ID
  figma.showUI(__html__, { width: 300, height: 80 });

  figma.ui.onmessage = async function(msg) {
    // Bridge connected — show channel ID
    if (msg.type === "bridge-connected") {
      figma.notify("Bridge connected! Channel: " + msg.channel, { timeout: 10000 });
      return;
    }

    // Peer events
    if (msg.type === "peer-connected") {
      figma.notify("Controller connected", { timeout: 3000 });
      return;
    }
    if (msg.type === "peer-disconnected") {
      figma.notify("Controller disconnected", { timeout: 3000 });
      return;
    }

    // WebSocket error
    if (msg.type === "ws-error") {
      figma.notify("WS Error: " + msg.message, { error: true, timeout: 5000 });
      return;
    }

    // Command from controller
    if (msg.type === "command") {
      var response;
      try {
        response = await handleCommand(msg);
      } catch (err) {
        response = { error: err.message || String(err) };
      }

      // Send response back through UI → WebSocket
      figma.ui.postMessage({
        type: "command-response",
        id: msg.id,
        result: response.result || null,
        error: response.error || null,
      });
    }
  };
}

// ─── Entry Point ────────────────────────────────────────────
// Always start in bridge mode (persistent)
startBridge();
