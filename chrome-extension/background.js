chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({
    windowId: tab.windowId
  });
  panelOpen[tab.windowId] = true;
});

// Track panel visibility per window
const panelOpen = {};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'fetchSharedNotes') {
    fetch(message.payload.url, { cache: 'no-cache' })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        sendResponse({ success: true, data });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  sendResponse();

  if (message.type === 'update') {
    chrome.runtime.sendMessage(message, () => {
      if (chrome.runtime.lastError) {
        return;
      }
    });
  }

  if (message.type === 'togglePanel') {
    const windowId = sender.tab ? sender.tab.windowId : null;
    if (!windowId) return;

    if (panelOpen[windowId]) {
      chrome.sidePanel.setOptions({ enabled: false });
      panelOpen[windowId] = false;
    } else {
      chrome.sidePanel.setOptions({ enabled: true });
      chrome.sidePanel.open({ windowId });
      panelOpen[windowId] = true;
    }
  }
});
