# 侧边栏 UI 重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将侧边栏的三个 toggle switch 替换为图标工具栏，并将配色从暖纸色系改为极简黑白风格。

**Architecture:** 纯前端改动，涉及三个文件：HTML 结构变更、CSS 配色迁移 + 新样式、JS 事件处理重构。content script 不变。无测试框架，使用手动验证。

**Tech Stack:** Vanilla HTML/CSS/JS, Chrome Extension Side Panel API

**Spec:** `docs/superpowers/specs/2026-07-10-sidepanel-ui-redesign-design.md`

---

## File Structure

- **Modify:** `chrome-extension/sidepanel.css` — 替换配色变量、迁移所有样式、新增 icon-bar 样式、清理死规则
- **Modify:** `chrome-extension/sidepanel.html` — 替换 toggle 结构为 icon bar（与 JS 同时提交，避免中间态崩溃）
- **Modify:** `chrome-extension/sidepanel.js` — 替换 toggle 事件处理为 icon button 点击处理（与 HTML 同时提交）

**重要：** HTML 和 JS 的改动必须在同一次提交中完成。如果先改 HTML（删除了 toggle 元素），JS 的 `init()` 会因 `getElementById` 返回 null 而崩溃。反之亦然。因此 Task 6 将 HTML 和 JS 合并为一个原子操作。

---

### Task 1: CSS — 替换配色变量

**Files:**
- Modify: `chrome-extension/sidepanel.css:1-10`

- [ ] **Step 1: 替换 `:root` CSS 变量**

将 `sidepanel.css` 第 1-10 行的旧变量替换为新变量：

旧代码：
```css
:root {
  --ink: #191816;
  --muted: #6b665f;
  --line: #ddd4c7;
  --paper: #f6f0e6;
  --panel: #fffdf8;
  --coal: #25211d;
  --accent: #2d6cdf;
  --warn: #d74f68;
}
```

新代码：
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

- [ ] **Step 2: 提交**

```bash
git add chrome-extension/sidepanel.css
git commit -m "refactor(css): replace color variables with minimal black-white palette"
```

---

### Task 2: CSS — 迁移全局样式（body + header + panel）

**Files:**
- Modify: `chrome-extension/sidepanel.css:12-64`

- [ ] **Step 1: 更新 body 样式**

将：
```css
html, body {
  height: 100%;
  margin: 0;
  color: var(--ink);
  background: var(--paper);
  font-family: "Avenir Next", "PingFang SC", "Microsoft YaHei", sans-serif;
}
```
改为：
```css
html, body {
  height: 100%;
  margin: 0;
  color: var(--fg);
  background: var(--bg);
  font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
}
```

> **注意：** body 的 `font-family` 从 `"Avenir Next"` 改为 `-apple-system` 是设计增强（非 spec 硬性要求），使字体栈更符合极简科技风格。

- [ ] **Step 2: 更新 header 样式**

将 `.header strong` 的 `font-family: Georgia, "Songti SC", serif;` 删除（继承 body 无衬线字体），`color` 改为 `var(--fg)`。

将 `.header span` 的 `color` 改为 `var(--fg-secondary)`。

- [ ] **Step 3: 更新 panel 样式**

将 `.panel` 的 `border-bottom: 1px solid var(--line);` 改为 `border-bottom: 1px solid var(--divider);`。

将 `.panel h2` 的 `font-family: Georgia, "Songti SC", serif;` 删除。

- [ ] **Step 4: 提交**

```bash
git add chrome-extension/sidepanel.css
git commit -m "refactor(css): migrate body/header/panel to minimal palette"
```

---

### Task 3: CSS — 替换 toggle 样式为 icon-bar 样式

**Files:**
- Modify: `chrome-extension/sidepanel.css:66-157`（旧 toggle 相关样式）

- [ ] **Step 1: 删除旧 toggle/mode-panel 样式**

删除以下 CSS 类的全部规则：
- `.mode-panel`
- `.toggle-row`（含 `.toggle-row + .toggle-row`、`.toggle-row.sub-toggle` 及其子选择器）
- `.toggle-info`（含 strong、span 子选择器）
- `.toggle-switch`
- `.toggle-switch input`
- `.toggle-slider`（含 `:before`、`:checked`、`:disabled` 等所有状态）

- [ ] **Step 2: 新增 icon-bar 和 icon-btn 样式**

在删除位置添加：
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

- [ ] **Step 3: 提交**

