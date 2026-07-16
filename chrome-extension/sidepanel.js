// i18n（i18n.js 已在 sidepanel.js 之前引入）
const t = (typeof i18n !== 'undefined') ? i18n.t : (k, v) => k;

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
  clearShareUrl: document.getElementById("clearShareUrl"),
  modeHint: document.getElementById("modeHint"),
  grantBox: document.getElementById("grantBox"),
  grantHostname: document.getElementById("grantHostname"),
  grantBtn: document.getElementById("grantBtn"),
  grantedDomainList: document.getElementById("grantedDomainList"),
  langToggle: document.getElementById("langToggle"),
  langLabel: document.getElementById("langLabel")
};

// 当前页面授权状态：'unknown' | 'not-needed' | 'granted' | 'pending'
//   not-needed: file://、chrome:// 等不需要域名授权的页面（走原有流程）
//   granted:   当前 http/https 域名已授权
//   pending:   未授权，侧边栏显示引导
let domainGrantState = 'unknown';
let currentHostname = '';

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

// 应用当前语言到所有标记了 data-i18n 的元素
function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPh);
  });
  // 更新语言切换按钮显示（显示"另一种语言"的缩写）
  if (els.langLabel) {
    els.langLabel.textContent = i18n.getLang() === 'zh' ? 'EN' : '中';
  }
  // 刷新动态文案（modeHint 当前态、grant 按钮等）
  if (typeof modeHints !== 'undefined' && currentState.mode) {
    const m = currentState.mode === 'preview' && currentState.readOnly ? 'shared' : currentState.mode;
    if (modeHints[m]) els.modeHint.textContent = modeHints[m];
  }
  // 域名管理列表是动态生成的（非 data-i18n），语言切换后需重新渲染
  if (typeof renderGrantedDomainList !== 'undefined') {
    renderGrantedDomainList();
  }
}

// 切换语言并刷新所有文案 + 通知 content/background
function toggleLang() {
  const next = i18n.getLang() === 'zh' ? 'en' : 'zh';
  i18n.setLang(next, () => {
    applyI18n();
    // 通知 content script 同步语言（重新渲染 toolbar/pin title 等）
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      chrome.tabs.sendMessage(tabs[0].id, { type: 'setLang', payload: { lang: next } }, () => {
        if (chrome.runtime.lastError) { /* content 不在则忽略 */ }
      });
    });
  });
}

function init() {
  els.iconBtns.forEach(btn => {
    btn.addEventListener("click", () => onModeSelect(btn.dataset.mode));
  });
  els.themeItems.forEach(item => {
    item.addEventListener("click", () => setTheme(item.dataset.theme));
  });
  els.langToggle.addEventListener("click", toggleLang);
  els.importJson.addEventListener("change", importJson);
  els.saveShareUrl.addEventListener("click", saveShareUrl);
  els.clearShareUrl.addEventListener("click", clearShareUrl);
  els.grantBtn.addEventListener("click", onGrantClick);

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
    // Ctrl/Cmd+0：云端模式 → 关闭已打开备注；非云端 → 进入云端模式
    if ((e.metaKey || e.ctrlKey) && e.key === '0') {
      e.preventDefault();
      onCtrlZero();
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

  // 初始化语言并应用文案（首次根据浏览器语言或用户历史选择）
  // 域名列表等动态文案在 applyI18n 内部渲染，须等语言就绪
  i18n.init(() => applyI18n());
}

// 判定当前页面是否需要/已通过域名授权
// 返回 'http-granted' | 'http-pending' | 'special'（file/chrome 等走原流程）
function classifyTab(url) {
  let parsed;
  try { parsed = new URL(url); } catch (e) { return 'special'; }
  // http/https 才走域名授权；file、chrome、edge 等走原流程
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return 'special';
  }
  currentHostname = parsed.hostname;
  return 'http';
}

function requestState() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;

    activeTabId = tabs[0].id;
    const url = tabs[0].url || '';

    // chrome:// 等无 url 或受限页面：直接标记不支持
    if (!url) {
      showUnsupportedPage();
      return;
    }

    const tabKind = classifyTab(url);

    if (tabKind === 'http') {
      // http/https：先查域名是否已授权
      chrome.runtime.sendMessage(
        { type: 'checkDomainGranted', payload: { hostname: currentHostname } },
        (res) => {
          if (res && res.granted) {
            domainGrantState = 'granted';
            queryContentState(tabs[0].id, true);
          } else {
            // 未授权：显示引导态，不发 getState
            domainGrantState = 'pending';
            showGrantPrompt(currentHostname);
          }
        }
      );
      return;
    }

    // file:// / chrome:// 等：走原有流程（content script 静态注入或不支持）
    domainGrantState = 'not-needed';
    hideGrantPrompt();
    queryContentState(tabs[0].id, false);
  });
}

