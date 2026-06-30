const state = {
  mode: null, // 'annotation' | 'preview' | null
  selectedId: null,
  editingId: null,
  notes: []
};

let shadowRoot = null;
let els = {};
let renderTimer = null;
let periodicTimer = null;
let mutationObserver = null;
let isContextValid = true;

function isExtensionContextValid() {
  if (!isContextValid) return false;

  try {
    if (!chrome || !chrome.runtime || !chrome.runtime.id) {
      isContextValid = false;
      return false;
    }
    return true;
  } catch (e) {
    isContextValid = false;
    return false;
  }
}

function handleContextInvalidated() {
  if (!isContextValid) return;

  isContextValid = false;

  if (state.mode) {
    state.mode = null;
  }

  els = {};
  shadowRoot = null;

  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }

  if (periodicTimer) {
    clearInterval(periodicTimer);
    periodicTimer = null;
  }

  if (renderTimer) {
    clearTimeout(renderTimer);
    renderTimer = null;
  }
}

function init() {
  if (!isExtensionContextValid()) return;

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!isExtensionContextValid()) {
      sendResponse({ error: 'context invalidated' });
      return;
    }

    try {
      switch (message.type) {
        case 'setMode':
          setMode(message.payload.mode);
          sendResponse({ success: true });
          break;
        case 'getState':
          sendResponse({
            mode: state.mode,
            selectedId: state.selectedId,
            notes: state.notes,
            total: state.notes.length
          });
          break;
        case 'deleteNote':
          deleteNote(message.payload.id);
          sendResponse({ success: true });
          break;
        case 'clearAll':
          if (confirm("确定清空全部备注吗？")) {
            state.notes = [];
            state.selectedId = null;
            state.editingId = null;
            saveNotes();
            renderNotes();
            toast("已清空");
            notifySidepanel();
          }
          sendResponse({ success: true });
          break;
        case 'exportJson':
          const exportData = {
            version: "0.2.0",
            url: window.location.href,
            exportedAt: new Date().toISOString(),
            notes: state.notes
          };
          sendResponse({ data: exportData });
          break;
        case 'importJson':
          if (message.payload && Array.isArray(message.payload.notes)) {
            state.notes = message.payload.notes;
            state.selectedId = null;
            state.editingId = null;
            saveNotes();
            renderNotes();
            toast("备注已导入");
            notifySidepanel();
          }
          sendResponse({ success: true });
          break;
      }
    } catch (e) {
      if (e.message && e.message.includes('Extension context invalidated')) {
        handleContextInvalidated();
      }
      sendResponse({ error: e.message });
    }
  });

  // Default to preview mode on page load
  setMode('preview');
}

