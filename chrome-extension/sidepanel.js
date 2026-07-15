const els = {
  iconBtns: Array.from(document.querySelectorAll('.icon-btn')),
  themeDropdown: document.getElementById('themeDropdown'),
  themeTrigger: document.getElementById('themeTrigger'),
  themeMenu: document.getElementById('themeMenu'),
  themeItems: Array.from(document.querySelectorAll('.theme-dd-item')),
  themeTriggerDot: document.getElementById('themeTriggerDot'),
  noteList: document.getElementById("noteList"),
  emptyState: document.getElementById("emptyState"),
  actionsRow: document.getElementById("actionsRow"),
  exportJson: document.getElementById("exportJson"),
  importJson: document.getElementById("importJson"),
  clearAll: document.getElementById("clearAll"),
  clearMenu: document.getElementById("clearMenu"),
  exportMenu: document.getElementById("exportMenu"),
  shareUrl: document.getElementById("shareUrl"),
  saveShareUrl: document.getElementById("saveShareUrl"),
  clearShareUrl: document.getElementById("clearShareUrl")
};

let currentState = {
  mode: null,
  readOnly: false,
  selectedId: null,
  openIds: [],
  notes: [],
  total: 0,
  visible: 0
};

let activeTabId = null;
let extensionSupported = false;
let currentTheme = 'minimal';

function init() {
  els.iconBtns.forEach(btn => {
    btn.addEventListener("click", () => onModeSelect(btn.dataset.mode));
  });
  els.themeItems.forEach(item => {
    item.addEventListener("click", () => setTheme(item.dataset.theme));
  });
  els.importJson.addEventListener("change", importJson);
  els.saveShareUrl.addEventListener("click", saveShareUrl);
  els.clearShareUrl.addEventListener("click", clearShareUrl);

  chrome.storage.local.get(['contexaShareUrl'], (result) => {
    if (result.contexaShareUrl) {
      els.shareUrl.value = result.contexaShareUrl;
    }
  });

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

  document.addEventListener("click", (e) => {
    const linkBtn = e.target.closest('.link-btn');
    if (linkBtn) {
      e.preventDefault();
      chrome.tabs.create({ url: linkBtn.dataset.url });
    }
  });

  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
      e.preventDefault();
      cycleMode();
    }
  });

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
  loadTheme();
}

function requestState() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;

    activeTabId = tabs[0].id;

    chrome.tabs.sendMessage(tabs[0].id, { type: 'getState' }, (response) => {
      if (chrome.runtime.lastError) {
        // Tab doesn't support the extension — reset UI and disable buttons
        currentState.mode = null;
        currentState.readOnly = false;
        extensionSupported = false;
        updateActiveButton(null, false);
        return;
      }
      extensionSupported = true;
      if (response) {
        currentState = { ...currentState, ...response };
        const isShared = response.readOnly && response.mode === 'preview';
        updateActiveButton(isShared ? 'shared' : response.mode, !!response.readOnly);
        renderNoteList(response.notes || []);
      }
    });
  });
}

function updateState(state) {
  if (state.mode !== undefined) {
    currentState.mode = state.mode;
  }
  if (state.readOnly !== undefined) {
    currentState.readOnly = state.readOnly;
  }

  // Only re-render list when notes data actually changes
  if (state.notes !== undefined) {
    const notesChanged = JSON.stringify(state.notes) !== JSON.stringify(currentState.notes);
    if (notesChanged) {
      currentState.notes = state.notes;
      renderNoteList(currentState.notes);
    }
  }

  // Update selection without full re-render
  const prevSelectedId = currentState.selectedId;
  const prevOpenIds = JSON.stringify(currentState.openIds);
  if (state.selectedId !== undefined) {
    currentState.selectedId = state.selectedId;
  }
  if (state.openIds !== undefined) {
    currentState.openIds = state.openIds;
  }
  if (currentState.selectedId !== prevSelectedId ||
      JSON.stringify(currentState.openIds) !== prevOpenIds) {
    updateNoteSelection();
  }

  const isShared = currentState.mode === 'preview' && currentState.readOnly;
  updateActiveButton(isShared ? 'shared' : currentState.mode, currentState.readOnly);
}