// 原 getState 流程抽离（已授权或特殊页面调用）
// granted=true 表示该域名已授权、期望脚本已注入；若 getState 失败则尝试补注入
function queryContentState(tabId, granted) {
  chrome.tabs.sendMessage(tabId, { type: 'getState' }, (response) => {
    if (chrome.runtime.lastError) {
      // getState 失败
      if (granted) {
        // 已授权但脚本未注入（如扩展 reload 后注册丢失、或当前页是 reload 前打开的标签页）
        // 主动对当前页补注入，再轮询就绪
        recoverInjectedTab(tabId);
        return;
      }
      // 非授权页面（file/special）不支持 —— 显示不支持
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
}

// 已授权但脚本缺失时，对当前标签页补注入 content script，然后轮询就绪
function recoverInjectedTab(tabId) {
  chrome.runtime.sendMessage(
    { type: 'injectCurrentTab', payload: { tabId } },
    (res) => {
      if (!res || !res.success) {
        // 补注入失败（可能是受限页面），降级为不支持
        currentState.mode = null;
        currentState.readOnly = false;
        extensionSupported = false;
        updateActiveButton(null, false);
        return;
      }
      // 补注入成功，轮询 content script 就绪
      waitForContentReady(tabId, 5, 300, null);
    }
  );
}

function showUnsupportedPage() {
  currentState.mode = null;
  currentState.readOnly = false;
  extensionSupported = false;
  domainGrantState = 'unknown';
  hideGrantPrompt();
  updateActiveButton(null, false);
}

// 显示域名授权引导
function showGrantPrompt(hostname) {
  els.modeHint.hidden = true;
  els.grantBox.hidden = false;
  els.grantHostname.textContent = hostname;
  els.grantBtn.textContent = t('grant.btnWithHost', { host: hostname });
  extensionSupported = false;
  currentState.mode = null;
  currentState.readOnly = false;
  updateActiveButton(null, false);
}

function hideGrantPrompt() {
  els.modeHint.hidden = false;
  els.grantBox.hidden = true;
}

function updateState(state) {
  let needsRender = false;

  if (state.mode !== undefined) {
    currentState.mode = state.mode;
  }

  // Re-render when readOnly changes (e.g. entering/leaving cloud mode),
  // because the empty-state import button visibility depends on it.
  const prevReadOnly = currentState.readOnly;
  if (state.readOnly !== undefined) {
    currentState.readOnly = state.readOnly;
    if (prevReadOnly !== state.readOnly) {
      needsRender = true;
    }
  }

  // Only re-render list when notes data actually changes
  if (state.notes !== undefined) {
    const notesChanged = JSON.stringify(state.notes) !== JSON.stringify(currentState.notes);
    if (notesChanged) {
      currentState.notes = state.notes;
      needsRender = true;
    }
  }

  if (needsRender) {
    renderNoteList(currentState.notes);
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

let dragSrcId = null;

function renderNoteList(notes) {
  els.noteList.innerHTML = '';

  const hasNotes = notes.length > 0;
  const isReadOnly = currentState.readOnly;

  els.noteList.hidden = !hasNotes;
  els.emptyState.hidden = hasNotes;
  els.actionsRow.hidden = !hasNotes || isReadOnly;

  // Hide import button in empty state when in shared mode
  const emptyImportBtn = els.emptyState.querySelector('label[for="importJson"]');
  if (emptyImportBtn) emptyImportBtn.hidden = isReadOnly;

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

    // Drag handle only in editable modes (not shared/readOnly)
    if (!currentState.readOnly) {
      item.draggable = true;

      const handle = document.createElement('span');
      handle.className = 'note-drag-handle';
      handle.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>';
      item.appendChild(handle);
    }

    const badge = document.createElement('span');
    badge.className = 'note-badge';
    badge.textContent = index + 1;

    const text = document.createElement('div');
    text.className = 'note-text';
    text.textContent = note.title || t('note.untitledParen');

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
            toast(t('toast.unsupportedOp'));
          }
        });
      });
    });

    // Drag & Drop sorting — only in editable modes
    if (!currentState.readOnly) {
      item.addEventListener('dragstart', (e) => {
        dragSrcId = note.id;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        els.noteList.querySelectorAll('.note-item').forEach(el => {
          el.classList.remove('drag-over-top', 'drag-over-bottom');
        });
        dragSrcId = null;
      });

      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (!dragSrcId || dragSrcId === note.id) return;

        const rect = item.getBoundingClientRect();
        const isAbove = e.clientY < rect.top + rect.height / 2;
        item.classList.toggle('drag-over-top', isAbove);
        item.classList.toggle('drag-over-bottom', !isAbove);
      });

      item.addEventListener('dragleave', () => {
        item.classList.remove('drag-over-top', 'drag-over-bottom');
      });

      item.addEventListener('drop', (e) => {
        e.preventDefault();
        item.classList.remove('drag-over-top', 'drag-over-bottom');
        if (!dragSrcId || dragSrcId === note.id) return;

        const rect = item.getBoundingClientRect();
        const insertBefore = e.clientY < rect.top + rect.height / 2;
        reorderNotes(dragSrcId, note.id, insertBefore);
      });
    }

    els.noteList.appendChild(item);
  });
}