// ---- One-time Shadow DOM setup ----
function ensureOverlay() {
  if (shadowRoot) return;

  const container = document.createElement('div');
  container.className = 'dom-notes-root';
  container.style.cssText = 'position: fixed !important; top: 0 !important; left: 0 !important; width: 0 !important; height: 0 !important; overflow: visible !important; z-index: 2147483647 !important; pointer-events: none;';
  const shadow = container.attachShadow({ mode: 'open' });

  shadow.innerHTML = `
    <style>
:host {
  --ink: #191816;
  --muted: #6b665f;
  --line: #ddd4c7;
  --paper: #f6f0e6;
  --panel: #fffdf8;
  --coal: #25211d;
  --accent: #2d6cdf;
  --warn: #d74f68;
  --shadow: 0 16px 44px rgba(37, 33, 29, .14);
}

.capture-layer {
  position: fixed;
  inset: 0;
  z-index: 1;
  background: transparent;
  cursor: crosshair;
  pointer-events: none;
  display: none;
}

:host(.dom-notes-annotation) .capture-layer {
  pointer-events: auto;
  display: block;
}

.target-box {
  position: fixed;
  z-index: 2;
  border: 2px solid var(--accent);
  background: rgba(45, 108, 223, .10);
  border-radius: 5px;
  pointer-events: none;
  opacity: 0;
  transition: opacity .12s ease;
}

.target-box.show {
  opacity: 1;
}

.pin {
  position: fixed;
  z-index: 3;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  color: #fff;
  background: var(--warn);
  border: 2px solid #fff;
  border-radius: 999px;
  box-shadow: 0 8px 18px rgba(37, 33, 29, .24);
  font-size: 13px;
  font-weight: 800;
  pointer-events: auto;
  padding: 0;
  cursor: pointer;
}

.pin:hover {
  transform: scale(1.1);
}

.pin.selected {
  background: var(--coal);
  outline: 3px solid rgba(37,33,29,.22);
  outline-offset: 2px;
}

.note-pop {
  position: fixed;
  z-index: 4;
  width: 220px;
  padding: 10px 12px;
  background: #fffceb;
  border: 1px solid rgba(0,0,0,.12);
  border-radius: 8px;
  box-shadow: 0 6px 20px rgba(37, 33, 29, .18);
  pointer-events: auto;
}

.note-pop[data-editable="true"] {
  cursor: pointer;
}

.note-pop::before {
  content: "";
  position: absolute;
  left: 14px;
  top: -6px;
  width: 36px;
  height: 12px;
  background: rgba(255,255,255,.5);
  border: 1px solid rgba(255,255,255,.3);
  border-radius: 2px;
  transform: rotate(-3deg);
}

.note-pop h3 {
  margin: 0 0 5px;
  font-size: 13px;
  font-weight: 700;
}

.note-pop p {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12px;
  line-height: 1.45;
  color: #444;
}

.note-pop.editing {
  width: 240px;
  padding: 10px;
}

.note-input,
.note-textarea {
  width: 100%;
  border: 1px solid rgba(37,33,29,.2);
  outline: 0;
  color: var(--coal);
  background: rgba(255,255,255,.6);
  border-radius: 5px;
  font-family: inherit;
  box-sizing: border-box;
}

.note-input {
  height: 30px;
  padding: 5px 8px;
  font-weight: 700;
  font-size: 13px;
}

.note-textarea {
  min-height: 80px;
  margin-top: 6px;
  padding: 7px 8px;
  resize: vertical;
  line-height: 1.4;
  font-size: 12px;
}

.note-actions {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 6px;
  margin-top: 7px;
}

.icon-btn {
  width: 26px;
  height: 26px;
  padding: 0;
  color: #fff;
  background: var(--coal);
  border-radius: 999px;
  border: 1px solid rgba(0,0,0,.1);
  font-size: 14px;
  line-height: 1;
  text-align: center;
  cursor: pointer;
}

.icon-btn svg {
  display: block;
  width: 14px;
  height: 14px;
  margin: auto;
  stroke: currentColor;
}

.icon-btn.danger {
  background: var(--warn);
}

.toast {
  position: fixed;
  left: 50%;
  bottom: 22px;
  z-index: 50;
  padding: 10px 14px;
  color: #fff;
  background: rgba(37,33,29,.94);
  border-radius: 8px;
  transform: translate(-50%, 16px);
  opacity: 0;
  transition: opacity .2s ease, transform .2s ease;
  pointer-events: none;
  font-size: 13px;
}

.toast.show {
  opacity: 1;
  transform: translate(-50%, 0);
}

/* ---- Floating toolbar ---- */
.toolbar {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 60;
  display: flex;
  gap: 4px;
  padding: 4px;
  background: rgba(255, 253, 248, .96);
  border: 1px solid rgba(0,0,0,.1);
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(37, 33, 29, .14);
  pointer-events: auto;
}

.tool-btn {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: none;
  background: transparent;
  border-radius: 7px;
  cursor: pointer;
  color: var(--muted);
  transition: background .15s, color .15s;
}

.tool-btn:hover {
  background: rgba(0,0,0,.06);
  color: var(--coal);
}

.tool-btn.active {
  background: var(--coal);
  color: #fff;
}

.tool-btn svg {
  width: 18px;
  height: 18px;
  stroke: currentColor;
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
    </style>
    <div class="capture-layer" id="captureLayer"></div>
    <div class="target-box" id="targetBox"></div>
    <div id="noteLayer"></div>
    <div class="toast" id="toast"></div>
    <div class="toolbar" id="toolbar">
      <button class="tool-btn" id="btnAnnotation" title="标注模式">
        <svg viewBox="0 0 24 24">
          <path d="M12 20h9"></path>
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
        </svg>
      </button>
      <button class="tool-btn" id="btnPreview" title="预览模式">
        <svg viewBox="0 0 24 24">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
      </button>
    </div>
  `;

  document.documentElement.appendChild(container);
  shadowRoot = shadow;

  els = {
    root: container,
    captureLayer: shadow.getElementById('captureLayer'),
    targetBox: shadow.getElementById('targetBox'),
    noteLayer: shadow.getElementById('noteLayer'),
    toast: shadow.getElementById('toast'),
    toolbar: shadow.getElementById('toolbar'),
    btnAnnotation: shadow.getElementById('btnAnnotation'),
    btnPreview: shadow.getElementById('btnPreview')
  };

  // Toolbar button handlers
  els.btnAnnotation.addEventListener('click', () => {
    if (state.mode === 'annotation') {
      // closing annotation → auto preview
      setMode('preview');
    } else {
      setMode('annotation');
    }
  });

  els.btnPreview.addEventListener('click', () => {
    if (state.mode === 'preview') {
      // manually closing preview → both off
      setMode(null);
    } else {
      setMode('preview');
    }
  });
}

