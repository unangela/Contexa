import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const extensionDir = resolve(root, 'chrome-extension');
const manifest = JSON.parse(readFileSync(resolve(extensionDir, 'manifest.json'), 'utf8'));
const outputDir = resolve(root, 'dist');
const outputFile = resolve(outputDir, `contexa-v${manifest.version}.zip`);

function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.name === '.DS_Store') return [];
    const fullPath = resolve(directory, entry.name);
    return entry.isDirectory() ? listFiles(fullPath) : [relative(extensionDir, fullPath)];
  });
}

mkdirSync(outputDir, { recursive: true });
rmSync(outputFile, { force: true });

const result = spawnSync('zip', ['-q', outputFile, ...listFiles(extensionDir)], {
  cwd: extensionDir,
  encoding: 'utf8'
});

if (result.status !== 0) {
  console.error(result.stderr || 'Failed to create extension package');
  process.exit(result.status || 1);
}

console.log(outputFile);