function reorderNotes(srcId, targetId, insertBefore) {
  const notes = [...currentState.notes];
  const srcIdx = notes.findIndex(n => n.id === srcId);
  const targetIdx = notes.findIndex(n => n.id === targetId);
  if (srcIdx === -1 || targetIdx === -1) return;

  const [moved] = notes.splice(srcIdx, 1);
  // Recalculate target index after removal
  const newTargetIdx = notes.findIndex(n => n.id === targetId);
  notes.splice(insertBefore ? newTargetIdx : newTargetIdx + 1, 0, moved);

  currentState.notes = notes;
  renderNoteList(currentState.notes);

  // Sync to content script
  const orderedIds = notes.map(n => n.id);
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, {
      type: 'reorderNotes',
      payload: { orderedIds }
    }, () => {
      if (chrome.runtime.lastError) {
        toast(t('toast.unsupportedOp'));
      }
    });
  });
}

// ---- 域名授权 ----
// 点击「授权访问」按钮（用户手势内）→ request 权限 → 注册注入 → 轮询就绪
function onGrantClick() {
  const hostname = currentHostname;
  if (!hostname) {
    toast(t('toast.noHostname'));
    return;
  }
  const origin = `*://${hostname}/*`;
  els.grantBtn.disabled = true;
  els.grantBtn.textContent = t('grant.waiting');

  chrome.permissions.request({ origins: [origin] }, (granted) => {
    if (chrome.runtime.lastError) {
      resetGrantBtn(hostname);
      toast(t('toast.grantFail'));
      return;
    }
    if (!granted) {
      resetGrantBtn(hostname);
      toast(t('toast.grantCancelled'));
      return;
    }
    // 权限已授予，通知 background 注册 content script（带 tabId 用于立即注入当前页）
    chrome.runtime.sendMessage(
      { type: 'grantDomain', payload: { hostname, tabId: activeTabId } },
      (res) => {
        resetGrantBtn(hostname);
        if (!res || !res.success) {
          toast(t('toast.registerFail'));
          return;
        }
        domainGrantState = 'granted';
        hideGrantPrompt();
        renderGrantedDomainList();
        // content script 注入需要一点时间，轮询 getState 直至就绪
        waitForContentReady(activeTabId, 5, 300, () => {
          toast(t('toast.granted'));
        });
      }
    );
  });
}

function resetGrantBtn(hostname) {
  els.grantBtn.disabled = false;
  els.grantBtn.textContent = t('grant.btnWithHost', { host: hostname });
}

// 由模式按钮触发的授权：授权成功后继续执行 pendingMode
function requestGrantAndContinue(pendingMode) {
  const hostname = currentHostname;
  if (!hostname) {
    toast(t('toast.noHostname'));
    return;
  }
  const origin = `*://${hostname}/*`;
  toast(t('toast.requestingGrant', { host: hostname }));

  chrome.permissions.request({ origins: [origin] }, (granted) => {
    if (chrome.runtime.lastError || !granted) {
      toast(t('toast.grantCancelled'));
      return;
    }
    chrome.runtime.sendMessage(
      { type: 'grantDomain', payload: { hostname, tabId: activeTabId } },
      (res) => {
        if (!res || !res.success) {
          toast(t('toast.registerFail'));
          return;
        }
        domainGrantState = 'granted';
        hideGrantPrompt();
        renderGrantedDomainList();
        // 轮询 content script 就绪后，再执行被拦截的模式切换
        waitForContentReady(activeTabId, 5, 300, () => {
          onModeSelect(pendingMode);
        });
      }
    );
  });
}

