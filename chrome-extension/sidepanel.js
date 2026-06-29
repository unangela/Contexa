const els = {
  annotationToggle: document.getElementById("annotationToggle"),
  previewToggle: document.getElementById("previewToggle"),
  editor: document.getElementById("editor"),
  editorEmpty: document.getElementById("editorEmpty"),
  selectorText: document.getElementById("selectorText"),
  totalCount: document.getElementById("totalCount"),
  visibleCount: document.getElementById("visibleCount"),
  exportJson: document.getElementById("exportJson"),
  importJson: document.getElementById("importJson"),
  clearAll: document.getElementById("clearAll")
};

let currentState = {
  mode: null,
  selectedId: null,
  notes: [],
  total: 0,
  visible: 0
};

let activeTabId = null;

function init() {
  els.annotationToggle.addEventListener("change", onAnnotationToggle);
  els.previewToggle.addEventListener("change", onPreviewToggle);
  els.exportJson.addEventListener("click", exportJson);
  els.importJson.addEventListener("change", importJson);
  els.clearAll.addEventListener("click", clearAll);

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

  setInterval(requestState, 2000);
}

function requestState() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;

    activeTabId = tabs[0].id;

    chrome.tabs.sendMessage(tabs[0].id, { type: 'getState' }, (response) => {
      if (chrome.runtime.lastError) {
        // Tab doesn't support the extension — reset UI
        els.annotationToggle.checked = false;
        els.previewToggle.checked = false;
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

  // sync toggles from the single mode value
  els.annotationToggle.checked = state.mode === 'annotation';
  els.previewToggle.checked = state.mode === 'preview';

  els.totalCount.textContent = state.total || currentState.notes.length;
  els.visibleCount.textContent = state.visible || 0;

  const note = state.notes?.find(item => item.id === state.selectedId);
  els.editor.hidden = !note;
  els.editorEmpty.hidden = Boolean(note);

  if (note) {
    els.selectorText.textContent = note.selector;
  }
}

// ---- Mode switching with mutual exclusion ----
// Rules:
// - Turning ON annotation → automatically turns OFF preview
// - Turning OFF annotation → automatically turns ON preview
// - Turning ON preview → automatically turns OFF annotation
// - Turning OFF preview manually → both OFF (no auto annotation)
function onAnnotationToggle(event) {
  const enabled = event.target.checked;
  if (enabled) {
    setMode('annotation');
  } else {
    // Closing annotation auto-opens preview
    setMode('preview');
  }
}

function onPreviewToggle(event) {
  const enabled = event.target.checked;
  if (enabled) {
    setMode('preview');
  } else {
    // Manually closing preview → both off
    setMode(null);
  }
}

function setMode(mode) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;

    chrome.tabs.sendMessage(tabs[0].id, {
      type: 'setMode',
      payload: { mode }
    }, () => {
      if (chrome.runtime.lastError) {
        toast("当前页面不支持标注");
        // revert both toggles
        els.annotationToggle.checked = false;
        els.previewToggle.checked = false;
        return;
      }

      currentState.mode = mode;
      els.annotationToggle.checked = mode === 'annotation';
      els.previewToggle.checked = mode === 'preview';

      if (mode === 'annotation') {
        toast("已开启标注模式");
      } else if (mode === 'preview') {
        toast("已开启预览模式");
      } else {
        toast("已关闭");
      }
    });
  });
}

function exportJson() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;

    chrome.tabs.sendMessage(tabs[0].id, { type: 'exportJson' }, (response) => {
      if (chrome.runtime.lastError) {
        toast("当前页面不支持操作");
        return;
      }
      if (response && response.data) {
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "dom-notes.json";
        link.click();
        URL.revokeObjectURL(link.href);
        toast("JSON 已导出");
      }
    });
  });
}

function importJson(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) return;

        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'importJson',
          payload: { notes: data.notes || [] }
        }, () => {
          if (chrome.runtime.lastError) {
            toast("当前页面不支持操作");
            return;
          }
          toast("JSON 已导入");
        });
      });
    } catch (error) {
      toast("导入失败，请检查 JSON 格式");
    }
  };

  reader.readAsText(file);
  event.target.value = "";
}

function clearAll() {
  if (!confirm("确定清空全部备注吗？")) return;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;

    chrome.tabs.sendMessage(tabs[0].id, { type: 'clearAll' }, () => {
      if (chrome.runtime.lastError) {
        toast("当前页面不支持操作");
      }
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
