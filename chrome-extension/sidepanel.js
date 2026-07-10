const els = {
  iconBtns: Array.from(document.querySelectorAll('.icon-btn')),
  editor: document.getElementById("editor"),
  editorEmpty: document.getElementById("editorEmpty"),
  selectorText: document.getElementById("selectorText"),
  noteList: document.getElementById("noteList"),
  emptyState: document.getElementById("emptyState"),
  actionsRow: document.getElementById("actionsRow"),
  exportJson: document.getElementById("exportJson"),
  importJson: document.getElementById("importJson"),
  clearAll: document.getElementById("clearAll"),
  clearMenu: document.getElementById("clearMenu"),
  exportMenu: document.getElementById("exportMenu")
};

let currentState = {
  mode: null,
  readOnly: false,
  selectedId: null,
  notes: [],
  total: 0,
  visible: 0
};

let activeTabId = null;

function init() {
  els.iconBtns.forEach(btn => {
    btn.addEventListener("click", () => onModeSelect(btn.dataset.mode));
  });
  els.importJson.addEventListener("change", importJson);

  // Dropdown toggles
  els.exportJson.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleDropdown(els.exportMenu);
  });
  els.clearAll.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleDropdown(els.clearMenu);
  });

  // Dropdown item handlers
  els.exportMenu.addEventListener("click", (e) => {
    const item = e.target.closest(".dd-item");
    if (!item) return;
    e.stopPropagation();
    closeAllDropdowns();
    if (item.dataset.scope === "page") exportPage();
    else exportAll();
  });
  els.clearMenu.addEventListener("click", (e) => {
    const item = e.target.closest(".dd-item");
    if (!item) return;
    e.stopPropagation();
    closeAllDropdowns();
    if (item.dataset.scope === "page") clearPage();
    else clearAllData();
  });

  // Close dropdowns on outside click
  document.addEventListener("click", closeAllDropdowns);

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'update') {
      // Only accept updates from the currently active tab
      if (sender.tab && sender.tab.id === activeTabId) {
        updateState(message.payload);
      }
    }
  });

  // Track tab switches and refresh state immediately
  chrome.tabs.onActivated.addListener((activeInfo) => {
    activeTabId = activeInfo.tabId;
    requestState();
  });

  requestState();
}

function requestState() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;

    activeTabId = tabs[0].id;

    chrome.tabs.sendMessage(tabs[0].id, { type: 'getState' }, (response) => {
      if (chrome.runtime.lastError) {
        // Tab doesn't support the extension — reset UI
        currentState.mode = null;
        currentState.readOnly = false;
        updateActiveButton(null, false);
        return;
      }
      if (response) {
        updateState(response);
      }
    });
  });
}

function updateState(state) {
  currentState = { ...currentState, ...state };

  // sync icon buttons from mode + readOnly state
  updateActiveButton(state.mode, !!state.readOnly);

  // Render all notes list
  renderNoteList(state.notes || []);
}

function renderNoteList(notes) {
  els.noteList.innerHTML = '';

  const hasNotes = notes.length > 0;
  els.emptyState.hidden = hasNotes;
  els.actionsRow.hidden = !hasNotes;
  els.noteList.hidden = !hasNotes;

  if (!hasNotes) return;

  notes.forEach((note, index) => {
    const item = document.createElement('div');
    item.className = 'note-item';
    item.dataset.id = note.id;

    const badge = document.createElement('span');
    badge.className = 'note-badge';
    badge.textContent = index + 1;

    const text = document.createElement('div');
    text.className = 'note-text';
    text.textContent = note.title || '(未命名备注)';

    item.appendChild(badge);
    item.appendChild(text);

    item.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) return;
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'selectNote',
          payload: { id: note.id }
        }, () => {
          if (chrome.runtime.lastError) {
            toast("当前页面不支持操作");
          }
        });
      });
    });

    els.noteList.appendChild(item);
  });
}

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

// ---- Dropdown helpers ----
function toggleDropdown(menu) {
  const isOpen = menu.classList.contains("show");
  closeAllDropdowns();
  if (!isOpen) menu.classList.add("show");
}

function closeAllDropdowns() {
  document.querySelectorAll(".dd-menu").forEach((m) => m.classList.remove("show"));
}

// ---- Storage helpers (key logic must match content.js) ----
function getStorageKeyForUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    if (url.protocol === "file:") {
      return "domNotes_" + url.pathname;
    }
    return "domNotes_" + url.hostname + url.pathname;
  } catch (e) {
    return null;
  }
}

function getActiveTab(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    callback(tabs[0] || null);
  });
}

