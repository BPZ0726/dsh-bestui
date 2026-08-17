/**
 * dsh-bestui — portable runtime core.
 *
 * This file is import-free ESM on purpose: the same source is inlined verbatim
 * into BOTH generated bundles (scripts/build.mjs):
 *   - dist/client.js        — pre-built static bundle served by the host
 *     (window.__ModuleLoader__.load CJS factory form, `require("react")`
 *     resolves through the shell's module seed table);
 *   - dist/dynamic-client.js — the browser half of a dynamic Cordis package
 *     (async function body; `React`, `styles` and `console` arrive as closure
 *     symbols, imports are impossible there).
 *
 * Everything browser-global is feature-detected so the module can also be
 * imported and unit-tested under Node.
 *
 * Theme contract (dsh-client-ui-theme): we register NO third-party theme id.
 * Instead we stack a token-override layer via `theme.overrideTokens(source,
 * { "--dsw-alias-…": { light, dark } })` — the layer composes over whichever
 * theme is active (light / dark / system / any other third-party theme), and
 * unloading the plugin restores the stock look automatically. This is the
 * compatibility core of the plugin.
 */

export const STORAGE_KEY = "dsh-wallpaper-theme/v1";

/** Base64 data-url length above which uploads are re-compressed. */
export const MAX_STORED_CHARS = 3_000_000;

/** Token ids use the real CSS variable names so overrideTokens needs no alias table. */
export const TOKEN_DEFS = [
  { id: "--dsw-alias-bg-base",            zh: "背景基底",       en: "Base background",      kind: "surface" },
  { id: "--dsw-alias-bg-layer-1",         zh: "第一层表面",     en: "Layer 1 surface",      kind: "surface" },
  { id: "--dsw-alias-bg-layer-2",         zh: "第二层表面",     en: "Layer 2 surface",      kind: "surface" },
  { id: "--dsw-alias-bg-layer-3",         zh: "第三层表面（含菜单）", en: "Layer 3 surface (menus)", kind: "surface" },
  { id: "--dsw-alias-bg-overlay",         zh: "浮层 / 弹窗",    en: "Overlays & popovers",  kind: "surface" },
  { id: "--dsw-specific-sidebar-fill",    zh: "侧边栏",         en: "Sidebar",              kind: "surface" },
  { id: "--dsw-alias-border-l1",          zh: "淡边框",         en: "Border (subtle)",      kind: "border" },
  { id: "--dsw-alias-border-l2",          zh: "常规边框",       en: "Border (regular)",     kind: "border" },
  { id: "--dsw-alias-brand-primary",      zh: "品牌主色",       en: "Brand primary",        kind: "plain" },
  { id: "--dsw-alias-label-primary",      zh: "主文字",         en: "Primary text",         kind: "plain" },
  { id: "--dsw-alias-label-secondary",    zh: "次文字",         en: "Secondary text",       kind: "plain" },
  { id: "--dsw-alias-state-error-primary",   zh: "错误色",      en: "Error",                kind: "plain" },
  { id: "--dsw-alias-state-success-primary", zh: "成功色",      en: "Success",              kind: "plain" },
  { id: "--dsw-alias-state-warn-primary",    zh: "警告色",      en: "Warning",              kind: "plain" },
];

export const SURFACE_IDS = TOKEN_DEFS.filter((def) => def.kind === "surface").map((def) => def.id);
export const BORDER_IDS = TOKEN_DEFS.filter((def) => def.kind === "border").map((def) => def.id);
export const ALL_TOKEN_IDS = TOKEN_DEFS.map((def) => def.id);

/**
 * Surfaces whose translucency has no visible effect in the product UI (the
 * wallpaper never shows through them). Their opacity rows are removed from the
 * settings and their alpha is pinned opaque; their COLORS stay customizable
 * because the light/dark palettes still reference those tokens.
 */
export const PINNED_OPAQUE_SURFACES = new Set([
  "--dsw-alias-bg-layer-1",
  "--dsw-alias-bg-layer-3",
  "--dsw-alias-bg-overlay",
]);

/** The surfaces that actually expose a usable opacity setting. */
export const OPACITY_IDS = SURFACE_IDS.filter((id) => !PINNED_OPAQUE_SURFACES.has(id));

/**
 * Extra element colors that exist only as CSS variables in the shell (not in
 * the overridable theme token registry). They are applied through a dedicated
 * style tag with `body` (light) and `body[data-ds-dark-theme]` (dark) blocks,
 * so scheme switching keeps working. Values accept any CSS color, e.g. rgba().
 *
 * Only tokens the shell actually consumes are listed: dead palette entries
 * (interactive-bg-hover-accent, toast-bg, bg-skeleton) were removed so every
 * row below visibly changes something.
 */
export const EXTRA_DEFS = [
  { id: "--dsw-alias-interactive-bg-hover",         zh: "悬停背景",         en: "Hover background",          light: "rgba(38, 49, 72, .06)",   dark: "rgba(255, 255, 255, .08)" },
  { id: "--dsw-alias-interactive-bg-active",        zh: "选中与按下背景",   en: "Selected & pressed background", light: "rgba(38, 49, 72, .1)", dark: "rgba(255, 255, 255, .14)" },
  { id: "--dsw-alias-interactive-bg-hover-danger",  zh: "危险悬停背景",     en: "Danger hover background",    light: "rgba(236, 19, 19, .05)",  dark: "rgba(242, 90, 90, .15)" },
  { id: "--dsw-alias-label-primary-inverted",       zh: "反色文字与图标",   en: "Inverted text & icons",     light: "#FFFFFF",                  dark: "#353638" },
  { id: "--dsw-alias-label-tertiary",               zh: "三级文字",         en: "Tertiary text",             light: "#81858C",                  dark: "#ADB2B8" },
  { id: "--dsw-alias-border-l3",                    zh: "强边框",           en: "Strong border",             light: "rgba(0, 0, 0, .12)",      dark: "rgba(255, 255, 255, .16)" },
  { id: "--dsw-alias-scrollbar-bg-l1",              zh: "滚动条滑块",       en: "Scrollbar thumb",           light: "#E5E5E5",                  dark: "#3C3C3D" },
  { id: "--dsw-alias-scrollbar-hover-l1",           zh: "滚动条滑块悬停",   en: "Scrollbar thumb hover",     light: "#D4D4D4",                  dark: "#545557" },
  { id: "--dsw-alias-tooltip-bg",                   zh: "提示气泡背景",     en: "Tooltip bubble",            light: "#2C2C2E",                  dark: "#43454A" },
];

/** Fresh default { light, dark } pairs for every extra color. */
function defaultExtraColors() {
  return Object.fromEntries(EXTRA_DEFS.map((def) => [def.id, { light: def.light, dark: def.dark }]));
}

/** Split a stored CSS color into a #RRGGBB picker value plus its alpha. */
export function cssToPicker(value) {
  const s = String(value || "").trim();
  const expand = (short) => short.split("").map((ch) => ch + ch).join("");
  let m = /^#([0-9a-fA-F]{3})$/.exec(s);
  if (m) return { color: `#${expand(m[1]).toUpperCase()}`, alpha: 1 };
  m = /^#([0-9a-fA-F]{4})$/.exec(s);
  if (m) {
    return {
      color: `#${expand(m[1].slice(0, 3)).toUpperCase()}`,
      alpha: Math.round((parseInt(expand(m[1][3]), 16) / 255) * 100) / 100,
    };
  }
  m = /^#([0-9a-fA-F]{6})$/.exec(s);
  if (m) return { color: s.toUpperCase(), alpha: 1 };
  m = /^#([0-9a-fA-F]{8})$/.exec(s);
  if (m) {
    return {
      color: `#${m[1].slice(0, 6).toUpperCase()}`,
      alpha: Math.round((parseInt(m[1].slice(6, 8), 16) / 255) * 100) / 100,
    };
  }
  m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/.exec(s);
  if (m) {
    return {
      color: rgbToHexString(Number(m[1]), Number(m[2]), Number(m[3])).toUpperCase(),
      alpha: m[4] === undefined ? 1 : clamp01(parseFloat(m[4])),
    };
  }
  return { color: "#000000", alpha: 1 };
}

