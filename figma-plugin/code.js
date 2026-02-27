// Design System Builder — Figma Plugin (v3 - bulletproof fonts)

function hexToRgb(hex) {
  const h = hex.replace("#", "");
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

const COLORS = {
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

const SPACING = {
  "spacing/1": 4, "spacing/2": 8, "spacing/3": 12, "spacing/4": 16,
  "spacing/5": 20, "spacing/6": 24, "spacing/8": 32, "spacing/10": 40,
  "spacing/12": 48, "spacing/16": 64,
};

const RADII = {
  "radius/sm": 4, "radius/md": 8, "radius/lg": 12, "radius/xl": 16, "radius/full": 9999,
};

const FONT_SIZES = {
  "fontSize/xs": 12, "fontSize/sm": 14, "fontSize/base": 16, "fontSize/lg": 18,
  "fontSize/xl": 20, "fontSize/2xl": 24, "fontSize/3xl": 30, "fontSize/4xl": 36,
};

// ─── Variables ───────────────────────────────────────────────

function getOrCreateCollection(name) {
  const existing = figma.variables.getLocalVariableCollections().find(c => c.name === name);
  if (existing) return existing;
  return figma.variables.createVariableCollection(name);
}

function getOrCreateVariable(name, collection, type) {
  const existing = figma.variables.getLocalVariables(type)
    .find(v => v.name === name && v.variableCollectionId === collection.id);
  if (existing) return existing;
  return figma.variables.createVariable(name, collection, type);
}

function ensureVariables() {
  const colorsCol = getOrCreateCollection("Colors");
  const cMode = colorsCol.modes[0].modeId;
  for (const [name, hex] of Object.entries(COLORS)) {
    getOrCreateVariable(name, colorsCol, "COLOR").setValueForMode(cMode, hexToFigmaColor(hex));
  }

  const spacingCol = getOrCreateCollection("Spacing");
  const sMode = spacingCol.modes[0].modeId;
  for (const [name, val] of Object.entries(SPACING)) {
    getOrCreateVariable(name, spacingCol, "FLOAT").setValueForMode(sMode, val);
  }

  const radiiCol = getOrCreateCollection("Radii");
  const rMode = radiiCol.modes[0].modeId;
  for (const [name, val] of Object.entries(RADII)) {
    getOrCreateVariable(name, radiiCol, "FLOAT").setValueForMode(rMode, val);
  }

  const typoCol = getOrCreateCollection("Typography");
  const tMode = typoCol.modes[0].modeId;
  for (const [name, val] of Object.entries(FONT_SIZES)) {
    getOrCreateVariable(name, typoCol, "FLOAT").setValueForMode(tMode, val);
  }
}

// ─── Text helper using ONLY the default font ────────────────

let DEFAULT_FONT = null;

function createText(content, size, color) {
  const node = figma.createText();
  if (DEFAULT_FONT) node.fontName = DEFAULT_FONT;
  node.characters = content;
  node.fontSize = size;
  node.fills = solidPaint(color);
  return node;
}

function createSectionTitle(text) {
  const t = createText(text, 12, "#4F46E5");
  t.letterSpacing = { value: 10, unit: "PERCENT" };
  t.textCase = "UPPER";
  return t;
}

// ─── Color Swatches ──────────────────────────────────────────

function buildColorSwatch(name, hex) {
  const frame = figma.createFrame();
  frame.name = name;
  frame.layoutMode = "VERTICAL";
  frame.counterAxisAlignItems = "CENTER";
  frame.itemSpacing = 8;
  frame.fills = [];
  frame.layoutSizingHorizontal = "HUG";
  frame.layoutSizingVertical = "HUG";

  const swatch = figma.createRectangle();
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
  const row = figma.createFrame();
  row.name = title;
  row.layoutMode = "HORIZONTAL";
  row.itemSpacing = 16;
  row.fills = [];
  row.layoutSizingHorizontal = "HUG";
  row.layoutSizingVertical = "HUG";

  for (const [name, hex] of Object.entries(subset)) {
    row.appendChild(buildColorSwatch(name, hex));
  }
  return row;
}

function buildColorsSection() {
  const s = figma.createFrame();
  s.name = "Colors";
  s.layoutMode = "VERTICAL";
  s.itemSpacing = 32;
  s.fills = [];
  s.layoutSizingHorizontal = "HUG";
  s.layoutSizingVertical = "HUG";

  const groups = { "Primary": "primary/", "Neutral": "neutral/", "Semantic": "semantic/" };
  for (const [label, prefix] of Object.entries(groups)) {
    s.appendChild(createSectionTitle("Colors — " + label));
    const subset = {};
    for (const [k, v] of Object.entries(COLORS)) {
      if (k.startsWith(prefix)) subset[k] = v;
    }
    s.appendChild(buildColorRow(label, subset));
  }
  return s;
}

// ─── Typography ──────────────────────────────────────────────

function buildTypographySection() {
  const s = figma.createFrame();
  s.name = "Typography";
  s.layoutMode = "VERTICAL";
  s.itemSpacing = 24;
  s.fills = [];
  s.layoutSizingHorizontal = "HUG";
  s.layoutSizingVertical = "HUG";

  s.appendChild(createSectionTitle("Typography"));

  const styles = [
    { label: "Heading 1 — 36px Bold", size: 36 },
    { label: "Heading 2 — 30px Bold", size: 30 },
    { label: "Heading 3 — 24px Semibold", size: 24 },
    { label: "Heading 4 — 20px Semibold", size: 20 },
    { label: "Body Large — 18px Regular", size: 18 },
    { label: "Body Base — 16px Regular", size: 16 },
    { label: "Body Small — 14px Regular", size: 14 },
    { label: "Caption — 12px Medium", size: 12 },
  ];

  for (const st of styles) {
    const row = figma.createFrame();
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
  const btn = figma.createFrame();
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
  const s = figma.createFrame();
  s.name = "Buttons";
  s.layoutMode = "VERTICAL";
  s.itemSpacing = 24;
  s.fills = [];
  s.layoutSizingHorizontal = "HUG";
  s.layoutSizingVertical = "HUG";

  s.appendChild(createSectionTitle("Buttons"));
  s.appendChild(createText("Variants", 13, "#6B7280"));

  const vRow = figma.createFrame();
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

  const sRow = figma.createFrame();
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
  const card = figma.createFrame();
  card.name = "card-" + title.toLowerCase().replace(/\s/g, "-");
  card.layoutMode = "VERTICAL";
  card.cornerRadius = 16;
  card.fills = solidPaint("#FFFFFF");
  card.strokes = solidPaint("#E5E7EB");
  card.strokeWeight = 1;
  card.resize(320, 1);
  card.layoutSizingVertical = "HUG";
  card.clipsContent = true;

  // Image
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

  // Body
  var body = figma.createFrame();
  body.name = "card-body";
  body.layoutMode = "VERTICAL";
  body.itemSpacing = 8;
  body.paddingTop = 24; body.paddingBottom = 24;
  body.paddingLeft = 24; body.paddingRight = 24;
  body.fills = [];

  // Tag
  const tagF = figma.createFrame();
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

  const d = createText(desc, 14, "#6B7280");
  d.resize(272, 1);
  d.textAutoResize = "HEIGHT";
  body.appendChild(d);

  // CTA
  const cta = buildBtn("Ver detalles", "#4F46E5", "#FFFFFF", null, 16, 8, 6);
  body.appendChild(cta);

  card.appendChild(body);
  body.layoutSizingHorizontal = "FILL";
  body.layoutSizingVertical = "HUG";

  // Footer
  var footer = figma.createFrame();
  footer.name = "card-footer";
  footer.layoutMode = "HORIZONTAL";
  footer.primaryAxisAlignItems = "SPACE_BETWEEN";
  footer.counterAxisAlignItems = "CENTER";
  footer.paddingTop = 16; footer.paddingBottom = 16;
  footer.paddingLeft = 24; footer.paddingRight = 24;
  footer.fills = [];

  const avatarGroup = figma.createFrame();
  avatarGroup.layoutMode = "HORIZONTAL";
  avatarGroup.itemSpacing = 10;
  avatarGroup.counterAxisAlignItems = "CENTER";
  avatarGroup.fills = [];
  avatarGroup.layoutSizingHorizontal = "HUG";
  avatarGroup.layoutSizingVertical = "HUG";

  const circle = figma.createEllipse();
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
  const s = figma.createFrame();
  s.name = "Cards";
  s.layoutMode = "VERTICAL";
  s.itemSpacing = 32;
  s.fills = [];
  s.layoutSizingHorizontal = "HUG";
  s.layoutSizingVertical = "HUG";

  s.appendChild(createSectionTitle("Cards"));

  const row = figma.createFrame();
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

  // Image (left side)
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

  // Right side content
  var content = figma.createFrame();
  content.name = "card-content";
  content.layoutMode = "VERTICAL";
  content.itemSpacing = 8;
  content.paddingTop = 24; content.paddingBottom = 24;
  content.paddingLeft = 24; content.paddingRight = 24;
  content.fills = [];
  content.primaryAxisAlignItems = "CENTER";

  // Tag
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

  // Buttons
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
  const s = figma.createFrame();
  s.name = "Spacing";
  s.layoutMode = "VERTICAL";
  s.itemSpacing = 12;
  s.fills = [];
  s.layoutSizingHorizontal = "HUG";
  s.layoutSizingVertical = "HUG";

  s.appendChild(createSectionTitle("Spacing Scale"));

  for (const [name, value] of Object.entries(SPACING)) {
    const row = figma.createFrame();
    row.layoutMode = "HORIZONTAL";
    row.itemSpacing = 16;
    row.counterAxisAlignItems = "CENTER";
    row.fills = [];
    row.layoutSizingHorizontal = "HUG";
    row.layoutSizingVertical = "HUG";

    const label = createText(name, 12, "#9CA3AF");
    label.resize(100, label.height);

    const bar = figma.createRectangle();
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

// ─── Main ────────────────────────────────────────────────────

async function main() {
  try {
    // Load ONLY the default font — guaranteed to work
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

  try {
    // Phase 1: Variables
    ensureVariables();

    // Phase 2: Visual components
    const page = figma.currentPage;

    // Clean up previous runs
    var children = page.children.slice();
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      if (child.name === "Design System" || child.name === "Frame 1") {
        child.remove();
      }
    }

    const master = figma.createFrame();
    master.name = "Design System";
    master.layoutMode = "VERTICAL";
    master.itemSpacing = 80;
    master.paddingTop = 64; master.paddingBottom = 64;
    master.paddingLeft = 64; master.paddingRight = 64;
    master.fills = solidPaint("#FFFFFF");

    // Header
    const header = figma.createFrame();
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
    const divider = figma.createRectangle();
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
    figma.notify("Done! Design System: 48 variables + componentes visuales");
  } catch (err) {
    figma.notify("Error: " + err.message, { error: true });
  }

  figma.closePlugin();
}

main();
