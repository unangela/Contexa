// 引入共享 i18n（service worker 支持 importScripts）
importScripts('i18n.js');
const t = i18n.t;

// Track panel visibility per window (声明提前，避免引用先于声明)
const panelOpen = {};

// 扩展 reload / 更新 / 浏览器重启后，registerContentScripts 的动态注册会丢失，
// 但 chrome.permissions 的授权是持久化的。需在 onInstalled 时根据持久化的
// 授权重新注册所有域名的 content script。
function restoreRegisteredScripts() {
  chrome.permissions.getAll(async (perms) => {
    const hostnames = (perms.origins || [])
      .map(hostnameFromOrigin)
      .filter(h => h && !h.includes('*'));
    // 并行重新注册
    await Promise.all(hostnames.map(h => registerDomain(h).catch(() => {})));
  });
}

chrome.runtime.onInstalled.addListener(() => {
  restoreRegisteredScripts();
});
// 也覆盖 service worker 被唤醒、未触发 onInstalled 的情况（每次 SW 启动检查一次）
restoreRegisteredScripts();
// 初始化语言（同步检测 + 异步从 storage 修正）
i18n.init();

// 监听语言切换：sidepanel 改语言后，background 同步更新
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.contexaLang) {
    i18n.setLang(changes.contexaLang.newValue || 'zh');
  }
});

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({
    windowId: tab.windowId
  });
  panelOpen[tab.windowId] = true;
});

// ---- SSRF 防护：校验云端 JSON URL ----
// 仅允许公网 http/https，拦截 localhost / 内网 IP / 私有段。
// 注意：这会打断本地开发测试（如 localhost:3000 托管 JSON），属刻意权衡。
// 如需临时放宽本地调试，可在下方函数顶部直接 return true。
function isAllowedFetchUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch (e) {
    return false;
  }

  // 只允许 http/https（拦截 file://、data: 等）
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

  const host = url.hostname.toLowerCase();

  // 拦截 localhost 及变体
  if (host === 'localhost' || host === '::1' || host === '0.0.0.0') return false;

  // 拦截 IPv4 私有 / 保留 / 回环段
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const [a, b] = host.split('.').map(Number);
    if (a === 10) return false;                       // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return false; // 172.16.0.0/12
    if (a === 192 && b === 168) return false;          // 192.168.0.0/16
    if (a === 127) return false;                       // 127.0.0.0/8 loopback
    if (a === 0) return false;                         // 0.0.0.0/8
    if (a === 169 && b === 254) return false;          // 169.254.0.0/16 link-local
    if (a >= 224) return false;                        // 组播 / 保留
  }

  // 拦截 IPv6 私有 / 回环
  if (/^(::1?|fe80|fc|fd)/i.test(host)) return false;

  return true;
}

// ---- 域名授权：动态 content script 注册/注销 ----
// 每个已授权域名注册一个动态脚本，ID 规则 contexa-<hostname>，
// matches 精确到子域名：*://<hostname>/*（不含通配子域）。
function scriptIdFor(hostname) {
  return 'contexa-' + hostname;
}

// 从权限 origin 反解出 hostname（origin 形如 *://www.figma.com/*）
function hostnameFromOrigin(origin) {
  try {
    const m = origin.match(/^(\*|https?):\/\/([^/]+)/);
    return m ? m[2] : null;
  } catch (e) {
    return null;
  }
}

// 注册某域名的 content script（授权成功后调用）
async function registerDomain(hostname) {
  const id = scriptIdFor(hostname);
  try {
    // 先尝试注销已存在的同名脚本，避免重复注册报错
    await chrome.scripting.unregisterContentScripts({ ids: [id] });
  } catch (e) {
    // 未注册过，忽略
  }
  await chrome.scripting.registerContentScripts([{
    id: id,
    matches: [`*://${hostname}/*`],
    js: ['i18n.js', 'content.js'],
    runAt: 'document_idle'
  }]);
}

