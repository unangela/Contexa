# Contexa 上架操作指引 / Launch Guide

> 按顺序执行，每步完成后打勾。涉及外部平台操作的部分需你手动完成。

---

## 物料清单总览

本仓库已为你准备好以下上架物料，均位于 `store/` 和 `docs/` 目录：

| 物料 | 文件位置 | 状态 |
| --- | --- | --- |
| 隐私政策（MD 双语） | `store/legal/PRIVACY.md` | ✅ 已就绪 |
| 隐私政策（HTML，供落地页） | `docs/legal/PRIVACY.html` | ✅ 已就绪 |
| 服务条款（MD 双语） | `store/legal/TERMS.md` | ✅ 已就绪 |
| 服务条款（HTML，供落地页） | `docs/legal/TERMS.html` | ✅ 已就绪 |
| 商店元数据（名称/描述/分类/关键词/权限说明） | `store/STORE_METADATA.md` | ✅ 已就绪 |
| 截图脚本（5 张规划） | `store/SCREENSHOTS_SCRIPT.md` | 📝 待制作图片 |
| 落地页（GitHub Pages） | `docs/index.html` | ✅ 已就绪（需填截图） |
| 本操作指引 | `store/LAUNCH_GUIDE.md` | ✅ 本文件 |

---

## 第 0 步：代码侧收尾（建议先做）

- [ ] 确认 `manifest.json` 的 `version` 为 `0.1.0`（后续每次提审/发布都要递增）
- [ ] 确认 `.gitignore` 已忽略 `.DS_Store`、`chrome-extension.crx`、`chrome-extension.pem`
- [ ] 全量功能回归测试（见文末检查清单）
- [ ] （可选）添加 `LICENSE` 文件：若开源，建议 MIT；若暂不开源，可跳过

## 第 1 步：启用 GitHub Pages（提供隐私政策 URL）

Chrome 商店审核**强制要求**一个可公开访问的「隐私政策 URL」。落地页就是为这个准备的。

1. 把代码 push 到 GitHub 仓库 `unangela/Contexa`
2. 进入仓库 **Settings → Pages**
3. **Source** 选 `Deploy from a branch`
4. **Branch** 选 `main`，文件夹选 `/docs`
5. 保存，等待 1-2 分钟
6. 访问 `https://unangela.github.io/Contexa/` 确认落地页可访问
7. 验证政策页可访问：
   - `https://unangela.github.io/Contexa/legal/PRIVACY.html`
   - `https://unangela.github.io/Contexa/legal/TERMS.html`
8. **记录这两个 URL**，后续填入商店后台

> 落地页和政策页中的仓库链接已统一为 `unangela/Contexa`。

## 第 2 步：制作商店视觉物料

需要你用设计工具完成（我无法生成像素图片/视频）：

- [ ] **店头宣传图** 440×280（横向 banner，展示产品名 + slogan + 主视觉）
- [ ] **5 张截图** 1280×800（按 `store/SCREENSHOTS_SCRIPT.md` 规划拍摄 + 叠字）
- [ ] （可选）**演示视频** ≤30s（按脚本最后一节）
- [ ] 把图片放进 `store/assets/`，命名 `promo-440.png`、`screenshot-1.png` ~ `screenshot-5.png`
- [ ] 把 `screenshot-1.png` 也复制一份到 `docs/`，替换落地页 hero 区的占位（编辑 `docs/index.html` 的 `#hero-shot`）

## 第 3 步：打包扩展

Chrome Web Store 只接受打包后的 `.zip`：

```bash
npm run verify
npm run package
```

- 生成文件位于 `dist/contexa-v0.1.0.zip`
- 确认 zip 内**直接是 manifest.json 等文件**（不能多一层 `chrome-extension/` 目录）
- 文件大小应 < 50MB（当前远低于此）

## 第 4 步：注册 Chrome Web Store 开发者账号

- [ ] 访问 https://chrome.google.com/webstore/devconsole/
- [ ] 一次性支付 **$5 注册费**（永久，支持国内信用卡）
- [ ] 完成邮箱验证

## 第 5 步：创建商品并填写信息

在开发者后台「添加新商品」，按 `store/STORE_METADATA.md` 逐项填写：

