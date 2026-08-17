# HANDOFF：在 cordis 预设会话中现场预览「壁纸主题」插件

> 这份说明写给 **cordis 预设会话**中的模型。目标：用 Cordis 工具现场动态加载
> 壁纸主题插件（`dsh-bestui`），**页面不重启**即可在
> 设置 → 常规 里使用，并可在决定永久安装前先试用全部功能。

## 步骤

1. 先调用 `skill` 工具加载 `cordis-plugin-development` 技能，按其中的客户端包
   定义规范操作（该技能随 cordis 预设提供）。
2. 用 `read` 工具读取
   `<repo-root>\dist\dynamic-client.js`
   的**全部源码**。
3. 调用 `cordis_define`：
   - `plugin.kind = "new"`，`idPrefix` 用 3–6 位小写字母（如 `wpthe`，宿主会加数字后缀）；
   - `name = "dsh-bestui"`，`purpose` 写一句用户可见的用途说明；
   - `code.client` = 第 2 步读到的全文，**原样放入，不要改写任何内容**；
   - `code.host` 省略（本插件是纯浏览器插件，不需要宿主半区）。
   - 该文件是普通 JavaScript 函数体（无 import、无 JSX，React/styles/console
     来自闭包符号），返回 `{ inject: ["theme", "slots"], apply(ctx) }`，
     与工具契约完全一致。
4. 调用 `cordis_run`，传入上一步返回的 `pluginId` / `packageId`。
   - 客户端包**首次运行需要用户批准**，会在页面 Cordis 面板（右上角徽标）弹出
     批准请求——**不要在本轮原地等待**，返回后告诉用户去点批准即可。
   - 若运行失败，用 `cordis_inspect_self`（pluginId + packageId）查看诊断。
5. 运行成功后请用户到 **设置 → 常规** 验证：「壁纸主题」设置行出现在「外观」下方，
   勾选启用 → 上传图片 → 调整六个透明表面的不透明度 → 按浅/深两套自定义元素颜色。

## 已知行为（如实告知用户）

- **动态包页面刷新后不自动恢复**：宿主保持运行，但本页面刷新后需要从 Cordis
  面板对该包点一次「加载回来」（load），壁纸效果才会重新应用。设置本身存在浏览器
  `localStorage`（key：`dsh-wallpaper-theme/v1`），不会丢。
- **停用立即还原**：`cordis_stop` / `cordis_undefine` 会随 fiber 清理撤销
  override 层、样式标签与背景层，界面回到原样。
- **不注册第三方主题 id**：浅色 / 深色 / 跟随系统仍由「外观」行管理，本插件只是
  叠加在其上的 token 层；与其它主题插件（如 infinity）可并存。
- **永久生效**走 README.md 的方式 A：`dsh plugin --profile web add <本目录>` +
  在 web profile 的 `cordis.patch.yml` 加一行 + 重启 `dsh web`（需 pnpm）。

## 若需要改插件

不要直接改 `dist/`（构建产物）。在仓库根目录改 `lib/runtime.js` 或 `lib/ui.js` 后运行
`node scripts/build.mjs`，
再重新 `read` `dist/dynamic-client.js` 全文，用 `cordis_define`（kind: "existing"）
追加一个新 Package 并 `cordis_run`。发布前用 `node scripts/verify-spill.mjs <spill.json> dist/dynamic-client.js` 做逐字节校验。
