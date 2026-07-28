import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const extensionDir = resolve(root, 'chrome-extension');
const require = createRequire(import.meta.url);
const shared = require(resolve(extensionDir, 'shared.js'));
const manifest = JSON.parse(readFileSync(resolve(extensionDir, 'manifest.json'), 'utf8'));

const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

assert(manifest.version === shared.EXTENSION_VERSION,
  `manifest version ${manifest.version} does not match shared version ${shared.EXTENSION_VERSION}`);
assert(manifest.version === require(resolve(root, 'package.json')).version,
  'package.json version does not match manifest version');
assert(!manifest.web_accessible_resources, 'unused web_accessible_resources should not be declared');
assert(manifest.background?.type === 'module', 'background service worker must use module mode');

for (const script of ['shared.js', 'i18n.js', 'content.js', 'sidepanel.js', 'background.js']) {
  const scriptPath = resolve(extensionDir, script);
  assert(existsSync(scriptPath), `missing ${script}`);
  const isModuleWorker = script === manifest.background?.service_worker && manifest.background?.type === 'module';
  const result = isModuleWorker
    ? spawnSync(process.execPath, ['--check', '--input-type=module'], {
      encoding: 'utf8',
      input: readFileSync(scriptPath, 'utf8')
    })
    : spawnSync(process.execPath, ['--check', scriptPath], { encoding: 'utf8' });
  if (result.status !== 0) failures.push(result.stderr || `${script} failed syntax check`);
}

const backgroundSource = readFileSync(resolve(extensionDir, manifest.background.service_worker), 'utf8');
assert(!backgroundSource.includes('importScripts('), 'module service worker must not call importScripts');
for (const dependency of [...backgroundSource.matchAll(/^import ['"]\.\/(.+?)['"];$/gm)].map(match => match[1])) {
  assert(existsSync(resolve(extensionDir, dependency)), `missing background dependency ${dependency}`);
}

const fileScripts = manifest.content_scripts?.[0]?.js || [];
assert(fileScripts[0] === 'shared.js' && fileScripts.includes('content.js'),
  'content scripts must load shared.js before content.js');

for (const path of ['README.md', 'docs/index.html', 'docs/legal/PRIVACY.html',
  'docs/legal/TERMS.html', 'store/STORE_METADATA.md', 'store/legal/PRIVACY.md',
  'store/legal/TERMS.md']) {
  assert(existsSync(resolve(root, path)), `missing release file ${path}`);
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Contexa ${manifest.version}: static checks passed`);