// 轮询 content script 是否就绪：最多 retries 次，每次间隔 interval ms
function waitForContentReady(tabId, retries, interval, onReady) {
  let attempt = 0;
  const poll = () => {
    attempt++;
    chrome.tabs.sendMessage(tabId, { type: 'getState' }, (response) => {
      if (!chrome.runtime.lastError && response) {
        // 注入就绪
        extensionSupported = true;
        currentState = { ...currentState, ...response };
        const isShared = response.readOnly && response.mode === 'preview';
        updateActiveButton(isShared ? 'shared' : response.mode, !!response.readOnly);
        renderNoteList(response.notes || []);
        if (onReady) onReady();
        return;
      }
      if (attempt < retries) {
        setTimeout(poll, interval);
      } else {
        // 超时：提示刷新（注入偶尔需要页面刷新才生效）
        toast(t('toast.refreshToActivate'));
      }
    });
  };
  setTimeout(poll, interval);
}

// 渲染域名管理列表
function renderGrantedDomainList() {
  chrome.runtime.sendMessage({ type: 'listGrantedDomains' }, (res) => {
    if (!res || !res.success) return;
    const hostnames = res.hostnames || [];
    els.grantedDomainList.innerHTML = '';

    if (hostnames.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'granted-domain-empty';
      empty.textContent = t('domain.empty');
      els.grantedDomainList.appendChild(empty);
      return;
    }

    hostnames.forEach((hostname) => {
      const item = document.createElement('div');
      item.className = 'granted-domain-item';

      const check = document.createElement('span');
      check.className = 'gd-check';
      check.textContent = '✓';

      const name = document.createElement('span');
      name.className = 'gd-name';
      name.textContent = hostname;

      const revoke = document.createElement('button');
      revoke.className = 'gd-revoke';
      revoke.textContent = t('domain.revoke');
      revoke.addEventListener('click', () => onRevokeClick(hostname, revoke));

      item.appendChild(check);
      item.appendChild(name);
      item.appendChild(revoke);
      els.grantedDomainList.appendChild(item);
    });
  });
}

function onRevokeClick(hostname, btn) {
  if (!confirm(t('domain.confirmRevoke', { host: hostname }))) return;
  btn.disabled = true;
  btn.textContent = t('domain.processing');
  chrome.runtime.sendMessage(
    { type: 'revokeDomain', payload: { hostname } },
    (res) => {
      if (!res || !res.success) {
        btn.disabled = false;
        btn.textContent = t('domain.revoke');
        toast(t('toast.revokeFail'));
        return;
      }
      renderGrantedDomainList();
      toast(t('toast.revoked', { host: hostname }));
      // 若撤销的正是当前页面域名，刷新侧边栏为未授权态
      if (hostname === currentHostname && domainGrantState === 'granted') {
        domainGrantState = 'pending';
        showGrantPrompt(currentHostname);
      }
    }
  );
}

// ---- Mode switching (icon toolbar, three-way mutual exclusion) ----
function onModeSelect(mode) {
  // 域名授权拦截：http/https 未授权时，点任意模式都先触发授权，
  // 授权成功后继续执行原本的模式切换（pendingMode 队列）。
  if (domainGrantState === 'pending') {
    requestGrantAndContinue(mode);
    return;
  }

  // For shared mode, check URL first regardless of extension support,
  // so users always get a clear prompt when URL is missing.
  if (mode === 'shared') {
    chrome.storage.local.get(['contexaShareUrl'], (result) => {
      const shareUrl = result.contexaShareUrl;
      if (!shareUrl || !shareUrl.trim()) {
        toast(t('toast.noShareUrl'));
        return;
      }
      if (!extensionSupported) {
        toast(t('toast.unsupported'));
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
      renderNoteList(currentState.notes);

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) return;
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'setMode',
          payload: { mode: 'preview', readOnly: true, shareUrl: shareUrl.trim() }
        }, (response) => {
          if (chrome.runtime.lastError || !response || !response.success) {
            toast(t('toast.sharedFail'));
            currentState.readOnly = false;
            updateActiveButton('preview', false);
            renderNoteList(currentState.notes);
            return;
          }
          const shared = response.shared;
          if (!shared || !shared.success) {
            toast(t('toast.sharedFail'));
            currentState.readOnly = false;
            updateActiveButton('preview', false);
            renderNoteList(currentState.notes);
          } else if (shared.count === 0) {
            toast(t('toast.sharedEmpty'));
          } else {
            toast(t('toast.sharedOn'));
          }
        });
      });
    });
  } else {
    if (!extensionSupported) {
      toast(t('toast.unsupported'));
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
          toast(mode === 'annotation' ? t('toast.annotationOn') : t('toast.previewOn'));
        });
      });
    } else {
      setMode(mode, () => {
        toast(mode === 'annotation' ? t('toast.annotationOn') : t('toast.previewOn'));
      });
    }
  }
}

