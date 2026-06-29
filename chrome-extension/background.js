chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({
    windowId: tab.windowId
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  sendResponse();
  
  if (message.type === 'update') {
    chrome.runtime.sendMessage(message, () => {
      if (chrome.runtime.lastError) {
        return;
      }
    });
  }
});
