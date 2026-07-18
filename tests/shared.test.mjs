import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const shared = require('../chrome-extension/shared.js');

const note = {
  id: 'note-1',
  selector: '#submit',
  tag: 'button',
  title: 'Submit',
  text: 'Send the form'
};

test('release and schema versions are explicit', () => {
  assert.equal(shared.EXTENSION_VERSION, '0.1.0');
  assert.equal(shared.DATA_SCHEMA_VERSION, 1);
});

test('Ctrl+E only toggles annotation and preview modes', () => {
  assert.equal(shared.getNextEditableMode('annotation'), 'preview');
  assert.equal(shared.getNextEditableMode('preview'), 'annotation');
  assert.equal(shared.getNextEditableMode('shared'), 'annotation');
});

test('entering shared mode clears local notes and selection state', () => {
  const state = {
    notes: [note],
    selectedId: note.id,
    editingId: note.id,
    openIds: [note.id]
  };

  shared.resetSharedNotes(state);
  assert.deepEqual(state.notes, []);
  assert.equal(state.selectedId, null);
  assert.equal(state.editingId, null);
  assert.deepEqual(state.openIds, []);
});

test('storage keys distinguish protocol and port but ignore query and hash', () => {
  assert.equal(
    shared.getStorageKeyForUrl('https://example.com:8443/page?a=1#part'),
    'domNotes_v2_https://example.com:8443/page'
  );
  assert.notEqual(
    shared.getStorageKeyForUrl('http://example.com/page'),
    shared.getStorageKeyForUrl('https://example.com/page')
  );
  assert.equal(
    shared.getStorageKeyForUrl('file:///Users/test/prototype.html#screen'),
    'domNotes_v2_file:///Users/test/prototype.html'
  );
});

test('legacy storage key remains available for migration', () => {
  assert.equal(
    shared.getLegacyStorageKeyForUrl('https://example.com:8443/page?a=1'),
    'domNotes_example.com/page'
  );
});

test('note merging preserves existing records and deduplicates ids', () => {
  const incoming = [{ ...note, title: 'Duplicate' }, { ...note, id: 'note-2' }];
  const result = shared.mergeNotesById([note], incoming);
  assert.deepEqual(result.map(item => item.id), ['note-1', 'note-2']);
  assert.equal(result[0].title, 'Submit');
});

test('storage migration merges legacy data into origin-aware keys', () => {
  const oldKey = 'domNotes_example.com/page';
  const newKey = 'domNotes_v2_https://example.com/page';
  const existing = { ...note, id: 'note-existing' };
  const allData = {
    [oldKey]: { url: 'https://example.com/page', notes: [note, existing] },
    [newKey]: { url: 'https://example.com/page', notes: [existing] },
    contexaTheme: 'minimal'
  };

  const migration = shared.buildStorageMigration(allData);
  assert.deepEqual(migration.keysToRemove, [oldKey]);
  assert.deepEqual(migration.updates[newKey].notes.map(item => item.id), [
    'note-existing',
    'note-1'
  ]);
});

test('annotation documents accept single-page and multi-page formats', () => {
  assert.equal(shared.validateAnnotationDocument({ notes: [note] }).valid, true);
  assert.equal(shared.validateAnnotationDocument({
    pages: [{ url: 'https://example.com/page', notes: [note] }]
  }).valid, true);
});

test('annotation documents reject malformed notes', () => {
  const result = shared.validateAnnotationDocument({ notes: [{ id: 'missing-selector' }] });
  assert.equal(result.valid, false);
});

test('cloud URL validation allows public HTTP URLs', () => {
  assert.equal(shared.isAllowedFetchUrl('https://cdn.example.com/notes.json'), true);
});

test('cloud URL validation rejects local, private, credentialed and non-HTTP URLs', () => {
  for (const url of [
    'http://localhost/notes.json',
    'http://app.local/notes.json',
    'http://127.0.0.1/notes.json',
    'http://10.1.2.3/notes.json',
    'http://172.16.0.1/notes.json',
    'http://192.168.1.1/notes.json',
    'http://[::1]/notes.json',
    'https://user:pass@example.com/notes.json',
    'file:///tmp/notes.json'
  ]) {
    assert.equal(shared.isAllowedFetchUrl(url), false, url);
  }
});