function setReadOnly(enabled, onError, onSuccess) {
  currentState.readOnly = enabled;
  updateActiveButton(currentState.mode, enabled);
  renderNoteList(currentState.notes);

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, {
      type: 'setReadOnly',
      payload: { readOnly: enabled }
    }, () => {
      if (chrome.runtime.lastError) {
        currentState.readOnly = !enabled;
        updateActiveButton(currentState.mode, !enabled);
        renderNoteList(currentState.notes);
        toast(t('toast.unsupportedOp'));
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
        toast(t('toast.unsupported'));
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

  updateModeHint(activeMode);
}

const modeHints = {
  annotation: () => t('hint.annotation'),
  preview: () => t('hint.preview'),
  shared: () => t('hint.shared')
};

function updateModeHint(activeMode) {
  if (!els.modeHint) return;
  if (activeMode && modeHints[activeMode]) {
    els.modeHint.textContent = modeHints[activeMode]();
  } else {
    els.modeHint.textContent = t('hint.default');
  }
}

function cycleMode() {
  if (!extensionSupported) {
    toast(t('toast.unsupported'));
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

// Ctrl/Cmd+0：云端模式 → 关闭已打开备注；非云端 → 进入云端模式
function onCtrlZero() {
  if (!extensionSupported) {
    toast(t('toast.unsupported'));
    return;
  }
  const isShared = currentState.mode === 'preview' && currentState.readOnly;
  if (isShared) {
    // 云端模式：发消息给 content 关闭所有已打开备注
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      chrome.tabs.sendMessage(tabs[0].id, { type: 'closeAllNotes' }, () => {
        if (chrome.runtime.lastError) {
          toast(t('toast.unsupportedOp'));
        }
      });
    });
  } else {
    // 非云端：进入云端模式（onModeSelect 会校验 shareUrl 并加载）
    onModeSelect('shared');
  }
}

function saveShareUrl() {
  const url = els.shareUrl.value.trim();
  if (!url) {
    toast(t('toast.urlInvalid'));
    return;
  }

  chrome.storage.local.set({ contexaShareUrl: url }, () => {
    toast(t('toast.urlSaved'));
  });
}

function clearShareUrl() {
  els.shareUrl.value = '';
  chrome.storage.local.remove('contexaShareUrl', () => {
    toast(t('toast.urlCleared'));
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

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

// ---- Export ----
function exportPage() {
  sendToActiveTab({ type: "exportJson" }, (response) => {
    if (!response || !response.data) {
      toast(t('toast.unsupportedOp'));
      return;
    }
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      let title = 'untitled';
      if (tabs[0] && tabs[0].title) {
        title = tabs[0].title.replace(/[\\/:*?"<>|]/g, '').trim() || 'untitled';
      }
      downloadJson(response.data, `${title}_${timestamp()}.json`);
      toast(t('toast.exported'));
    });
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
        toast(t('toast.noExportData'));
        return;
      }
      const exportData = {
        version: "0.3.0",
        exportedAt: new Date().toISOString(),
        pages
      };
      downloadJson(exportData, `share_${timestamp()}.json`);
      toast(t('toast.exportAll', { count: pages.length }));
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
        toast(t('toast.noImportData'));
        return;
      }

      importPages(pages);
    } catch (error) {
      toast(t('toast.importFail'));
    }
  };

  reader.readAsText(file);
  event.target.value = "";
}

function importPages(pages) {
  getActiveTab((tab) => {
    if (!tab) {
      toast(t('toast.noTab'));
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
      toast(t('toast.importedPages', { count: pages.length }));
    });
  });
}

// ---- Clear ----
function clearPage() {
  if (!confirm(t('confirm.clearPage'))) return;
  sendToActiveTab({ type: "clearAll" }, (response) => {
    if (!response) toast(t('toast.unsupportedOp'));
  });
}

function clearAllData() {
  chrome.storage.local.get(null, (allData) => {
    const keysToRemove = Object.keys(allData).filter((k) =>
      k.startsWith("domNotes_")
    );
    if (keysToRemove.length === 0) {
      toast(t('toast.noClearData'));
      return;
    }
    if (
      !confirm(
        t('confirm.clearAll', { count: keysToRemove.length })
      )
    )
      return;

    chrome.storage.local.remove(keysToRemove, () => {
      // Notify current page's content script to reload
      sendToActiveTab({ type: "reloadNotes" }, () => {});
      toast(t('toast.clearedAll'));
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
