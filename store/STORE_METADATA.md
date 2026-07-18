# Contexa — Chrome Web Store 上架元数据

> 供 Chrome Web Store 开发者后台填写使用。中英双语。
> 填写后请删除每段的「（备注：...）」说明。

---

## 基本信息

- **扩展名称 / Name**：`Contexa`
- **开发者 / Developer**：（填你的名称或团队名）
- **分类 / Category**：`Productivity`（生产力工具）
- **图形 / Graphic**：需要 128×128 图标（已有）、440×280 店头宣传图（待制作）

---

## 简短描述（≤132 字符，显示在列表卡片）

**中文**：
```
网页上下文标注与交付工具，将说明精准绑定到页面元素，以结构化数据交付给团队或 AI。按域名授权，隐私可控。
```

**English**：
```
Attach notes to page elements and hand off structured web context to teams or AI. Per-domain permission, privacy-first.
```

---

## 详细描述（≤16,000 字符，展示在详情页）

### 中文详细描述

```
Contexa — Point → Explain → Hand off

Contexa 是一款网页上下文标注与交付工具，让产品、设计、测试、运营和客户把说明精准绑定到页面元素，并以结构化数据交付给团队或 AI。

📝 三种工作模式
• 标注模式：点击页面元素添加备注，记录交互逻辑、业务规则、异常场景
• 预览模式：查看已有备注，页面可正常交互
• 云端模式：加载远程 JSON，查看团队共享的备注（只读）

☁️ 高效协作流程
在网页或 HTML 原型上标注 → 导出 JSON → 上传到任意静态托管（GitHub Pages / Vercel / OSS）→ 团队配置云端 URL 即可查看。结构化标注数据也可直接交付给 AI，保留元素位置与说明上下文。

🔒 隐私优先 · 按需授权
• 安装时不索取任何网站权限
• 首次在某网站标注时，Chrome 弹出授权提示，明确显示具体子域名
• 授权范围精确到子域名，可在「域名管理」随时撤销
• 所有标注数据仅存本地，不上传任何服务器

✨ 核心特性
• 精准元素定位：自动生成稳定 CSS 选择器，备注与 DOM 元素精准绑定
• 拖拽排序：备注列表拖拽调整顺序，优化审阅流程
• 15 款编辑器主题：Minimal、Solarized、Tokyo Night、Catppuccin、Codex Dark、Kanagawa、Everforest 等
• 完整快捷键：⌘E 切换标注/预览、⌘+Enter 保存、⌘0 云端模式/关闭备注
• Shadow DOM 隔离：标注层样式完全隔离，不影响原页面
• file:// 本地原型支持：无需域名授权，本地设计稿开箱即用

适用人群：产品、设计、测试、研发、运营、内容团队、服务商与客户。
```

### English Detailed Description

```
Contexa — Point → Explain → Hand off

Contexa is a contextual web annotation and handoff tool. It lets product, design, QA, operations, and clients attach notes precisely to page elements and hand off structured context to teams or AI.

📝 Three Working Modes
• Annotation mode: click any element to add notes — interaction logic, business rules, edge cases
• Preview mode: review existing notes while keeping the page fully interactive
• Cloud mode: load remote JSON to view team-shared notes (read-only)

☁️ Seamless Collaboration
Annotate a web page or HTML prototype → export JSON → upload it to any static host (GitHub Pages / Vercel / OSS) → the team configures the cloud URL to review. The structured annotation data can also be handed directly to AI with element locations and context intact.

🔒 Privacy-First · On-Domain Permission
• Requests NO website permissions at install
• On first annotation, Chrome prompts with the exact subdomain clearly shown
• Grants are scoped to exact subdomains and revocable anytime in "Domain Management"
• All annotation data stays local — nothing is uploaded to our servers

✨ Core Features
• Precise element targeting: stable CSS selectors keep notes bound to DOM elements
• Drag-to-reorder: rearrange notes in the sidebar to streamline review
• 15 editor themes: Minimal, Solarized, Tokyo Night, Catppuccin, Codex Dark, Kanagawa, Everforest, and more
• Full keyboard shortcuts: ⌘E toggles Annotate/Preview, ⌘+Enter saves, ⌘0 enters cloud mode / closes notes
• Shadow DOM isolation: the annotation layer never affects the underlying page
• file:// local prototype support: no permission needed — local mockups work out of the box

For: product, design, QA, engineering, operations, content teams, agencies, and clients.
```

---

## 关键词 / Tags（后台可填，影响搜索）

**中文关键词**：`网页标注` `上下文交付` `原型评审` `设计反馈` `测试验收` `DOM 标注` `AI 上下文`

**English keywords**：`web annotation` `context handoff` `prototype review` `design feedback` `QA review` `DOM annotation` `AI context`

---

## 权限说明（审核必填 — "Why does your extension need each permission?"）

逐项说明，复制到开发者后台「权限说明」字段：

### activeTab
**中文**：在用户主动点击扩展图标或授权某域名后，访问当前标签页以注入标注层、读取用户点击的 DOM 元素并生成选择器。
**EN**: After the user actively clicks the extension icon or grants a domain, access the active tab to inject the annotation overlay, read clicked DOM elements, and generate CSS selectors.

### sidePanel
**中文**：提供侧边栏 UI，作为标注管理、模式切换、域名管理、导入导出的主操作面板。
**EN**: Provides the side panel UI as the main control surface for annotation management, mode switching, domain management, and import/export.

### storage
**中文**：在浏览器本地（chrome.storage.local）持久化用户创建的标注数据、主题偏好、用户配置的云端 JSON URL。数据不上传任何服务器。
**EN**: Persists user-created annotations, theme preference, and the user-configured cloud JSON URL locally (chrome.storage.local). No data is uploaded to any server.

### scripting
**中文**：当用户授权某域名后，动态向该域名的页面注入标注脚本（content.js），实现按域名的按需标注能力，避免预先申请全站权限。
**EN**: After the user grants a domain, dynamically injects the annotation script (content.js) into pages of that domain, enabling per-domain on-demand annotation without pre-claiming all-site access.

### optional_host_permissions (*://*/*)
**中文**：作为按需授权的声明空间。安装时不授予任何网站访问权；仅当用户在具体网站首次标注时，才请求该具体子域名的访问权限。用户可随时撤销。
**EN**: Declares the space for on-demand grants. Grants NO website access at install; only when the user first annotates a specific site is access to that exact subdomain requested. Users can revoke anytime.

---

## 上传前自检清单

提交审核前请逐项确认：
- [ ] manifest.json 的 version 已更新（当前 0.1.0）
- [ ] 图标 128×128 已就绪
- [ ] 440×280 店头宣传图已制作
- [ ] 至少 1 张（建议 3-5 张）1280×800 截图
- [ ] 短视频（≤30s，可选但显著提升转化）
- [ ] 隐私政策 URL（填落地页地址 + /privacy）
- [ ] 服务条款 URL（填落地页地址 + /terms）
- [ ] 支持联系方式（填 GitHub Issues 或邮箱）
- [ ] 权限说明已逐项填写
- [ ] 单一用途声明（Single Purpose）：一句话说明扩展用途