function sendToActiveTab(message, callback) {
  getActiveTab((tab) => {
    if (!tab) {
      if (callback) callback(null);
      return;
    }
    chrome.tabs.sendMessage(tab.id, message, (response) => {
      if (chrome.runtime.lastError) {
        if (callback) callback(null);
        return;
      }
      if (callback) callback(response);
    });
  });
}

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

// ---- Export ----
function exportPage() {
  sendToActiveTab({ type: "exportJson" }, (response) => {
    if (!response || !response.data) {
      toast("当前页面不支持操作");
      return;
    }
    downloadJson(response.data, "dom-notes.json");
    toast("JSON 已导出");
  });
}

function exportAll() {
  chrome.storage.local.get(null, (allData) => {
    const pages = [];
    for (const key of Object.keys(allData)) {
      if (key.startsWith("domNotes_") && allData[key] && Array.isArray(allData[key].notes)) {
        pages.push({
          url: allData[key].url || "",
          notes: allData[key].notes
        });
      }
    }
    if (pages.length === 0) {
      toast("没有可导出的数据");
      return;
    }
    const exportData = {
      version: "0.3.0",
      exportedAt: new Date().toISOString(),
      pages
    };
    downloadJson(exportData, "dom-notes-all.json");
    toast(`已导出 ${pages.length} 个页面的数据`);
  });
}

// ---- Import (routes by URL) ----
function importJson(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);

      // Normalize to a list of { url, notes } pages
      let pages = [];
      if (Array.isArray(data.pages)) {
        pages = data.pages.filter((p) => p && p.url && Array.isArray(p.notes));
      } else if (Array.isArray(data.notes)) {
        pages = [{ url: data.url || "", notes: data.notes }];
      }

      if (pages.length === 0) {
        toast("未找到有效的备注数据");
        return;
      }

      importPages(pages);
    } catch (error) {
      toast("导入失败，请检查 JSON 格式");
    }
  };

  reader.readAsText(file);
  event.target.value = "";
}

function importPages(pages) {
  getActiveTab((tab) => {
    if (!tab) {
      toast("无法确定当前页面");
      return;
    }

    const currentKey = getStorageKeyForUrl(tab.url);
    const currentNotes = [];
    const otherPages = [];

    for (const page of pages) {
      const key = getStorageKeyForUrl(page.url);
      if (key === currentKey) {
        // Current page: route through content script (handles all protocols)
        currentNotes.push(...page.notes);
      } else if (key) {
        // Other page: write directly to storage
        otherPages.push(page);
      }
    }

    const tasks = [];

    // Current page notes via content script
    if (currentNotes.length > 0) {
      tasks.push(
        new Promise((resolve) => {
          sendToActiveTab(
            { type: "importJson", payload: { notes: currentNotes } },
            resolve
          );
        })
      );
    }

    // Other pages: merge directly into storage
    for (const page of otherPages) {
      const key = getStorageKeyForUrl(page.url);
      tasks.push(
        new Promise((resolve) => {
          chrome.storage.local.get([key], (result) => {
            const existing = result[key];
            const existingNotes =
              existing && Array.isArray(existing.notes) ? existing.notes : [];
            const existingIds = new Set(existingNotes.map((n) => n.id));
            const merged = existingNotes.concat(
              page.notes.filter((n) => !existingIds.has(n.id))
            );
            chrome.storage.local.set(
              { [key]: { url: page.url, notes: merged } },
              resolve
            );
          });
        })
      );
    }

    Promise.all(tasks).then(() => {
      toast(`已导入 ${pages.length} 个页面的数据`);
    });
  });
}

// ---- Clear ----
function clearPage() {
  if (!confirm("确定清空当前页面的全部备注吗？")) return;
  sendToActiveTab({ type: "clearAll" }, (response) => {
    if (!response) toast("当前页面不支持操作");
  });
}

function clearAllData() {
  chrome.storage.local.get(null, (allData) => {
    const keysToRemove = Object.keys(allData).filter((k) =>
      k.startsWith("domNotes_")
    );
    if (keysToRemove.length === 0) {
      toast("没有可清空的数据");
      return;
    }
    if (
      !confirm(
        `确定清空全部数据吗？将删除 ${keysToRemove.length} 个页面的备注，此操作不可撤销。`
      )
    )
      return;

    chrome.storage.local.remove(keysToRemove, () => {
      // Notify current page's content script to reload
      sendToActiveTab({ type: "reloadNotes" }, () => {});
      toast("已清空全部数据");
    });
  });
}

function toast(message) {
  let toastEl = document.querySelector('.toast');
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    document.body.appendChild(toastEl);
  }

  toastEl.textContent = message;
  toastEl.classList.add('show');

  clearTimeout(toastEl.timer);
  toastEl.timer = setTimeout(() => toastEl.classList.remove('show'), 1600);
}

document.addEventListener('DOMContentLoaded', init);