// 注销某域名的 content script
async function unregisterDomain(hostname) {
  const id = scriptIdFor(hostname);
  try {
    await chrome.scripting.unregisterContentScripts({ ids: [id] });
  } catch (e) {
    // 未注册，忽略
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'fetchSharedNotes') {
    // SSRF 校验：非法 URL 直接拒绝
    if (!isAllowedFetchUrl(message.payload && message.payload.url)) {
      sendResponse({ success: false, error: t('err.ssrBlocked') });
      return false;
    }

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
    return true; // 异步响应
  }

  // 域名授权成功后，注册 content script（注：permissions.request 已在 sidepanel 完成）
  if (message.type === 'grantDomain') {
    const hostname = message.payload && message.payload.hostname;
    if (!hostname) {
      sendResponse({ success: false, error: t('err.missingHost') });
      return false;
    }
    // grantDomain 由 sidepanel 发出（无 sender.tab），tabId 显式由 payload 传入
    const tabId = (message.payload && typeof message.payload.tabId === 'number')
      ? message.payload.tabId
      : (sender.tab ? sender.tab.id : null);
    registerDomain(hostname)
      .then(async () => {
        // 对当前已加载的页面立即注入一次（registerContentScripts 只对后续导航生效，
        // 当前页面需 executeScript 补一次，避免用户授权后还要手动刷新）
        if (tabId !== null) {
          try {
            await chrome.scripting.executeScript({
              target: { tabId },
              files: ['i18n.js', 'content.js']
            });
          } catch (e) {
            // 当前页面可能已注入过或无法注入（如已通过静态注入），忽略
          }
        }
        sendResponse({ success: true });
      })
      .catch(err => sendResponse({ success: false, error: err && err.message }));
    return true; // 异步响应
  }

  // 对当前标签页补注入 content script（用于"已授权但脚本未注入"的恢复场景，
  // 如扩展 reload 后注册丢失、当前页是 reload 前已打开的标签页）
  if (message.type === 'injectCurrentTab') {
    const tabId = message.payload && message.payload.tabId;
    if (typeof tabId !== 'number') {
      sendResponse({ success: false, error: t('err.missingTabId') });
      return false;
    }
    chrome.scripting.executeScript({
      target: { tabId },
      files: ['i18n.js', 'content.js']
    })
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err && err.message }));
    return true; // 异步响应
  }

  // 取消授权：注销脚本 + 移除权限
  if (message.type === 'revokeDomain') {
    const hostname = message.payload && message.payload.hostname;
    if (!hostname) {
      sendResponse({ success: false, error: t('err.missingHost') });
      return false;
    }
    const origin = `*://${hostname}/*`;
    Promise.resolve()
      .then(() => unregisterDomain(hostname))
      .then(() => chrome.permissions.remove({ origins: [origin] }))
      .then(removed => sendResponse({ success: true, removed }))
      .catch(err => sendResponse({ success: false, error: err && err.message }));
    return true; // 异步响应
  }

  // 列出所有已授权域名（基于真实权限态）
  if (message.type === 'listGrantedDomains') {
    chrome.permissions.getAll((perms) => {
      const hostnames = (perms.origins || [])
        .map(hostnameFromOrigin)
        .filter(h => h && !h.includes('*'));  // 过滤掉含通配的，只留精确子域名
      sendResponse({ success: true, hostnames });
    });
    return true; // 异步响应
  }

  // 查询某域名是否已授权
  if (message.type === 'checkDomainGranted') {
    const hostname = message.payload && message.payload.hostname;
    if (!hostname) {
      sendResponse({ success: false, granted: false });
      return false;
    }
    const origin = `*://${hostname}/*`;
    chrome.permissions.contains({ origins: [origin] }, (granted) => {
      sendResponse({ success: true, granted });
    });
    return true; // 异步响应
  }

  if (message.type === 'update') {
    chrome.runtime.sendMessage(message, () => {
      if (chrome.runtime.lastError) {
        return;
      }
    });
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === 'togglePanel') {
    const windowId = sender.tab ? sender.tab.windowId : null;
    if (windowId !== null) {
      if (panelOpen[windowId]) {
        chrome.sidePanel.setOptions({ enabled: false });
        panelOpen[windowId] = false;
      } else {
        chrome.sidePanel.setOptions({ enabled: true });
        chrome.sidePanel.open({ windowId });
        panelOpen[windowId] = true;
      }
    }
    sendResponse({ ok: true });
    return false;
  }

  // 未识别的消息类型
  return false;
});
