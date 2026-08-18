import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const out = path.resolve(root, '..', 'vector-studio-release');

execFileSync(process.execPath, [path.join(here, 'build-bundle.mjs')], { cwd: root, stdio: 'inherit' });

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const copy = (rel) => {
  const src = path.join(root, rel);
  const dest = path.join(out, rel);
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
};

[
  'index.html',
  'styles.css',
  'app.bundle.js',
  'assets',
  'js',
  'scripts/build-bundle.mjs',
  'scripts/package-release.mjs',
  'ARCHITECTURE.md',
  'BASELINE_CHECKLIST.md',
  'BASELINE_MANIFEST.json',
  'THIRD_PARTY_NOTICES.txt'
].forEach(copy);

const forbidden = fs.readdirSync(out).filter(name =>
  /^app\.layers-v\d+\.bundle\.js$/i.test(name) || /^styles\.layers-v\d+\.css$/i.test(name)
);
if (forbidden.length) {
  throw new Error(`Release contains archived assets: ${forbidden.join(', ')}`);
}

const html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
if (!html.includes('href="styles.css"') || !html.includes('src="app.bundle.js"')) {
  throw new Error('index.html must reference only styles.css and app.bundle.js for app assets.');
}

console.log(`Clean release staged at ${out}`);
