# BestUI · 壁纸主题插件

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-blue.svg)](package.json)
[![npm](https://img.shields.io/npm/v/dsh-bestui.svg)](https://www.npmjs.com/package/dsh-bestui)
[![CI](https://github.com/BPZ0726/dsh-bestui/actions/workflows/ci.yml/badge.svg)](https://github.com/BPZ0726/dsh-bestui/actions/workflows/ci.yml)

> 给 DeepSeek Harness Web GUI 的背景主题插件（又名 *壁纸主题 / Wallpaper theme*）。
> A background theme plugin for the **DeepSeek Harness Web GUI**, a.k.a. *壁纸主题*.

> **预览版提示 / Preview:** BestUI `0.1.x` 面向仍在快速迭代的 DeepSeek Harness
> Developer Preview，宿主升级后可能需要同步适配。

---

## 功能特性 / Features

- 🖼 **上传图片当背景 / Wallpaper upload**：本地选图即用，超限图片自动压缩（降采样 + JPEG 重编码），动画 GIF 保留动画，设置持久保存在浏览器 `localStorage`。
- 🪟 **透明部件不透明度 / Per-surface opacity**：背景基底 / 第二层表面 / 侧边栏各配独立滑块与「默认」勾选；数值越小壁纸透出越多。其余表面固定不透明（颜色仍可自定义）。
- 🎨 **元素颜色自定义 / Per-element colors**：14 个设计 token（表面 / 边框 / 品牌色 / 主次文字 / 状态色）+ 9 个额外元素色（悬停 / 选中按下 / 滚动条 / 提示气泡等），每个都按 **浅色 / 深色** 两套方案分别取色，边框按 shell 同款透明度渲染。
  - 颜色自定义与「启用」开关**无关**：关闭壁纸后自定义配色仍然生效。
  - 「恢复默认配色」= 产品 design-platform 原始色板（逐值一致），旧方案自动迁移。
- ✨ **自动配色 / Auto palette**：
  - 有背景图 → canvas 采样（32×32 降采样 + 色桶统计），浅色方案取自图片亮部、深色方案取自暗部，并按图片明暗自动切换浅/深主题；
  - 无背景图 → 中性配色与产品默认一致，随系统深浅自动切换。
- 🔤 **字体与界面 / Fonts & interface**：字体风格 / 字重 / 字体大小（纯文字缩放，不动控件）/ 文字色相；界面缩放、按钮 / 输入框 / 卡片 / 设置窗口圆角、设置窗口宽高，全部带「默认」勾选。
- 📤 **方案导出 / 导入 / Scheme export & import**：一键导出完整方案为 JSON（壁纸、配色、字体、圆角、不透明度），导入整体替换并完整校验迁移。
- ♻️ **停用易恢复 / Unload-safe styling**：视觉效果基于 `theme.overrideTokens` 覆盖层 + 受控样式标签，不注册第三方主题 id；停用/卸载会移除样式覆盖，可与其它主题插件并存。若曾按壁纸明暗自动切换主题，主题偏好需在宿主设置中手动切回。

## 截图 / Screenshots

> TODO：在此处添加 设置 → 常规 → 壁纸主题 的效果截图（建议浅色/深色各一张，另附壁纸透出示意）。

## 快速上手 / Quick Start

```powershell
node scripts/build.mjs   # 重新生成 dist/ 两个 bundle（零依赖，无需 npm install）
node test/smoke.mjs      # 28 项冒烟测试
```

> 要求 Node.js ≥ 18（使用 Node.js 24 验证）。构建与测试**零第三方依赖**。

## 安装 / Installation

### 方式 A：从 npm 安装（推荐）

```powershell
dsh plugin --profile web add dsh-bestui
```

重启 `dsh web` 后生效，此后每次启动自动加载。

### 方式 B：从 GitHub 安装

```powershell
dsh plugin --profile web add github:BPZ0726/dsh-bestui
```

### 方式 C：本地开发目录安装

```powershell
dsh plugin --profile web add "<path-to-this-repo>"
```

若 `dsh plugin add` 未自动写入，在 `~/.dsh/profiles/web/cordis.patch.yml` 中追加：

```yaml
- id: ui-wallpaper-theme
  name: 'dsh-bestui'
```

### 方式 D：现场预览（动态 Cordis 包，免重启）

在带 **cordis 工具预设**（`cordis_define` / `cordis_run`）的会话里：

1. `cordis_define`：`plugin.kind = "new"`，`idPrefix` 用 3–6 位小写字母（如 `wpthe`），
   `code.client` 填 [`dist/dynamic-client.js`](dist/dynamic-client.js) 的**完整原文**（不要改写）；
   `code.host` 可省略——本插件是纯浏览器插件。
2. `cordis_run` 运行返回的 `pluginId/packageId`；客户端包首次运行需在页面右上角
   Cordis 面板点一次**批准**。
3. 到 **设置 → 常规** 查看「壁纸主题 · BestUI」设置行。

> 动态包在页面刷新后不自动恢复（在 Cordis 面板对该包点一次「加载回来」即可）；设置本身在
> `localStorage`（key：`dsh-wallpaper-theme/v1`）不丢失。永久化请走方式 A。

## 使用说明 / Usage

打开 **设置 → 常规**，在「外观」下方找到「壁纸主题 · BestUI」：

1. 勾选 **启用**，点 **上传图片**（支持 JPG / PNG / WebP / GIF；动画 GIF 保留动画）。
   上传后自动给三个表面一组推荐透明度，可再逐个调整；图片控件含适应方式、位置、模糊、变暗/提亮。
2. **透明部件不透明度**：右侧「默认」= 完全不透明跟随产品；取消勾选后拖滑块，数值越小壁纸透出越多。
3. **元素颜色**：每个元素两栏取色器（浅 / 深），分别对应浅色与深色方案；「交互与滚动条」组
   的取色器右侧数字是透明度（0–1）。颜色设置与「启用」无关，关闭壁纸后配色仍生效。
4. **自动配色**（默认开）：上传图片后自动按图生成配色并按图片明暗切主题（可关「上传后跟随图片
   明暗切换主题」）；想回到内置观感点「恢复默认配色」。
5. **导出方案 / 导入方案**：导出 JSON 存档或迁移到另一台设备；导入会整体替换当前方案。
6. 改动即时生效并写入 `localStorage`，刷新页面后保留；「全部重置」清除壁纸与所有自定义。

> **隐私提醒：**导出的 JSON 包含完整壁纸数据。分享方案文件前，请确认壁纸不含私人照片、
> 路径、账号信息或其他不希望公开的内容。

English quick usage: enable → upload an image; per-surface opacity sliders with a
"default" checkbox; per-element light/dark color pickers; auto palette from the
image (or neutral when no image); export/import your whole scheme as JSON.

## 架构与兼容性 / Architecture & Compatibility

主题服务（`dsh-client-ui-theme`）会把当前主题的 alias token 内联写到 `body` 上。本插件
**不注册新主题 id**，而是调用 `ctx.theme.overrideTokens(source, tokens)` 叠加一层 token
覆盖层——它组合在任意当前生效主题之上（light / dark / system / 其它第三方主题），并由
fiber 保证「卸载即撤销」。背景层是 `position: fixed; z-index: -1` 的 div（
`data-dsw-wallpaper`），半透明表面色（`rgba`）叠在它上面让壁纸自然透出；明暗切换由
`body[data-ds-dark-theme]` 纯 CSS 翻转，不依赖事件订阅。额外元素色（shell 未纳入
token 注册表的变量）通过独立样式标签直接声明在 `body` + `!important`，避免被宿主
body 级同名声明覆盖。

同一份零 import 源码（`lib/runtime.js` + `lib/ui.js`）由 `scripts/build.mjs` 生成两种形态：

| 形态 | 文件 | 用途 |
| --- | --- | --- |
| 静态预编译 bundle | `dist/client.js` | 方式 A 永久安装，宿主原样提供 |
| 动态客户端半区 | `dist/dynamic-client.js` | 方式 B Cordis 现场预览 |

- **浏览器兼容**：仅用广泛能力（`rgba`、canvas 2d、FileReader、React 18
  `useSyncExternalStore`、CSS 变量）；不支持的路径全部静默降级。
- **持久化**：`localStorage` 按 origin 隔离；超限图片自动压缩到 ~2MB 以内；私密模式降级为内存态。
- **并存**：与注册主题 id 的插件（如 infinity）不冲突——未启用且配色未改动时不注册任何覆盖层。

## 目录结构 / Project Layout

```
dsh-bestui/
├── package.json              # dsh.client 清单（platform: web, inject: theme/slots）
├── lib/
│   ├── index.js              # 宿主空插件（浏览器专用，占位让客户端名录收录）
│   ├── runtime.js            # 纯逻辑核心：颜色数学、图片采样、配色生成、store、运行时
│   └── ui.js                 # 设置行 React 组件工厂（createUi(React, api)）
├── scripts/
│   ├── build.mjs             # 生成 dist/ 下两个 bundle（零依赖）
│   └── verify-spill.mjs      # 发布校验：cordon inspect 溢出 JSON ↔ dist 逐字节比对
├── test/smoke.mjs            # 冒烟测试（node test/smoke.mjs）
├── dist/                     # 构建产物（随仓库提交，可直接取用）
│   ├── client.js
│   └── dynamic-client.js
├── docs/HANDOFF.md           # 模型会话内部交接文档（如何现场加载/修改插件）
├── .github/workflows/ci.yml  # 每次 push/PR 自动 build + smoke
└── CHANGELOG.md              # 版本历史
```

## 开发 / Development

```powershell
node scripts/build.mjs                # 重新生成 dist/ 两个 bundle
node test/smoke.mjs                   # 逻辑 + 双 bundle 挂载冒烟测试
node scripts/verify-spill.mjs <spill.json> dist/dynamic-client.js  # 发布前逐字节校验
```

- `lib/runtime.js` 与 `lib/ui.js` 保持**零 import**（动态半区无法 import；静态 bundle 只从
  shell 共享模块表取 `react`）。
- 改完核心必须重跑 `build`（`dist/` 是产物，宿主直接提供该文件，不会现场编译）。
- 发布新版本：改 `lib/*` → `build` → `test` → 用 `cordis_define`（kind: "existing"）追加
  Package → `cordis_run` 更新 → 用 `verify-spill.mjs` 校验字节一致。详见 `docs/HANDOFF.md`。

## 版本历史 / Changelog

见 [CHANGELOG.md](CHANGELOG.md)。当前公开预览版为 **0.1.0**。

## 许可 / License

[MIT](LICENSE) © 2026 BPZ0726
