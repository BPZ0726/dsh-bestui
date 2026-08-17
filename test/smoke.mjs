/**
 * Smoke tests for dsh-bestui (run: node test/smoke.mjs).
 *
 * Covers:
 *   - color math, sampling digest, palette derivation, pair building
 *   - state normalization + store persistence (fake localStorage)
 *   - createRuntime against a fake theme service + fake document
 *   - dist/client.js (static bundle) mounted on a fake module loader + ctx
 *   - dist/dynamic-client.js evaluated exactly like the dynamic-package
 *     evaluator does, then mounted on a fake facade ctx
 *   - createUi(ReactStub, api) body smoke (builds the element tree once)
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const runtime = await import(pathToFileURL(join(root, "lib", "runtime.js")).href);
const { createUi } = await import(pathToFileURL(join(root, "lib", "ui.js")).href);

const ok = (label) => console.log(`  \u2713 ${label}`);
let failures = 0;
function test(label, fn) {
  try {
    fn();
    ok(label);
  } catch (error) {
    failures += 1;
    console.error(`  \u2717 ${label}`);
    console.error(String(error && error.stack ? error.stack : error));
  }
}

test("package advertises an installable DSH profile bundle", () => {
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const patch = readFileSync(join(root, "cordis.patch.yml"), "utf8");
  assert.equal(manifest.version, "0.1.1");
  assert.equal(manifest.dsh?.bundle?.patch, "./cordis.patch.yml");
  assert.equal(manifest.exports?.["./cordis.patch.yml"], "./cordis.patch.yml");
  assert.ok(manifest.files.includes("cordis.patch.yml"));
  assert.match(patch, /id:\s*dsh-bestui/);
  assert.match(patch, /name:\s*dsh-bestui/);
});

// ---------------------------------------------------------------------------
// color math
// ---------------------------------------------------------------------------

test("hexToRgb / rgbToHexString round trip", () => {
  assert.deepEqual(runtime.hexToRgb("#4A7DF0"), { r: 74, g: 125, b: 240 });
  assert.equal(runtime.rgbToHexString(74, 125, 240), "#4a7df0");
  assert.equal(runtime.isHex("#4a7dF0"), true);
  assert.equal(runtime.isHex("red"), false);
});

test("hsl round trip stays in gamut", () => {
  const { r, g, b } = runtime.hslToRgb(216, 0.6, 0.5);
  assert.ok(r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255);
  const back = runtime.rgbToHsl(r, g, b);
  assert.ok(Math.abs(back.h - 216) < 8);
});

test("rgbaFromHex clamps alpha", () => {
  assert.equal(runtime.rgbaFromHex("#000000", 0.55), "rgba(0, 0, 0, 0.55)");
  assert.equal(runtime.rgbaFromHex("#FFFFFF", 2), "rgba(255, 255, 255, 1)");
});

test("contrastRatio sanity", () => {
  const ratio = runtime.contrastRatio("#111318", "#F9FAFB");
  assert.ok(ratio > 12, `expected high contrast, got ${ratio}`);
});

// ---------------------------------------------------------------------------
// state
// ---------------------------------------------------------------------------

test("normalizeState tolerates garbage and missing fields", () => {
  const fromNull = runtime.normalizeState(null);
  assert.equal(fromNull.enabled, false);
  assert.equal(fromNull.mode, "auto");
  assert.equal(fromNull.opacities["--dsw-alias-bg-base"], 1);
  assert.equal(fromNull.colors["--dsw-alias-brand-primary"].light, "#0F1115");

  const mixed = runtime.normalizeState({
    enabled: true,
    mode: "custom",
    followScheme: false,
    image: { dataUrl: "data:image/png;base64,iVBOR", name: "a.png" },
    imageStyle: { blur: 99, dim: 2 },
    opacities: { "--dsw-alias-bg-base": -1 },
    colors: { "--dsw-alias-brand-primary": { light: "#112233", dark: "not-a-color" } },
  });
  assert.equal(mixed.enabled, true);
  assert.equal(mixed.mode, "custom");
  assert.equal(mixed.followScheme, false);
  assert.equal(mixed.imageStyle.blur, 60); // clamped
  assert.equal(mixed.imageStyle.dim, 1);   // clamped
  assert.equal(mixed.opacities["--dsw-alias-bg-base"], 0); // clamped
  assert.equal(mixed.colors["--dsw-alias-brand-primary"].light, "#112233");
  assert.equal(mixed.colors["--dsw-alias-brand-primary"].dark, "#F9FAFB"); // fallback

  // JSON round trip (what localStorage does)
  const round = runtime.normalizeState(JSON.parse(JSON.stringify(fromNull)));
  assert.deepEqual(round, fromNull);
});

test("legacy default colors migrate to the stock palette", () => {
  const legacy = runtime.normalizeState({
    colors: {
      "--dsw-alias-brand-primary": { light: "#4176E6", dark: "#6B9EFF" },
      "--dsw-alias-bg-layer-2": { light: "#F5F6F7", dark: "#2C2C2E" },
    },
  });
  assert.equal(legacy.colors["--dsw-alias-brand-primary"].light, "#0F1115", "legacy brand default migrates");
  assert.equal(legacy.colors["--dsw-alias-brand-primary"].dark, "#F9FAFB");
  assert.equal(legacy.colors["--dsw-alias-bg-layer-2"].light, "#FFFFFF");
  assert.equal(legacy.colors["--dsw-alias-bg-layer-2"].dark, "#2C2C2E");

  // a genuinely customized pair (differs from both palettes) is preserved
  const custom = runtime.normalizeState({
    colors: { "--dsw-alias-brand-primary": { light: "#123456", dark: "#6B9EFF" } },
  });
  assert.equal(custom.colors["--dsw-alias-brand-primary"].light, "#123456");
  assert.equal(custom.colors["--dsw-alias-brand-primary"].dark, "#6B9EFF");

  const legacyExtra = runtime.normalizeState({
    extraColors: { "--dsw-alias-label-primary-inverted": { light: "#FFFFFF", dark: "#353638" } },
  });
  assert.equal(legacyExtra.extraColors["--dsw-alias-label-primary-inverted"].dark, "#353638", "extra default matches the shell's dark inverted text");
  assert.ok(runtime.EXTRA_DEFS.some((d) => d.id === "--dsw-alias-tooltip-bg"), "tooltip bubble color stays customizable");
});

test("store persists via localStorage and notifies", () => {
  const storage = new Map();
  globalThis.localStorage = {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, v),
    removeItem: (k) => storage.delete(k),
  };
  const store = runtime.createStore(runtime.defaultState());
  let notified = 0;
  store.subscribe(() => { notified += 1; });
  store.set({ enabled: true });
  assert.equal(store.get().enabled, true);
  assert.equal(notified, 1);
  assert.ok(storage.has(runtime.STORAGE_KEY));
  assert.equal(JSON.parse(storage.get(runtime.STORAGE_KEY)).enabled, true);
  delete globalThis.localStorage;
});

test("scheme export / import round-trips and validates", () => {
  const theme = makeFakeTheme();
  const runtimeApi = runtime.createRuntime({ theme, insertCss: () => () => {}, console: null });
  runtimeApi.setColor("--dsw-alias-brand-primary", "light", "#123456");
  runtimeApi.setButtonRadius(0);
  runtimeApi.setOpacity("--dsw-alias-bg-base", 0.4);
  runtimeApi.setFontSize(1.2);
  const json = runtimeApi.exportScheme();
  const parsed = JSON.parse(json);
  assert.equal(parsed.colors["--dsw-alias-brand-primary"].light, "#123456");
  assert.equal(parsed.buttonRadius, 0);
  assert.equal(parsed.opacities["--dsw-alias-bg-base"], 0.4);

  // wipe, then restore from the export
  runtimeApi.resetAll();
  assert.equal(runtimeApi.store.get().colors["--dsw-alias-brand-primary"].light, "#0F1115");
  const result = runtimeApi.importScheme(json);
  assert.equal(result.ok, true);
  assert.equal(runtimeApi.store.get().colors["--dsw-alias-brand-primary"].light, "#123456");
  assert.equal(runtimeApi.store.get().buttonRadius, 0);
  assert.equal(runtimeApi.store.get().buttonRadiusDefault, false);
  assert.equal(runtimeApi.store.get().opacities["--dsw-alias-bg-base"], 0.4);
  assert.equal(runtimeApi.store.get().fontSize, 1.2);

  // invalid payloads are rejected without touching state
  assert.equal(runtimeApi.importScheme("not json").ok, false);
  assert.equal(runtimeApi.importScheme("[1,2]").ok, false);
  assert.equal(runtimeApi.importScheme("").ok, false);
  assert.equal(runtimeApi.store.get().buttonRadius, 0, "state untouched after failed imports");
  runtimeApi.dispose();
});

// ---------------------------------------------------------------------------
// pair building + palette
// ---------------------------------------------------------------------------

test("buildPairs applies per-surface opacity and border alpha", () => {
  const state = runtime.normalizeState({ enabled: true });
  const pairs = runtime.buildPairs(state);
  assert.equal(pairs["--dsw-alias-bg-base"].light, "rgba(255, 255, 255, 1)");
  assert.equal(pairs["--dsw-alias-border-l1"].light, "rgba(0, 0, 0, 0.04)");
  assert.equal(pairs["--dsw-alias-brand-primary"].dark, "#F9FAFB");
  assert.equal(state.opacitiesDefault["--dsw-alias-bg-base"], true, "untouched opacity follows the default");

  state.opacities["--dsw-alias-bg-base"] = 0.5;
  const stillOpaque = runtime.buildPairs(state);
  assert.equal(stillOpaque["--dsw-alias-bg-base"].light, "rgba(255, 255, 255, 1)", "value ignored while the default flag is on");
  state.opacitiesDefault["--dsw-alias-bg-base"] = false;
  const dimmed = runtime.buildPairs(state);
  assert.equal(dimmed["--dsw-alias-bg-base"].light, "rgba(255, 255, 255, 0.5)");
  // other surfaces untouched
  assert.equal(dimmed["--dsw-alias-bg-layer-1"].light, "rgba(255, 255, 255, 1)");
});

test("normalizeState migrates legacy opacities into default flags", () => {
  const legacy = runtime.normalizeState({ opacities: { "--dsw-alias-bg-base": 0.4, "--dsw-alias-bg-layer-1": 0.2 } });
  assert.equal(legacy.opacities["--dsw-alias-bg-base"], 0.4);
  assert.equal(legacy.opacitiesDefault["--dsw-alias-bg-base"], false, "customized surface is not default");
  assert.equal(legacy.opacities["--dsw-alias-bg-layer-1"], undefined, "pinned surface no longer tracks opacity");
  assert.equal(legacy.opacitiesDefault["--dsw-alias-bg-layer-2"], true, "untouched adjustable surface stays default");
  assert.equal(runtime.PINNED_OPAQUE_SURFACES.has("--dsw-alias-bg-overlay"), true);
  assert.equal(runtime.OPACITY_IDS.includes("--dsw-alias-bg-overlay"), false);
  const pinnedPairs = runtime.buildPairs(legacy);
  assert.equal(pinnedPairs["--dsw-alias-bg-layer-1"].light, "rgba(255, 255, 255, 1)", "pinned surface renders fully opaque");
  assert.equal(pinnedPairs["--dsw-alias-bg-overlay"].dark, "rgba(97, 102, 107, 1)", "pinned surface keeps its color, opaque");
  const tinted = runtime.normalizeState({ tintStrength: 0.8 });
  assert.equal(tinted.tintStrengthDefault, false);
  assert.equal(runtime.normalizeState({ tintStrength: 0.5 }).tintStrengthDefault, true);
});

test("tintHex scales saturation and leaves neutrals alone", () => {
  assert.equal(runtime.tintHex("#808080", 1, 0.9), "#808080");
  assert.equal(runtime.tintHex("#0F1115", 0.5, 0.8), "#0F1115", "50% reproduces the stored color verbatim");
  const muted = runtime.tintHex("#FFEEDD", 0, 0.9);
  const strong = runtime.tintHex("#FFEEDD", 1, 0.9);
  const spread = (hex) => {
    const { r, g, b } = runtime.hexToRgb(hex);
    return Math.max(r, g, b) - Math.min(r, g, b);
  };
  assert.ok(spread(strong) > spread(muted), "higher strength should produce more saturation");
});

test("buildPairs boosts surface tint with tintStrength", () => {
  const state = runtime.normalizeState({ enabled: true });
  state.colors["--dsw-alias-bg-base"] = { light: "#FFEEDD", dark: "#221100" };
  const low = runtime.buildPairs({ ...state, tintStrength: 0, tintStrengthDefault: false });
  const high = runtime.buildPairs({ ...state, tintStrength: 1, tintStrengthDefault: false });
  const spreadRgba = (rgba) => {
    const m = /^rgba\((\d+), (\d+), (\d+),/.exec(rgba);
    return Math.max(+m[1], +m[2], +m[3]) - Math.min(+m[1], +m[2], +m[3]);
  };
  assert.ok(spreadRgba(high["--dsw-alias-bg-base"].light) > spreadRgba(low["--dsw-alias-bg-base"].light));
  const neutral = runtime.buildPairs({ ...state, tintStrength: 1, tintStrengthDefault: true });
  const mid = runtime.buildPairs({ ...state, tintStrength: 0.5, tintStrengthDefault: false });
  assert.equal(neutral["--dsw-alias-bg-base"].light, mid["--dsw-alias-bg-base"].light, "default flag forces neutral 50% strength");
});

test("rotateHue shifts hue and leaves grays alone", () => {
  assert.equal(runtime.rotateHue("#808080", 90), "#808080");
  const green = runtime.hexToRgb(runtime.rotateHue("#FF0000", 120));
  assert.ok(green.g > 200 && green.r < 80, "red + 120deg should become green");
  // hue shift flows through buildPairs onto the text colors
  const state = runtime.normalizeState({ enabled: true, fontHue: 180 });
  const pairs = runtime.buildPairs(state);
  assert.equal(typeof pairs["--dsw-alias-label-primary"].light, "string");
  // zero shift passes text colors through verbatim (no hsl round-trip drift)
  const zero = runtime.buildPairs(runtime.normalizeState({ enabled: true }));
  assert.equal(zero["--dsw-alias-label-primary"].light, "#0F1115");
  assert.equal(zero["--dsw-alias-label-secondary"].dark, "#CFD3D6");
});

test("cssToPicker and pickerToCss round-trip rgba and hex", () => {
  const p = runtime.cssToPicker("rgba(38, 49, 72, .06)");
  assert.equal(p.color, "#263148");
  assert.ok(Math.abs(p.alpha - 0.06) < 1e-9);
  assert.equal(runtime.pickerToCss("#263148", 0.06), "rgba(38, 49, 72, 0.06)");
  assert.equal(runtime.pickerToCss("#FFFFFF", 1), "#FFFFFF");
  assert.equal(runtime.cssToPicker("#353638").alpha, 1);
  // short and 8-digit hex forms render correctly in the picker
  assert.deepEqual(runtime.cssToPicker("#fff"), { color: "#FFFFFF", alpha: 1 });
  assert.deepEqual(runtime.cssToPicker("#AbC"), { color: "#AABBCC", alpha: 1 });
  const eight = runtime.cssToPicker("#11223380");
  assert.equal(eight.color, "#112233");
  assert.ok(Math.abs(eight.alpha - 0.5) < 0.01);
});

test("font settings inject and revert a dedicated style tag", () => {
  const savedDocument = globalThis.document;
  const doc = makeFakeDocument();
  globalThis.document = doc;
  try {
    const runtimeApi = runtime.createRuntime({ theme: makeFakeTheme(), insertCss: () => () => {}, console: null });
    assert.equal(doc.head.children.find((c) => c.tagName === "STYLE"), undefined, "no font tag by default");
    runtimeApi.setFontWeight(700);
    const tag = doc.head.children.find((c) => c.tagName === "STYLE" && String(c.textContent).indexOf("font-weight: 700") !== -1);
    assert.ok(tag, "font style tag injected");
    runtimeApi.setFontFamily("mono");
    assert.ok(String(tag.textContent).indexOf("monospace") !== -1, "family stack applied");
    runtimeApi.setFontScale(1.2);
    assert.ok(String(tag.textContent).indexOf("zoom: 1.2") !== -1, "scale applied");
    runtimeApi.setFontWeight(400);
    runtimeApi.setFontFamily("default");
    runtimeApi.setFontScale(1);
    assert.ok(tag.removed === true || !doc.head.children.includes(tag), "font tag removed when back to defaults");
    runtimeApi.dispose();
  } finally {
    if (savedDocument === undefined) delete globalThis.document;
    else globalThis.document = savedDocument;
  }
});

test("font size scaler paints text-only sizes and cleans up", () => {
  const savedDocument = globalThis.document;
  const savedCss = globalThis.getComputedStyle;
  const doc = makeFakeDocument();
  globalThis.document = doc;
  const div = makeFakeElement("div");
  const span = makeFakeElement("span");
  div.appendChild(span);
  doc.body.appendChild(div);
  // Live resolver: an element's computed size is the nearest ancestor inline
  // font-size (what our scaler painted) or the base 16px.
  let computedReads = 0;
  const resolveSize = (node) => {
    let p = node;
    while (p !== null) {
      const v = p.style.props["font-size"];
      if (v !== undefined && v !== "") return v;
      p = p.parentElement;
    }
    return "16px";
  };
  globalThis.getComputedStyle = (el) => {
    computedReads += 1;
    return { fontSize: resolveSize(el) };
  };
  try {
    const runtimeApi = runtime.createRuntime({ theme: makeFakeTheme(), insertCss: () => () => {}, console: null });
    assert.equal(div.style.props["font-size"], undefined, "no font scaling by default");
    runtimeApi.setFontSize(1.25);
    assert.equal(div.style.props["font-size"], "20px", "div scaled");
    assert.equal(span.style.props["font-size"], "20px", "span scaled");
    assert.equal(div.getAttribute("data-dsw-font-base"), "16", "original size cached");
    // observer path: a node inserted while scaling is active inherits the
    // PAINTED 20px; it must not compound (base stays 16, not 20)
    const late = makeFakeElement("em");
    div.appendChild(late);
    runtime.paintFontSubtree(late, 1.25, runtime.parentFontRef(late));
    assert.equal(late.style.props["font-size"], "20px", "late node painted at the active scale");
    assert.equal(late.getAttribute("data-dsw-font-base"), "16", "late node base is the parent's original, no compounding");
    const readsAfterFirstPaint = computedReads;
    runtimeApi.setFontSize(1.3);
    assert.equal(late.style.props["font-size"], "20.8px", "late node rescales from its cached base");
    assert.equal(late.getAttribute("data-dsw-font-base"), "16", "late node base survives a rescale");
    assert.equal(computedReads, readsAfterFirstPaint, "scale-only change repaints from cache with zero re-reads");
    runtimeApi.setFontSizeDefault(true);
    assert.equal(div.style.props["font-size"], undefined, "scaling cleared on default");
    assert.equal(div.getAttribute("data-dsw-font-base"), null, "base cache cleared");
    assert.equal(span.style.props["font-size"], undefined, "span cleared");
    assert.equal(late.style.props["font-size"], undefined, "late node cleared");
    runtimeApi.dispose();
  } finally {
    if (savedCss === undefined) delete globalThis.getComputedStyle;
    else globalThis.getComputedStyle = savedCss;
    if (savedDocument === undefined) delete globalThis.document;
    else globalThis.document = savedDocument;
  }
});

test("extra colors and corner radius inject and revert", () => {
  const savedDocument = globalThis.document;
  const doc = makeFakeDocument();
  globalThis.document = doc;
  try {
    const runtimeApi = runtime.createRuntime({ theme: makeFakeTheme(), insertCss: () => () => {}, console: null });
    assert.equal(doc.head.children.find((c) => c.tagName === "STYLE"), undefined, "no style tag by default");
    runtimeApi.setExtraColor("--dsw-alias-border-l3", "dark", "#123456");
    const tag = doc.head.children.find((c) => c.tagName === "STYLE" && String(c.textContent).indexOf("--dsw-alias-border-l3: #123456") !== -1);
    assert.ok(tag, "extra color block injected");
    assert.ok(String(tag.textContent).indexOf("body[data-ds-dark-theme]") !== -1, "dark block present");
    assert.ok(String(tag.textContent).indexOf(":root {") === -1, "light extra colors must target body, not :root");
    assert.ok(String(tag.textContent).indexOf("body { --dsw-alias-interactive-bg-hover") !== -1, "light extra colors declared on body");
    assert.ok(String(tag.textContent).indexOf("--dsw-alias-border-l3: rgba(0, 0, 0, .12) !important") !== -1, "light extra colors marked !important");
    // returning to the default via picker-shaped rgba must tear the tag down
    runtimeApi.setExtraColor("--dsw-alias-border-l3", "dark", "rgba(255, 255, 255, 0.16)");
    assert.ok(tag.removed === true || !doc.head.children.includes(tag), "tag removed when extra color back to default");
    runtimeApi.setButtonRadius(16);
    const tag2 = doc.head.children.find((c) => c.tagName === "STYLE" && String(c.textContent).indexOf("[role=\"button\"]") !== -1 && String(c.textContent).indexOf("min(16px, 50%)") !== -1);
    assert.ok(tag2, "button radius injected");
    runtimeApi.setInputRadius(8);
    assert.ok(String(tag2.textContent).indexOf("min(8px, 50%)") !== -1, "input radius injected");
    assert.ok(String(tag2.textContent).indexOf("[data-composer-card]") !== -1, "composer card is part of the input selector");
    runtimeApi.setCardRadius(20);
    assert.ok(String(tag2.textContent).indexOf("min(20px, 50%)") !== -1, "card radius injected");
    runtimeApi.setDialogRadius(30);
    assert.ok(String(tag2.textContent).indexOf("min(30px, 50%)") !== -1, "dialog radius injected");
    runtimeApi.setButtonRadius(0);
    assert.ok(String(tag2.textContent).indexOf("min(0px, 50%)") !== -1, "sharp radius injected at 0");
    runtimeApi.resetShape();
    assert.ok(tag2.removed === true || !doc.head.children.includes(tag2), "tag removed by resetShape");
    runtimeApi.setDialogWidth(600);
    const tag3 = doc.head.children.find((c) => c.tagName === "STYLE" && String(c.textContent).indexOf("[class*=\"_dialog_\"]") !== -1 && String(c.textContent).indexOf("width: 600px") !== -1);
    assert.ok(tag3, "dialog width injected");
    assert.ok(String(tag3.textContent).indexOf(":has(.dsw-root)") !== -1, "dialog size scoped to the settings window only");
    runtimeApi.setDialogHeight(700);
    assert.ok(String(tag3.textContent).indexOf("height: 700px") !== -1, "dialog height injected");
    runtimeApi.setDialogWidthDefault(true);
    runtimeApi.setDialogHeightDefault(true);
    assert.ok(tag3.removed === true || !doc.head.children.includes(tag3), "size rules removed when default is re-checked");
    runtimeApi.dispose();
  } finally {
    if (savedDocument === undefined) delete globalThis.document;
    else globalThis.document = savedDocument;
  }
});

test("paletteFromSample: dark teal image -> dark scheme, teal hues", () => {
  const sample = {
    dominant: "#1A4040",
    average: "#244848",
    clusters: [{ hex: "#1A4040", weight: 0.8 }, { hex: "#E0E0E0", weight: 0.1 }],
    luminance: 0.06,
    dominantLuminance: 0.04,
    hue: 180,
    saturation: 0.45,
    saturated: { hex: "#1A4040", hue: 180, saturation: 0.45 },
  };
  const { colors, scheme } = runtime.paletteFromSample(sample);
  assert.equal(scheme, "dark");
  const base = runtime.hexToRgb(colors["--dsw-alias-bg-base"].dark);
  assert.ok(base.b >= base.r, "dark base should lean teal/blue");
  const ratio = runtime.contrastRatio(
    colors["--dsw-alias-label-primary"].dark,
    colors["--dsw-alias-bg-base"].dark
  );
  assert.ok(ratio >= 4.5, `label contrast ${ratio} below 4.5`);
});

test("paletteFromSample: light pastel image -> light scheme", () => {
  const sample = {
    dominant: "#F2E8E0",
    average: "#F0E8E2",
    clusters: [{ hex: "#F2E8E0", weight: 0.9 }],
    luminance: 0.82,
    dominantLuminance: 0.8,
    hue: 25,
    saturation: 0.1,
    saturated: { hex: "#F2E8E0", hue: 25, saturation: 0.1 },
  };
  const { colors, scheme } = runtime.paletteFromSample(sample);
  assert.equal(scheme, "light");
  assert.equal(colors["--dsw-alias-state-error-primary"].light, "#EC1313");
});

test("paletteFromSample: light scheme follows bright pixels, dark scheme follows dark pixels", () => {
  const sample = {
    dominant: "#C96F2B",
    average: "#8A7A5A",
    clusters: [
      { hex: "#F2D9C2", weight: 0.5 }, // warm bright side
      { hex: "#2B1E14", weight: 0.5 }, // warm dark side
    ],
    luminance: 0.5,
    dominantLuminance: 0.3,
    hue: 25,
    saturation: 0.4,
    saturated: { hex: "#C96F2B", hue: 25, saturation: 0.7 },
  };
  const { colors, scheme } = runtime.paletteFromSample(sample);
  const lightBase = runtime.hexToRgb(colors["--dsw-alias-bg-base"].light);
  const darkBase = runtime.hexToRgb(colors["--dsw-alias-bg-base"].dark);
  // warm family: red channel leads in both schemes
  assert.ok(lightBase.r > lightBase.b, "light base should follow the bright warm pixels");
  assert.ok(darkBase.r > darkBase.b, "dark base should follow the dark warm pixels");
  assert.equal(scheme, "light");
});

// ---------------------------------------------------------------------------
// runtime against fakes
// ---------------------------------------------------------------------------

function makeFakeElement(tag) {
  return {
    tagName: (tag || "div").toUpperCase(),
    nodeType: 1,
    dataset: {},
    style: {
      props: {},
      setProperty(k, v) { this.props[k] = v; },
      removeProperty(k) { delete this.props[k]; },
      getPropertyValue(k) { return this.props[k] !== undefined ? String(this.props[k]) : ""; },
    },
    attributes: {},
    children: [],
    firstChild: null,
    parentElement: null,
    src: "",
    isConnected: true,
    setAttribute(k, v) { this.attributes[k] = v; },
    getAttribute(k) { return this.attributes[k] !== undefined ? this.attributes[k] : null; },
    hasAttribute(k) { return this.attributes[k] !== undefined; },
    removeAttribute(k) { delete this.attributes[k]; },
    appendChild(child) {
      const last = this.children.length > 0 ? this.children[this.children.length - 1] : null;
      this.children.push(child);
      child.parentElement = this;
      child.nextSibling = null;
      if (last !== null) last.nextSibling = child;
      if (this.firstChild === null) this.firstChild = child;
      return child;
    },
    remove() { this.removed = true; },
    draggable: false,
    alt: "",
  };
}

function makeFakeDocument() {
  const body = makeFakeElement("body");
  const head = makeFakeElement("head");
  const documentElement = makeFakeElement("html");
  documentElement.appendChild(head);
  documentElement.appendChild(body);
  return {
    body,
    head,
    documentElement,
    createElement: (tag) => makeFakeElement(tag),
    querySelector: () => null,
    querySelectorAll(selector) {
      const out = [];
      const wantBase = selector === "[data-dsw-font-base]";
      (function walk(node) {
        if (!node) return;
        if (node.nodeType === 1) {
          if (wantBase && node.hasAttribute("data-dsw-font-base")) out.push(node);
          for (const child of node.children) walk(child);
        }
      })(body);
      return out;
    },
  };
}

function makeFakeTheme() {
  return {
    layers: [],
    overrideTokens(source, tokens) {
      const record = { source, tokens, disposed: false };
      this.layers.push(record);
      return () => { record.disposed = true; };
    },
    getTheme() {
      return { preference: "system", revision: 1 };
    },
    setThemeCalls: [],
    setTheme(id) { this.setThemeCalls.push(id); },
  };
}

test("createRuntime: enabled without image emits full pairs; opacity flows", () => {
  const theme = makeFakeTheme();
  const css = [];
  const runtimeApi = runtime.createRuntime({
    theme,
    insertCss: (text) => { css.push(text); return () => {}; },
    console: null,
  });
  assert.equal(css.length, 1, "css installed at start");
  runtimeApi.setEnabled(true);
  assert.equal(theme.layers.length, 2, "re-applied after state change");
  const last = theme.layers[theme.layers.length - 1];
  assert.equal(Object.keys(last.tokens).length, runtime.ALL_TOKEN_IDS.length, "enabled -> full pair set");
  assert.equal(last.tokens["--dsw-alias-bg-base"].light, "rgba(255, 255, 255, 1)");
  runtimeApi.setOpacity("--dsw-alias-bg-base", 0.3);
  const after = theme.layers[theme.layers.length - 1].tokens;
  assert.equal(after["--dsw-alias-bg-base"].light, "rgba(255, 255, 255, 0.3)");
  runtimeApi.setOpacityDefault("--dsw-alias-bg-base", true);
  const defaulted = theme.layers[theme.layers.length - 1].tokens;
  assert.equal(defaulted["--dsw-alias-bg-base"].light, "rgba(255, 255, 255, 1)", "re-checking default restores full opacity");
  runtimeApi.setColor("--dsw-alias-brand-primary", "light", "#123456");
  const withColor = theme.layers[theme.layers.length - 1].tokens;
  assert.equal(withColor["--dsw-alias-brand-primary"].light, "#123456");
  assert.equal(withColor["--dsw-alias-brand-primary"].dark, "#F9FAFB");
  runtimeApi.dispose();
  assert.ok(theme.layers.every((l) => l.disposed));
});

test("disabled stock state emits no layer; custom colors apply while disabled", () => {
  const theme = makeFakeTheme();
  const runtimeApi = runtime.createRuntime({
    theme,
    insertCss: () => () => {},
    console: null,
  });
  assert.equal(runtime.appearanceIsStock(runtimeApi.store.get()), true);
  assert.equal(Object.keys(theme.layers[0].tokens).length, 0, "stock + disabled leaves other themes untouched");
  runtimeApi.setColor("--dsw-alias-brand-primary", "light", "#123456");
  const colored = theme.layers[theme.layers.length - 1].tokens;
  assert.equal(colored["--dsw-alias-brand-primary"].light, "#123456", "custom colors apply while the wallpaper is off");
  runtimeApi.setOpacity("--dsw-alias-bg-base", 0.3);
  const dimmed = theme.layers[theme.layers.length - 1].tokens;
  assert.equal(dimmed["--dsw-alias-bg-base"].light, "rgba(255, 255, 255, 1)", "surfaces stay opaque while disabled");
  // restoring the color but keeping a custom opacity still keeps the layer
  runtimeApi.setColor("--dsw-alias-brand-primary", "light", "#0F1115");
  assert.equal(runtime.appearanceIsStock(runtimeApi.store.get()), false);
  assert.equal(Object.keys(theme.layers[theme.layers.length - 1].tokens).length, runtime.ALL_TOKEN_IDS.length);
  runtimeApi.setOpacityDefault("--dsw-alias-bg-base", true);
  assert.equal(runtime.appearanceIsStock(runtimeApi.store.get()), true);
  assert.equal(Object.keys(theme.layers[theme.layers.length - 1].tokens).length, 0, "fully stock again -> layer withdrawn");
  runtimeApi.dispose();
});

test("createRuntime: wallpaper element lifecycle with fake document", () => {
  const savedDocument = globalThis.document;
  const doc = makeFakeDocument();
  globalThis.document = doc;
  try {
    const theme = makeFakeTheme();
    const runtimeApi = runtime.createRuntime({
      theme,
      insertCss: () => () => {},
      console: null,
    });
    runtimeApi.setEnabled(true);
    runtimeApi.store.set({
      image: { dataUrl: "data:image/png;base64,iVBORw0KGgo=", name: "bg.png" },
    });
    const wall = doc.body.children.find((c) => c.attributes["data-dsw-wallpaper"] !== undefined);
    assert.ok(wall, "wallpaper element appended");
    const img = wall.children.find((c) => c.tagName === "IMG");
    assert.equal(img.src, "data:image/png;base64,iVBORw0KGgo=");
    assert.equal(wall.style.props["--dsw-wp-fit"], "cover");
    assert.equal(wall.style.props["--dsw-wp-blur"], "0px");
    assert.equal(wall.style.props["--dsw-wp-dim"], "0");

    runtimeApi.setImageStyle("blur", 8);
    runtimeApi.setImageStyle("dim", 0.5);
    assert.equal(wall.style.props["--dsw-wp-blur"], "8px");
    assert.equal(wall.style.props["--dsw-wp-dim"], "0.5");

    runtimeApi.setEnabled(false);
    assert.ok(wall.removed, "wallpaper element removed on disable");
    runtimeApi.dispose();
  } finally {
    if (savedDocument === undefined) delete globalThis.document;
    else globalThis.document = savedDocument;
  }
});

test("readImageFile rejects non-image files gracefully (no FileReader in Node)", async () => {
  const result = await runtime.readImageFile({ type: "text/plain" });
  assert.equal(result, null);
});

test("compressDataUrl keeps animated GIFs untouched", async () => {
  const gif = "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";
  const result = await runtime.compressDataUrl(gif, "image/gif");
  assert.equal(result, gif);
});

// ---------------------------------------------------------------------------
// static bundle (dist/client.js)
// ---------------------------------------------------------------------------

test("static bundle: loads, registers the settings row, applies overrides", () => {
  const source = readFileSync(join(root, "dist", "client.js"), "utf8");
  let factory = null;
  const fakeWindow = {
    __ModuleLoader__: {
      load(record) {
        factory = record.factory;
      },
    },
  };
  new Function("window", source)(fakeWindow);
  assert.equal(typeof factory, "function");

  const reactStub = {
    createElement: (type, props, ...children) => ({ type, props, children }),
    useState: () => [false, () => {}],
    useRef: () => ({ current: null }),
    useSyncExternalStore: (subscribe, get) => get(),
    useEffect: () => {},
  };
  const moduleExport = factory((name) => {
    assert.equal(name, "react");
    return reactStub;
  });

  assert.deepEqual(moduleExport.inject, ["theme", "slots"]);
  assert.equal(typeof moduleExport.apply, "function");

  const theme = makeFakeTheme();
  const slots = {
    registrations: [],
    inject(key, callback) {
      this.key = key;
      const dispose = callback();
      this.registerDispose = dispose;
      return () => {};
    },
    register(options, component) {
      this.registrations.push({ options, component });
      return () => {};
    },
  };
  let effectDisposer = null;
  const ctx = {
    theme,
    slots,
    effect(fn) {
      effectDisposer = fn();
      return () => {};
    },
  };
  const api = moduleExport.apply(ctx);
  assert.equal(typeof api, "function");
  assert.equal(api, effectDisposer);
  assert.equal(slots.key, "settings.general.item");
  assert.equal(slots.registrations.length, 1);
  assert.equal(slots.registrations[0].options.name, "settings.general.item");
  assert.equal(slots.registrations[0].options.id, "wallpaper-theme");
  assert.equal(slots.registrations[0].options.order, 20);
  assert.equal(typeof slots.registrations[0].component, "function");
  assert.ok(theme.layers.length >= 1);
  assert.equal(theme.layers[0].source, "dsh-bestui");

  // dispose path restores everything
  effectDisposer();
  assert.ok(theme.layers.every((l) => l.disposed));
});

test("static bundle: createUi body builds an element tree against a stub React", () => {
  const source = readFileSync(join(root, "dist", "client.js"), "utf8");
  let factory = null;
  new Function("window", source)({ __ModuleLoader__: { load: (r) => { factory = r.factory; } } });
  const made = [];
  const reactStub = {
    createElement: (type, props, ...children) => {
      made.push(type);
      return { type, props, children };
    },
    useState: (initial) => [initial, () => {}],
    useRef: () => ({ current: null }),
    useSyncExternalStore: (subscribe, get) => get(),
    useEffect: () => {},
  };
  const moduleExport = factory(() => reactStub);
  const theme = makeFakeTheme();
  const slots = {
    registrations: [],
    inject(key, callback) {
      callback();
      return () => {};
    },
    register(options, component) {
      this.registrations.push({ options, component });
      return () => {};
    },
  };
  moduleExport.apply({
    theme,
    slots,
    effect: () => () => {},
  });
  assert.equal(slots.registrations.length, 1);
  slots.registrations[0].component({});
  assert.ok(made.length > 0, "component built some elements");
});

// ---------------------------------------------------------------------------
// dynamic bundle (dist/dynamic-client.js)
// ---------------------------------------------------------------------------

test("dynamic bundle: evaluates like the runner, returns a mountable plugin", async () => {
  const source = readFileSync(join(root, "dist", "dynamic-client.js"), "utf8");
  const parameters = [
    "React", "console", "styles", "host", "harness",
    "setTimeout", "setInterval", "clearTimeout", "clearInterval", "fetch",
    "require", "process", "Buffer",
  ];
  const reactStub = {
    createElement: (type, props, ...children) => ({ type, props, children }),
    useState: () => [false, () => {}],
    useRef: () => ({ current: null }),
    useSyncExternalStore: (subscribe, get) => get(),
    useEffect: () => {},
  };
  const stylesStub = {
    inserted: [],
    insert(css) {
      this.inserted.push(css);
      return () => {};
    },
  };
  const consoleStub = { warn() {} };
  const closure = new Function(
    ...parameters,
    `return (async () => {\n${source}\n})()`
  );
  const plugin = await closure(
    reactStub,
    consoleStub,
    stylesStub,
    { call: () => Promise.resolve(null) },
    new Proxy({}, { get: () => () => { throw new Error("harness trap"); } }),
    () => {}, () => {}, () => {}, () => {}, () => {},
    () => { throw new Error("require trap"); },
    undefined, undefined
  );

  assert.equal(typeof plugin, "object");
  assert.equal(plugin.name, "BestUI");
  assert.deepEqual(plugin.inject, ["theme", "slots"]);
  assert.equal(typeof plugin.apply, "function");

  const theme = makeFakeTheme();
  const slots = {
    registrations: [],
    inject(key, callback) {
      this.key = key;
      const dispose = callback();
      this.registerDispose = dispose;
      return () => {};
    },
    register(options, component) {
      this.registrations.push({ options, component });
      return () => {};
    },
  };
  let effectDisposer = null;
  const ctx = {
    theme,
    slots,
    effect(fn) {
      effectDisposer = fn();
      return () => {};
    },
  };
  const api = plugin.apply(ctx);
  assert.equal(typeof api, "function");
  assert.equal(api, effectDisposer);
  assert.equal(slots.key, "settings.general.item");
  assert.equal(slots.registrations.length, 1);
  assert.ok(stylesStub.inserted.length >= 1, "dynamic styles.insert used");
  assert.ok(theme.layers.length >= 1);
  effectDisposer();
  assert.ok(theme.layers.every((l) => l.disposed));
});

// ---------------------------------------------------------------------------

console.log("");
if (failures > 0) {
  console.error(`smoke tests finished with ${failures} failure(s)`);
  process.exit(1);
} else {
  console.log("smoke tests passed");
}
