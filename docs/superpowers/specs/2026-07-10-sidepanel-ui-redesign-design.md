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
- **点击已激活按钮为 no-op**：不会切换到 null 状态。null 状态仅作为初始态或页面不支持扩展时出现，用户主动操作不可达

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
| 分隔线       | `#e0e0e0`             |
| 危险操作     | `#e05050`             |

设计特征：
- **去掉卡片边框**，用留白和浅色背景划分区域
- **无衬线字体**，标题加粗，正文常规
- **细线条图标**（stroke-width: 1.5），尺寸 16px
- 整体风格：安静、克制、高留白

## 详细设计

### HTML 结构变更

**删除**：`mode-panel` section 中的三个 `toggle-row` + `toggle-switch` 结构，以及 `readOnlyRow`

**新增**：图标工具栏结构

```html
<section class="panel">
  <div class="icon-bar">
    <button class="icon-btn" data-mode="annotation" aria-pressed="false">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
      <span>标注</span>
    </button>
    <button class="icon-btn" data-mode="preview" aria-pressed="false">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      <span>预览</span>
    </button>
    <button class="icon-btn" data-mode="readonly" aria-pressed="false">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      <span>只读</span>
    </button>
  </div>
</section>
```

注意：HTML 中三个按钮均不带 `active` 类，避免首屏闪烁。初始状态由 `requestState()` 从 content script 取回后设置。

### CSS 变更

**删除**：所有 `--ink`, `--muted`, `--line`, `--paper`, `--panel`, `--coal`, `--accent`, `--warn` 变量及其用法

**删除的死 CSS 规则**（当前未被任何 HTML 引用）：`.guide`, `.guide li`, `.stats`, `.stat`, `.note-list-empty` — 一并清理

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

```css
.icon-bar {
  display: flex;
  background: var(--bar-bg);
  border-radius: 8px;
  padding: 3px;
  gap: 2px;
}

.icon-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 8px 4px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--fg-secondary);
  cursor: pointer;
  transition: background .2s, color .2s;
  font: inherit;
}

.icon-btn svg {
  width: 16px;
  height: 16px;
}

.icon-btn span {
  font-size: 10px;
  font-weight: 500;
}

.icon-btn.active {
  background: var(--active-bg);
  color: var(--active-fg);
}

.icon-btn:not(.active):hover {
  background: var(--divider);
}
```

**配色迁移映射表**（旧用法 → 新变量）：

