# 侧边栏 UI 重构设计

**日期**: 2026-07-10
**状态**: 已确认，待实现
**涉及文件**: `sidepanel.html`, `sidepanel.css`, `sidepanel.js`

## 背景与问题

当前侧边栏存在两个设计问题：

1. **开关交互臃肿** — 三个 toggle switch（标注模式 / 预览模式 / 只读模式）占用了三行垂直空间，但这些不是高频操作，用开关形式显得过重。
2. **配色不满意** — 暖纸色系（`#f6f0e6` / `#fffaf0`）虽然有一定调性，但整体观感偏旧，用户期望更极简、科技、日杂 Muji 风格。

## 设计决策

### 交互形式：图标工具栏替代开关

将三个 toggle switch 替换为一行图标工具栏（icon bar），三个模式按钮横排互斥切换：

```
┌───────────────────────────────────┐
│   标注        预览        只读      │
│  [✏️]        [👁]       [🔒]       │
└───────────────────────────────────┘
```

- **三选一互斥**：同一时刻只有一个按钮处于激活态
- **点击即切换**：不需要先切到预览再开启只读，点击"只读"直接进入只读状态
- **底层映射**：选"只读"时，content script 侧设置 `mode='preview' + readOnly=true`

### 配色：极简黑白（无边界）

| 元素         | 颜色                  |
| ------------ | --------------------- |
| 背景         | `#fafafa`（近白）     |
| 文字主色     | `#1a1a1a`             |
| 次要文字     | `#999999`             |
| 图标栏底色   | `#efefef`             |
| 激活态背景   | `#1a1a1a`（黑底）     |
| 激活态文字   | `#ffffff`（白字）     |
| 未激活文字   | `#999999`             |
| 分隔线       | `#e0e0e0`（可选）     |

设计特征：
- **去掉卡片边框**，用留白和浅色背景划分区域
- **无衬线字体**，标题加粗，正文常规
- **细线条图标**（stroke-width: 1.5），尺寸 16-17px
- 整体风格：安静、克制、高留白

## 详细设计

### HTML 结构变更

**删除**：`mode-panel` section 中的三个 `toggle-row` + `toggle-switch` 结构

**新增**：图标工具栏结构

```html
<section class="panel mode-panel">
  <div class="icon-bar">
    <button class="icon-btn active" data-mode="annotation">
      <svg>...</svg>
      <span>标注</span>
    </button>
    <button class="icon-btn" data-mode="preview">
      <svg>...</svg>
      <span>预览</span>
    </button>
    <button class="icon-btn" data-mode="readonly">
      <svg>...</svg>
      <span>只读</span>
    </button>
  </div>
</section>
```

### CSS 变更

**删除**：所有 `--ink`, `--muted`, `--line`, `--paper`, `--panel`, `--coal`, `--accent`, `--warn` 变量及其用法

**新增**：极简黑白配色变量

```css
:root {
  --bg: #fafafa;
  --fg: #1a1a1a;
  --fg-secondary: #999999;
  --bar-bg: #efefef;
  --active-bg: #1a1a1a;
  --active-fg: #ffffff;
  --divider: #e0e0e0;
  --danger: #e05050;
}
```

**删除的 CSS 类**：`.toggle-row`, `.toggle-info`, `.toggle-switch`, `.toggle-slider`, `.sub-toggle`, `.mode-panel`（旧样式）

**新增的 CSS 类**：`.icon-bar`, `.icon-btn`

**更新的 CSS 类**（配色迁移）：
- `.header` — 移除 Georgia 衬线字体，改无衬线
- `.panel` — 移除暖色背景，改透明/留白分隔
- `.selector` — 更新为极简配色
- `.empty` — 更新为极简配色
- `.note-item` / `.note-badge` — 更新为极简配色
- `.btn` / `.btn.primary` / `.btn-icon` — 更新为极简配色
- `.dd-menu` / `.dd-item` — 更新为极简配色
- `.toast` — 更新为极简配色

### JS 逻辑变更

**删除**：
- `els` 对象中的 `annotationToggle`, `previewToggle`, `readOnlyToggle`
- `onAnnotationToggle()`, `onPreviewToggle()`, `onReadOnlyToggle()` 函数
- init() 中的三个 `addEventListener("change", ...)` 绑定

**新增**：
- `els` 对象中新增 `iconBtns`（三个 icon button 的引用）
- `init()` 中为每个 icon button 绑定 `click` 事件
- `onModeSelect(mode)` 函数：统一处理三选一切换

```javascript
function onModeSelect(mode) {
  // "readonly" 在底层映射为 preview + readOnly
  if (mode === 'readonly') {
    setMode('preview');
    setReadOnly(true);
  } else {
    setReadOnly(false);
    setMode(mode);
  }
}
```

**更新**：
- `updateState()` — 不再同步 checkbox checked 状态，改为更新 icon button 的 `active` class
- `setMode()` — 移除 checkbox checked 赋值，改为 icon button active 状态管理
- `setReadOnly()` — 提取为独立函数，供 `onModeSelect` 调用

**UI 状态同步逻辑**：

```javascript
function updateActiveButton(mode, readOnly) {
  let activeMode = mode;
  if (mode === 'preview' && readOnly) {
    activeMode = 'readonly';
  }
  if (!mode) activeMode = null;

  els.iconBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === activeMode);
  });
}
```

### 边界情况

- **页面不支持扩展时**：所有三个按钮都不激活（无 active）
- **content script 返回错误**：toast 提示，按钮状态回退
- **只读模式切回标注**：自动关闭 readOnly，发送 `setReadOnly({readOnly: false})` 给 content script

## 不在本次范围内

- 侧边栏其他区域（备注列表、导入导出、文件提示）的功能逻辑不变，仅配色更新
- content script（`content.js`）的 mode/readOnly 消息处理逻辑不变
- 不新增功能，不修改数据结构