```bash
git add chrome-extension/sidepanel.css
git commit -m "refactor(css): replace toggle styles with icon-bar styles"
```

---

### Task 4: CSS — 迁移剩余组件配色

**Files:**
- Modify: `chrome-extension/sidepanel.css`（selector、empty、note-item、btn、btn-icon、dd-menu、toast 等）

- [ ] **Step 1: 迁移 selector 样式**

将 `.selector` 的 `color` 改为 `var(--fg)`，`background` 改为 `var(--bar-bg)`，`border` 改为 `1px solid var(--divider)`。

- [ ] **Step 2: 迁移 empty/hint/empty-state 样式**

将 `.hint` 的 `color` 改为 `var(--fg-secondary)`。
将 `.empty` 的 `color` 改为 `var(--fg-secondary)`，`background` 改为 `var(--bar-bg)`，`border` 改为 `1px dashed var(--divider)`。
将 `.empty-state p` 的 `color: var(--muted)` 改为 `color: var(--fg-secondary)`。

- [ ] **Step 3: 迁移 note-item 样式**

将 `.note-item` 的 `background` 改为 `transparent`，`border` 改为 `1px solid var(--divider)`。
将 `.note-item:hover` 的 `background` 改为 `var(--bar-bg)`，`border-color` 改为 `var(--fg)`。
将 `.note-badge` 的 `background` 改为 `var(--active-bg)`。
将 `.note-text` 的 `color: var(--ink)` 改为 `color: var(--fg)`。

- [ ] **Step 4: 迁移 btn/btn-icon 样式**

将 `.btn` 的 `color` 改为 `var(--fg)`，`background` 改为 `transparent`，`border` 改为 `1px solid var(--divider)`。
将 `.btn.primary` 的 `background` 和 `border-color` 改为 `var(--active-bg)`，`color` 改为 `var(--active-fg)`。
将 `.btn-icon` 的 `background` 改为 `transparent`，`border` 改为 `1px solid var(--divider)`，`color` 改为 `var(--danger)`。
将 `.btn-icon:hover` 的 `background` 改为 `rgba(224,80,80,0.1)`，`color` 改为 `var(--danger)`。

- [ ] **Step 5: 迁移 dd-menu/dd-item 样式**

将 `.dd-menu` 的 `background` 改为 `#ffffff`，`border` 改为 `1px solid var(--divider)`，`box-shadow` 改为 `0 6px 20px rgba(0, 0, 0, .12)`。
将 `.dd-item` 的 `color: var(--ink)` 改为 `color: var(--fg)`。
将 `.dd-item:hover` 的 `background` 改为 `var(--bar-bg)`。
将 `.dd-item.danger` 的 `color` 改为 `var(--danger)`。
将 `.dd-item.danger:hover` 的 `background` 改为 `rgba(224,80,80,0.1)`。

- [ ] **Step 6: 迁移 toast 样式**

将 `.toast` 的 `background` 改为 `rgba(26,26,26,.94)`。

- [ ] **Step 7: 提交**

```bash
git add chrome-extension/sidepanel.css
git commit -m "refactor(css): migrate remaining component colors to minimal palette"
```

---

### Task 5: CSS — 清理死规则

**Files:**
- Modify: `chrome-extension/sidepanel.css`

- [ ] **Step 1: 删除未使用的 CSS 规则**

删除以下规则（经确认 HTML 中无引用）：
- `.guide` 及 `.guide li` 和 `.guide li:before`
- `.stats` 和 `.stat` 及子选择器 `.stat b`、`.stat span`
- `.note-list-empty`

- [ ] **Step 2: 提交**

```bash
git add chrome-extension/sidepanel.css
git commit -m "chore(css): remove dead CSS rules"
```

---

### Task 6: HTML + JS — 替换 toggle 结构和事件处理（原子操作）

**Files:**
- Modify: `chrome-extension/sidepanel.html:24-55`
- Modify: `chrome-extension/sidepanel.js:1-253`

> **重要：** 本 Task 的所有步骤必须在同一次 commit 中完成。HTML 删除了 toggle 元素后，旧 JS 会因 `getElementById` 返回 null 而崩溃；反过来 JS 删除了旧引用后，旧 HTML 也无法工作。

- [ ] **Step 1: 替换 HTML mode-panel section**

将 `sidepanel.html` 第 24-55 行的整个 `<section class="panel mode-panel">...</section>` 替换为：

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

- [ ] **Step 2: 更新 JS els 对象**