### 商品信息
- [ ] 上传 `dist/contexa-v0.1.0.zip`
- [ ] 商品名称：`Contexa`
- [ ] 简短描述（132 字符内）：复制 STORE_METADATA.md 中文版
- [ ] 详细描述：复制 STORE_METADATA.md 中文详细描述
- [ ] 类别：`生产力 / Productivity`
- [ ] 图形：上传 128 图标 + 440×280 店头图
- [ ] 截图：上传 5 张 1280×800
- [ ] （可选）演示视频
- [ ] 语言：可同时添加「中文(简体)」和「英语(美国)」两套，分别填对应文案

### 隐私权
- [ ] **隐私政策 URL**：填 `https://unangela.github.io/Contexa/legal/PRIVACY.html`
- [ ] **权限说明**：逐项粘贴 STORE_METADATA.md 的「权限说明」部分
- [ ] **数据用途声明**：勾选「不收集或使用」相关选项（本扩展确实不收集）
- [ ] **远程代码**：确认「不使用远程代码」（MV3 本就禁止）

### 账号
- [ ] **单一用途**（Single Purpose）：填一句话，如「在网页和原型上添加标注并共享给团队」
- [ ] **权限说明**：若后台要求再次说明，复用上面的权限说明

### 联系信息
- [ ] 支持邮箱 / 网站：填 GitHub Issues 链接或邮箱

## 第 6 步：提交审核

- [ ] 再次通读所有填写项
- [ ] 点击「提交审核」
- [ ] 审核通常 **1-3 个工作日**，复杂权限可能更久
- [ ] 如被拒，根据拒审理由修改后重新提交（常见原因：权限说明不够清晰、单一用途描述模糊）

---

## 功能回归检查清单（提交前必测）

在 Chrome 中重新加载扩展，逐项验证：

### 基础功能
- [ ] file:// 本地原型：打开即自动激活，无需授权
- [ ] http(s) 未授权网站：侧边栏显示🔒引导，按钮置灰
- [ ] 点击「授权访问 X」：Chrome 弹窗显示具体子域名 → 允许 → 立即可标注
- [ ] 授权后再开同域名页面：自动注入 + 自动浮现标注
- [ ] 拒绝授权：toast 提示，不卡死

### 三种模式
- [ ] 标注模式：点击元素弹出编辑框，保存成功
- [ ] 预览模式：可查看备注，页面可交互
- [ ] 云端模式：配置 URL 后加载远程备注，只读

### 快捷键
- [ ] ⌘E / Ctrl+E：仅在标注 / 预览模式之间切换
- [ ] ⌘+Enter / Ctrl+Enter：保存备注
- [ ] ⌘+Backspace / Ctrl+Backspace：删除备注
- [ ] ⌘0 / Ctrl+0：云端模式→关闭备注；非云端→进入云端模式
- [ ] ⌘0 / Ctrl+0：侧边栏聚焦时同样生效

### 数据
- [ ] 导出当前页面 / 全部数据：JSON 正常下载
- [ ] 导入 JSON：备注正确合并
- [ ] 清空当前页 / 全部数据：确认弹窗 + 清除成功
- [ ] 拖拽排序：顺序更新并持久化

### 域名管理
- [ ] 已授权域名列表正确显示
- [ ] 取消授权：该域名不再自动激活，数据保留
- [ ] reload 扩展后：已授权域名自动恢复注入（不报「不支持」）

### 主题
- [ ] 15 款主题切换正常，刷新后保持
- [ ] 落地页 + 政策页可正常访问

---

## 审核被拒的常见原因与应对

| 拒审理由 | 应对 |
| --- | --- |
| 权限说明不清 | 用 STORE_METADATA.md 的权限说明逐项填写，说明「何时、为何」使用 |
| 单一用途模糊 | 强调「仅用于在网页/原型上添加标注」这一唯一用途 |
| 隐私政策缺失/不可访问 | 确认 GitHub Pages 已生效，URL 可公开访问 |
| 远程代码 | 确认 manifest 无 `externally_connectable` 到可疑域，content.js 无 eval/远程脚本 |
| `<all_urls>` 质疑 | 说明已改为 `optional_host_permissions` 按需授权，安装时零网站权限 |

---

## 发布后

- [ ] 在落地页 `#install` 区把「添加到 Chrome」链接换成真实商店 URL
- [ ] 更新 README.md 顶部加上商店徽章
- [ ] 准备发布渠道：Product Hunt / V2EX / 即刻 / 少数派 / 少数派