// ---- Single source of truth for presentation ----
function applyMode() {
  ensureOverlay();

  const mode = state.mode;

  // reset capture layer to default (hidden, passthrough)
  els.captureLayer.style.display = 'none';
  els.captureLayer.style.pointerEvents = 'none';
  removeCursorStyle();

  if (mode === null) {
    // Hide everything including toolbar — only re-open via sidepanel
    els.root.style.display = 'none';
    detachAnnotationListeners();
    state.selectedId = null;
    state.editingId = null;
    return;
  }

  els.root.style.display = '';
  els.noteLayer.style.display = '';
  els.toolbar.style.display = '';

  if (mode === 'annotation') {
    // capture layer blocks the page and shows crosshair
    els.captureLayer.style.display = 'block';
    els.captureLayer.style.pointerEvents = 'auto';
    addCursorStyle();
    attachAnnotationListeners();
  } else {
    // preview: page fully interactive
    detachAnnotationListeners();
    state.editingId = null;
  }

  updateToolbarActive();
  renderNotes();
}

// Update toolbar button active states
function updateToolbarActive() {
  if (!els.btnAnnotation) return;
  els.btnAnnotation.classList.toggle('active', state.mode === 'annotation');
  els.btnPreview.classList.toggle('active', state.mode === 'preview');
}

function addCursorStyle() {
  if (document.getElementById('dom-notes-cursor-style')) return;
  const style = document.createElement('style');
  style.id = 'dom-notes-cursor-style';
  // crosshair on the page; Shadow DOM elements keep their own cursor styles
  style.textContent = 'html.dom-notes-crosshair, html.dom-notes-crosshair * { cursor: crosshair !important; }';
  document.head.appendChild(style);
  document.documentElement.classList.add('dom-notes-crosshair');
}

function removeCursorStyle() {
  const style = document.getElementById('dom-notes-cursor-style');
  if (style) style.remove();
  document.documentElement.classList.remove('dom-notes-crosshair');
}

function setMode(mode) {
  if (!isExtensionContextValid()) return;
  const prevMode = state.mode;
  state.mode = mode;

  if (mode === null) {
    // fully tearing down
    if (prevMode !== null) {
      applyMode();
    }
    // stop periodic rendering when inactive
    if (periodicTimer) {
      clearInterval(periodicTimer);
      periodicTimer = null;
    }
    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
    }
    return;
  }

  applyMode();

  // load notes then render
  loadNotes(() => {
    renderNotes();
    notifySidepanel();
  });

  tryInjectObserver();

  if (!periodicTimer) {
    periodicTimer = setInterval(() => {
      if (!isExtensionContextValid()) {
        handleContextInvalidated();
        return;
      }
      if (!state.editingId) renderNotes();
    }, 600);
  }
}

