// Builds the app into public/ — run `npm run build` (Netlify runs it on every deploy too).
//   src/index.html      → the app page (Today, Progress, Log, setup, habits … and all app logic/state)
//   src/screens/*.jsx   → Train, Fuel and Coach tabs, compiled into public/screens.js
//   src/static/         → fonts, icons, React, the design runtime, scanner + push helpers (copied as-is)
// It also stamps the version shown on the welcome screen and writes the offline service worker.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { toLight } from './tools/light-theme.mjs';

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
// Netlify tells the build which copy it is making. Anything that isn't the live app gets a label, a different
// home-screen name and a small corner badge, so a test copy can never be mistaken for the real one.
const CTX = process.env.CONTEXT || '';          // 'production' | 'branch-deploy' | 'deploy-preview' | '' (your Mac)
const LABEL = CTX === 'branch-deploy' ? 'DEV' : CTX === 'deploy-preview' ? 'PREVIEW' : '';
let page = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8').replaceAll('__APP_VERSION__', (LABEL ? LABEL + ' · ' : '') + version);
if (LABEL) {
  const nice = LABEL[0] + LABEL.slice(1).toLowerCase();
  page = page.replace('<meta name="apple-mobile-web-app-title" content="70 Hard">', `<meta name="apple-mobile-web-app-title" content="70 Hard ${nice}">`)
    .replace('<title>Seventy Hard</title>', `<title>Seventy Hard ${nice}</title>`)
    .replace('</style>', `body::after{content:'${LABEL}';position:fixed;z-index:99;pointer-events:none;top:calc(env(safe-area-inset-top, 0px) + 4px);right:10px;font:700 9px/1 'IBM Plex Mono',monospace;letter-spacing:.14em;color:#231800;background:#f4b544;padding:3px 6px;border-radius:6px}\n</style>`);
  const mf = path.join(OUT, 'manifest.webmanifest'), m = JSON.parse(fs.readFileSync(mf, 'utf8'));
  m.name += ' ' + nice; m.short_name += ' ' + nice;
  fs.writeFileSync(mf, JSON.stringify(m, null, 2));
}
// Light + dark: index.html is the dark app, light.html the light one (every dark colour swapped for its light
// partner, see tools/light-theme.mjs). Both share the same saved data; a tiny script at the top of each page
// switches to the other one when the Appearance setting asks for it. The dev app starts in light, the live app in dark
// (THEME=light makes light the starting look on your Mac too).
const DEFAULT_THEME = CTX === 'branch-deploy' || process.env.THEME === 'light' ? 'light' : 'dark';
page = page.replace('__DEFAULT_THEME__', DEFAULT_THEME);
fs.writeFileSync(path.join(OUT, 'index.html'), page.replace('__PAGE_THEME__', 'dark'));
fs.writeFileSync(path.join(OUT, 'light.html'), toLight(page.replace('__PAGE_THEME__', 'light')).replaceAll('from="screens.js"', 'from="screens-light.js"'));
fs.writeFileSync(path.join(OUT, 'screens-light.js'), toLight(fs.readFileSync(path.join(OUT, 'screens.js'), 'utf8')));

// 3. Service worker: caches every file for offline use; the cache name changes whenever any file changes
const files = [];
const walk = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => { const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else files.push(path.relative(OUT, f).split(path.sep).join('/')); });
walk(OUT);
files.sort();
const h = crypto.createHash('sha256'); files.forEach(f => h.update(fs.readFileSync(path.join(OUT, f))));
const ver = h.digest('hex').slice(0, 10);
const sw = fs.readFileSync(path.join(ROOT, 'tools', 'sw.template.js'), 'utf8').replace('__CACHE__', 'seventy-hard-' + ver).replace('__FILES__', JSON.stringify(['./'].concat(files), null, 2));
fs.writeFileSync(path.join(OUT, 'sw.js'), sw);
console.log(`✓ built public/ · ${LABEL ? LABEL + ' copy · ' : ''}version ${version} · ${files.length + 1} files · cache ${ver}`);
