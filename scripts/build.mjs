/**
 * Builds the two distributable client halves from the single portable core
 * (lib/runtime.js + lib/ui.js):
 *
 *   dist/client.js         — static plugin bundle in the browser module
 *                            system's CJS-factory form. The host serves this
 *                            file verbatim at /plugins/<pkg>/client.js; the
 *                            factory `require("react")` resolves through the
 *                            shell's shared-module seed table.
 *
 *   dist/dynamic-client.js — the browser half of a dynamic Cordis package:
 *                            a plain async function body (no imports, no JSX)
 *                            that returns the plugin object. `React`, `styles`
 *                            and `console` arrive as closure symbols.
 *
 * Both halves mount the exact same runtime: token override layers over the
 * active theme (ctx.theme.overrideTokens) + one settings row registered into
 * the `settings.general.item` slot (ctx.slots). All cleanup hangs on the
 * calling fiber via ctx.effect, so unload restores the stock look.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => readFileSync(join(root, name), "utf8");

const runtimeSrc = read("lib/runtime.js");
const uiSrc = read("lib/ui.js");

// Both sources are import-free by design; strip the module-level `export`
// keyword so they inline into one function/closure scope.
const stripExports = (src) => src.replace(/^export\s+/gm, "");
const indent = (src, pad) => src.split("\n").map((line) => pad + line).join("\n");

const runtimeInline = indent(stripExports(runtimeSrc), "    ");
const uiInline = indent(stripExports(uiSrc), "    ");

const META = {
  name: "BestUI",
  description:
    "Wallpaper background theme for the dsh web GUI: image background, per-surface opacity, per-element light/dark colors, auto palettes from the image or the browser color scheme.",
};

// Shared apply body; __REACT__ / __INSERT_CSS__ are substituted per target.
const APPLY_BODY = `function apply(ctx) {
  var api = createRuntime({ theme: ctx.theme, insertCss: __INSERT_CSS__, console: console });
  var unregister = ctx.slots.inject("settings.general.item", function () {
    return ctx.slots.register(
      { name: "settings.general.item", id: "wallpaper-theme", order: 20 },
      createUi(__REACT__, api)
    );
  });
  function disposeWallpaperTheme() {
    try { unregister(); } catch (error) {}
    api.dispose();
  }
  ctx.effect(function () {
    return disposeWallpaperTheme;
  });
  // The shell's Cordis core collects apply's return value as an effect:
  // returning a plain object here is rejected ("Invalid effect"). Return the
  // disposer so BOTH the static module path (ctx.effect) and the dynamic
  // package runner (return value) tear the runtime down; both entries are
  // idempotent, so double disposal is safe.
  return disposeWallpaperTheme;
}`;

const STATIC_INSERT_CSS = `var insertCss = function (css) {
    if (typeof document === "undefined") return function () {};
    var tagId = "dsh-bestui/style";
    if (document.querySelector('style[data-plugin-css="' + tagId + '"]') !== null) {
      // re-activation reuses the existing tag
      return function () {};
    }
    var tag = document.createElement("style");
    tag.dataset.plugin = "dsh-bestui";
    tag.dataset.pluginCss = tagId;
    tag.textContent = css;
    document.head.appendChild(tag);
    return function () {
      try { tag.remove(); } catch (error) {}
    };
  };`;

const DYNAMIC_INSERT_CSS = `(function (css) {
    try {
      return styles.insert(css);
    } catch (error) {
      console.warn("[dsh-bestui] styles.insert failed", error);
      return function () {};
    }
  })`;

const staticBundle = `/* GENERATED FILE — do not edit. Run \`node scripts/build.mjs\` to rebuild.
 * Static client bundle (browser module system CJS-factory form) for
 * dsh-bestui. Served verbatim by the dsh host at
 * /plugins/dsh-bestui/client.js.
 */
window.__ModuleLoader__.load({
  id: "dsh-bestui",
  factory: function (require) {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    var React = require("react");

${runtimeInline}

${uiInline}

    var inject = ["theme", "slots"];
${STATIC_INSERT_CSS}

${APPLY_BODY.replace("__REACT__", "React").replace("__INSERT_CSS__", "insertCss")}

    exports.apply = apply;
    exports.inject = inject;
    exports.meta = ${JSON.stringify(META, null, 2)};
    return module.exports;
  }
});
`;

const dynamicBundle = `/* GENERATED FILE — do not edit. Run \`node scripts/build.mjs\` to rebuild.
 * Dynamic client half (browser half of a Cordis package) for
 * dsh-bestui. Plain JavaScript async function body: no
 * imports, no JSX. \`React\`, \`styles\` and \`console\` arrive as closure
 * symbols provided by the dynamic package evaluator. Return the plugin object.
 */

${stripExports(runtimeSrc)}

${stripExports(uiSrc)}

${APPLY_BODY.replace("__REACT__", "React").replace("__INSERT_CSS__", DYNAMIC_INSERT_CSS)}

return {
  name: ${JSON.stringify(META.name)},
  inject: ["theme", "slots"],
  apply: apply
};
`;

mkdirSync(join(root, "dist"), { recursive: true });
writeFileSync(join(root, "dist", "client.js"), staticBundle);
writeFileSync(join(root, "dist", "dynamic-client.js"), dynamicBundle);

console.log("build.mjs: wrote dist/client.js and dist/dynamic-client.js");