// ---- Annotation-mode DOM selection listeners ----
function attachAnnotationListeners() {
  els.captureLayer.addEventListener('mousemove', onCaptureMove);
  els.captureLayer.addEventListener('mouseleave', onCaptureLeave);
  els.captureLayer.addEventListener('click', onCaptureClick);
  window.addEventListener('resize', scheduleRender);
}

function detachAnnotationListeners() {
  if (!els.captureLayer) return;
  els.captureLayer.removeEventListener('mousemove', onCaptureMove);
  els.captureLayer.removeEventListener('mouseleave', onCaptureLeave);
  els.captureLayer.removeEventListener('click', onCaptureClick);
  window.removeEventListener('resize', scheduleRender);
  if (els.targetBox) els.targetBox.classList.remove("show");
}

function onCaptureLeave() {
  if (els.targetBox) els.targetBox.classList.remove("show");
}

function onCaptureMove(event) {
  if (!isExtensionContextValid()) return;
  if (state.mode !== 'annotation') return;
  // don't track target box while editing a note
  if (state.editingId) return;

  // hide host to read the underlying page element
  els.root.style.display = 'none';
  const pageElement = document.elementFromPoint(event.clientX, event.clientY);
  els.root.style.display = '';

  if (!pageElement || pageElement === document.documentElement || pageElement === document.body) {
    els.targetBox.classList.remove("show");
    return;
  }

  drawTargetBox(pageElement);
}

function onCaptureClick(event) {
  if (!isExtensionContextValid()) return;
  if (state.mode !== 'annotation') return;

  // If a note popover is open, clicking outside should only
  // save & close the popover, NOT select a new DOM element.
  // The focusout handler may have already cleared the state, so we use
  // a flag to prevent the click from also creating a new note.
  if (state._popoverWasOpen) {
    state._popoverWasOpen = false;
    return;
  }
  if (state.editingId || state.selectedId) {
    state._popoverWasOpen = false;
    saveActiveEditingNote();
    state.selectedId = null;
    state.editingId = null;
    renderNotes();
    notifySidepanel();
    return;
  }

  els.root.style.display = 'none';
  const pageElement = document.elementFromPoint(event.clientX, event.clientY);
  els.root.style.display = '';

  if (!pageElement || pageElement === document.documentElement || pageElement === document.body) {
    toast("无法选择该元素");
    return;
  }

  const selector = buildSelector(pageElement);

  if (!selector) {
    toast("无法生成选择器");
    return;
  }

  let note = state.notes.find(item => item.selector === selector);
  const isNewNote = !note;

  if (!note) {
    note = {
      id: makeId(),
      selector,
      tag: pageElement.tagName.toLowerCase(),
      title: labelFromElement(pageElement),
      text: ""
    };
    state.notes.push(note);
  }

  state.selectedId = note.id;
  state.editingId = isNewNote ? note.id : null;

  toast(`已添加备注: ${note.title}`);

  renderNotes();
  saveNotes();

  notifySidepanel();
}

// ---- Note editing helpers ----
function saveNoteFromPopover(noteId, popover, options = {}) {
  if (!isExtensionContextValid()) return;

  const note = state.notes.find(item => item.id === noteId);
  if (!note) return;

  note.title = popover.querySelector(".note-input").value.trim() || "未命名备注";
  note.text = popover.querySelector(".note-textarea").value.trim();

  // If description is empty, delete the note instead of keeping it
  if (!note.text) {
    state.notes = state.notes.filter(item => item.id !== noteId);
    state.selectedId = null;
    state.editingId = null;
    saveNotes();
    if (!options.skipRender) renderNotes();
    notifySidepanel();
    return;
  }

  if (state.editingId === noteId) state.editingId = null;
  state.selectedId = null;
  saveNotes();

  if (!options.skipRender) renderNotes();
  if (!options.silent) toast("备注已保存");

  notifySidepanel();
}