将 `sidepanel.js` 第 1-16 行的 els 对象中，删除 `annotationToggle`、`previewToggle`、`readOnlyToggle`，新增 `iconBtns`：

旧代码：
```javascript
const els = {
  annotationToggle: document.getElementById("annotationToggle"),
  previewToggle: document.getElementById("previewToggle"),
  readOnlyToggle: document.getElementById("readOnlyToggle"),
  editor: document.getElementById("editor"),
  ...
```

新代码：
```javascript
const els = {
  iconBtns: Array.from(document.querySelectorAll('.icon-btn')),
  editor: document.getElementById("editor"),
  ...
```

- [ ] **Step 3: 更新 init() 中的事件绑定**

将第 30-32 行的三个 `addEventListener("change", ...)` 替换为 icon button 的 click 事件：

旧代码：
```javascript
  els.annotationToggle.addEventListener("change", onAnnotationToggle);
  els.previewToggle.addEventListener("change", onPreviewToggle);
  els.readOnlyToggle.addEventListener("change", onReadOnlyToggle);
```

新代码：
```javascript
  els.iconBtns.forEach(btn => {
    btn.addEventListener("click", () => onModeSelect(btn.dataset.mode));
  });
```

- [ ] **Step 4: 更新 requestState() 错误路径**

将第 93-95 行：
```javascript
        els.annotationToggle.checked = false;
        els.previewToggle.checked = false;
        return;
```
改为：
```javascript
        currentState.mode = null;
        currentState.readOnly = false;
        updateActiveButton(null, false);
        return;
```

- [ ] **Step 5: 更新 updateState()**

将第 107-113 行：
```javascript
  // sync toggles from the single mode value
  els.annotationToggle.checked = state.mode === 'annotation';
  els.previewToggle.checked = state.mode === 'preview';

  // read-only is only available in preview mode
  els.readOnlyToggle.disabled = state.mode !== 'preview';
  els.readOnlyToggle.checked = !!state.readOnly;
```
改为：
```javascript
  // sync icon buttons from mode + readOnly state
  updateActiveButton(state.mode, !!state.readOnly);
```

- [ ] **Step 6: 删除旧的 toggle handler 函数**

删除 `onAnnotationToggle()`（第 169-190 行）、`onPreviewToggle()`（第 192-200 行）、`onReadOnlyToggle()`（第 202-216 行）三个函数。

- [ ] **Step 7: 新增 onModeSelect 函数**

在删除位置添加：
```javascript
// ---- Mode switching (icon toolbar, three-way mutual exclusion) ----
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

- [ ] **Step 8: 新增 setReadOnly 函数**

在 onModeSelect 后面添加：
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
      updateActiveButton(currentState.mode, enabled);
      if (onSuccess) onSuccess();
    });
  });
}
```

- [ ] **Step 9: 重写 setMode 函数**

将第 218-253 行的 setMode 函数替换为：
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

- [ ] **Step 10: 新增 updateActiveButton 函数**

在 setMode 后面添加：
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

- [ ] **Step 11: 提交（HTML + JS 一起提交）**

```bash
git add chrome-extension/sidepanel.html chrome-extension/sidepanel.js
git commit -m "refactor: replace toggle switches with icon toolbar (HTML + JS)"
```

---

### Task 7: 手动验证

**Files:** 无修改

- [ ] **Step 1: 加载扩展并打开侧边栏**

在 Chrome 中打开 `chrome://extensions`，重新加载 Contexa 扩展，打开任意网页的侧边栏。

- [ ] **Step 2: 验证视觉**

- 背景为近白色 `#fafafa`
- 图标工具栏三个按钮横排，灰底圆角容器
- 无暖纸色残留
- 无卡片边框

- [ ] **Step 3: 验证交互**

- 点击"标注" → 黑底白字激活态，toast "已开启标注模式"
- 点击"预览" → 切换激活，toast "已开启预览模式"
- 点击"只读" → 切换激活，toast "已开启只读模式"
- 点击已激活按钮 → 无反应（no-op）
- 切换到不支持扩展的页面 → 所有按钮灭活

- [ ] **Step 4: 验证备注功能**

- 在标注模式下点击页面元素 → 正常添加备注
- 备注列表配色正确（transparent 底，hover 灰底）
- 导出/导入按钮配色正确
- 清空按钮 danger 红色正确

- [ ] **Step 5: 提交最终状态（如有修复）**

```bash
git add -A
git commit -m "fix: address manual testing issues"
```
