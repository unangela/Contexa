// Contexa 集中式国际化文案表
// 三个运行环境（sidepanel / content / background）共享同一套 key。
//
// 用法：
//   const t = i18n.t;            // 取当前语言文案
//   t('mode.annotation')         // 返回对应文案
//   i18n.setLang('en');          // 切换语言
//   i18n.getLang();              // 当前语言 'zh' | 'en'
//   i18n.detectLang();           // 检测浏览器语言

(function (global) {
  const MESSAGES = {
    zh: {
      // —— 侧边栏 header / 模式按钮 ——
      'brand.tagline': 'Design. Explain. Deliver.',
      'mode.annotation': '标注',
      'mode.preview': '预览',
      'mode.shared': '云端',
      'theme.switch': '切换主题',
      'lang.switch': '切换语言',

      // —— 模式提示 ——
      'hint.default': '💡 选中标注模式，点击页面中的元素即可添加标注',
      'hint.annotation': '📝 点击页面元素可添加标注，此时不可以操作网页',
      'hint.preview': '👁️ 可以操作网页，点击已有标注可以编辑',
      'hint.shared': '☁️ 已从云端加载备注，数据只读不可编辑',

      // —— 未授权引导 ——
      'grant.title': 'Contexa 未获准访问当前网站',
      'grant.desc': '授权 {host} 后即可标注',
      'grant.descPre': '授权',
      'grant.descPost': '后即可标注',
      'grant.btn': '授权访问',
      'grant.btnWithHost': '授权访问 {host}',
      'grant.waiting': '等待授权…',

      // —— 空状态 ——
      'empty.notes': '暂无标注',
      'empty.import': '导入已有数据',

      // —— 操作按钮 ——
      'btn.export': '导出',
      'btn.import': '导入',
      'btn.save': '保存',
      'btn.clear': '清空',
      'btn.clearAll': '清空备注',
      'export.page': '导出当前页面',
      'export.all': '导出全部数据',
      'clear.page': '清空当前页面',
      'clear.all': '清空全部数据',

      // —— 使用帮助 ——
      'help.title': '📖 使用帮助',
      'help.shortcut': '快捷键',
      'help.shortcutDesc': '切换标注 / 预览模式',
      'help.sort': '排序调整',
      'help.sortDesc': '在备注列表中拖拽备注项可调整序号顺序',
      'help.cloud': '云端配置',
      'help.cloudDesc': '配置 JSON URL 后，可在云端模式下加载在线备注',
      'help.cloudPlaceholder': '输入云端 JSON URL',
      'help.domain': '域名管理',
      'help.domainDesc': '已授权的网站可在任意页面自动标注',
      'help.file': '本地文件使用',
      'help.fileDesc': '在 {link} 中启用"允许访问文件网址"后，可在 file:// 页面使用标注。',
      'help.fileDescPre': '在',
      'help.fileDescPost': '中启用"允许访问文件网址"后，可在 file:// 页面使用标注。',
      'help.fileLink': 'chrome://extensions',

      // —— 域名管理 ——
      'domain.empty': '尚未授权任何网站',
      'domain.revoke': '取消授权',
      'domain.processing': '处理中…',
      'domain.confirmRevoke': '确定取消对 {host} 的授权吗？\n取消后该网站不再自动标注（标注数据保留）。',

      // —— toast（侧边栏 + content 共用）——
      'toast.saved': '备注已保存',
      'toast.deleted': '备注已删除',
      'toast.cleared': '已清空',
      'toast.added': '已添加备注: {title}',
      'toast.imported': '已导入 {count} 条备注',
      'toast.annotationOn': '已开启标注模式',
      'toast.previewOn': '已开启预览模式',
      'toast.sharedOn': '已开启云端模式',
      'toast.sharedEmpty': '当前网页无云端数据',
      'toast.sharedFail': '加载云端数据失败',
      'toast.sharedFormatErr': '云端数据格式错误',
      'toast.sharedFailWith': '加载云端数据失败: {err}',
      'toast.noShareUrl': '请先在侧边栏配置云端 JSON URL',
      'toast.unsupported': '当前页面不支持标注',
      'toast.unsupportedOp': '当前页面不支持操作',
      'toast.cannotSelect': '无法选择该元素',
      'toast.noSelector': '无法生成选择器',
      'toast.granted': '已授权，可以开始标注了',
      'toast.grantCancelled': '已取消授权',
      'toast.grantFail': '授权请求失败',
      'toast.registerFail': '注册失败，请重试',
      'toast.revokeFail': '取消授权失败',
      'toast.revoked': '已取消授权 {host}',
      'toast.requestingGrant': '正在请求授权 {host}…',
      'toast.noHostname': '无法确定当前域名',
      'toast.refreshToActivate': '授权成功，请刷新页面以激活',
      'toast.urlInvalid': '请输入有效的云端 URL',
      'toast.urlSaved': '云端 URL 已保存',
      'toast.urlCleared': '已清空云端 URL',
      'toast.exported': 'JSON 已导出',
      'toast.exportAll': '已导出 {count} 个页面的数据',
      'toast.noExportData': '没有可导出的数据',
      'toast.importFail': '导入失败，请检查 JSON 格式',
      'toast.noImportData': '未找到有效的备注数据',
      'toast.noTab': '无法确定当前页面',
      'toast.importedPages': '已导入 {count} 个页面的数据',
      'toast.clearedAll': '已清空全部数据',
      'toast.noClearData': '没有可清空的数据',

      // —— confirm ——
      'confirm.clearPage': '确定清空当前页面的全部备注吗？',
      'confirm.deleteNote': '确定删除这条备注吗？',
      'confirm.clearAll': '确定清空全部数据吗？将删除 {count} 个页面的备注，此操作不可撤销。',

      // —— content 浮标 / 编辑框 ——
      'toolbar.annotation': '标注模式',
      'toolbar.preview': '预览模式',
      'toolbar.panel': '展开/收起侧边栏',
      'editor.titlePlaceholder': '标题',
      'editor.bodyPlaceholder': '输入备注内容...',
      'editor.delete': '删除',
      'editor.save': '保存',
      'note.untitled': '未命名备注',
      'note.untitledParen': '(未命名备注)',
      'note.hide': '隐藏备注',
      'note.show': '显示备注',
      'note.defaultTitle': '{tag} 备注',

      // —— background 错误 ——
      'err.ssrBlocked': 'URL 不允许（仅限公网 http/https）',
      'err.missingHost': '缺少 hostname',
      'err.missingTabId': '缺少 tabId',
    },

    en: {
      // —— header / mode buttons ——
      'brand.tagline': 'Design. Explain. Deliver.',
      'mode.annotation': 'Annotate',
      'mode.preview': 'Preview',
      'mode.shared': 'Cloud',
      'theme.switch': 'Switch theme',
      'lang.switch': 'Switch language',

      // —— mode hints ——
      'hint.default': '💡 Select Annotate mode, then click any element to add a note',
      'hint.annotation': '📝 Click elements to add notes. Page interaction is disabled.',
      'hint.preview': '👁️ Page is interactive. Click any pin to edit its note.',
      'hint.shared': '☁️ Notes loaded from cloud. Read-only.',

      // —— grant prompt ——
      'grant.title': 'Contexa needs access to this site',
      'grant.desc': 'Grant access to {host} to start annotating',
      'grant.descPre': 'Grant access to',
      'grant.descPost': 'to start annotating',
      'grant.btn': 'Grant access',
      'grant.btnWithHost': 'Grant access to {host}',
      'grant.waiting': 'Waiting for permission…',

      // —— empty state ——
      'empty.notes': 'No notes yet',
      'empty.import': 'Import existing data',

      // —— action buttons ——
      'btn.export': 'Export',
      'btn.import': 'Import',
      'btn.save': 'Save',
      'btn.clear': 'Clear',
      'btn.clearAll': 'Clear notes',
      'export.page': 'Export current page',
      'export.all': 'Export all data',
      'clear.page': 'Clear current page',
      'clear.all': 'Clear all data',

      // —— help section ——
      'help.title': '📖 Help',
      'help.shortcut': 'Shortcuts',
      'help.shortcutDesc': 'Toggle Annotate / Preview mode',
      'help.sort': 'Reorder',
      'help.sortDesc': 'Drag notes in the list to reorder them',
      'help.cloud': 'Cloud config',
      'help.cloudDesc': 'Set a JSON URL to load shared notes in Cloud mode',
      'help.cloudPlaceholder': 'Enter cloud JSON URL',
      'help.domain': 'Domain access',
      'help.domainDesc': 'Authorized sites can show notes automatically',
      'help.file': 'Local files',
      'help.fileDesc': 'Enable "Allow access to file URLs" in {link} to annotate file:// pages.',
      'help.fileDescPre': 'Enable "Allow access to file URLs" in',
      'help.fileDescPost': 'to annotate file:// pages.',
      'help.fileLink': 'chrome://extensions',

      // —— domain management ——
      'domain.empty': 'No sites authorized yet',
      'domain.revoke': 'Revoke',
      'domain.processing': 'Processing…',
      'domain.confirmRevoke': 'Revoke access to {host}?\nNotes are kept, but this site will no longer auto-annotate.',

      // —— toasts ——
      'toast.saved': 'Note saved',
      'toast.deleted': 'Note deleted',
      'toast.cleared': 'Cleared',
      'toast.added': 'Added note: {title}',
      'toast.imported': 'Imported {count} note(s)',
      'toast.annotationOn': 'Annotation mode on',
      'toast.previewOn': 'Preview mode on',
      'toast.sharedOn': 'Cloud mode on',
      'toast.sharedEmpty': 'No cloud data for this page',
      'toast.sharedFail': 'Failed to load cloud data',
      'toast.sharedFormatErr': 'Invalid cloud data format',
      'toast.sharedFailWith': 'Failed to load cloud data: {err}',
      'toast.noShareUrl': 'Please set a cloud JSON URL in the sidebar first',
      'toast.unsupported': 'This page does not support annotation',
      'toast.unsupportedOp': 'This page does not support this action',
      'toast.cannotSelect': 'Cannot select that element',
      'toast.noSelector': 'Cannot generate a selector',
      'toast.granted': 'Granted. Ready to annotate.',
      'toast.grantCancelled': 'Permission cancelled',
      'toast.grantFail': 'Permission request failed',
      'toast.registerFail': 'Registration failed, please retry',
      'toast.revokeFail': 'Failed to revoke',
      'toast.revoked': 'Revoked access to {host}',
      'toast.requestingGrant': 'Requesting access to {host}…',
      'toast.noHostname': 'Cannot determine current domain',
      'toast.refreshToActivate': 'Granted. Refresh the page to activate.',
      'toast.urlInvalid': 'Please enter a valid URL',
      'toast.urlSaved': 'Cloud URL saved',
      'toast.urlCleared': 'Cloud URL cleared',
      'toast.exported': 'JSON exported',
      'toast.exportAll': 'Exported {count} page(s)',
      'toast.noExportData': 'Nothing to export',
      'toast.importFail': 'Import failed — check the JSON format',
      'toast.noImportData': 'No valid note data found',
      'toast.noTab': 'Cannot determine current page',
      'toast.importedPages': 'Imported {count} page(s)',
      'toast.clearedAll': 'All data cleared',
      'toast.noClearData': 'Nothing to clear',

      // —— confirm ——
      'confirm.clearPage': 'Clear all notes on this page?',
      'confirm.deleteNote': 'Delete this note?',
      'confirm.clearAll': 'Clear ALL data? This removes notes from {count} page(s) and cannot be undone.',

      // —— content toolbar / editor ——
      'toolbar.annotation': 'Annotation mode',
      'toolbar.preview': 'Preview mode',
      'toolbar.panel': 'Show/hide sidebar',
      'editor.titlePlaceholder': 'Title',
      'editor.bodyPlaceholder': 'Type the note…',
      'editor.delete': 'Delete',
      'editor.save': 'Save',
      'note.untitled': 'Untitled note',
      'note.untitledParen': '(Untitled note)',
      'note.hide': 'Hide note',
      'note.show': 'Show note',
      'note.defaultTitle': '{tag} note',

      // —— background errors ——
      'err.ssrBlocked': 'URL not allowed (public http/https only)',
      'err.missingHost': 'Missing hostname',
      'err.missingTabId': 'Missing tabId',
    }
  };

  const STORAGE_KEY = 'contexaLang';

  let currentLang = 'zh';

  // 检测浏览器语言：中文环境用 zh，其余用 en
  function detectLang() {
    const ui = (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getUILanguage)
      ? chrome.i18n.getUILanguage()
      : (navigator.language || 'en');
    return String(ui).toLowerCase().startsWith('zh') ? 'zh' : 'en';
  }

  // 占位符替换：t('key', { host: 'a.com' }) → 替换 {host}
  function format(str, vars) {
    if (!vars) return str;
    return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : `{${k}}`));
  }

  const i18n = {
    // 初始化：从 storage 读用户偏好，无则用浏览器语言
    init(cb) {
      if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
        currentLang = detectLang();
        if (cb) cb(currentLang);
        return;
      }
      try {
        chrome.storage.local.get([STORAGE_KEY], (res) => {
          currentLang = res && res[STORAGE_KEY] ? res[STORAGE_KEY] : detectLang();
          if (cb) cb(currentLang);
        });
      } catch (e) {
        currentLang = detectLang();
        if (cb) cb(currentLang);
      }
    },

    getLang() { return currentLang; },

    setLang(lang, cb) {
      currentLang = lang;
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        try {
          chrome.storage.local.set({ [STORAGE_KEY]: lang }, () => { if (cb) cb(lang); });
          return;
        } catch (e) { /* ignore */ }
      }
      if (cb) cb(lang);
    },

    // 取文案：t(key, vars?)
    t(key, vars) {
      const dict = MESSAGES[currentLang] || MESSAGES.zh;
      const str = dict[key];
      if (str == null) {
        // 回退到另一语言
        const fallback = MESSAGES.zh[key];
        return fallback != null ? format(fallback, vars) : key;
      }
      return format(str, vars);
    }
  };

  global.i18n = i18n;
})(typeof window !== 'undefined' ? window : self);