| 元素 | 旧值 | 新值 |
|------|------|------|
| `.header strong` color | `--ink` (#191816) | `--fg` (#1a1a1a) |
| `.header span` color | `--muted` (#6b665f) | `--fg-secondary` (#999) |
| `.header strong` font-family | Georgia, serif | 无衬线 (继承 body) |
| `.panel` border-bottom | `--line` (#ddd4c7) | `--divider` (#e0e0e0) |
| `.selector` background | #efe8dc | `--bar-bg` (#efefef) |
| `.selector` border | #d9cfbf | `--divider` (#e0e0e0) |
| `.selector` color | #3d3832 | `--fg` (#1a1a1a) |
| `.empty` background | #f0e9dd | `--bar-bg` (#efefef) |
| `.empty` border | #cbbfac | `--divider` (#e0e0e0) |
| `.empty` color | `--muted` | `--fg-secondary` (#999) |
| `.note-item` background | #fffaf0 | transparent |
| `.note-item` border | `--line` | `--divider` (#e0e0e0) |
| `.note-item:hover` background | #fff5e0 | `--bar-bg` (#efefef) |
| `.note-item:hover` border-color | `--coal` | `--fg` (#1a1a1a) |
| `.note-badge` background | `--coal` (#25211d) | `--active-bg` (#1a1a1a) |
| `.btn` color | `--coal` | `--fg` (#1a1a1a) |
| `.btn` background | #fffaf0 | transparent |
| `.btn` border | #d7cdbc | `--divider` (#e0e0e0) |
| `.btn.primary` background | `--coal` | `--active-bg` (#1a1a1a) |
| `.btn.primary` border-color | `--coal` | `--active-bg` (#1a1a1a) |
| `.btn-icon` background | #fffaf0 | transparent |
| `.btn-icon` border | `--line` | `--divider` (#e0e0e0) |
| `.btn-icon` color | `--warn` | `--danger` (#e05050) |
| `.btn-icon:hover` background | #fde8ec | rgba(224,80,80,0.1) |
| `.btn-icon:hover` color | #b53047 | `--danger` |
| `.dd-menu` background | `--panel` | #ffffff |
| `.dd-menu` border | `--line` | `--divider` |
| `.dd-item:hover` background | #f0e9dd | `--bar-bg` (#efefef) |
| `.dd-item.danger` color | `--warn` | `--danger` |
| `.dd-item.danger:hover` background | #fde8ec | rgba(224,80,80,0.1) |
| `.toast` background | rgba(37,33,29,.94) | rgba(26,26,26,.94) |
| body background | `--paper` (#f6f0e6) | `--bg` (#fafafa) |
| body color | `--ink` (#191816) | `--fg` (#1a1a1a) |

### JS 逻辑变更

**删除**：
- `els` 对象中的 `annotationToggle`, `previewToggle`, `readOnlyToggle`
- `onAnnotationToggle()`, `onPreviewToggle()`, `onReadOnlyToggle()` 函数
- init() 中的三个 `addEventListener("change", ...)` 绑定

**新增**：
- `els` 对象中新增 `iconBtns`: `Array.from(document.querySelectorAll('.icon-btn'))`
- `init()` 中为每个 icon button 绑定 `click` 事件，调用 `onModeSelect(mode)`
- `onModeSelect(mode)` 函数：统一处理三选一切换
- `setReadOnly(enabled)` 独立函数：从 `onReadOnlyToggle` 提取

```javascript
function onModeSelect(mode) {
  const activeMode = currentState.mode === 'preview' && currentState.readOnly
    ? 'readonly'
    : currentState.mode;

  // 点击已激活按钮 → no-op
  if (mode === activeMode) return;

  // "readonly" 在底层映射为 preview + readOnly
  if (mode === 'readonly') {
    setMode('preview', () => {
      setReadOnly(true, null, () => {
        toast("已开启只读模式");
      });
    });
  } else {
    // 从只读切出时，先关 readOnly 再切模式，保证状态一致
    if (currentState.readOnly) {
      setReadOnly(false, null, () => {
        setMode(mode, () => {
          toast(mode === 'annotation' ? "已开启标注模式" : "已开启预览模式");
        });
      });
    } else {
      setMode(mode, () => {
        toast(mode === 'annotation' ? "已开启标注模式" : "已开启预览模式");
      });
    }
  }
}
```

注意：所有异步操作均使用 callback chaining，确保前一步完成后再执行下一步，避免中间态闪烁和 toast 冲突。

**提取的 `setReadOnly` 函数**：

```javascript
function setReadOnly(enabled, onError, onSuccess) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, {
      type: 'setReadOnly',
      payload: { readOnly: enabled }
    }, () => {
      if (chrome.runtime.lastError) {
        toast("当前页面不支持操作");
        if (onError) onError();
        return;
      }
      currentState.readOnly = enabled;
      if (onSuccess) onSuccess();
    });
  });
}
```

**更新**：
- `updateState()` — 不再同步 checkbox，改为调用 `updateActiveButton()`
- `setMode()` — 移除 checkbox checked 赋值和 toast 逻辑，改为仅更新状态 + 调用 `updateActiveButton()` + 执行 callback。toast 逻辑移至 `onModeSelect` 中统一处理

```javascript
function setMode(mode, callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;

    chrome.tabs.sendMessage(tabs[0].id, {
      type: 'setMode',
      payload: { mode }
    }, () => {
      if (chrome.runtime.lastError) {
        toast("当前页面不支持标注");
        currentState.mode = null;
        updateActiveButton(null, false);
        return;
      }

      currentState.mode = mode;
      updateActiveButton(mode, currentState.readOnly);

      if (callback) callback();
    });
  });
}
```

**UI 状态同步逻辑**：

```javascript
function updateActiveButton(mode, readOnly) {
  let activeMode = mode;
  if (mode === 'preview' && readOnly) {
    activeMode = 'readonly';
  }
  if (!mode) activeMode = null;

  els.iconBtns.forEach(btn => {
    const isActive = btn.dataset.mode === activeMode;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive);
  });
}
```

**`requestState()` 错误路径更新**：

```javascript
// 错误时清除所有激活态
if (chrome.runtime.lastError) {
  currentState.mode = null;
  currentState.readOnly = false;
  updateActiveButton(null, false);
  return;
}
```

### 无障碍

- icon button 使用 `aria-pressed="true/false"` 表达切换状态
- `<span>` 文本提供可访问名称
- `data-mode` 属性用于 JS 逻辑，不影响无障碍语义

### 边界情况

- **页面不支持扩展时**：`requestState()` 错误回调中调用 `updateActiveButton(null, false)`，所有按钮不激活
- **content script 返回错误**：toast 提示，`setMode` 错误回调中调用 `updateActiveButton(null, false)` 清除激活态
- **只读模式切回标注/预览**：`onModeSelect` 检测到 `currentState.readOnly` 为 true，先 `setReadOnly(false)` 成功后再 `setMode(mode)`，使用 callback chaining 保证顺序
- **点击已激活按钮**：no-op，直接 return
- **异步顺序保证**：所有模式切换均使用 callback chaining（setMode → setReadOnly 或 setReadOnly → setMode），避免中间态闪烁和 toast 冲突

## 不在本次范围内

- 侧边栏其他区域（备注列表、导入导出、文件提示）的功能逻辑不变，仅配色更新
- content script（`content.js`）的 mode/readOnly 消息处理逻辑不变
- 不新增功能，不修改数据结构