/** Compose a stored CSS color from a #RRGGBB picker value and an alpha. */
export function pickerToCss(color, alpha) {
  if (typeof color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(color)) return null;
  const a = typeof alpha === "number" && isFinite(alpha) ? clamp01(alpha) : 1;
  if (a >= 0.999) return color;
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.round(a * 1000) / 1000})`;
}

/** Border tokens render as a translucent tint; per-scheme alphas mirror the shell's design-platform.css. */
export const BORDER_ALPHA = {
  "--dsw-alias-border-l1": { light: 0.04, dark: 0.06 },
  "--dsw-alias-border-l2": { light: 0.1,  dark: 0.12 },
};

/** Suggested surface opacities applied once when a wallpaper is first enabled. */
export const WALLPAPER_OPACITIES = {
  "--dsw-alias-bg-base": 0.35,
  "--dsw-alias-bg-layer-2": 0.7,
  "--dsw-specific-sidebar-fill": 0.55,
};

/**
 * Stock palette: the shell's own defaults from design-platform.css
 * (`body` light block + `body[data-ds-dark-theme]` dark block). With these
 * values the override layer is pixel-identical to the built-in look, so
 * "Default colors" genuinely restores the product appearance.
 */
export const NEUTRAL_PAIRS = {
  "--dsw-alias-bg-base": { light: "#FFFFFF", dark: "#151517" },
  "--dsw-alias-bg-layer-1": { light: "#FFFFFF", dark: "#232324" },
  "--dsw-alias-bg-layer-2": { light: "#FFFFFF", dark: "#2C2C2E" },
  "--dsw-alias-bg-layer-3": { light: "#FFFFFF", dark: "#353638" },
  "--dsw-alias-bg-overlay": { light: "#E9ECF2", dark: "#61666B" },
  "--dsw-specific-sidebar-fill": { light: "#F9FAFB", dark: "#1B1B1C" },
  "--dsw-alias-border-l1": { light: "#000000", dark: "#FFFFFF" },
  "--dsw-alias-border-l2": { light: "#000000", dark: "#FFFFFF" },
  "--dsw-alias-brand-primary": { light: "#0F1115", dark: "#F9FAFB" },
  "--dsw-alias-label-primary": { light: "#0F1115", dark: "#F9FAFB" },
  "--dsw-alias-label-secondary": { light: "#61666B", dark: "#CFD3D6" },
  "--dsw-alias-state-error-primary": { light: "#EC1313", dark: "#F25A5A" },
  "--dsw-alias-state-success-primary": { light: "#22C55E", dark: "#22C55E" },
  "--dsw-alias-state-warn-primary": { light: "#F59E0B", dark: "#F59E0B" },
};

export const DEFAULT_IMAGE_STYLE = Object.freeze({
  fit: "cover",
  position: "center",
  blur: 0,
  dim: 0,
});

// ---------------------------------------------------------------------------
// color math (hand-rolled — no deps, works in every modern browser)
// ---------------------------------------------------------------------------

export function clamp01(value) {
  const n = Number(value);
  if (!isFinite(n)) return 0;
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

export function isHex(value) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

export function hexToRgb(hex) {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(String(hex).trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHexString(r, g, b) {
  const c = (v) => Math.round(clamp01(v / 255) * 255).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function rgbToHsl(r, g, b) {
  const rn = clamp01(r / 255), gn = clamp01(g / 255), bn = clamp01(b / 255);
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return { h: (h * 60) % 360, s, l };
}

export function hslToRgb(h, s, l) {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp01(s), lig = clamp01(l);
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lig - c / 2;
  let rgb;
  if (hue < 60) rgb = [c, x, 0];
  else if (hue < 120) rgb = [x, c, 0];
  else if (hue < 180) rgb = [0, c, x];
  else if (hue < 240) rgb = [0, x, c];
  else if (hue < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return {
    r: Math.round((rgb[0] + m) * 255),
    g: Math.round((rgb[1] + m) * 255),
    b: Math.round((rgb[2] + m) * 255),
  };
}

export function hslHex(h, s, l) {
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHexString(r, g, b);
}

export function rgbaFromHex(hex, alpha) {
  const rgb = hexToRgb(hex) || { r: 0, g: 0, b: 0 };
  const a = clamp01(alpha);
  const rounded = Math.round(a * 1000) / 1000;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${rounded})`;
}

