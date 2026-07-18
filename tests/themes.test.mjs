import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sidepanelCss = await readFile(new URL('../chrome-extension/sidepanel.css', import.meta.url), 'utf8');
const contentJs = await readFile(new URL('../chrome-extension/content.js', import.meta.url), 'utf8');
const sidepanelHtml = await readFile(new URL('../chrome-extension/sidepanel.html', import.meta.url), 'utf8');

const expectedThemes = new Map([
  ['minimal', 'Minimal'],
  ['warm', 'Sepia'],
  ['blue', 'Solarized'],
  ['mint', 'GitHub'],
  ['navy', 'Nord'],
  ['rose', 'Rosé Pine'],
  ['sand', 'Gruvbox'],
  ['ocean', 'Tokyo Night'],
  ['forest', 'Sage'],
  ['lavender', 'Catppuccin'],
  ['sunset', 'Ayu'],
  ['graphite', 'Codex Dark'],
  ['coral', 'Kanagawa'],
  ['olive', 'Everforest'],
  ['midnight', 'One Dark']
]);

const tokens = [
  'bg', 'fg', 'fg-secondary', 'bar-bg', 'active-bg', 'active-fg',
  'divider', 'danger', 'danger-fg'
];

function parseThemes(source, pattern) {
  return new Map([...source.matchAll(pattern)].map(match => {
    const values = new Map([...match[2].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)]
      .map(token => [token[1], token[2].toLowerCase()]));
    return [match[1], values];
  }));
}

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map(channel => parseInt(channel, 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(first, second) {
  const light = Math.max(luminance(first), luminance(second));
  const dark = Math.min(luminance(first), luminance(second));
  return (light + 0.05) / (dark + 0.05);
}

const sidepanelThemes = parseThemes(sidepanelCss, /body\.theme-(\w+)\s*\{([\s\S]*?)\}/g);
const contentThemes = parseThemes(contentJs, /:host\(\.theme-(\w+)\)\s*\{([\s\S]*?)\}/g);

test('all 15 named themes are present in the picker', () => {
  assert.deepEqual([...sidepanelThemes.keys()], [...expectedThemes.keys()]);
  for (const [id, name] of expectedThemes) {
    assert.match(sidepanelHtml, new RegExp(`data-theme="${id}"[\\s\\S]*?<span>${name}</span>`));
  }
});

test('sidepanel and canvas use identical theme tokens', () => {
  assert.deepEqual([...contentThemes.keys()], [...sidepanelThemes.keys()]);
  for (const [id, values] of sidepanelThemes) {
    for (const token of tokens) {
      assert.equal(contentThemes.get(id).get(token), values.get(token), `${id} --${token}`);
    }
  }
});

test('themes have distinct palettes and a balanced light/dark selection', () => {
  const signatures = [...sidepanelThemes.values()].map(values =>
    `${values.get('bg')}:${values.get('active-bg')}`);
  assert.equal(new Set(signatures).size, expectedThemes.size);

  const darkCount = [...sidepanelThemes.values()]
    .filter(values => luminance(values.get('bg')) < 0.18).length;
  assert.equal(darkCount, 6);
});

test('theme body text and active controls meet WCAG AA contrast', () => {
  for (const [id, values] of sidepanelThemes) {
    assert.ok(contrast(values.get('fg'), values.get('bg')) >= 4.5, `${id} body contrast`);
    assert.ok(contrast(values.get('active-fg'), values.get('active-bg')) >= 4.5,
      `${id} active control contrast`);
    assert.ok(contrast(values.get('danger-fg'), values.get('danger')) >= 4.5,
      `${id} danger control contrast`);
  }
});

test('accent foregrounds use theme-tinted ink instead of pure black or white', () => {
  const genericInk = new Set(['#000000', '#ffffff']);
  for (const [id, values] of sidepanelThemes) {
    assert.ok(!genericInk.has(values.get('active-fg')), `${id} active foreground`);
    assert.ok(!genericInk.has(values.get('danger-fg')), `${id} danger foreground`);
  }
});