function saveActiveEditingNote() {
  if (!isExtensionContextValid()) return;
  if (!state.editingId) return;

  const popover = els.noteLayer?.querySelector(".note-pop.editing");
  if (!popover) {
    state.editingId = null;
    return;
  }

  saveNoteFromPopover(state.editingId, popover, { silent: true, skipRender: true });
}

function deleteNote(noteId) {
  if (!isExtensionContextValid()) return;

  const note = state.notes.find(item => item.id === noteId);
  if (!note) return;

  if (note.text.trim() && !confirm("确定删除这条备注吗？")) return;

  state.notes = state.notes.filter(item => item.id !== noteId);
  state.selectedId = null;
  state.editingId = null;

  saveNotes();
  renderNotes();
  toast("备注已删除");

  notifySidepanel();
}

// ---- Render pins (works in both annotation and preview modes) ----
function renderNotes() {
  if (!isExtensionContextValid()) return;
  if (!els.noteLayer) return;

  els.noteLayer.innerHTML = "";
  let visible = 0;

  for (const note of state.notes) {
    let element = null;
    try {
      element = document.querySelector(note.selector);
    } catch (e) {
      // selector may be invalid (e.g. legacy numeric ID), skip
      continue;
    }
    if (!element || !isElementVisible(element)) continue;

    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;

    visible += 1;

    const pin = document.createElement("button");
    pin.className = "pin";
    const isSelected = note.id === state.selectedId;
    pin.classList.toggle("selected", isSelected);
    pin.setAttribute("aria-pressed", String(isSelected));
    pin.textContent = visible;
    pin.title = isSelected ? "隐藏备注" : (note.title || "显示备注");

    pin.style.left = `${clamp(rect.right - 12, 4, window.innerWidth - 32)}px`;
    pin.style.top = `${clamp(rect.top - 12, 4, window.innerHeight - 32)}px`;

    pin.addEventListener("pointerdown", event => {
      if (!isExtensionContextValid()) return;

      event.preventDefault();
      event.stopPropagation();

      const wasSelected = state.selectedId === note.id;

      if (state.editingId) saveActiveEditingNote();

      if (wasSelected) {
        state.selectedId = null;
        state.editingId = null;
      } else {
        state.selectedId = note.id;
        state.editingId = note.id;
      }

      renderNotes();
      notifySidepanel();
    });

    els.noteLayer.appendChild(pin);

    if (isSelected) {
      const pop = document.createElement("article");
      pop.className = "note-pop editing";
      pop.innerHTML = `
        <input class="note-input" placeholder="标题">
        <textarea class="note-textarea" placeholder="输入备注内容..."></textarea>
        <div class="note-actions">
          <button class="icon-btn save-note" title="保存">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
          </button>
          <button class="icon-btn danger delete-note" title="删除">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18"></path>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <path d="M6 6l1 15h10l1-15"></path>
              <path d="M10 11v6"></path>
              <path d="M14 11v6"></path>
            </svg>
          </button>
        </div>
      `;

      pop.querySelector(".note-input").value = note.title || "";
      pop.querySelector(".note-textarea").value = note.text || "";

      let suppressFocusSave = false;

      // On focus loss: save and close the popover entirely
      pop.addEventListener("focusout", (e) => {
        if (suppressFocusSave) return;
        if (e.relatedTarget && pop.contains(e.relatedTarget)) return;
        setTimeout(() => {
          if (!isExtensionContextValid()) return;
          if (!pop.isConnected) return;
          if (document.activeElement && pop.contains(document.activeElement)) return;
          saveNoteFromPopover(note.id, pop, { silent: true, skipRender: true });
          state.selectedId = null;
          state.editingId = null;
          renderNotes();
          notifySidepanel();
        }, 0);
      });

      pop.querySelector(".save-note").addEventListener("mousedown", (event) => {
        event.preventDefault();
      });
      pop.querySelector(".save-note").addEventListener("click", event => {
        if (!isExtensionContextValid()) return;
        event.stopPropagation();
        suppressFocusSave = true;
        state.selectedId = null;
        state.editingId = null;
        saveNoteFromPopover(note.id, pop, {});
      });

      pop.querySelector(".delete-note").addEventListener("mousedown", (event) => {
        event.preventDefault();
      });
      pop.querySelector(".delete-note").addEventListener("click", event => {
        if (!isExtensionContextValid()) return;
        event.stopPropagation();
        suppressFocusSave = true;
        deleteNote(note.id);
      });

      setTimeout(() => pop.querySelector(".note-input")?.focus(), 0);

      // Smart positioning: measure actual popover size, then flip/adjust
      // to keep it fully within the viewport.
      els.noteLayer.appendChild(pop);

      const popW = pop.offsetWidth || 220;
      const popH = pop.offsetHeight || 140;
      const pinRect = pin.getBoundingClientRect();
      const gap = 8;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Default: below the pin, left-aligned
      let left = pinRect.left - 8;
      let top = pinRect.bottom + gap;

      // If not enough space below, flip above
      if (top + popH > vh - 4) {
        top = pinRect.top - popH - gap;
      }
      // If still out of bounds (very small viewport), clamp to top
      if (top < 4) top = 4;

      // Horizontal: if overflows right, shift left; if overflows left, clamp
      if (left + popW > vw - 4) {
        left = vw - popW - 4;
      }
      if (left < 4) left = 4;

      pop.style.left = `${left}px`;
      pop.style.top = `${top}px`;
    }
  }

  // Set flag so the next captureLayer click knows a popover was open.
  // Only set to true here; it's cleared in onCaptureClick after consuming it.
  // This survives the focusout→renderNotes cycle because we never set it false here.
  if (state.selectedId || state.editingId) {
    state._popoverWasOpen = true;
  }

  // In annotation mode, when a popover is open:
  // - hide crosshair cursor (show default)
  // - show blue border on the selected note's DOM element
  // - page stays non-interactive (capture layer remains active)
  if (state.mode === 'annotation') {
    const popoverOpen = state.selectedId || state.editingId;
    if (popoverOpen) {
      removeCursorStyle();
      // show blue border on the selected note's element
      const selectedNote = state.notes.find(n => n.id === state.selectedId);
      if (selectedNote) {
        try {
          const el = document.querySelector(selectedNote.selector);
          if (el) {
            drawTargetBox(el);
          }
        } catch (e) {
          // ignore
        }
      }
    } else {
      addCursorStyle();
      // don't touch targetBox here — onCaptureMove manages it
    }
  }

  notifySidepanel({ total: state.notes.length, visible });
}

