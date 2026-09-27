// Builds the app into public/ — run `npm run build` (Netlify runs it on every deploy too).
//   src/index.html      → the app page (Today, Progress, Log, setup, habits … and all app logic/state)
//   src/screens/*.jsx   → Train, Fuel and Coach tabs, compiled into public/screens.js
//   src/static/         → fonts, icons, React, the design runtime, scanner + push helpers (copied as-is)
// It also stamps the version shown on the welcome screen and writes the offline service worker.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const SRC = path.join(ROOT, 'src'), OUT = path.join(ROOT, 'public');
const require = createRequire(import.meta.url);
const Babel = require('./tools/babel.min.cjs');

fs.rmSync(OUT, { recursive: true, force: true });
const copyDir = (from, to) => { fs.mkdirSync(to, { recursive: true }); for (const e of fs.readdirSync(from, { withFileTypes: true })) { if (e.name === '.DS_Store') continue; const a = path.join(from, e.name), b = path.join(to, e.name); if (e.isDirectory()) copyDir(a, b); else fs.copyFileSync(a, b); } };
copyDir(path.join(SRC, 'static'), OUT);

// 1. Train / Fuel / Coach screens (JSX → plain JS, so the phone never runs Babel)
const ORDER = ['ui.jsx', 'library.jsx', 'train.jsx', 'fuel.jsx', 'coach.jsx'];   // later files use earlier ones
const jsx = ORDER.map(f => fs.readFileSync(path.join(SRC, 'screens', f), 'utf8')).join('\n\n');
let code;
try { code = Babel.transform(jsx, { presets: ['react'], filename: 'screens.jsx' }).code; }
catch (e) {
  // point at the real file + line instead of the joined bundle
  const m = String(e.message).match(/\((\d+):(\d+)\)/);
  if (m) { let line = +m[1]; for (const f of ORDER) { const n = fs.readFileSync(path.join(SRC, 'screens', f), 'utf8').split('\n').length + 1; if (line <= n) { console.error(`\n✗ Syntax error in src/screens/${f} line ${line}, column ${m[2]}`); break; } line -= n; } }
  console.error(String(e.message).split('\n').slice(0, 12).join('\n'));
  process.exit(1);
}
fs.writeFileSync(path.join(OUT, 'screens.js'), '// Train + Fuel + Coach screens. Source: src/screens/*.jsx (compiled by build.mjs).\n(function () {\n' + code + '\n})();\n');

// 2. The app page, with the version stamp (Edmonton time)
const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Edmonton', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date()).map(x => [x.type, x.value]));
const version = `${p.year}-${p.month}-${p.day} ${p.hour === '24' ? '00' : p.hour}:${p.minute}`;
fs.writeFileSync(path.join(OUT, 'index.html'), fs.readFileSync(path.join(SRC, 'index.html'), 'utf8').replaceAll('__APP_VERSION__', version));

// 3. Service worker: caches every file for offline use; the cache name changes whenever any file changes
const files = [];
const walk = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => { const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else files.push(path.relative(OUT, f).split(path.sep).join('/')); });
walk(OUT);
files.sort();
const h = crypto.createHash('sha256'); files.forEach(f => h.update(fs.readFileSync(path.join(OUT, f))));
const ver = h.digest('hex').slice(0, 10);
const sw = fs.readFileSync(path.join(ROOT, 'tools', 'sw.template.js'), 'utf8').replace('__CACHE__', 'seventy-hard-' + ver).replace('__FILES__', JSON.stringify(['./'].concat(files), null, 2));
fs.writeFileSync(path.join(OUT, 'sw.js'), sw);
console.log(`✓ built public/ · version ${version} · ${files.length + 1} files · cache ${ver}`);
