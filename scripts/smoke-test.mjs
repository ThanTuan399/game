import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const jsFiles = walk(path.join(root, 'js')).filter(file => file.endsWith('.js'));

for (const file of jsFiles) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
}

const knownFiles = new Set(jsFiles.map(file => path.relative(root, file).replaceAll('\\', '/')));

for (const file of jsFiles) {
  const rel = path.relative(root, file).replaceAll('\\', '/');
  const source = fs.readFileSync(file, 'utf8');

  for (const match of source.matchAll(/from\s+['"](\.[^'"]+)['"]/g)) {
    const resolved = path
      .normalize(path.join(path.dirname(rel), match[1]))
      .replaceAll('\\', '/');

    if (!knownFiles.has(resolved)) {
      throw new Error(`Missing import target: ${rel} -> ${match[1]} (${resolved})`);
    }
  }

  if (/[Ã]|ðŸ|âœ|â˜|Â·|Ä‘|Æ°/.test(source)) {
    throw new Error(`Possible UTF-8 mojibake detected in ${rel}`);
  }
}

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const main = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);

if (duplicates.length) {
  throw new Error(`Duplicate HTML ids: ${[...new Set(duplicates)].join(', ')}`);
}

const staticIds = [...main.matchAll(/\$\('([^']+)'\)/g)].map(match => match[1]);
const dynamicIds = new Set(['sleepBtn', 'upgradeHomeBtn']);
const missingIds = [...new Set(staticIds.filter(id => !ids.includes(id) && !dynamicIds.has(id)))];

if (missingIds.length) {
  throw new Error(`Missing HTML ids used by main.js: ${missingIds.join(', ')}`);
}

console.log(`Smoke test passed: ${jsFiles.length} JS files, ${ids.length} HTML ids.`);
