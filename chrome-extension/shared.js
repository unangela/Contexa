(function (root, factory) {
  const api = factory();
  root.ContexaShared = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const EXTENSION_VERSION = '0.1.0';
  const DATA_SCHEMA_VERSION = 1;
  const STORAGE_PREFIX = 'domNotes_v2_';
  const LEGACY_STORAGE_PREFIX = 'domNotes_';
  const MAX_SHARED_BYTES = 5 * 1024 * 1024;
  const MAX_PAGES = 1000;
  const MAX_NOTES_PER_PAGE = 10000;

  function parseUrl(rawUrl) {
    try {
      return new URL(rawUrl);
    } catch (error) {
      return null;
    }
  }

  function getStorageKeyForUrl(rawUrl) {
    const url = parseUrl(rawUrl);
    if (!url) return null;

    if (url.protocol === 'file:') {
      return STORAGE_PREFIX + 'file://' + url.pathname;
    }

    return STORAGE_PREFIX + url.origin + url.pathname;
  }

  function getLegacyStorageKeyForUrl(rawUrl) {
    const url = parseUrl(rawUrl);
    if (!url) return null;

    if (url.protocol === 'file:') {
      return LEGACY_STORAGE_PREFIX + url.pathname;
    }

    return LEGACY_STORAGE_PREFIX + url.hostname + url.pathname;
  }

  function isAnnotationNote(note) {
    if (!note || typeof note !== 'object' || Array.isArray(note)) return false;
    if (typeof note.id !== 'string' || note.id.length === 0 || note.id.length > 256) return false;
    if (typeof note.selector !== 'string' || note.selector.length === 0 || note.selector.length > 4096) return false;
    if (note.title !== undefined && (typeof note.title !== 'string' || note.title.length > 1000)) return false;
    if (note.text !== undefined && (typeof note.text !== 'string' || note.text.length > 100000)) return false;
    if (note.tag !== undefined && (typeof note.tag !== 'string' || note.tag.length > 100)) return false;
    return true;
  }

  function validateNotes(notes) {
    if (!Array.isArray(notes)) return { valid: false, error: 'notes must be an array' };
    if (notes.length > MAX_NOTES_PER_PAGE) return { valid: false, error: 'too many notes' };

    for (let index = 0; index < notes.length; index += 1) {
      if (!isAnnotationNote(notes[index])) {
        return { valid: false, error: `invalid note at index ${index}` };
      }
    }

    return { valid: true };
  }

  function mergeNotesById(existingNotes, incomingNotes) {
    const merged = Array.isArray(existingNotes) ? existingNotes.slice() : [];
    const existingIds = new Set(merged.map(note => note && note.id));

    for (const note of Array.isArray(incomingNotes) ? incomingNotes : []) {
      if (!existingIds.has(note && note.id)) {
        merged.push(note);
        existingIds.add(note && note.id);
      }
    }

    return merged;
  }

  function getNextEditableMode(mode) {
    return mode === 'annotation' ? 'preview' : 'annotation';
  }

  function resetSharedNotes(state) {
    state.notes = [];
    state.selectedId = null;
    state.editingId = null;
    state.openIds = [];
    return state;
  }

  function buildStorageMigration(allData) {
    const source = allData && typeof allData === 'object' ? allData : {};
    const updates = {};
    const keysToRemove = [];

    for (const [key, value] of Object.entries(source)) {
      const isLegacyKey = key.startsWith(LEGACY_STORAGE_PREFIX) && !key.startsWith(STORAGE_PREFIX);
      if (!isLegacyKey || !value || !value.url || !Array.isArray(value.notes)) continue;

      const newKey = getStorageKeyForUrl(value.url);
      if (!newKey || newKey === key) continue;

      const existing = updates[newKey] || source[newKey];
      const existingNotes = existing && Array.isArray(existing.notes) ? existing.notes : [];
      updates[newKey] = {
        url: value.url,
        notes: mergeNotesById(existingNotes, value.notes)
      };
      keysToRemove.push(key);
    }

    return { updates, keysToRemove };
  }

  function validateAnnotationDocument(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return { valid: false, error: 'document must be an object' };
    }

    if (Array.isArray(data.notes)) {
      return validateNotes(data.notes);
    }

    if (!Array.isArray(data.pages)) {
      return { valid: false, error: 'document must contain notes or pages' };
    }
    if (data.pages.length > MAX_PAGES) {
      return { valid: false, error: 'too many pages' };
    }

    for (let index = 0; index < data.pages.length; index += 1) {
      const page = data.pages[index];
      if (!page || typeof page !== 'object' || typeof page.url !== 'string' || !parseUrl(page.url)) {
        return { valid: false, error: `invalid page at index ${index}` };
      }
      const result = validateNotes(page.notes);
      if (!result.valid) {
        return { valid: false, error: `page ${index}: ${result.error}` };
      }
    }

    return { valid: true };
  }

  function isAllowedFetchUrl(rawUrl) {
    const url = parseUrl(rawUrl);
    if (!url || (url.protocol !== 'http:' && url.protocol !== 'https:')) return false;
    if (url.username || url.password) return false;

    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (host === 'localhost' || host === 'localhost.localdomain' || host === '::1' || host === '0.0.0.0') {
      return false;
    }
    if (host.endsWith('.localhost') || host.endsWith('.local')) return false;

    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      const parts = host.split('.').map(Number);
      if (parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return false;
      const [a, b] = parts;
      if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
      if (a === 100 && b >= 64 && b <= 127) return false;
      if (a === 169 && b === 254) return false;
      if (a === 172 && b >= 16 && b <= 31) return false;
      if (a === 192 && b === 168) return false;
    }

    if (host === '::' || host.startsWith('fe8') || host.startsWith('fe9') ||
        host.startsWith('fea') || host.startsWith('feb') || host.startsWith('fc') ||
        host.startsWith('fd')) {
      return false;
    }

    return true;
  }

  return {
    EXTENSION_VERSION,
    DATA_SCHEMA_VERSION,
    STORAGE_PREFIX,
    LEGACY_STORAGE_PREFIX,
    MAX_SHARED_BYTES,
    getStorageKeyForUrl,
    getLegacyStorageKeyForUrl,
    validateAnnotationDocument,
    validateNotes,
    mergeNotesById,
    getNextEditableMode,
    resetSharedNotes,
    buildStorageMigration,
    isAllowedFetchUrl
  };
});