function scheduleRender() {
  if (!isExtensionContextValid()) return;
  if (state.editingId) return;
  clearTimeout(renderTimer);
  renderTimer = setTimeout(renderNotes, 80);
}

function drawTargetBox(element) {
  const rect = element.getBoundingClientRect();
  els.targetBox.style.left = `${rect.left}px`;
  els.targetBox.style.top = `${rect.top}px`;
  els.targetBox.style.width = `${rect.width}px`;
  els.targetBox.style.height = `${rect.height}px`;
  els.targetBox.classList.add("show");
}

// ---- Selector & label helpers ----
function buildSelector(element) {
  if (element.id) return `[id="${cssEscape(element.id)}"]`;

  const parts = [];
  let current = element;

  while (current && current.nodeType === 1 && current !== document.documentElement) {
    const tag = current.tagName.toLowerCase();
    const stableAttr = ["data-testid", "data-id", "name", "aria-label"].find(attr => current.getAttribute(attr));

    if (stableAttr) {
      parts.unshift(`${tag}[${stableAttr}="${cssEscape(current.getAttribute(stableAttr))}"]`);
      break;
    }

    const className = [...current.classList].find(name => !/active|show|selected|hover|focus/.test(name));
    const base = className ? `${tag}.${cssEscape(className)}` : tag;
    const index = siblingIndex(current);

    parts.unshift(`${base}:nth-of-type(${index})`);
    current = current.parentElement;
  }

  const selector = parts.join(" > ");
  if (!selector && element.tagName) {
    return element.tagName.toLowerCase();
  }
  return selector;
}

