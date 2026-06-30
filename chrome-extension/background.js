chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({
    windowId: tab.windowId
  });
  panelOpen[tab.windowId] = true;
});

// Track panel visibility per window
const panelOpen = {};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
