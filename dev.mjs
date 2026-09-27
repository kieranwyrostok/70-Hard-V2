// Local preview: `npm run dev` → builds, serves public/ at http://localhost:8888 and rebuilds when you save a file in src/.
// Just refresh the browser after saving. The /api features (food search, AI coach, photo logging, push) run on
// Netlify, so here they answer with a short message — use `npx netlify dev` if you want them locally too.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = path.dirname(new URL(import.meta.url).pathname), PUB = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT) || 8888;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const build = () => spawnSync(process.execPath, [path.join(ROOT, 'build.mjs')], { stdio: 'inherit' }).status === 0;
build();

let t = null;
fs.watch(path.join(ROOT, 'src'), { recursive: true }, () => { clearTimeout(t); t = setTimeout(() => { console.log('\n↻ change detected'); build(); }, 150); });

http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname.startsWith('/api/')) {
    res.writeHead(501, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ error: 'local', message: 'This feature runs on Netlify. Preview it on a deploy preview, or run `npx netlify dev`.' }));
  }
  if (u.pathname === '/sw.js') {   // no offline cache while developing, so a refresh always shows your latest save
    res.writeHead(200, { 'content-type': 'text/javascript', 'cache-control': 'no-store' });
    return res.end("self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.map(x=>caches.delete(x)))).then(()=>self.registration.unregister())));");
  }
  let f = path.join(PUB, decodeURIComponent(u.pathname));
  if (!f.startsWith(PUB)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(f).pipe(res);
}).listen(PORT, () => console.log(`\n▶ Seventy Hard running at http://localhost:${PORT}  (Ctrl+C to stop)\n  Tip: in Chrome/Safari open developer tools → device toolbar to see it at phone size.`));