function siblingIndex(element) {
  const tag = element.tagName;
  const siblings = [...element.parentElement.children].filter(item => item.tagName === tag);
  return siblings.indexOf(element) + 1;
}

function labelFromElement(element) {
  const text = (element.innerText || element.textContent || "").trim().replace(/\s+/g, " ");
  if (text) return text.slice(0, 24);
  return `${element.tagName.toLowerCase()} 备注`;
}

function isElementVisible(element) {
  const style = window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
}

// ---- MutationObserver ----
function tryInjectObserver() {
  if (!isExtensionContextValid()) return;
  if (mutationObserver) return;

  mutationObserver = new MutationObserver(() => scheduleRender());
  mutationObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style", "hidden"]
  });

  window.addEventListener("scroll", scheduleRender, true);
}

// ---- Storage ----
function getStorageKey() {
  const url = new URL(window.location.href);
  if (url.protocol === 'file:') {
    return 'domNotes_' + url.pathname;
  }
  return 'domNotes_' + url.hostname + url.pathname;
}

function loadNotes(callback) {
  if (!isExtensionContextValid()) {
    if (callback) callback();
    return;
  }

  const key = getStorageKey();

  if (window.location.protocol === 'file:') {
    try {
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed && Array.isArray(parsed.notes)) {
          state.notes = parsed.notes;
        }
      }
    } catch (e) {
      console.warn('Failed to load notes from localStorage:', e);
    }
    if (callback) callback();
    return;
  }

  try {
    chrome.storage.local.get([key], (result) => {
      if (chrome.runtime.lastError) {
        if (chrome.runtime.lastError.message &&
            chrome.runtime.lastError.message.includes('Extension context invalidated')) {
          handleContextInvalidated();
        }
        if (callback) callback();
        return;
      }

      const data = result[key];
      if (data && Array.isArray(data.notes)) {
        state.notes = data.notes;
      }
      if (callback) callback();
    });
  } catch (e) {
    handleContextInvalidated();
    if (callback) callback();
  }
}

function saveNotes() {
  if (!isExtensionContextValid()) return;

  const key = getStorageKey();

  if (window.location.protocol === 'file:') {
    try {
      localStorage.setItem(key, JSON.stringify({
        url: window.location.href,
        notes: state.notes
      }));
    } catch (e) {
      console.warn('Failed to save notes to localStorage:', e);
    }
    return;
  }

  try {
    chrome.storage.local.set({
      [key]: {
        url: window.location.href,
        notes: state.notes
      }
    }, () => {
      if (chrome.runtime.lastError) {
        if (chrome.runtime.lastError.message &&
            chrome.runtime.lastError.message.includes('Extension context invalidated')) {
          handleContextInvalidated();
        }
      }
    });
  } catch (e) {
    handleContextInvalidated();
  }
}

// ---- Sidepanel communication ----
function notifySidepanel(data = {}) {
  if (!isExtensionContextValid()) return;

  try {
    chrome.runtime.sendMessage({
      type: 'update',
      payload: {
        mode: state.mode,
        selectedId: state.selectedId,
        notes: state.notes,
        total: state.notes.length,
        ...data
      }
    }, () => {
      if (chrome.runtime.lastError) {
        if (chrome.runtime.lastError.message &&
            chrome.runtime.lastError.message.includes('Extension context invalidated')) {
          handleContextInvalidated();
        }
      }
    });
  } catch (e) {
    if (e.message && e.message.includes('Extension context invalidated')) {
      handleContextInvalidated();
    }
  }
}

// ---- Misc helpers ----
function cssEscape(value) {
  return String(value).replace(/["\\]/g, "\\$&");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function makeId() {
  return `note-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function toast(message) {
  if (!els.toast) return;
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => els.toast.classList.remove("show"), 1600);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