/** WCAG relative luminance, 0..1. */
export function relativeLuminance(r, g, b) {
  const f = (v) => {
    const c = clamp01(v / 255);
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrastRatio(hexA, hexB) {
  const a = hexToRgb(hexA), b = hexToRgb(hexB);
  if (!a || !b) return Infinity;
  const la = relativeLuminance(a.r, a.g, a.b);
  const lb = relativeLuminance(b.r, b.g, b.b);
  const hi = Math.max(la, lb), lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

// ---------------------------------------------------------------------------
// state shape + persistence
// ---------------------------------------------------------------------------

export function defaultState() {
  return {
    version: 1,
    enabled: false,
    mode: "auto",          // "auto" | "custom"
    followScheme: true,    // after an image upload, switch light/dark by its luminance
    image: null,           // { dataUrl, name } | null
    imageStyle: { ...DEFAULT_IMAGE_STYLE },
    tintStrength: 0.5,     // 0..1: how strongly surfaces pick up the theme tint
    tintStrengthDefault: true,
    fontFamily: "default", // "default" | "sans" | "serif" | "mono" | "rounded"
    // Font & interface settings use an explicit "follow default" flag per row;
    // the checkbox in the UI mirrors it. While a flag is true the value is
    // stored but NOT injected, so the product's own look stays untouched.
    fontScale: 1,          // 0.75..1.5 whole-UI zoom (html { zoom })
    fontScaleDefault: true,
    fontWeight: 400,       // 300..800; 400 leaves the shell's weight untouched
    fontWeightDefault: true,
    fontSize: 1,           // 0.75..1.5 text-only scale (per-element font-size)
    fontSizeDefault: true,
    fontHue: 0,            // 0..360 hue rotation for text colors
    fontHueDefault: true,
    buttonRadius: 8,       // 0..24; 0 = sharp corners
    buttonRadiusDefault: true,
    inputRadius: 8,        // 0..24; 0 = sharp corners
    inputRadiusDefault: true,
    cardRadius: 8,         // 0..24; 0 = sharp corners
    cardRadiusDefault: true,
    dialogRadius: 12,      // 0..40; 0 = sharp corners
    dialogRadiusDefault: true,
    dialogWidth: 480,      // px width for dialogs
    dialogWidthDefault: true,
    dialogHeight: 640,     // px height for dialogs
    dialogHeightDefault: true,
    extraColors: defaultExtraColors(),
    opacities: Object.fromEntries(OPACITY_IDS.map((id) => [id, 1])),
    opacitiesDefault: Object.fromEntries(OPACITY_IDS.map((id) => [id, true])),
    colors: Object.fromEntries(ALL_TOKEN_IDS.map((id) => [id, { ...NEUTRAL_PAIRS[id] }])),
  };
}

function clonePairs() {
  return Object.fromEntries(ALL_TOKEN_IDS.map((id) => [id, { ...NEUTRAL_PAIRS[id] }]));
}

/**
 * The pre-stock-palette defaults (the old "neutral" palette). States persisted
 * before the stock alignment still hold these values for untouched colors;
 * normalizeState migrates exactly-matching pairs to the new stock palette so
 * legacy users follow the built-in look, while genuinely customized pairs
 * (differing from BOTH palettes) are kept as user choices.
 */
const LEGACY_NEUTRAL_PAIRS = {
  "--dsw-alias-bg-base": { light: "#F9FAFB", dark: "#151517" },
  "--dsw-alias-bg-layer-1": { light: "#FFFFFF", dark: "#232325" },
  "--dsw-alias-bg-layer-2": { light: "#F5F6F7", dark: "#2C2C2E" },
  "--dsw-alias-bg-layer-3": { light: "#FFFFFF", dark: "#353537" },
  "--dsw-alias-bg-overlay": { light: "#E9ECF2", dark: "#434346" },
  "--dsw-specific-sidebar-fill": { light: "#F9FAFB", dark: "#1B1B1D" },
  "--dsw-alias-border-l1": { light: "#000000", dark: "#FFFFFF" },
  "--dsw-alias-border-l2": { light: "#000000", dark: "#FFFFFF" },
  "--dsw-alias-brand-primary": { light: "#4176E6", dark: "#6B9EFF" },
  "--dsw-alias-label-primary": { light: "#0F1115", dark: "#F9FAFB" },
  "--dsw-alias-label-secondary": { light: "#61656B", dark: "#CFD3D6" },
  "--dsw-alias-state-error-primary": { light: "#EC1313", dark: "#F25A5A" },
  "--dsw-alias-state-success-primary": { light: "#22C55E", dark: "#4ED17E" },
  "--dsw-alias-state-warn-primary": { light: "#F5A20B", dark: "#F7AD31" },
};

export function normalizeState(input) {
  const base = defaultState();
  if (!input || typeof input !== "object") return base;
  const out = base;
  out.version = 1;
  out.enabled = input.enabled === true;
  out.mode = input.mode === "custom" ? "custom" : "auto";
  out.followScheme = input.followScheme !== false;
  out.tintStrength = clamp01(typeof input.tintStrength === "number" ? input.tintStrength : 0.5);
  out.fontFamily = ["default", "sans", "serif", "mono", "rounded"].includes(input.fontFamily) ? input.fontFamily : "default";
  // Explicit default flags win when stored; otherwise derive them from the
  // legacy values (null/0/1/400 mean "untouched, follow the product").
  const flagOf = (flag, legacy, sentinel) =>
    typeof flag === "boolean" ? flag : legacy === undefined || legacy === null || legacy === sentinel;
  out.tintStrengthDefault = flagOf(input.tintStrengthDefault, input.tintStrength, 0.5);
  out.fontWeight = typeof input.fontWeight === "number" && isFinite(input.fontWeight) ? Math.min(800, Math.max(300, Math.round(input.fontWeight))) : 400;
  out.fontWeightDefault = flagOf(input.fontWeightDefault, input.fontWeight, 400);
  out.fontScale = typeof input.fontScale === "number" && isFinite(input.fontScale) ? Math.min(1.5, Math.max(0.75, input.fontScale)) : 1;
  out.fontScaleDefault = flagOf(input.fontScaleDefault, input.fontScale, 1);
  out.fontSize = typeof input.fontSize === "number" && isFinite(input.fontSize) ? Math.min(1.5, Math.max(0.75, input.fontSize)) : 1;
  out.fontSizeDefault = flagOf(input.fontSizeDefault, input.fontSize, 1);
  out.fontHue = typeof input.fontHue === "number" && isFinite(input.fontHue) ? ((input.fontHue % 360) + 360) % 360 : 0;
  out.fontHueDefault = flagOf(input.fontHueDefault, input.fontHue, 0);
  // Radius: legacy null = untouched (value shows 8/12 as a starting point),
  // legacy 0 stays a real 0 = sharp, any other number is a custom radius.
  const legacyRadius = (v, min, max, start) => {
    if (v === null || v === undefined || typeof v !== "number" || !isFinite(v)) return start;
    return Math.min(max, Math.max(min, Math.round(v)));
  };
  out.buttonRadius = legacyRadius(input.buttonRadius, 0, 24, 8);
  out.buttonRadiusDefault = flagOf(input.buttonRadiusDefault, input.buttonRadius, null);
  out.inputRadius = legacyRadius(input.inputRadius, 0, 24, 8);
  out.inputRadiusDefault = flagOf(input.inputRadiusDefault, input.inputRadius, null);
  out.cardRadius = legacyRadius(input.cardRadius, 0, 24, 8);
  out.cardRadiusDefault = flagOf(input.cardRadiusDefault, input.cardRadius, null);
  out.dialogRadius = legacyRadius(input.dialogRadius, 0, 40, 12);
  out.dialogRadiusDefault = flagOf(input.dialogRadiusDefault, input.dialogRadius, null);
  // Window size: legacy 0 = follow default (value shows the 480/640 start).
  out.dialogWidth = typeof input.dialogWidth === "number" && isFinite(input.dialogWidth) && input.dialogWidth > 0
    ? Math.min(1400, Math.round(input.dialogWidth))
    : 480;
  out.dialogWidthDefault = flagOf(input.dialogWidthDefault, input.dialogWidth, 0);
  out.dialogHeight = typeof input.dialogHeight === "number" && isFinite(input.dialogHeight) && input.dialogHeight > 0
    ? Math.min(1600, Math.round(input.dialogHeight))
    : 640;
  out.dialogHeightDefault = flagOf(input.dialogHeightDefault, input.dialogHeight, 0);
  if (input.extraColors && typeof input.extraColors === "object") {
    for (const def of EXTRA_DEFS) {
      const pair = input.extraColors[def.id];
      if (pair && typeof pair === "object") {
        for (const scheme of ["light", "dark"]) {
          const v = pair[scheme];
          if (typeof v === "string" && v.length >= 3 && v.length <= 64 && /^(#|rgb)/i.test(v.trim())) {
            out.extraColors[def.id][scheme] = v.trim();
          }
        }
      }
    }
  }
  if (input.image && typeof input.image === "object" && typeof input.image.dataUrl === "string" && /^data:image\//i.test(input.image.dataUrl)) {
    out.image = {
      dataUrl: input.image.dataUrl,
      name: typeof input.image.name === "string" ? input.image.name : "",
    };
  }
  if (input.imageStyle && typeof input.imageStyle === "object") {
    const st = out.imageStyle;
    if (["cover", "contain", "fill", "none"].includes(input.imageStyle.fit)) st.fit = input.imageStyle.fit;
    if (["center", "top", "bottom", "left", "right"].includes(input.imageStyle.position)) st.position = input.imageStyle.position;
    if (typeof input.imageStyle.blur === "number" && isFinite(input.imageStyle.blur)) st.blur = Math.max(0, Math.min(60, input.imageStyle.blur));
    if (typeof input.imageStyle.dim === "number" && isFinite(input.imageStyle.dim)) st.dim = clamp01(input.imageStyle.dim);
  }
  if (input.opacities && typeof input.opacities === "object") {
    for (const id of OPACITY_IDS) {
      const v = input.opacities[id];
      if (typeof v === "number" && isFinite(v)) out.opacities[id] = clamp01(v);
    }
  }
  // Legacy states had no explicit flags: an untouched opacity was exactly 1.
  // Explicit per-surface flags win when the stored state already has them.
  const explicitOpacityDefaults = input.opacitiesDefault && typeof input.opacitiesDefault === "object" ? input.opacitiesDefault : null;
  for (const id of OPACITY_IDS) {
    const legacy = input.opacities && typeof input.opacities === "object" ? input.opacities[id] : undefined;
    out.opacitiesDefault[id] = explicitOpacityDefaults !== null && typeof explicitOpacityDefaults[id] === "boolean"
      ? explicitOpacityDefaults[id]
      : flagOf(undefined, legacy, 1);
  }
  if (input.colors && typeof input.colors === "object") {
    for (const id of ALL_TOKEN_IDS) {
      const pair = input.colors[id];
      if (pair && typeof pair === "object") {
        if (isHex(pair.light)) out.colors[id].light = pair.light.toUpperCase();
        if (isHex(pair.dark)) out.colors[id].dark = pair.dark.toUpperCase();
      }
    }
  }
  // Pairs still holding the previous built-in defaults migrate to the stock
  // palette; pairs differing from both palettes are preserved as choices.
  for (const id of ALL_TOKEN_IDS) {
    const legacy = LEGACY_NEUTRAL_PAIRS[id];
    const pair = out.colors[id];
    if (legacy && pair && pair.light === legacy.light && pair.dark === legacy.dark) {
      out.colors[id] = { ...NEUTRAL_PAIRS[id] };
    }
  }
  return out;
}

export function loadState() {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    return normalizeState(JSON.parse(raw));
  } catch {
    return null;
  }
}

function persistState(state) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // quota / private mode — stay in-memory only
  }
}

export function createStore(initial) {
  let state = initial;
  const listeners = new Set();
  return {
    get() {
      return state;
    },
    set(patch) {
      const next = typeof patch === "function" ? patch(state) : { ...state, ...patch };
      if (next === state) return;
      state = next;
      persistState(state);
      for (const fn of [...listeners]) {
        try {
          fn(state);
        } catch {
          // a broken subscriber must not break the store
        }
      }
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
  };
}

// ---------------------------------------------------------------------------
// image sampling (canvas; feature-detected)
// ---------------------------------------------------------------------------

/** Sample an image to a small palette digest. Resolves null on any failure. */
export function sampleImageDataUrl(dataUrl) {
  return new Promise((resolve) => {
    if (typeof Image === "undefined" || typeof document === "undefined") return resolve(null);
    let img;
    try {
      img = new Image();
    } catch {
      return resolve(null);
    }
    img.onload = () => {
      try {
        resolve(sampleFromImage(img));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

export function sampleFromImage(img) {
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvas 2d context unavailable");
  ctx.drawImage(img, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;

  const buckets = new Map();
  let sumR = 0, sumG = 0, sumB = 0, count = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 128) continue;
    const r = data[i] >> 4, g = data[i + 1] >> 4, b = data[i + 2] >> 4;
    const key = (r << 8) | (g << 4) | b;
    buckets.set(key, (buckets.get(key) || 0) + 1);
    sumR += data[i];
    sumG += data[i + 1];
    sumB += data[i + 2];
    count += 1;
  }
  if (count === 0) throw new Error("image has no opaque pixels");

  const clusters = [...buckets.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([key, weight]) => {
      const r = ((key >> 8) & 15) * 17 + 8;
      const g = ((key >> 4) & 15) * 17 + 8;
      const b = (key & 15) * 17 + 8;
      const { h, s, l } = rgbToHsl(r, g, b);
      return { hex: rgbToHexString(r, g, b), r, g, b, weight: weight / count, h, s, l };
    });

  const dominant = clusters[0];
  const average = { r: sumR / count, g: sumG / count, b: sumB / count };
  const avgHsl = rgbToHsl(average.r, average.g, average.b);

  let saturated = dominant;
  let bestSat = -1;
  for (const c of clusters) {
    if (c.s > bestSat) {
      bestSat = c.s;
      saturated = c;
    }
  }

  return {
    dominant: dominant.hex,
    average: rgbToHexString(average.r, average.g, average.b),
    clusters: clusters.map((c) => ({ hex: c.hex, weight: c.weight })),
    luminance: relativeLuminance(average.r, average.g, average.b),
    dominantLuminance: relativeLuminance(dominant.r, dominant.g, dominant.b),
    hue: avgHsl.h,
    saturation: avgHsl.s,
    saturated: { hex: saturated.hex, hue: saturated.h, saturation: saturated.s },
  };
}

// ---------------------------------------------------------------------------
// palette derivation
// ---------------------------------------------------------------------------

/** Derive { light, dark } color pairs from an image sample. */
export function paletteFromSample(sample) {
  const colors = clonePairs();

  // Expand the sampled clusters into weighted color points (hex -> rgb/hsl).
  const points = (Array.isArray(sample.clusters) ? sample.clusters : [])
    .map((cluster) => {
      if (!cluster || typeof cluster.hex !== "string") return null;
      const rgb = hexToRgb(cluster.hex);
      if (!rgb) return null;
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      const weight = typeof cluster.weight === "number" && isFinite(cluster.weight) && cluster.weight > 0
        ? cluster.weight
        : 0;
      return { ...rgb, ...hsl, weight };
    })
    .filter((point) => point !== null && point.weight > 0);

  /** Weighted average of a group of color points, or null when empty. */
  function mix(group) {
    if (!group || group.length === 0) return null;
    const total = group.reduce((sum, p) => sum + p.weight, 0) || 1;
    const r = group.reduce((sum, p) => sum + p.r * p.weight, 0) / total;
    const g = group.reduce((sum, p) => sum + p.g * p.weight, 0) / total;
    const b = group.reduce((sum, p) => sum + p.b * p.weight, 0) / total;
    return { r, g, b, ...rgbToHsl(r, g, b) };
  }

  const brightMix = mix(points.filter((p) => p.l > 0.5));
  const darkMix = mix(points.filter((p) => p.l <= 0.5));

  // Overall hue/saturation of the image; hue-less images fall back to blue.
  const hue = sample.saturation < 0.08 ? 216 : sample.hue;
  const sat = Math.min(0.55, Math.max(0.12, sample.saturation));

  // Brand color comes from the most saturated cluster of the image.
  let brandHue = hue;
  let brandSat = 0.6;
  let mostSaturated = null;
  for (const p of points) {
    if (mostSaturated === null || p.s > mostSaturated.s) mostSaturated = p;
  }
  if (mostSaturated !== null && mostSaturated.s > 0.25) {
    brandHue = mostSaturated.h;
    brandSat = Math.min(0.8, Math.max(0.4, mostSaturated.s));
  }

  // The light scheme inherits the image's BRIGHT side (bright pixel mix) and
  // the dark scheme its DARK side (dark pixel mix), so both schemes are
  // genuinely derived from the picture instead of one shared average hue.
  const lightHue = brightMix !== null ? brightMix.h : hue;
  const lightSat = brightMix !== null ? Math.min(0.5, Math.max(0.12, brightMix.s * 0.9)) : sat;
  const darkHue = darkMix !== null ? darkMix.h : hue;
  const darkSat = darkMix !== null ? Math.min(0.55, Math.max(0.15, darkMix.s * 1.1)) : sat;

  // surfaces — colored by the image itself: each scheme keeps the hue AND a
  // noticeable part of the saturation of the picture's bright/dark side,
  // instead of collapsing to near-white / near-black. Saturation is capped
  // for comfort, and the lightness ladder preserves visual hierarchy.
  const lightSurfSat = Math.min(0.3, lightSat);
  const darkSurfSat = Math.min(0.4, darkSat);
  colors["--dsw-alias-bg-base"].light = hslHex(lightHue, lightSurfSat, 0.95);
  colors["--dsw-alias-bg-base"].dark = hslHex(darkHue, darkSurfSat, 0.1);
  colors["--dsw-alias-bg-layer-1"].light = hslHex(lightHue, lightSurfSat * 0.65, 0.975);
  colors["--dsw-alias-bg-layer-1"].dark = hslHex(darkHue, darkSurfSat * 0.75, 0.14);
  colors["--dsw-alias-bg-layer-2"].light = hslHex(lightHue, lightSurfSat, 0.92);
  colors["--dsw-alias-bg-layer-2"].dark = hslHex(darkHue, darkSurfSat, 0.18);
  colors["--dsw-alias-bg-layer-3"].light = hslHex(lightHue, lightSurfSat * 0.8, 0.965);
  colors["--dsw-alias-bg-layer-3"].dark = hslHex(darkHue, darkSurfSat * 0.85, 0.22);
  colors["--dsw-alias-bg-overlay"].light = hslHex(lightHue, Math.min(0.34, lightSurfSat * 1.1), 0.885);
  colors["--dsw-alias-bg-overlay"].dark = hslHex(darkHue, Math.min(0.44, darkSurfSat * 1.1), 0.26);
  colors["--dsw-specific-sidebar-fill"].light = hslHex(lightHue, lightSurfSat, 0.93);
  colors["--dsw-specific-sidebar-fill"].dark = hslHex(darkHue, Math.min(0.44, darkSurfSat * 1.1), 0.07);

  // borders — tinted with the image's overall hue
  colors["--dsw-alias-border-l1"].light = hslHex(hue, Math.min(0.7, sat * 1.4), 0.35);
  colors["--dsw-alias-border-l1"].dark = hslHex(hue, Math.min(0.7, sat * 1.4), 0.8);
  colors["--dsw-alias-border-l2"].light = hslHex(hue, Math.min(0.7, sat * 1.4), 0.25);
  colors["--dsw-alias-border-l2"].dark = hslHex(hue, Math.min(0.7, sat * 1.4), 0.9);

  // brand — the image's most saturated accent
  colors["--dsw-alias-brand-primary"].light = hslHex(brandHue, brandSat, 0.45);
  colors["--dsw-alias-brand-primary"].dark = hslHex(brandHue, brandSat, 0.62);

  // text — the light scheme reads on the image's dark side and vice versa
  colors["--dsw-alias-label-primary"].light = hslHex(darkMix !== null ? darkMix.h : hue, darkMix !== null ? Math.min(0.6, darkMix.s * 0.8) : sat * 0.6, 0.16);
  colors["--dsw-alias-label-primary"].dark = hslHex(brightMix !== null ? brightMix.h : hue, brightMix !== null ? Math.min(0.5, brightMix.s * 0.7) : sat * 0.5, 0.94);
  colors["--dsw-alias-label-secondary"].light = hslHex(darkMix !== null ? darkMix.h : hue, darkMix !== null ? Math.min(0.4, darkMix.s * 0.5) : sat * 0.35, 0.38);
  colors["--dsw-alias-label-secondary"].dark = hslHex(brightMix !== null ? brightMix.h : hue, brightMix !== null ? Math.min(0.35, brightMix.s * 0.5) : sat * 0.3, 0.72);

  // keep semantic state colors (already legible in both schemes)
  colors["--dsw-alias-state-error-primary"] = { ...NEUTRAL_PAIRS["--dsw-alias-state-error-primary"] };
  colors["--dsw-alias-state-success-primary"] = { ...NEUTRAL_PAIRS["--dsw-alias-state-success-primary"] };
  colors["--dsw-alias-state-warn-primary"] = { ...NEUTRAL_PAIRS["--dsw-alias-state-warn-primary"] };

  // readability backstop: force label contrast against the base surfaces
  for (const scheme of ["light", "dark"]) {
    if (contrastRatio(colors["--dsw-alias-label-primary"][scheme], colors["--dsw-alias-bg-base"][scheme]) < 4.5) {
      colors["--dsw-alias-label-primary"][scheme] = scheme === "light" ? "#111318" : "#F7F8FA";
    }
  }

  const scheme = sample.luminance < 0.38 ? "dark" : "light";
  return { colors, scheme, dominant: sample.dominant, average: sample.average };
}

// ---------------------------------------------------------------------------
// token override building
// ---------------------------------------------------------------------------

/**
 * Scale the saturation of a hex color by the tint strength (0..1).
 * strength 0.5 reproduces the stored color (factor 1); 0 mutes it toward
 * neutral and 1 makes it far more pronounced. Achromatic colors stay as-is.
 */
export function tintHex(hex, strength, cap, lShift) {
  const s01 = clamp01(strength);
  // 50% is the neutral point: returning the stored color verbatim also avoids
  // the hex→hsl→hex round-trip drift, so default colors stay pixel-exact.
  if (s01 === 0.5) return hex;
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  if (hsl.s === 0) return hex;
  // Steeper curve so 0% and 100% look clearly different, while 50% still
  // reproduces the stored color exactly (factor 1).
  const factor = s01 <= 0.5 ? s01 * 2 : 1 + (s01 - 0.5) * 3.2;
  let lig = hsl.l;
  if (typeof lShift === "number" && s01 > 0.5) {
    // Above 50% the surface lightness also moves a bit, which makes the
    // tint far more visible than saturation alone.
    lig = clamp01(lig + lShift * ((s01 - 0.5) * 2));
  }
  // The cap only kicks in above the 50% neutral point, and never drops a
  // color below its original saturation, so 50% reproduces stored colors.
  const limit = Math.max(typeof cap === "number" ? cap : 0.85, hsl.s);
  return hslHex(hsl.h, Math.min(limit, hsl.s * factor), lig).toUpperCase();
}

/** Rotate the hue of a hex color; achromatic colors are unaffected. */
export function rotateHue(hex, shiftDeg) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  if (hsl.s === 0) return hex;
  return hslHex((((hsl.h + (Number(shiftDeg) || 0)) % 360) + 360) % 360, hsl.s, hsl.l).toUpperCase();
}

/** Compose the { light, dark } override pairs for the current state. */
export function buildPairs(state) {
  // A surface whose "default" checkbox is on renders fully opaque (the
  // product's own look); the tint defaults to its neutral 50% strength.
  const strength = state.tintStrengthDefault === true
    ? 0.5
    : (typeof state.tintStrength === "number" ? clamp01(state.tintStrength) : 0.5);
  const hueShift = typeof state.fontHue === "number" ? ((state.fontHue % 360) + 360) % 360 : 0;
  const pairs = {};
  for (const def of TOKEN_DEFS) {
    const fallback = NEUTRAL_PAIRS[def.id];
    const color = state.colors[def.id] || fallback;
    if (def.kind === "surface") {
      const pinned = PINNED_OPAQUE_SURFACES.has(def.id);
      const defaulted = state.opacitiesDefault && state.opacitiesDefault[def.id] === true;
      // Translucency only matters while the wallpaper is actually showing:
      // with the master toggle off, surfaces stay fully opaque (their COLORS
      // still apply — color customization is independent of the wallpaper).
      const alpha = pinned || defaulted || state.enabled !== true
        ? 1
        : clamp01(typeof state.opacities[def.id] === "number" ? state.opacities[def.id] : 1);
      pairs[def.id] = {
        light: rgbaFromHex(tintHex(color.light, strength, 0.8, -0.06), alpha),
        dark: rgbaFromHex(tintHex(color.dark, strength, 0.9, 0.06), alpha),
      };
    } else if (def.kind === "border") {
      const alpha = BORDER_ALPHA[def.id] || { light: 0.06, dark: 0.12 };
      pairs[def.id] = {
        light: rgbaFromHex(tintHex(color.light, strength, 0.9), alpha.light),
        dark: rgbaFromHex(tintHex(color.dark, strength, 0.95), alpha.dark),
      };
    } else if (def.id === "--dsw-alias-brand-primary") {
      pairs[def.id] = {
        light: tintHex(color.light, strength, 0.95),
        dark: tintHex(color.dark, strength, 1),
      };
    } else if (def.id === "--dsw-alias-label-primary" || def.id === "--dsw-alias-label-secondary") {
      // A zero shift must pass the stored color through verbatim: the
      // hex→hsl→hex round trip in rotateHue would otherwise drift ±1 per
      // channel even at the default 0°.
      pairs[def.id] = hueShift !== 0
        ? { light: rotateHue(color.light, hueShift), dark: rotateHue(color.dark, hueShift) }
        : { light: color.light, dark: color.dark };
    } else {
      pairs[def.id] = { light: color.light, dark: color.dark };
    }
  }
  return pairs;
}

/**
 * True while every appearance knob (colors, opacity, tint strength, text hue)
 * still matches the stock shell look. Used to keep the override layer empty
 * when the plugin is disabled and nothing is customized, so other theme
 * plugins (e.g. infinity) are not covered by a do-nothing layer.
 */
export function appearanceIsStock(state) {
  const colorsStock = ALL_TOKEN_IDS.every((id) => {
    const pair = state.colors && state.colors[id];
    const ref = NEUTRAL_PAIRS[id];
    return !!pair && pair.light === ref.light && pair.dark === ref.dark;
  });
  const opacityStock = OPACITY_IDS.every((id) => !state.opacitiesDefault || state.opacitiesDefault[id] === true);
  return colorsStock && opacityStock && state.tintStrengthDefault === true && state.fontHueDefault === true;
}

// ---------------------------------------------------------------------------
// image file handling
// ---------------------------------------------------------------------------

/**
 * Downscale + re-encode oversized uploads (localStorage is ~5MB per origin;
 * remote browsers share the same budget). Transparent PNGs are passed through
 * untouched unless oversized, in which case they are flattened to JPEG.
 */
export function compressDataUrl(dataUrl, mime) {
  return new Promise((resolve) => {
    // Animated GIFs pass through untouched: re-encoding would freeze the
    // animation (and rarely saves bytes for gifs).
    if (typeof mime === "string" && mime.toLowerCase() === "image/gif") {
      return resolve(dataUrl);
    }
    if (
      typeof dataUrl !== "string"
      || dataUrl.length <= MAX_STORED_CHARS
      || typeof Image === "undefined"
      || typeof document === "undefined"
    ) {
      return resolve(dataUrl);
    }
    let img;
    try {
      img = new Image();
    } catch {
      return resolve(dataUrl);
    }
    img.onload = () => {
      try {
        const maxSide = 2560;
        const scale = Math.min(1, maxSide / Math.max(img.width || 1, img.height || 1));
        const w = Math.max(1, Math.round((img.width || 1) * scale));
        const h = Math.max(1, Math.round((img.height || 1) * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(dataUrl);
        ctx.drawImage(img, 0, 0, w, h);
        const out = canvas.toDataURL("image/jpeg", 0.85);
        resolve(out.length < dataUrl.length ? out : dataUrl);
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function readImageFile(file) {
  return new Promise((resolve) => {
    if (
      typeof FileReader === "undefined"
      || !file
      || typeof file !== "object"
      || typeof file.type !== "string"
      || !/^image\//i.test(file.type)
    ) {
      return resolve(null);
    }
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result !== "string") return resolve(null);
      resolve(await compressDataUrl(reader.result, file.type));
    };
    reader.onerror = () => resolve(null);
    try {
      reader.readAsDataURL(file);
    } catch {
      resolve(null);
    }
  });
}

// ---------------------------------------------------------------------------
// runtime
// ---------------------------------------------------------------------------

/** Font stacks applied by the font settings (empty = leave the shell alone). */
export const FONT_FAMILIES = {
  default: "",
  sans: "'Segoe UI', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif",
  serif: "Georgia, 'Times New Roman', 'Songti SC', 'STSong', serif",
  mono: "'Cascadia Code', 'JetBrains Mono', 'Consolas', 'Courier New', monospace",
  rounded: "ui-rounded, 'SF Pro Rounded', 'PingFang SC', 'Segoe UI', sans-serif",
};

/** Element-category selectors used by the per-category radius settings. */
const BTN_SELECTOR = "button, [role=\"button\"], .dsw-btn, [class*=\"_btn_\"], [class*=\"_button_\"]";
// The chat composer's visible rounded box is the CARD around the invisible
// textarea (uV2eYG_card carries the border + background); the shell marks it
// with [data-composer-card], a stable attribute, so the input radius lands on
// the element the user actually sees.
const INPUT_SELECTOR = "input:not([type=\"checkbox\"]):not([type=\"radio\"]):not([type=\"range\"]):not([type=\"color\"]):not([type=\"file\"]), select, textarea, [contenteditable=\"true\"], [contenteditable=\"plaintext-only\"], [class*=\"_input_\"], [data-composer-card]";
const DIALOG_SELECTOR = "[class*=\"_dialog_\"], [role=\"dialog\"]";
// Dialog SIZE rules are scoped to the settings window only — the dialog that
// hosts our own .dsw-root settings row — so dialogs that other plugins add
// (approvals, question cards, pickers, …) keep their natural dimensions.
// :has() degrades gracefully: on webviews without support the size setting
// simply does nothing, while the radius rule above still applies.
const DIALOG_SIZE_SELECTOR = "[class*=\"_dialog_\"]:has(.dsw-root), [role=\"dialog\"]:has(.dsw-root)";
const CARD_SELECTOR = "[class*=\"_card_\"], [class*=\"_panel_\"], .dsw-section, .dsw-preview";

export const PLUGIN_CSS = `\
[data-dsw-wallpaper] {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
}
[data-dsw-wallpaper] > img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: var(--dsw-wp-fit, cover);
  object-position: var(--dsw-wp-pos, center);
  filter: blur(var(--dsw-wp-blur, 0px));
  transform: scale(1.08);
}
[data-dsw-wallpaper-dim] {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, var(--dsw-wp-dim, 0));
  transition: background 200ms ease;
}
body[data-ds-dark-theme] [data-dsw-wallpaper-dim] {
  background: rgba(0, 0, 0, var(--dsw-wp-dim, 0));
}

/* ---- settings row UI ---- */
.dsw-root {
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  padding: 18px 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--dsw-alias-label-primary);
}
.dsw-root:last-child {
  border-bottom: none;
}
.dsw-title {
  font-size: 14px;
  line-height: 22px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.dsw-title-name {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.01em;
}
.dsw-desc {
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
}
.dsw-switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}
.dsw-switch-row label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  user-select: none;
}
.dsw-switch-row input[type="checkbox"] {
  width: 15px;
  height: 15px;
  margin: 0;
  accent-color: var(--dsw-alias-brand-primary);
  cursor: pointer;
}
.dsw-section {
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 14px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.dsw-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: transparent;
  border: none;
  padding: 4px 6px;
  margin: -4px -6px;
  border-radius: 8px;
  transition: background 120ms ease;
  font: inherit;
  color: var(--dsw-alias-label-primary);
  cursor: pointer;
  text-align: left;
  width: 100%;
}
.dsw-section-head:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}
.dsw-section-head-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
}
.dsw-caret {
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  transition: transform 120ms ease;
  display: inline-block;
}
.dsw-caret.dsw-open {
  transform: rotate(90deg);
}
.dsw-hint {
  font-size: 12px;
  color: var(--dsw-alias-label-secondary);
}
.dsw-hint.dsw-error {
  color: var(--dsw-alias-state-error-primary);
}
.dsw-btn-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.dsw-btn {
  box-sizing: border-box;
  font: inherit;
  font-size: 12px;
  line-height: 18px;
  transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
  color: var(--dsw-alias-label-primary);
  background: transparent;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 10px;
  padding: 5px 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.dsw-btn:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover);
}
.dsw-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.dsw-btn-primary {
  background: var(--dsw-alias-brand-primary);
  border-color: transparent;
  color: var(--dsw-alias-label-primary-inverted);
}
.dsw-btn-primary:hover:not(:disabled) {
  background: var(--dsw-alias-brand-primary);
  filter: brightness(1.08);
}
.dsw-btn-danger:hover:not(:disabled) {
  color: var(--dsw-alias-state-error-primary);
  border-color: var(--dsw-alias-state-error-primary);
}
.dsw-preview {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--dsw-alias-border-l2);
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--dsw-alias-bg-layer-2);
}
.dsw-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.dsw-preview-empty {
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
}
.dsw-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.dsw-field-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.dsw-field-label {
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  white-space: nowrap;
}
.dsw-slider {
  flex: 1;
  min-width: 100px;
  margin: 0;
  accent-color: var(--dsw-alias-brand-primary);
}
.dsw-value {
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  min-width: 44px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.dsw-select {
  box-sizing: border-box;
  font: inherit;
  font-size: 12px;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-2);
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 10px;
  padding: 5px 10px;
  outline: none;
  cursor: pointer;
  transition: border-color 120ms ease;
}
.dsw-color-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 3px 6px;
  margin: 0 -6px;
  border-radius: 8px;
  transition: background 120ms ease;
}
.dsw-color-row:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}
.dsw-color-name {
  flex: 1;
  min-width: 110px;
  font-size: 12px;
  color: var(--dsw-alias-label-primary);
}
.dsw-color-pair {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.dsw-color-pair span {
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
}
input[type="color"].dsw-color {
  box-sizing: border-box;
  width: 34px;
  height: 24px;
  padding: 1px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 7px;
  background: transparent;
  cursor: pointer;
}
.dsw-group-label {
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.02em;
  padding-top: 6px;
}
.dsw-file-input {
  display: none;
}
.dsw-extra {
  box-sizing: border-box;
  width: 110px;
  font-size: 11px;
  padding: 2px 6px;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-2);
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 7px;
  outline: none;
}
.dsw-alpha {
  box-sizing: border-box;
  width: 56px;
  font-size: 11px;
  padding: 2px 6px;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-2);
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 7px;
  outline: none;
}
.dsw-slider:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.dsw-default-check {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}
.dsw-default-check input[type="checkbox"] {
  width: 14px;
  height: 14px;
  margin: 0;
  accent-color: var(--dsw-alias-brand-primary);
  cursor: pointer;
}
.dsw-section-head:focus-visible,
.dsw-btn:focus-visible,
.dsw-select:focus-visible,
.dsw-extra:focus-visible,
.dsw-alpha:focus-visible,
.dsw-slider:focus-visible,
.dsw-switch-row input[type="checkbox"]:focus-visible,
.dsw-default-check input[type="checkbox"]:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 2px;
}
`;

// ---------------------------------------------------------------------------
// text-only font scaling
// ---------------------------------------------------------------------------
// The shell's CSS hard-codes font sizes in px all over, so no single CSS
// variable (or html { font-size }) can resize text without also resizing the
// whole UI (that is what "UI scale" zoom is for). This scaler walks the live
// DOM, caches each element's ORIGINAL computed px size in a data attribute,
// and re-paints font-size = original * scale on the elements that carry text.
// Two-phase (read everything, then write everything) avoids layout thrash,
// and a MutationObserver re-paints only newly inserted subtrees.

const FONT_SKIP_TAGS = new Set([
  "STYLE", "SCRIPT", "LINK", "META", "TITLE", "BASE", "NOSCRIPT", "TEMPLATE",
  "HEAD", "HTML", "BR", "WBR", "HR", "IMG", "PICTURE", "SOURCE", "VIDEO",
  "AUDIO", "CANVAS", "IFRAME", "OBJECT", "EMBED", "TRACK", "AREA", "MAP",
  "PARAM", "SVG", "PATH", "CIRCLE", "RECT", "ELLIPSE", "LINE", "POLYLINE",
  "POLYGON", "G", "DEFS", "SYMBOL", "USE", "MARKER", "MASK", "CLIPPATH",
  "PATTERN", "LINEARGRADIENT", "RADIALGRADIENT", "STOP",
]);

function fontSizeEligible(el) {
  const tag = el && el.tagName;
  return typeof tag === "string" && !FONT_SKIP_TAGS.has(tag.toUpperCase());
}

function cachedFontBase(el) {
  const raw = el.getAttribute("data-dsw-font-base");
  if (raw === null || raw === undefined || raw === "") return null;
  const n = parseFloat(raw);
  return isFinite(n) ? n : null;
}

/** { base, cmp } of the nearest painted ancestor (cmp = what its children currently inherit). */
export function parentFontRef(node) {
  let p = node && node.parentElement ? node.parentElement : null;
  while (p !== null) {
    const base = cachedFontBase(p);
    if (base !== null && base > 0) {
      let cmp = base;
      try {
        const inline = String(p.style.getPropertyValue("font-size") || "");
        const inPx = parseFloat(inline);
        if (inline !== "" && isFinite(inPx) && inPx > 0) cmp = inPx;
      } catch {
        cmp = base;
      }
      return { base, cmp };
    }
    p = p.parentElement;
  }
  return null;
}

/**
 * Cache original font sizes for the subtree and paint font-size = base*scale.
 * @param root - element to walk (usually document.documentElement or an added node)
 * @param scale - 0.75..1.5 multiplier
 * @param parentRef - { base, cmp } for root's painted parent (from parentFontRef)
 */
export function paintFontSubtree(root, scale, parentRef) {
  if (typeof getComputedStyle === "undefined" || !root || root.nodeType !== 1) return;
  const jobs = [];
  (function walk(node, parent) {
    if (!node || node.nodeType !== 1) return;
    let pass = parent;
    if (fontSizeEligible(node)) {
      let base = cachedFontBase(node);
      if (base === null) {
        let cs = null;
        try {
          cs = getComputedStyle(node);
        } catch {
          cs = null;
        }
        const cur = cs ? parseFloat(cs.fontSize) : 0;
        base = isFinite(cur) && cur > 0 ? cur : 0;
        // A child whose computed size equals what its parent currently paints
        // simply inherited it — base must be the parent's base, not the
        // already-scaled value (avoids compounding on late-inserted nodes).
        if (base > 0 && parent !== null && parent.cmp > 0 && Math.abs(cur - parent.cmp) < 0.5) {
          base = parent.base;
        }
        if (base > 0) {
          let inline = "";
          try {
            inline = String(node.style.getPropertyValue("font-size") || "");
          } catch {
            inline = "";
          }
          if (inline !== "" && !node.hasAttribute("data-dsw-font-inline")) {
            try {
              node.setAttribute("data-dsw-font-inline", inline);
            } catch {
              // ignore
            }
          }
          try {
            node.setAttribute("data-dsw-font-base", String(Math.round(base * 100) / 100));
          } catch {
            // ignore
          }
        } else {
          try {
            node.setAttribute("data-dsw-font-base", "0");
          } catch {
            // ignore
          }
        }
      }
      if (base > 0) {
        jobs.push({ node, px: Math.round(base * scale * 100) / 100 });
        let cmp = base;
        try {
          const inline = String(node.style.getPropertyValue("font-size") || "");
          const inPx = parseFloat(inline);
          if (inline !== "" && isFinite(inPx) && inPx > 0) cmp = inPx;
        } catch {
          cmp = base;
        }
        pass = { base, cmp };
      }
    }
    for (let c = node.firstChild; c !== null; c = c.nextSibling) walk(c, pass);
  })(root, parentRef || null);
  for (const job of jobs) {
    try {
      job.node.style.setProperty("font-size", job.px + "px", "important");
    } catch {
      // ignore
    }
  }
}

/** Remove every injected font-size and cached base; restore prior inline sizes. */
function clearFontScale() {
  if (typeof document === "undefined" || document.body === null || typeof document.querySelectorAll !== "function") return;
  try {
    const list = document.querySelectorAll("[data-dsw-font-base]");
    for (let i = 0; i < list.length; i++) {
      const el = list[i];
      try {
        const inline = el.getAttribute("data-dsw-font-inline");
        el.removeAttribute("data-dsw-font-base");
        el.removeAttribute("data-dsw-font-inline");
        if (inline !== null && inline !== "") el.style.setProperty("font-size", inline);
        else el.style.removeProperty("font-size");
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
}

/**
 * Build the runtime over the theme service.
 * @param deps.console - optional console (dynamic packages receive a tagged one)
 */
export function createRuntime({ theme, insertCss, console: logger }) {
  const store = createStore(loadState() || defaultState());
  let cssInstalled = false;
  let cssDispose = null;
  let bgEl = null;
  let overrideDispose = null;
  const disposed = { flag: false };
  let fontTag = null;
  // text-only scaler runtime state
  const fontScaler = { key: null, scale: 1, active: false };
  let fontObserver = null;
  let fontResizeHandler = null;
  let fontPending = false;
  let fontPendingRoots = [];

  const warn = (message, extra) => {
    if (logger && typeof logger.warn === "function") {
      try {
        logger.warn("[dsh-bestui]", message, extra);
      } catch {
        // ignore
      }
    }
  };

  function ensureCss() {
    if (cssInstalled || disposed.flag) return;
    if (typeof insertCss !== "function") return;
    cssInstalled = true;
    try {
      cssDispose = insertCss(PLUGIN_CSS);
    } catch (error) {
      cssInstalled = false;
      warn("css injection failed", error);
    }
  }

  /**
   * True when every extra color still matches the shell defaults. Comparison
   * is semantic (picker color + alpha), not string equality: the picker
   * re-composes rgba() with its own spacing and 0.x notation, which would
   * otherwise never match the stored default strings.
   */
  function extraIsDefault(extra) {
    if (!extra) return true;
    return EXTRA_DEFS.every((def) => {
      const pair = extra[def.id];
      if (!pair) return true;
      const pl = cssToPicker(pair.light), dl = cssToPicker(def.light);
      const pd = cssToPicker(pair.dark), dd = cssToPicker(def.dark);
      return pl.color === dl.color && pl.alpha === dl.alpha && pd.color === dd.color && pd.alpha === dd.alpha;
    });
  }

  /** Apply font / shape / extra-color settings through one dedicated style tag. */
  function syncUiCss() {
    if (typeof document === "undefined") return;
    const state = store.get();
    const family = FONT_FAMILIES[state.fontFamily] || "";
    const scale = typeof state.fontScale === "number" ? Math.min(1.5, Math.max(0.75, state.fontScale)) : 1;
    const weight = typeof state.fontWeight === "number" ? Math.min(800, Math.max(300, Math.round(state.fontWeight))) : 400;
    let css = "";
    if (state.fontScaleDefault !== true && scale !== 1) css += `html { zoom: ${Math.round(scale * 100) / 100} !important; }`;
    if (family) css += `body { font-family: ${family} !important; }`;
    if (state.fontWeightDefault !== true && weight !== 400) css += `body, body * { font-weight: ${weight} !important; }`;
    // Radius rules inject only while the row's "default" checkbox is off;
    // 0 still means sharp (min(0px, 50%)) so a real right angle sticks.
    if (state.buttonRadiusDefault !== true) {
      const buttonRadius = Math.min(24, Math.max(0, Math.round(state.buttonRadius)));
      css += `${BTN_SELECTOR} { border-radius: min(${buttonRadius}px, 50%) !important; }`;
    }
    if (state.inputRadiusDefault !== true) {
      const inputRadius = Math.min(24, Math.max(0, Math.round(state.inputRadius)));
      css += `${INPUT_SELECTOR} { border-radius: min(${inputRadius}px, 50%) !important; }`;
    }
    if (state.cardRadiusDefault !== true) {
      const cardRadius = Math.min(24, Math.max(0, Math.round(state.cardRadius)));
      css += `${CARD_SELECTOR} { border-radius: min(${cardRadius}px, 50%) !important; }`;
    }
    if (state.dialogRadiusDefault !== true) {
      const dialogRadius = Math.min(40, Math.max(0, Math.round(state.dialogRadius)));
      css += `${DIALOG_SELECTOR} { border-radius: min(${dialogRadius}px, 50%) !important; }`;
    }
    const dialogWidth = typeof state.dialogWidth === "number" ? Math.min(1400, Math.max(0, Math.round(state.dialogWidth))) : 0;
    if (state.dialogWidthDefault !== true && dialogWidth > 0) {
      css += `${DIALOG_SIZE_SELECTOR} { width: ${dialogWidth}px !important; max-width: min(92vw, ${dialogWidth}px) !important; }`;
    }
    const dialogHeight = typeof state.dialogHeight === "number" ? Math.min(1600, Math.max(0, Math.round(state.dialogHeight))) : 0;
    if (state.dialogHeightDefault !== true && dialogHeight > 0) {
      css += `${DIALOG_SIZE_SELECTOR} { height: ${dialogHeight}px !important; max-height: min(92vh, ${dialogHeight}px) !important; }`;
    }
    if (!extraIsDefault(state.extraColors)) {
      const light = [];
      const dark = [];
      for (const def of EXTRA_DEFS) {
        const pair = (state.extraColors && state.extraColors[def.id]) || { light: def.light, dark: def.dark };
        light.push(`${def.id}: ${pair.light} !important;`);
        dark.push(`${def.id}: ${pair.dark} !important;`);
      }
      // The shell declares these same-named variables directly on <body>, so
      // :root would lose (an element's own declaration beats an inherited
      // one, regardless of stylesheet order). Target body directly and use
      // !important so a body-level inline style can't override it either;
      // body[data-ds-dark-theme] still wins over plain body in dark mode.
      css += `body { ${light.join(" ")} }\nbody[data-ds-dark-theme] { ${dark.join(" ")} }`;
    }
    if (css === "") {
      if (fontTag !== null) {
        try { fontTag.remove(); } catch { /* ignore */ }
        fontTag = null;
      }
      return;
    }
    try {
      if (fontTag === null || (typeof fontTag.isConnected === "boolean" && !fontTag.isConnected)) {
        fontTag = document.createElement("style");
        fontTag.dataset.plugin = "dsh-bestui-font";
        (document.head || document.documentElement).appendChild(fontTag);
      }
      fontTag.textContent = css;
    } catch (error) {
      warn("font css injection failed", error);
    }
  }

  /** Tear down the text scaler: clear injected sizes, observers and timers. */
  function teardownFontScaler() {
    if (fontObserver !== null) {
      try { fontObserver.disconnect(); } catch { /* ignore */ }
      fontObserver = null;
    }
    if (fontResizeHandler !== null && typeof window !== "undefined") {
      try { window.removeEventListener("resize", fontResizeHandler); } catch { /* ignore */ }
      fontResizeHandler = null;
    }
    if (fontPending) {
      fontPending = false;
      fontPendingRoots = [];
    }
    clearFontScale();
  }

  function ensureFontResize() {
    if (fontResizeHandler !== null || typeof window === "undefined") return;
    fontResizeHandler = () => {
      if (fontScaler.active !== true || fontScaler.scale === 1) return;
      // Media queries may change font sizes on resize: re-base everything.
      clearFontScale();
      paintFontSubtree(document.documentElement, fontScaler.scale, null);
    };
    try {
      window.addEventListener("resize", fontResizeHandler);
    } catch {
      fontResizeHandler = null;
    }
  }

  function ensureFontObserver() {
    if (fontObserver !== null || typeof MutationObserver === "undefined") return;
    try {
      fontObserver = new MutationObserver((records) => {
        if (fontScaler.active !== true || fontScaler.scale === 1) return;
        for (const record of records) {
          if (record.type !== "childList") continue;
          for (const node of record.addedNodes) {
            if (node !== null && (node.nodeType === 1 || node.nodeType === 11)) {
              fontPendingRoots.push(node);
            }
          }
        }
        if (fontPendingRoots.length === 0) return;
        if (fontPending) return;
        fontPending = true;
        const raf = typeof requestAnimationFrame === "function" ? requestAnimationFrame : (fn) => setTimeout(fn, 16);
        raf(() => {
          fontPending = false;
          const roots = fontPendingRoots;
          fontPendingRoots = [];
          if (fontScaler.active !== true || fontScaler.scale === 1) return;
          for (const root of roots) {
            paintFontSubtree(root, fontScaler.scale, parentFontRef(root));
          }
        });
      });
      fontObserver.observe(document.documentElement, { childList: true, subtree: true });
    } catch {
      fontObserver = null;
    }
  }

  /** Apply the text-only font-size setting (dirty-guarded: only acts on change). */
  function syncFontSize() {
    if (typeof document === "undefined") return;
    const state = store.get();
    const active = state.fontSizeDefault !== true;
    const scale = typeof state.fontSize === "number" && isFinite(state.fontSize)
      ? Math.min(1.5, Math.max(0.75, state.fontSize))
      : 1;
    const key = String(active) + "|" + scale;
    if (key === fontScaler.key) return;
    fontScaler.key = key;
    if (!active || scale === 1) {
      fontScaler.active = false;
      fontScaler.scale = 1;
      teardownFontScaler();
      return;
    }
    fontScaler.active = true;
    fontScaler.scale = scale;
    // Entering the active state guarantees no injected styles are left over
    // (deactivation tears them down), and the cached per-element base sizes
    // are scale-independent. A scale-only change therefore repaints from the
    // cache with zero getComputedStyle reads — no clear/re-base, which keeps
    // slider drags cheap. The resize listener is the only path that clears
    // and re-bases (media queries can change the underlying px sizes).
    ensureFontObserver();
    ensureFontResize();
    paintFontSubtree(document.documentElement, scale, null);
  }

  function syncBackground() {
    if (typeof document === "undefined") return;
    const state = store.get();
    const active = state.enabled && state.image !== null;
    if (!active) {
      if (bgEl !== null) {
        try {
          bgEl.remove();
        } catch {
          // ignore
        }
        bgEl = null;
      }
      return;
    }
    const root = document.body || document.documentElement;
    if (root === null || typeof root.appendChild !== "function") return;
    if (bgEl === null || (typeof bgEl.isConnected === "boolean" && !bgEl.isConnected)) {
      bgEl = document.createElement("div");
      bgEl.setAttribute("data-dsw-wallpaper", "");
      const imgEl = document.createElement("img");
      imgEl.alt = "";
      imgEl.draggable = false;
      const dimEl = document.createElement("div");
      dimEl.setAttribute("data-dsw-wallpaper-dim", "");
      bgEl.appendChild(imgEl);
      bgEl.appendChild(dimEl);
      root.appendChild(bgEl);
    }
    const imgEl = bgEl.firstChild;
    if (imgEl && imgEl.tagName === "IMG" && imgEl.src !== state.image.dataUrl) {
      imgEl.src = state.image.dataUrl;
    }
    const style = state.imageStyle || DEFAULT_IMAGE_STYLE;
    bgEl.style.setProperty("--dsw-wp-fit", String(style.fit || "cover"));
    bgEl.style.setProperty("--dsw-wp-pos", String(style.position || "center"));
    bgEl.style.setProperty("--dsw-wp-blur", `${Math.max(0, Number(style.blur) || 0)}px`);
    bgEl.style.setProperty("--dsw-wp-dim", String(clamp01(style.dim)));
  }

  function applyNow() {
    if (disposed.flag) return;
    const state = store.get();
    ensureCss();
    syncUiCss();
    syncFontSize();
    syncBackground();
    // Color customization is independent of the wallpaper toggle: build the
    // override layer whenever the wallpaper is enabled OR any appearance
    // setting deviates from stock. A fully stock, disabled state emits an
    // empty layer so the plugin stays invisible while it does nothing.
    const pairs = state.enabled || !appearanceIsStock(state) ? buildPairs(state) : {};
    try {
      if (overrideDispose !== null) {
        overrideDispose();
        overrideDispose = null;
      }
      if (theme && typeof theme.overrideTokens === "function") {
        overrideDispose = theme.overrideTokens("dsh-bestui", pairs);
      }
    } catch (error) {
      warn("overrideTokens failed", error);
    }
  }

  const api = {
    store,
    ensureCss,
    applyNow,
    tokenDefs: TOKEN_DEFS,
    extraDefs: EXTRA_DEFS,
    opacityIds: OPACITY_IDS,
    cssToPicker,
    pickerToCss,
    getThemePreference() {
      try {
        const snapshot = theme && theme.getTheme ? theme.getTheme() : null;
        return snapshot && typeof snapshot.preference === "string" ? snapshot.preference : "system";
      } catch {
        return "system";
      }
    },
    setTheme(id) {
      try {
        if (theme && typeof theme.setTheme === "function") theme.setTheme(id);
      } catch (error) {
        warn("setTheme failed", error);
      }
    },
    setEnabled(enabled) {
      const state = store.get();
      const patch = { enabled: enabled === true };
      if (patch.enabled && state.image !== null) {
        // First enable with an image: leave "default" (opaque) behind once and
        // apply the suggested translucent look for every surface.
        const untouched = OPACITY_IDS.every((id) => (state.opacitiesDefault && state.opacitiesDefault[id]) === true);
        if (untouched) {
          patch.opacities = { ...WALLPAPER_OPACITIES };
          patch.opacitiesDefault = Object.fromEntries(OPACITY_IDS.map((id) => [id, false]));
        }
      }
      store.set(patch);
    },
    setImageStyle(key, value) {
      const state = store.get();
      store.set({ imageStyle: { ...state.imageStyle, [key]: value } });
    },
    setOpacity(id, value) {
      if (!OPACITY_IDS.includes(id)) return;
      const state = store.get();
      store.set({
        opacities: { ...state.opacities, [id]: clamp01(value) },
        opacitiesDefault: { ...(state.opacitiesDefault || {}), [id]: false },
      });
    },
    setOpacityDefault(id, value) {
      if (!OPACITY_IDS.includes(id)) return;
      const state = store.get();
      store.set({ opacitiesDefault: { ...(state.opacitiesDefault || {}), [id]: value === true } });
    },
    setColor(id, scheme, hex) {
      if (!isHex(hex) || scheme !== "light" && scheme !== "dark") return;
      const state = store.get();
      const pair = state.colors[id] || NEUTRAL_PAIRS[id];
      store.set({ colors: { ...state.colors, [id]: { ...pair, [scheme]: hex.toUpperCase() } } });
    },
    setMode(mode) {
      store.set({ mode: mode === "custom" ? "custom" : "auto" });
    },
    setFollowScheme(value) {
      store.set({ followScheme: value === true });
    },
    setTintStrength(value) {
      store.set({ tintStrength: clamp01(value), tintStrengthDefault: false });
    },
    setTintStrengthDefault(value) {
      store.set({ tintStrengthDefault: value === true });
    },
    setFontFamily(value) {
      if (FONT_FAMILIES[value] === undefined) return;
      store.set({ fontFamily: value });
    },
    setFontWeight(value) {
      const n = Number(value);
      if (!isFinite(n)) return;
      store.set({ fontWeight: Math.min(800, Math.max(300, Math.round(n))), fontWeightDefault: false });
    },
    setFontWeightDefault(value) {
      store.set({ fontWeightDefault: value === true });
    },
    setFontScale(value) {
      const n = Number(value);
      if (!isFinite(n)) return;
      store.set({ fontScale: Math.min(1.5, Math.max(0.75, n)), fontScaleDefault: false });
    },
    setFontScaleDefault(value) {
      store.set({ fontScaleDefault: value === true });
    },
    setFontSize(value) {
      const n = Number(value);
      if (!isFinite(n)) return;
      store.set({ fontSize: Math.min(1.5, Math.max(0.75, n)), fontSizeDefault: false });
    },
    setFontSizeDefault(value) {
      store.set({ fontSizeDefault: value === true });
    },
    setFontHue(value) {
      const n = Number(value);
      if (!isFinite(n)) return;
      store.set({ fontHue: ((n % 360) + 360) % 360, fontHueDefault: false });
    },
    setFontHueDefault(value) {
      store.set({ fontHueDefault: value === true });
    },
    setButtonRadius(value) {
      const n = Number(value);
      if (!isFinite(n)) return;
      store.set({ buttonRadius: Math.min(24, Math.max(0, Math.round(n))), buttonRadiusDefault: false });
    },
    setButtonRadiusDefault(value) {
      store.set({ buttonRadiusDefault: value === true });
    },
    setInputRadius(value) {
      const n = Number(value);
      if (!isFinite(n)) return;
      store.set({ inputRadius: Math.min(24, Math.max(0, Math.round(n))), inputRadiusDefault: false });
    },
    setInputRadiusDefault(value) {
      store.set({ inputRadiusDefault: value === true });
    },
    setCardRadius(value) {
      const n = Number(value);
      if (!isFinite(n)) return;
      store.set({ cardRadius: Math.min(24, Math.max(0, Math.round(n))), cardRadiusDefault: false });
    },
    setCardRadiusDefault(value) {
      store.set({ cardRadiusDefault: value === true });
    },
    setDialogRadius(value) {
      const n = Number(value);
      if (!isFinite(n)) return;
      store.set({ dialogRadius: Math.min(40, Math.max(0, Math.round(n))), dialogRadiusDefault: false });
    },
    setDialogRadiusDefault(value) {
      store.set({ dialogRadiusDefault: value === true });
    },
    setDialogWidth(value) {
      const n = Number(value);
      if (!isFinite(n)) return;
      store.set({ dialogWidth: Math.min(1400, Math.max(0, Math.round(n))), dialogWidthDefault: false });
    },
    setDialogWidthDefault(value) {
      store.set({ dialogWidthDefault: value === true });
    },
    setDialogHeight(value) {
      const n = Number(value);
      if (!isFinite(n)) return;
      store.set({ dialogHeight: Math.min(1600, Math.max(0, Math.round(n))), dialogHeightDefault: false });
    },
    setDialogHeightDefault(value) {
      store.set({ dialogHeightDefault: value === true });
    },
    resetShape() {
      store.set({
        fontScaleDefault: true,
        buttonRadiusDefault: true,
        inputRadiusDefault: true,
        cardRadiusDefault: true,
        dialogRadiusDefault: true,
        dialogWidthDefault: true,
        dialogHeightDefault: true,
      });
    },
    setExtraColor(id, scheme, value) {
      if (scheme !== "light" && scheme !== "dark") return;
      const def = EXTRA_DEFS.find((d) => d.id === id);
      if (!def) return;
      if (typeof value !== "string" || value.length < 3 || value.length > 64) return;
      if (!/^(#|rgb)/i.test(value.trim())) return;
      const state = store.get();
      const pair = (state.extraColors && state.extraColors[id]) || { light: def.light, dark: def.dark };
      store.set({ extraColors: { ...(state.extraColors || {}), [id]: { ...pair, [scheme]: value.trim() } } });
    },
    async uploadImage(file) {
      const dataUrl = await readImageFile(file);
      if (dataUrl === null) return { ok: false };
      const name = file && typeof file.name === "string" ? file.name : "";
      store.set({ image: { dataUrl, name } });
      const state = store.get();
      // Uploading an image is an implicit "show me the wallpaper" gesture.
      if (!state.enabled) api.setEnabled(true);
      if (state.mode === "auto") {
        const palette = await api.autoColors();
        if (state.followScheme && palette !== null) {
          api.setTheme(palette.scheme);
        }
      }
      return { ok: true };
    },
    removeImage() {
      store.set({ image: null });
    },
    async autoColors() {
      const state = store.get();
      if (state.image === null) {
        store.set({ colors: clonePairs() });
        return null;
      }
      const sample = await sampleImageDataUrl(state.image.dataUrl);
      if (sample === null) {
        store.set({ colors: clonePairs() });
        return null;
      }
      const result = paletteFromSample(sample);
      store.set({ colors: result.colors });
      return { scheme: result.scheme, dominant: result.dominant };
    },
    resetColors() {
      const state = store.get();
      const showThrough = state.enabled && state.image !== null;
      const opacities = showThrough
        ? { ...WALLPAPER_OPACITIES }
        : Object.fromEntries(OPACITY_IDS.map((id) => [id, 1]));
      const opacitiesDefault = Object.fromEntries(OPACITY_IDS.map((id) => [id, !showThrough]));
      store.set({ colors: clonePairs(), opacities, opacitiesDefault, extraColors: defaultExtraColors() });
    },
    resetAll() {
      store.set(defaultState());
    },
    /** Serialize the whole scheme (wallpaper, colors, fonts, shapes, opacities). */
    exportScheme() {
      return JSON.stringify(store.get(), null, 2);
    },
    /** Replace the whole scheme from a previously exported JSON string. */
    importScheme(text) {
      if (typeof text !== "string" || text.trim() === "") return { ok: false, error: "empty" };
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        return { ok: false, error: "json" };
      }
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return { ok: false, error: "shape" };
      }
      store.set(normalizeState(parsed));
      return { ok: true };
    },
    dispose() {
      if (disposed.flag) return;
      disposed.flag = true;
      teardownFontScaler();
      if (overrideDispose !== null) {
        try {
          overrideDispose();
        } catch {
          // ignore
        }
        overrideDispose = null;
      }
      if (cssDispose !== null) {
        try {
          cssDispose();
        } catch {
          // ignore
        }
        cssDispose = null;
      }
      if (bgEl !== null) {
        try {
          bgEl.remove();
        } catch {
          // ignore
        }
        bgEl = null;
      }
      if (fontTag !== null) {
        try {
          fontTag.remove();
        } catch {
          // ignore
        }
        fontTag = null;
      }
    },
  };

  store.subscribe(applyNow);
  applyNow();
  return api;
}
