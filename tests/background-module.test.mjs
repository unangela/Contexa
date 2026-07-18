import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

const backgroundUrl = pathToFileURL(fileURLToPath(
  new URL('../chrome-extension/background.js', import.meta.url)
)).href;

test('module service worker loads shared and i18n dependencies', () => {
  const bootstrap = `
    globalThis.self = globalThis;
    globalThis.navigator = { language: 'en-US' };
    const noop = () => {};
    globalThis.chrome = {
      i18n: { getUILanguage: () => 'en-US' },
      permissions: {
        getAll: callback => callback({ origins: [] }),
        remove: () => Promise.resolve(true),
        contains: (_, callback) => callback(false)
      },
      runtime: {
        onInstalled: { addListener: noop },
        onMessage: { addListener: noop },
        sendMessage: noop
      },
      storage: {
        local: {
          get: (_, callback) => callback({}),
          set: (_, callback) => callback && callback()
        },
        onChanged: { addListener: noop }
      },
      action: { onClicked: { addListener: noop } },
      sidePanel: { open: noop, setOptions: noop },
      scripting: {
        unregisterContentScripts: () => Promise.resolve(),
        registerContentScripts: () => Promise.resolve()
      }
    };
    await import(${JSON.stringify(backgroundUrl)});
    if (!globalThis.ContexaShared || !globalThis.i18n) {
      throw new Error('service worker dependencies were not initialized');
    }
  `;

  const result = spawnSync(process.execPath, [
    '--experimental-default-type=module',
    '--eval',
    bootstrap
  ], { encoding: 'utf8' });

  assert.equal(result.status, 0, result.stderr);
});
