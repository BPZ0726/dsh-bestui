// One-shot zh copy polisher: for each t(zh, en) call whose EN string matches an
// anchor below, replace ONLY the zh argument with the new copy (non-ASCII is
// re-escaped as \uXXXX, matching the file's existing convention). Every other
// byte of lib/ui.js is left untouched.
import fs from "node:fs";

const file = "lib/ui.js";
const src = fs.readFileSync(file, "utf8");

const enc = (s) =>
  s.replace(/[^\x00-\x7F]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0"));

// [exact EN string inside t(zh, en), new Chinese copy]
const pairs = [
  ["Upload an image as the background; each translucent surface gets its own opacity; every element's color is customizable per light/dark scheme; or generate a palette automatically from the image or the browser theme.",
   "以图片作为界面背景；各透明部件可单独调节不透明度；每个元素可按浅色/深色方案自定义颜色；也可从图片或系统主题自动生成配色。"],

  ["Match theme to image brightness after upload",
   "上传后按图片明暗自动切换主题"],

  ["Exports every setting (wallpaper, colors, fonts, radii, opacities) as a JSON file; importing replaces the current scheme.",
   "导出为 JSON 文件（壁纸、配色、字体、圆角、不透明度等全部设置）；导入后整体替换当前方案。"],

  ['Check \\"default\\" on the right to stay fully opaque (following the product); uncheck and drag the slider — lower values let the wallpaper show through more. This section covers the base background, layer 2 surface and the sidebar. Higher \\"Tint strength\\" makes the theme tint on surfaces and the sidebar more pronounced.',
   "勾选「默认」即完全不透明（跟随产品）；取消勾选后拖动滑杆，数值越小壁纸透出越多。可调项：背景基底、第二层表面、侧边栏。「主题色突出程度」越高，表面与侧边栏的主题色调越浓。"],

  ['Tune the font family, weight, size and \\"Text hue\\"; checking \\"default\\" on the right follows the product, uncheck it and drag the slider to apply. \\"Font size\\" changes text only, not controls or windows (use \\"UI scale\\" in \\"Interface settings\\" for the whole UI).',
   "字体风格、字重、字号与「文字色相」均可调节，勾选「默认」即跟随产品原样。注意：「字体大小」只缩放文字，不影响按钮、窗口等控件（整体缩放请用「界面设置」→「界面缩放」）。"],

  ['Check \\"default\\" on the right to follow the product; uncheck and drag the slider to apply. A radius of 0 is a true right angle and larger values are rounder (capped at a half circle). \\"UI scale\\" resizes the whole interface and its controls.',
   "勾选「默认」即跟随产品原样，取消勾选后拖动滑杆生效。圆角为 0 是真正的直角，越大越圆（上限半圆）。「界面缩放」整体缩放界面与控件。"],

  ["Each element takes a light-scheme and a dark-scheme color; borders render as translucent tints. Auto-generated palettes derive the light scheme from the image's bright side and the dark scheme from its dark side; switching the theme applies the matching scheme. Surfaces like overlays, popovers and the sidebar now carry the actual tint of the image's bright/dark side instead of near-white / near-black. Color settings are independent of the Enable toggle: your custom palette stays applied even when the wallpaper is off.",
   "每个元素可分别设置浅色/深色方案下的颜色，边框为透明着色。自动配色从图片亮部推出浅色方案、暗部推出深色方案，切换主题即套用；浮层、弹窗、侧边栏等表面会直接带出图片亮暗部的色调。颜色自定义与「启用」开关无关——关闭壁纸后配色依然生效。"],

  ["Reset interface defaults",
   "恢复界面默认"],
];

const tRe = /t\(\s*"((?:\\.|[^"\\])*)"\s*,\s*"((?:\\.|[^"\\])*)"\s*\)/gs;

let out = "";
let last = 0;
let count = 0;
const seen = new Set();
for (const m of src.matchAll(tRe)) {
  const en = m[2];
  const pair = pairs.find(([e]) => e === en);
  if (!pair) continue;
  seen.add(en);
  const zhStart = m.index + m[0].indexOf(m[1]);
  out += src.slice(last, zhStart) + enc(pair[1]);
  last = zhStart + m[1].length;
  count++;
}
out += src.slice(last);

if (count !== pairs.length) {
  console.error(`matched ${count}/${pairs.length}`);
  for (const [e] of pairs) if (!seen.has(e)) console.error("MISSING:", e.slice(0, 60) + "...");
  process.exit(1);
}
fs.writeFileSync(file, out);
console.log(`polished ${count} zh strings`);