function updateNoteSelection() {
  els.noteList.querySelectorAll('.note-item').forEach(item => {
    const id = item.dataset.id;
    const isSelected = currentState.readOnly
      ? currentState.openIds.includes(id)
      : id === currentState.selectedId;
    item.classList.toggle('selected', isSelected);
  });
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

    const isOpen = currentState.readOnly
      ? currentState.openIds.includes(note.id)
      : note.id === currentState.selectedId;
    if (isOpen) {
      item.classList.add('selected');
    }

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
  // For shared mode, check URL first regardless of extension support,
  // so users always get a clear prompt when URL is missing.
  if (mode === 'shared') {
    chrome.storage.local.get(['contexaShareUrl'], (result) => {
      const shareUrl = result.contexaShareUrl;
      if (!shareUrl || !shareUrl.trim()) {
        toast("请先设置共享 JSON URL");
        return;
      }
      if (!extensionSupported) {
        toast("当前页面不支持标注");
        return;
      }

      // URL exists — now check if already active
      const activeMode = currentState.mode === 'preview' && currentState.readOnly
        ? 'shared'
        : currentState.mode;
      if (mode === activeMode) return;

      currentState.mode = 'preview';
      currentState.readOnly = true;
      updateActiveButton('shared', true);

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) return;
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'setMode',
          payload: { mode: 'preview', readOnly: true }
        }, () => {
          sendToActiveTab({
            type: 'loadSharedNotes',
            payload: { url: shareUrl.trim() }
          }, (response) => {
            if (!response || !response.success) {
              toast("加载共享数据失败");
              currentState.readOnly = false;
              updateActiveButton('preview', false);
            } else {
              toast("已开启共享模式");
            }
          });
        });
      });
    });
  } else {
    if (!extensionSupported) {
      toast("当前页面不支持标注");
      return;
    }

    // Non-shared modes: check if already active
    const activeMode = currentState.mode === 'preview' && currentState.readOnly
      ? 'shared'
      : currentState.mode;
    if (mode === activeMode) return;

    // 从共享切出时，先关 readOnly 再切模式，保证状态一致
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
  currentState.readOnly = enabled;
  updateActiveButton(currentState.mode, enabled);

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, {
      type: 'setReadOnly',
      payload: { readOnly: enabled }
    }, () => {
      if (chrome.runtime.lastError) {
        currentState.readOnly = !enabled;
        updateActiveButton(currentState.mode, !enabled);
        toast("当前页面不支持操作");
        if (onError) onError();
        return;
      }
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
    activeMode = 'shared';
  }
  if (!mode) activeMode = null;

  els.iconBtns.forEach(btn => {
    const isActive = btn.dataset.mode === activeMode;
    btn.classList.toggle('active', isActive);
    btn.classList.toggle('disabled', !extensionSupported);
    btn.setAttribute('aria-pressed', isActive);
    btn.setAttribute('aria-disabled', !extensionSupported);
  });
}

function cycleMode() {
  if (!extensionSupported) {
    toast("当前页面不支持标注");
    return;
  }

  const modes = ['annotation', 'preview', 'shared'];
  let activeMode = currentState.mode === 'preview' && currentState.readOnly
    ? 'shared'
    : currentState.mode;

  const currentIndex = modes.indexOf(activeMode);
  const nextIndex = (currentIndex + 1) % modes.length;
  const nextMode = modes[nextIndex];

  onModeSelect(nextMode);
}

function saveShareUrl() {
  const url = els.shareUrl.value.trim();
  if (!url) {
    toast("请输入有效的共享 URL");
    return;
  }

  chrome.storage.local.set({ contexaShareUrl: url }, () => {
    toast("共享 URL 已保存");
  });
}

function clearShareUrl() {
  els.shareUrl.value = '';
  chrome.storage.local.remove('contexaShareUrl', () => {
    toast("已清空共享 URL");
  });
}

// ---- Theme switching ----
function loadTheme() {
  chrome.storage.local.get(['contexaTheme'], (result) => {
    const theme = result.contexaTheme || 'minimal';
    applyTheme(theme);
  });
}

function applyTheme(theme) {
  currentTheme = theme;
  document.body.className = `theme-${theme}`;
  
  els.themeItems.forEach(item => {
    item.classList.toggle('active', item.dataset.theme === theme);
  });

  // Update trigger dot to match selected theme
  const activeItem = els.themeItems.find(item => item.dataset.theme === theme);
  if (activeItem) {
    const dot = activeItem.querySelector('.theme-dot');
    if (dot) els.themeTriggerDot.style.background = dot.style.background;
  }
}

function setTheme(theme) {
  if (theme === currentTheme) return;
  
  applyTheme(theme);
  
  chrome.storage.local.set({ contexaTheme: theme }, () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'setTheme',
          payload: { theme }
        });
      }
    });
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
