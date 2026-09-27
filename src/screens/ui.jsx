// Shared look + helpers for the Train and Fuel screens (compiled to public/screens.js at build time).
const { useState, useEffect, useRef, useMemo, useLayoutEffect } = React;

const C = {
  bg: '#15181d', card: '#1e232a', card2: '#171a20', line: '#2b3039', line2: '#3d4450',
  text: '#eef0f4', dim: '#9ca3b0', mute: '#8f9ab0', faint: '#6b7382',
  blue: '#4f8dff', blueInk: '#081631', amber: '#ffc233', amberInk: '#231800', olive: '#a8f25c', oliveInk: '#111a08', red: '#ff5a5f'
};
// custom app colours (see __SH_PALETTE in index.html): swap any matching token for the user's pick
(() => { const P = window.__SH_PALETTE && window.__SH_PALETTE(); if (!P) return;
  const low = {}; Object.keys(P.map).forEach(k => { low[k.toLowerCase()] = P.map[k]; });
  Object.keys(C).forEach(k => { const v = low[String(C[k]).toLowerCase()]; if (v) C[k] = v; }); })();
// Liquid glass: page, cards and lines become see-through so the moving colour glow behind the app shows through
// (tools/glass.mjs does the same for the page markup). C.solid keeps the old opaque page colour for text on accents.
C.solid = C.bg;
Object.assign(C, window.__PAGE === 'light'
  ? { bg: 'rgba(240,243,250,.74)', card: 'rgba(255,255,255,.62)', card2: 'rgba(255,255,255,.42)', line: 'rgba(30,45,90,.10)', line2: 'rgba(30,45,90,.17)' }
  : { bg: 'rgba(10,12,19,.74)', card: 'rgba(255,255,255,.06)', card2: 'rgba(255,255,255,.035)', line: 'rgba(255,255,255,.09)', line2: 'rgba(255,255,255,.16)' });
const GLASS_BLUR = 'blur(26px) saturate(170%)';
const F = {
  head: "'Saira Condensed',sans-serif", mono: "'IBM Plex Mono',monospace", body: 'Barlow,system-ui,sans-serif'
};
const T = {
  h1: { font: `800 40px/0.95 ${F.head}`, textTransform: 'uppercase', color: C.text },
  h2: { font: `700 17px/1 ${F.head}`, letterSpacing: '.16em', textTransform: 'uppercase', color: C.text },
  label: { font: `500 10px/1.2 ${F.mono}`, letterSpacing: '.14em', color: C.mute, textTransform: 'uppercase' },
  mono: { font: `600 12px/1 ${F.mono}`, letterSpacing: '.1em' },
  body: { font: `400 15px/1.35 ${F.body}`, color: C.text },
  name: { font: `600 15px/1.25 ${F.body}`, color: C.text }
};

const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const r1 = v => Math.round((Number(v) || 0) * 10) / 10;
const r2 = v => Math.round((Number(v) || 0) * 100) / 100;
const pad2 = n => String(n).padStart(2, '0');
const fmtDur = sec => { sec = Math.max(0, Math.floor(sec)); const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return h ? h + ':' + pad2(m) + ':' + pad2(s) : m + ':' + pad2(s); };
const fmtMin = sec => { const m = Math.round(sec / 60); return m >= 60 ? Math.floor(m / 60) + 'h ' + (m % 60) + 'm' : m + 'm'; };
const parseTime = v => { v = String(v || '').trim(); if (!v) return null; if (v.includes(':')) { const [a, b] = v.split(':'); return (parseInt(a, 10) || 0) * 60 + (parseInt(b, 10) || 0); } const n = parseFloat(v); return isNaN(n) ? null : Math.round(n); };
const num = v => { if (v === '' || v == null) return null; const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : n; };
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const isoOf = d => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
const dOf = iso => new Date(iso + 'T12:00:00');
const addDaysIso = (iso, n) => { const d = dOf(iso); d.setDate(d.getDate() + n); return isoOf(d); };
const niceDate = iso => { const d = dOf(iso); return WD[d.getDay()] + ', ' + MON[d.getMonth()] + ' ' + d.getDate(); };
const agoText = (iso, today) => { const n = Math.round((dOf(today) - dOf(iso)) / 864e5); return n <= 0 ? 'today' : n === 1 ? 'yesterday' : n < 7 ? n + ' days ago' : n < 14 ? '1 week ago' : Math.floor(n / 7) + ' weeks ago'; };
// A short rising three-note chime (rest timer, rule timers). iPhones only allow sound after a tap, so every
// "start" button calls shAudioUnlock() first. Silent mode mutes it.
let audioCtx = null;
const audioUnlock = () => { try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === 'suspended') audioCtx.resume(); } catch (e) { /* no audio */ } };
function chime() {
  try { audioUnlock(); const t0 = audioCtx.currentTime + 0.02;
    [[880, 0], [1175, 0.15], [1568, 0.3]].forEach(([f, d]) => { const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t0 + d); g.gain.exponentialRampToValueAtTime(0.22, t0 + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.38);
      o.connect(g); g.connect(audioCtx.destination); o.start(t0 + d); o.stop(t0 + d + 0.42); });
  } catch (e) { /* no audio */ }
}
window.shChime = chime; window.shAudioUnlock = audioUnlock;
const vib = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* no-op */ } };

// ── primitives ──
function Btn({ children, onClick, kind = 'primary', tone = C.blue, ink = C.blueInk, style, disabled }) {
  const base = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, padding: '0 16px', boxSizing: 'border-box', borderRadius: 12, cursor: disabled ? 'default' : 'pointer', userSelect: 'none', opacity: disabled ? 0.45 : 1, ...T.mono, fontSize: 13 };
  const k = kind === 'primary' ? { background: tone, color: ink, border: '1px solid ' + tone, font: `700 17px/1 ${F.head}`, letterSpacing: '.14em', textTransform: 'uppercase' }
    : kind === 'ghost' ? { background: 'transparent', color: tone, border: '1px solid ' + C.line2 }
    : kind === 'danger' ? { background: 'transparent', color: C.red, border: '1px solid #6e3638' }
    : { background: 'transparent', color: tone, border: 'none' };
  return <div role="button" onClick={disabled ? undefined : onClick} style={{ ...base, ...k, ...style }}>{children}</div>;
}
function Chip({ on, children, onClick, tone = C.blue, ink = C.blueInk, style }) {
  return <div role="button" onClick={onClick} style={{ flex: 'none', padding: '9px 13px', borderRadius: 999, cursor: 'pointer', ...T.mono, fontSize: 11, background: on ? tone : 'transparent', color: on ? ink : C.dim, border: '1px solid ' + (on ? tone : C.line2), ...style }}>{children}</div>;
}
function Seg({ items, value, onChange, tone = C.blue, ink = C.blueInk }) {
  return <div style={{ display: 'flex', border: '1px solid #30363f', borderRadius: 12, overflow: 'hidden', background: '#1a1e24' }}>
    {items.map(([v, l], i) => <div key={v} role="button" onClick={() => onChange(v)} style={{ flex: 1, textAlign: 'center', padding: '13px 0', cursor: 'pointer', ...T.mono, fontSize: 11, background: value === v ? tone : 'transparent', color: value === v ? ink : C.dim, borderLeft: i ? '1px solid #30363f' : 'none' }}>{l}</div>)}
  </div>;
}
function Card({ children, style, onClick, accent }) {
  return <div onClick={onClick} style={{ background: C.card, border: '1px solid ' + C.line, borderLeft: accent ? '3px solid ' + accent : '1px solid ' + C.line, borderRadius: 14, padding: 14, cursor: onClick ? 'pointer' : 'default', ...style }}>{children}</div>;
}
// Full-screen layer above the whole app (tab bar included).
function Sheet({ title, sub, left, right, children, footer, z = 40, bg = C.bg, onTitle }) {
  const leftRef = useRef(null), edge = useRef(null), rootRef = useRef(null);
  // swipe right from the left edge = ‹ BACK (like iOS): the screen follows the finger, then slides away or springs back
  const edgeDown = e => { edge.current = e.clientX < 30 ? { x: e.clientX, y: e.clientY, t: performance.now(), lock: null } : null; };
  const edgeMove = e => { const g = edge.current, el = rootRef.current; if (!g || !el) return;
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    if (g.lock == null) { if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return; g.lock = dx > Math.abs(dy) ? 'x' : 'y'; }
    if (g.lock !== 'x') return;
    el.style.transition = 'none'; el.style.transform = `translate3d(${Math.max(0, dx)}px,0,0)`; el.style.boxShadow = '-12px 0 30px rgba(0,0,0,.35)'; };
  const edgeUp = e => { const g = edge.current, el = rootRef.current; edge.current = null; if (!g || !el || g.lock !== 'x') return;
    const dx = e.clientX - g.x, v = dx / Math.max(1, performance.now() - g.t), b = leftRef.current && leftRef.current.querySelector('[role=button]');
    el.style.transition = 'transform .26s cubic-bezier(.2,.9,.25,1)';
    if (b && (dx > innerWidth * 0.35 || (dx > 40 && v > 0.5))) { el.style.transform = 'translate3d(100%,0,0)'; setTimeout(() => b.click(), 200); }
    else { el.style.transform = ''; el.style.boxShadow = ''; } };
  return ReactDOM.createPortal(
    <div ref={rootRef} onPointerDownCapture={edgeDown} onPointerMoveCapture={edgeMove} onPointerUpCapture={edgeUp} onPointerCancelCapture={edgeUp} style={{ position: 'fixed', inset: 0, zIndex: z, background: bg, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, animation: 'shIn .34s cubic-bezier(.2,.9,.25,1) both', display: 'flex', flexDirection: 'column', fontFamily: F.body, color: C.text }}>
      <div style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 14px) 16px 12px', borderBottom: '1px solid ' + C.line, display: 'flex', alignItems: 'center', gap: 10, minHeight: 44 }}>
        <div ref={leftRef} style={{ minWidth: 70 }}>{left}</div>
        <div onClick={onTitle} style={{ flex: 1, minWidth: 0, textAlign: 'center', cursor: onTitle ? 'pointer' : 'default' }}>
          <div style={{ font: `700 18px/1.1 ${F.head}`, letterSpacing: '.1em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
          {sub ? <div style={{ ...T.label, marginTop: 3 }}>{sub}</div> : null}
        </div>
        <div style={{ minWidth: 70, display: 'flex', justifyContent: 'flex-end' }}>{right}</div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>{children}</div>
      {footer ? <div style={{ borderTop: '1px solid ' + C.line, padding: '10px 16px calc(env(safe-area-inset-bottom, 0px) + 12px)', background: '#111419' }}>{footer}</div> : null}
    </div>, document.body);
}
function TopLink({ children, onClick, tone = C.blue }) {
  return <span role="button" onClick={onClick} style={{ ...T.mono, fontSize: 12, color: tone, cursor: 'pointer', padding: '10px 4px', display: 'inline-block' }}>{children}</span>;
}
// Bottom action sheet (menus).
function ActionSheet({ title, actions, onClose }) {
  return ReactDOM.createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,.4)', animation: 'fadeIn .2s both', display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} onPointerDown={e => { e.currentTarget._y0 = e.clientY; }} onPointerUp={e => { const y0 = e.currentTarget._y0; e.currentTarget._y0 = null; if (y0 != null && e.clientY - y0 > 70) onClose(); }} style={{ width: '100%', backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, animation: 'asUp .3s cubic-bezier(.2,.9,.25,1) both', background: '#1a1e24', borderTop: '1px solid ' + C.line2, borderRadius: '18px 18px 0 0', padding: '8px 0 calc(env(safe-area-inset-bottom, 0px) + 10px)' }}>
        {title ? <div style={{ ...T.label, padding: '10px 18px 8px' }}>{title}</div> : null}
        {actions.filter(Boolean).map((a, i) => <div key={i} role="button" onClick={() => { onClose(); a.run(); }} style={{ padding: '15px 18px', cursor: 'pointer', font: `500 16px/1.2 ${F.body}`, color: a.danger ? C.red : C.text, borderTop: i ? '1px solid #272c34' : 'none' }}>{a.label}</div>)}
        <div role="button" onClick={onClose} style={{ margin: '8px 16px 0', padding: 14, textAlign: 'center', border: '1px solid ' + C.line2, borderRadius: 12, cursor: 'pointer', ...T.mono, color: C.dim }}>CANCEL</div>
      </div>
    </div>, document.body);
}
function Field({ label, value, onChange, placeholder, inputMode, style, autoFocus }) {
  return <div style={{ minWidth: 0, ...style }}>
    {label ? <div style={{ ...T.label, marginBottom: 5 }}>{label}</div> : null}
    <input value={value == null ? '' : value} onChange={e => onChange(e.target.value)} placeholder={placeholder} inputMode={inputMode} autoFocus={autoFocus}
      style={{ width: '100%', boxSizing: 'border-box', background: C.card, border: '1px solid ' + C.line2, color: C.text, font: `500 16px/1.2 ${F.body}`, padding: '11px 10px', outline: 'none', borderRadius: 10 }} />
  </div>;
}
function Empty({ children }) {
  return <div style={{ padding: '26px 18px', textAlign: 'center', ...T.mono, fontSize: 11, lineHeight: 1.6, color: C.faint }}>{children}</div>;
}
function Bar({ pct, tone, h = 7 }) {
  return <div style={{ height: h, background: '#282d36', overflow: 'hidden', borderRadius: 99 }}><div style={{ height: '100%', borderRadius: 99, width: Math.max(0, Math.min(100, pct)) + '%', background: tone, transition: 'width .7s cubic-bezier(.2,.9,.25,1)' }} /></div>;
}
// re-render every `ms` while `on`
function useTick(on, ms = 1000) {
  const [, set] = useState(0);
  useEffect(() => { if (!on) return; const t = setInterval(() => set(x => x + 1), ms); return () => clearInterval(t); }, [on, ms]);
}

// POST to one of the AI functions, handling the optional coach passcode (asked once, remembered).
async function aiPost(path, body, retried) {
  let code = null; try { code = localStorage.getItem('coachCode'); } catch (e) { /* ignore */ }
  const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...body, code }) });
  let j = {}; try { j = await r.json(); } catch (e) { /* ignore */ }
  if (r.status === 401 && j.error === 'code' && !retried) {
    const c = prompt('Hercules passcode (the COACH_CODE you set in Netlify):');
    if (c) { try { localStorage.setItem('coachCode', c.trim()); } catch (e) { /* ignore */ } return aiPost(path, body, true); }
  }
  return { ok: r.ok, status: r.status, j };
}
// Downscale a photo to a JPEG (keeps uploads small and fast). Resolves { b64, url }.
function shrinkToJpeg(file, maxSide = 1280) {
  return new Promise((res, rej) => {
    const img = new Image(), src = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, maxSide / Math.max(img.width, img.height));
      const cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(src);
      const url = cv.toDataURL('image/jpeg', 0.82);
      res({ b64: url.split(',')[1], url });
    };
    img.onerror = () => { URL.revokeObjectURL(src); rej(new Error('Couldn’t read that image')); };
    img.src = src;
  });
}

// ── Charts (single series; tap/drag to read a value) ──
const shortDate = iso => { const d = dOf(iso); return MON[d.getMonth()] + ' ' + d.getDate(); };
function niceTicks(lo, hi) {
  if (hi - lo < 1e-9) { const pad = Math.abs(hi) * 0.1 || 1; lo -= pad; hi += pad; }
  const span = hi - lo, step0 = Math.pow(10, Math.floor(Math.log10(span / 3))), step = [1, 2, 2.5, 5, 10].map(m => m * step0).find(s => span / s <= 4) || step0 * 10;
  const a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, out = [];
  for (let v = a; v <= b + step / 2; v += step) out.push(Math.round(v * 1000) / 1000);
  return out;
}
function LineChart({ points, tone = C.olive, fmt = v => String(r1(v)), height = 170 }) {
  const [sel, setSel] = useState(null);
  const ref = useRef(null);
  if (!points || points.length < 2) return <Empty>LOG THIS AT LEAST TWICE TO SEE A TREND</Empty>;
  const W = 340, H = height, L = 44, R = 10, Tp = 12, B = 24;
  const ys = points.map(p => p.y), ticks = niceTicks(Math.min(...ys), Math.max(...ys));
  const y0 = ticks[0], y1 = ticks[ticks.length - 1];
  const X = i => L + (W - L - R) * (points.length === 1 ? 0.5 : i / (points.length - 1));
  const Y = v => Tp + (H - Tp - B) * (1 - (v - y0) / (y1 - y0 || 1));
  const pick = e => {
    const box = ref.current.getBoundingClientRect(), x = ((e.touches ? e.touches[0].clientX : e.clientX) - box.left) / box.width * W;
    let best = 0; points.forEach((p, i) => { if (Math.abs(X(i) - x) < Math.abs(X(best) - x)) best = i; }); setSel(best);
  };
  const s = sel != null ? points[sel] : points[points.length - 1];
  const d = points.map((p, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(p.y).toFixed(1)).join(' ');
  return <div style={{ position: 'relative' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
      <span style={{ font: `700 22px/1 ${F.head}`, color: C.text }}>{fmt(s.y)}</span>
      <span style={{ ...T.label }}>{sel != null ? shortDate(s.x).toUpperCase() : 'LATEST · ' + shortDate(s.x).toUpperCase()}</span>
    </div>
    <svg ref={ref} data-hswipe="" viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', touchAction: 'pan-y' }}
      onPointerDown={pick} onPointerMove={e => e.buttons && pick(e)} onTouchMove={pick}>
      {ticks.map(t => <g key={t}><line x1={L} x2={W - R} y1={Y(t)} y2={Y(t)} stroke="#282d36" strokeWidth="1" />
        <text x={L - 6} y={Y(t) + 3.5} textAnchor="end" fill={C.faint} style={{ font: `500 10px ${F.mono}` }}>{fmt(t)}</text></g>)}
      <text x={L} y={H - 6} fill={C.faint} style={{ font: `500 10px ${F.mono}` }}>{shortDate(points[0].x).toUpperCase()}</text>
      <text x={W - R} y={H - 6} textAnchor="end" fill={C.faint} style={{ font: `500 10px ${F.mono}` }}>{shortDate(points[points.length - 1].x).toUpperCase()}</text>
      <path d={d + ` L${X(points.length - 1).toFixed(1)},${(H - B).toFixed(1)} L${X(0).toFixed(1)},${(H - B).toFixed(1)} Z`} fill={tone} opacity="0.10" />
      <path d={d} fill="none" stroke={tone} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {sel != null ? <line x1={X(sel)} x2={X(sel)} y1={Tp} y2={H - B} stroke={C.dim} strokeWidth="1" strokeDasharray="3 3" /> : null}
      {points.map((p, i) => <circle key={i} cx={X(i)} cy={Y(p.y)} r={i === (sel != null ? sel : points.length - 1) ? 5 : 3.5} fill={tone} stroke={C.solid} strokeWidth="2" />)}
      <rect x={L} y={0} width={W - L} height={H} fill="transparent" />
    </svg>
  </div>;
}
function BarChart({ bars, tone = C.olive, goal, fmt = v => String(Math.round(v)), height = 150 }) {
  const [sel, setSel] = useState(null);
  if (!bars || !bars.length) return null;
  const W = 340, H = height, L = 40, R = 6, Tp = 10, B = 22;
  const max = Math.max(goal || 0, ...bars.map(b => b.y)), ticks = niceTicks(0, max || 1), y1 = ticks[ticks.length - 1];
  const bw = (W - L - R) / bars.length, Y = v => Tp + (H - Tp - B) * (1 - v / (y1 || 1));
  const s = sel != null ? bars[sel] : null;
  return <div>
    <div style={{ height: 18, ...T.label, color: s ? C.text : C.faint }}>{s ? s.label.toUpperCase() + ' · ' + fmt(s.y) : 'TAP A BAR FOR ITS VALUE'}</div>
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {ticks.map(t => <g key={t}><line x1={L} x2={W - R} y1={Y(t)} y2={Y(t)} stroke="#282d36" strokeWidth="1" />
        <text x={L - 6} y={Y(t) + 3.5} textAnchor="end" fill={C.faint} style={{ font: `500 10px ${F.mono}` }}>{fmt(t)}</text></g>)}
      {bars.map((b, i) => { const x = L + i * bw + 2, w = Math.max(2, bw - 4), top = Y(b.y), bot = H - B, r = Math.min(4, w / 2, (bot - top) / 2);
        const path = b.y > 0 ? `M${x},${bot} L${x},${top + r} Q${x},${top} ${x + r},${top} L${x + w - r},${top} Q${x + w},${top} ${x + w},${top + r} L${x + w},${bot} Z` : '';
        return <g key={i} onClick={() => setSel(sel === i ? null : i)} style={{ cursor: 'pointer' }}>
          <rect x={L + i * bw} y={Tp} width={bw} height={H - Tp - B} fill="transparent" />
          {path ? <path d={path} fill={b.tone || tone} opacity={sel == null || sel === i ? 1 : 0.45} /> : <line x1={x} x2={x + w} y1={bot - 1} y2={bot - 1} stroke={C.line2} strokeWidth="2" />}
          {b.tick ? <text x={x + w / 2} y={H - 7} textAnchor="middle" fill={C.faint} style={{ font: `500 9px ${F.mono}` }}>{b.tick}</text> : null}
        </g>; })}
      {goal ? <g><line x1={L} x2={W - R} y1={Y(goal)} y2={Y(goal)} stroke={C.text} strokeWidth="1.5" strokeDasharray="5 4" opacity="0.7" />
        <text x={W - R} y={Y(goal) - 4} textAnchor="end" fill={C.dim} style={{ font: `600 10px ${F.mono}` }}>GOAL {fmt(goal)}</text></g> : null}
    </svg>
  </div>;
}
function Sparkline({ values, tone = C.olive, w = 90, h = 28 }) {
  if (!values || values.length < 2) return <div style={{ width: w, height: h }} />;
  const lo = Math.min(...values), hi = Math.max(...values);
  const pts = values.map((v, i) => (i * (w - 4) / (values.length - 1) + 2).toFixed(1) + ',' + (h - 3 - (hi - lo < 1e-9 ? (h - 6) / 2 : (h - 6) * (v - lo) / (hi - lo))).toFixed(1)).join(' ');
  return <svg width={w} height={h} style={{ flex: 'none' }}><polyline points={pts} fill="none" stroke={tone} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /></svg>;
}

// ── Drag-and-drop reordering ──
// Grab the ≡ handle (or long-press where `press` props are spread) and drop the row where it should go.
function scrollerOf(el) {
  for (let p = el && el.parentElement; p; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY;
    if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight) return p;
  }
  return null;
}
// iOS decides whether a touch may scroll when it starts, so this listener is always there and only blocks while dragging
let DRAG_ON = false;
try { document.addEventListener('touchmove', e => { if (DRAG_ON) e.preventDefault(); }, { passive: false }); } catch (e) { /* ignore */ }
function DragList({ items, keyOf, onMove, render, onActive }) {
  const refs = useRef({}), dref = useRef(null), timer = useRef(null);
  const [, bump] = useState(0);
  const d = dref.current;
  const kOf = (it, i) => keyOf ? keyOf(it, i) : i;
  const compute = () => {
    const x = dref.current; if (!x || !x.rects) return;
    const yEff = x.c0 + (x.y - x.y0) + (x.sc ? x.sc.scrollTop - x.st0 : 0);   // the row follows the finger from where it sits
    let to = 0; x.rects.forEach((r, i) => { if (i !== x.from && r.top + r.h / 2 < yEff) to++; });
    x.to = to; x.yEff = yEff; bump(n => n + 1);
  };
  const stop = commit => {
    const x = dref.current; if (!x) return;
    dref.current = null; cancelAnimationFrame(x.raf);
    window.removeEventListener('pointermove', x.mv); window.removeEventListener('pointerup', x.up); window.removeEventListener('pointercancel', x.cc);
    DRAG_ON = false;
    document.body.style.userSelect = document.body.style.webkitUserSelect = '';
    if (onActive) onActive(false);
    bump(n => n + 1);
    if (commit && x.to != null && x.to !== x.from) onMove(x.from, x.to);
  };
  const begin = (i, y) => {
    const x = { from: i, y, to: i, speed: 0 };
    x.mv = ev => { x.y = ev.clientY; if (x.sc) { const r = x.sc.getBoundingClientRect(); x.speed = ev.clientY < r.top + 70 ? -1 : ev.clientY > r.bottom - 70 ? 1 : 0; } compute(); };
    x.up = () => stop(true); x.cc = () => stop(false);
    const loop = () => { if (dref.current !== x) return; if (x.sc && x.speed) { x.sc.scrollTop += x.speed * 9; compute(); } x.raf = requestAnimationFrame(loop); };
    window.addEventListener('pointermove', x.mv); window.addEventListener('pointerup', x.up); window.addEventListener('pointercancel', x.cc);
    DRAG_ON = true;
    document.body.style.userSelect = document.body.style.webkitUserSelect = 'none';
    dref.current = x; vib(20);
    if (onActive) onActive(true);
    bump(n => n + 1);
    x.raf = requestAnimationFrame(loop);
  };
  // measure once the list has re-rendered in drag mode (rows may collapse), and keep the grabbed row under the finger
  useLayoutEffect(() => {
    const x = dref.current; if (!x || x.rects) return;
    const els = items.map((it, i) => refs.current[kOf(it, i)]);
    if (els.some(e => !e)) return;
    x.sc = scrollerOf(els[x.from]);
    const measure = () => els.map(e => { const r = e.getBoundingClientRect(); return { top: r.top, h: r.height }; });
    let rects = measure();
    if (x.sc) {
      const want = rects[x.from].top + rects[x.from].h / 2 - x.y;
      if (Math.abs(want) > 4) { x.sc.scrollTop += want; rects = measure(); }
    }
    x.rects = rects; x.st0 = x.sc ? x.sc.scrollTop : 0; x.y0 = x.y; x.c0 = rects[x.from].top + rects[x.from].h / 2;
    x.gap = rects.length > 1 ? Math.max(0, rects[1].top - rects[0].top - rects[0].h) : 0;
    compute();
  });
  useEffect(() => () => { clearTimeout(timer.current); stop(false); }, []);
  const handle = i => ({
    onPointerDown: ev => { if (ev.button > 0) return; ev.preventDefault(); ev.stopPropagation(); begin(i, ev.clientY); },
    style: { touchAction: 'none', cursor: 'grab', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }
  });
  // long-press anywhere these props are spread
  const press = i => ({
    onPointerDown: ev => {
      if (ev.button > 0) return;
      const y0 = ev.clientY, x0 = ev.clientX;
      clearTimeout(timer.current);
      const cancel = e2 => { if (!e2 || Math.abs(e2.clientY - y0) > 8 || Math.abs(e2.clientX - x0) > 8 || e2.type !== 'pointermove') { clearTimeout(timer.current); off(); } };
      const off = () => { window.removeEventListener('pointermove', cancel); window.removeEventListener('pointerup', cancel); window.removeEventListener('pointercancel', cancel); };
      window.addEventListener('pointermove', cancel); window.addEventListener('pointerup', cancel); window.addEventListener('pointercancel', cancel);
      timer.current = setTimeout(() => { off(); begin(i, y0); }, 380);
    },
    onContextMenu: ev => ev.preventDefault(),
    style: { userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }
  });
  return <>{items.map((it, i) => {
    const k = kOf(it, i);
    let tf = 'none', z = 'auto', extra = {};
    if (d && d.rects && d.to != null) {
      const fr = d.rects[d.from], step = fr.h + (d.gap || 0);
      if (i === d.from) { tf = 'translateY(' + (d.yEff - fr.top - fr.h / 2) + 'px) scale(1.02)'; z = 20; extra = { boxShadow: '0 12px 30px rgba(0,0,0,.45)', borderRadius: 14 }; }
      else if (d.from < d.to && i > d.from && i <= d.to) tf = 'translateY(' + (-step) + 'px)';
      else if (d.from > d.to && i >= d.to && i < d.from) tf = 'translateY(' + step + 'px)';
    }
    return <div key={k} ref={el => { refs.current[k] = el; }} data-drag-row={i}
      style={{ position: 'relative', zIndex: z, transform: tf, transition: d && i !== d.from ? 'transform .16s ease' : 'none', ...extra }}>
      {render(it, i, { handle: handle(i), press: press(i), active: !!d, dragging: !!d && d.from === i })}
    </div>;
  })}</>;
}
function Grip({ h, color }) {
  return <span {...h} role="button" aria-label="Drag to reorder" style={{ ...h.style, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 36, flex: 'none', color: color || C.faint, font: `400 20px/1 ${F.body}` }}>≡</span>;
}

// ── Swipe gestures ──
// SwipeRow: slide a row left to reveal actions (like iOS Mail); a long swipe or a hard flick runs the first action.
// While the finger is down the row is moved directly (no React re-render), so it tracks at full frame rate.
let openSwipeRow = null;   // only one row open at a time
function SwipeRow({ actions, children, bg = C.card, radius = 0, disabled, style }) {
  const content = useRef(null), box = useRef(null), outer = useRef(null), g = useRef(null), pos = useRef(0), justSwiped = useRef(0), raf = useRef(0);
  const acts = (actions || []).filter(Boolean), W = acts.length * 78;
  const apply = (x, anim) => {
    pos.current = x;
    const el = content.current, a = box.current; if (!el) return;
    el.style.transition = anim ? 'transform .32s cubic-bezier(.2,.9,.25,1)' : 'none';
    el.style.transform = x ? `translate3d(${x}px,0,0)` : '';
    if (a) { a.style.visibility = x < 0 ? 'visible' : 'hidden'; a.style.width = Math.max(0, -x) + 'px'; a.style.transition = anim ? 'width .32s cubic-bezier(.2,.9,.25,1)' : 'none'; }
  };
  const close = () => { apply(0, true); if (openSwipeRow === close) openSwipeRow = null; };
  useEffect(() => () => { cancelAnimationFrame(raf.current); if (openSwipeRow === close) openSwipeRow = null; }, []);
  if (disabled || !acts.length) return <div style={style}>{children}</div>;
  const down = e => {
    if (e.button > 0) return;
    if (openSwipeRow && openSwipeRow !== close) openSwipeRow();
    g.current = { x: e.clientX, y: e.clientY, base: pos.current, lock: null, pts: [[e.clientX, performance.now()]] };
  };
  const move = e => {
    const t = g.current; if (!t) return;
    const mx = e.clientX - t.x, my = e.clientY - t.y;
    if (t.lock == null) {
      if (Math.abs(mx) < 6 && Math.abs(my) < 6) return;
      t.lock = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
      if (t.lock === 'x') { try { e.currentTarget.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ } }
    }
    if (t.lock !== 'x') return;
    e.stopPropagation();
    t.pts.push([e.clientX, performance.now()]); if (t.pts.length > 6) t.pts.shift();
    let x = t.base + mx;
    if (x > 0) x = x * 0.25;                                          // rubber band to the right
    const max = W + 140; if (x < -max) x = -max - (-x - max) * 0.3;    // and past a full swipe
    cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(() => apply(x, false));
  };
  const up = e => {
    const t = g.current; g.current = null;
    if (!t || t.lock !== 'x') return;
    e.stopPropagation(); justSwiped.current = Date.now(); cancelAnimationFrame(raf.current);
    const x = t.base + (e.clientX - t.x), p0 = t.pts[0], v = p0 ? (e.clientX - p0[0]) / Math.max(1, performance.now() - p0[1]) : 0;   // px per ms
    const width = outer.current ? outer.current.offsetWidth : 360;
    if (x < -W - 90 || (v < -1.1 && x < -W * 0.7)) {                    // full swipe / hard flick → first action
      apply(-width, true); vib(20);
      setTimeout(() => { acts[0].run(); apply(0, false); }, 220);
      if (openSwipeRow === close) openSwipeRow = null;
    } else if (x < -W / 2 || v < -0.45) {
      apply(-W, true); openSwipeRow = close;
      // tapping anywhere outside this row closes it again
      const away = ev => { if (outer.current && outer.current.contains(ev.target)) return; document.removeEventListener('pointerdown', away, true); if (pos.current) close(); };
      setTimeout(() => document.addEventListener('pointerdown', away, true), 0);
    }
    else close();
  };
  return <div ref={outer} style={{ position: 'relative', overflow: 'hidden', borderRadius: radius, ...style }}>
    <div ref={box} style={{ position: 'absolute', top: 0, bottom: 0, right: 0, display: 'flex', width: 0, overflow: 'hidden', visibility: 'hidden' }}>
      {acts.map((a, i) => <div key={i} role="button" onClick={() => { close(); a.run(); }} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: a.tone || C.red, color: a.ink || '#fff', ...T.mono, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap', minWidth: 0, overflow: 'hidden' }}>{a.label}</div>)}
    </div>
    <div ref={content} data-hswipe="" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      onClickCapture={e => { if (Date.now() - justSwiped.current < 350) { e.stopPropagation(); e.preventDefault(); } else if (pos.current) { e.stopPropagation(); close(); } }}
      style={{ position: 'relative', background: bg, touchAction: 'pan-y', willChange: 'transform' }}>{children}</div>
  </div>;
}
// Horizontal swipe on an area → onLeft / onRight (next / previous day, month…). The area follows the finger a little
// and springs back, so it feels connected. Gesture state lives on the element, so re-renders mid-swipe don't lose it.
function swipeNav(onLeft, onRight) {
  const ease = 'transform .3s cubic-bezier(.2,.9,.25,1)';
  return {
    onPointerDown: e => { if (e.button > 0) return; e.currentTarget.__sw = { x: e.clientX, y: e.clientY, t: performance.now(), lock: null }; },
    onPointerMove: e => {
      const el = e.currentTarget, t = el.__sw; if (!t) return;
      const dx = e.clientX - t.x, dy = e.clientY - t.y;
      if (t.lock == null) { if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return; t.lock = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'x' : 'y'; }
      if (t.lock !== 'x') return;
      const can = dx < 0 ? !!onLeft : !!onRight, k = can ? 0.45 : 0.15;
      el.style.transition = 'none'; el.style.transform = `translate3d(${dx * k}px,0,0)`; el.style.opacity = String(1 - Math.min(0.35, Math.abs(dx) / 900));
    },
    onPointerUp: e => {
      const el = e.currentTarget, t = el.__sw; el.__sw = null; if (!t) return;
      const dx = e.clientX - t.x, dy = e.clientY - t.y, v = Math.abs(dx) / Math.max(1, performance.now() - t.t);
      el.style.transition = ease + ', opacity .3s'; el.style.transform = ''; el.style.opacity = '';
      if (t.lock === 'x' && Math.abs(dy) < Math.abs(dx) && (Math.abs(dx) > 70 || (Math.abs(dx) > 30 && v > 0.5))) { if (dx < 0 && onLeft) onLeft(); else if (dx > 0 && onRight) onRight(); }
    },
    onPointerCancel: e => { const el = e.currentTarget; el.__sw = null; el.style.transition = ease; el.style.transform = ''; el.style.opacity = ''; },
    style: { touchAction: 'pan-y' }, 'data-hswipe': ''
  };
}

// ── Celebration: confetti burst + banner (used for new PRs) ──
function celebrate(title, lines) {
  vib([30, 60, 30]);
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const banner = document.createElement('div');
  banner.style.cssText = 'position:fixed;left:16px;right:16px;top:calc(env(safe-area-inset-top,0px) + 14px);z-index:120;pointer-events:none;background:' + C.amber + ';color:' + C.amberInk + ';border-radius:16px;padding:14px 16px;box-shadow:0 12px 34px rgba(0,0,0,.35);transform:translateY(-140%);transition:transform .35s cubic-bezier(.2,1.3,.4,1)';
  banner.innerHTML = '<div style="font:800 22px/1.05 ' + F.head + ';letter-spacing:.06em;text-transform:uppercase">🏆 ' + title + '</div>' + (lines || []).slice(0, 4).map(l => '<div style="font:600 12px/1.4 ' + F.mono + ';letter-spacing:.04em;margin-top:4px">' + String(l).replace(/[<>&]/g, '') + '</div>').join('');
  document.body.appendChild(banner);
  requestAnimationFrame(() => { banner.style.transform = 'translateY(0)'; });
  setTimeout(() => { banner.style.transform = 'translateY(-140%)'; setTimeout(() => banner.remove(), 400); }, 2800);
  if (reduce) return;
  const cv = document.createElement('canvas'), dpr = Math.min(2, window.devicePixelRatio || 1), W = innerWidth, H = innerHeight;
  cv.width = W * dpr; cv.height = H * dpr; cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:119;pointer-events:none';
  document.body.appendChild(cv);
  const g = cv.getContext('2d'); g.scale(dpr, dpr);
  const cols = [C.amber, C.blue, C.olive, C.red, '#ffffff'];
  const bits = Array.from({ length: 140 }, (_, i) => ({ x: W / 2 + (Math.random() - .5) * 60, y: H * 0.32, vx: (Math.random() - .5) * 11, vy: -Math.random() * 12 - 4,
    r: Math.random() * Math.PI, vr: (Math.random() - .5) * .3, w: 5 + Math.random() * 5, h: 8 + Math.random() * 6, c: cols[i % cols.length] }));
  const t0 = performance.now();
  const step = now => {
    const t = now - t0; g.clearRect(0, 0, W, H);
    for (const b of bits) { b.vy += 0.32; b.vx *= 0.99; b.x += b.vx; b.y += b.vy; b.r += b.vr;
      g.save(); g.translate(b.x, b.y); g.rotate(b.r); g.globalAlpha = Math.max(0, 1 - t / 2200); g.fillStyle = b.c; g.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); g.restore(); }
    if (t < 2200) requestAnimationFrame(step); else cv.remove();
  };
  requestAnimationFrame(step);
}

// ── Water pail: fills as you drink; tap it to add a glass ──
function Pail({ ml, goal, onTap, size = 118 }) {
  const pct = Math.max(0, Math.min(1, goal ? ml / goal : 0)), top = 38, bottom = 108, y = bottom - pct * (bottom - top);
  const [pop, setPop] = useState(0);
  const tap = () => { if (!onTap) return; setPop(p => p + 1); vib(12); onTap(); };
  const id = useMemo(() => 'pail' + uid(), []);
  return <svg role="button" aria-label="Add a glass of water" onClick={tap} viewBox="0 0 120 120" width={size} height={size} key={pop}
    style={{ cursor: onTap ? 'pointer' : 'default', flex: 'none', animation: pop ? 'pailpop .35s ease' : 'none', overflow: 'visible' }}>
    <defs><clipPath id={id}><path d="M17 38 L103 38 L94 104 Q93 110 87 110 L33 110 Q27 110 26 104 Z" /></clipPath></defs>
    <path d="M24 40 C 22 2, 98 2, 96 40" fill="none" stroke={C.line2} strokeWidth="4" strokeLinecap="round" />
    <path d="M17 38 L103 38 L94 104 Q93 110 87 110 L33 110 Q27 110 26 104 Z" fill={C.card} />
    <g clipPath={`url(#${id})`}>
      <rect x="0" y={y} width="120" height="120" fill={C.blue} style={{ transition: 'y .5s ease' }} />
      {pct > 0 && pct < 1 ? <g className="pailwave" style={{ transform: `translateY(${y - 6}px)` }}>
        <path d="M-60 6 Q -45 0 -30 6 T 0 6 T 30 6 T 60 6 T 90 6 T 120 6 T 150 6 T 180 6 V 14 H -60 Z" fill={C.blue} opacity=".55" />
      </g> : null}
      {[0.25, 0.5, 0.75].map(f => <line key={f} x1="18" x2="102" y1={bottom - f * (bottom - top)} y2={bottom - f * (bottom - top)} stroke={C.solid} strokeOpacity=".35" strokeDasharray="3 4" />)}
    </g>
    <path d="M17 38 L103 38 L94 104 Q93 110 87 110 L33 110 Q27 110 26 104 Z" fill="none" stroke={pct >= 1 ? C.blue : C.line2} strokeWidth="3" strokeLinejoin="round" />
    <ellipse cx="60" cy="38" rx="44" ry="4" fill="none" stroke={pct >= 1 ? C.blue : C.line2} strokeWidth="3" />
    <text x="60" y="80" textAnchor="middle" style={{ font: `700 19px ${F.head}`, fill: pct > 0.45 ? '#ffffff' : C.text }}>{Math.round(pct * 100)}%</text>
  </svg>;
}

// Today tab's pail (the Today screen is a template, so it mounts this React piece)
function PailWidget({ app, st }) {
  if (!app || !st) return null;
  return <Pail ml={st.waterMl || 0} goal={st.waterGoal || 3500} size={112} onTap={() => app.addWater(250)} />;
}
window.PailWidget = PailWidget;


// ── Swipe between the main tabs ──
// A clear sideways swipe on a main screen (anywhere that isn't already a swipe area: food rows, day/month swipers,
// charts, sideways-scrolling chip rows, inputs, drag handles) moves to the next / previous tab in the tab bar.
(function tabSwipe() {
  if (window.__tabSwipe) return; window.__tabSwipe = true;
  const ORDER = [['s02'], ['s03'], ['s04'], ['s05', 's07', 's08', 's11'], ['s06'], ['s12']];
  const at = id => ORDER.findIndex(g => g.includes(id));
  const blocked = el => {
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      if (e.hasAttribute && e.hasAttribute('data-hswipe')) return true;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName)) return true;
      const cs = getComputedStyle(e);
      if (cs.touchAction === 'none') return true;
      if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && e.scrollWidth > e.clientWidth + 2) return true;
      if (e.classList && e.classList.contains('screen')) return false;
    }
    return false;
  };
  let g = null;
  const reset = (el, anim) => { if (!el) return; el.style.transition = anim ? 'transform .25s cubic-bezier(.2,.9,.25,1), opacity .25s' : 'none'; el.style.transform = ''; el.style.opacity = ''; };
  document.addEventListener('pointerdown', e => {
    g = null;
    if (e.button > 0 || document.querySelector('body > div[style*="position: fixed"][style*="inset: 0px"]')) return;   // a full-screen sheet is open
    const scr = e.target.closest && e.target.closest('.screen');
    if (!scr || at(scr.id) < 0 || blocked(e.target)) return;
    g = { x: e.clientX, y: e.clientY, t: performance.now(), scr, lock: null, id: e.pointerId };
  }, true);
  // iPhone: once a finger is clearly moving sideways, stop the page from starting a vertical scroll (which would
  // cancel the swipe). A slightly diagonal swipe still changes page; a mostly up/down drag still scrolls.
  document.addEventListener('touchmove', e => {
    if (!g || g.lock === 'y' || e.touches.length !== 1 || !e.cancelable) return;
    const t = e.touches[0], dx = t.clientX - g.x, dy = t.clientY - g.y;
    if (g.lock === 'x' || (Math.abs(dx) >= 6 && Math.abs(dx) > Math.abs(dy) * 1.1)) e.preventDefault();
  }, { passive: false, capture: true });
  document.addEventListener('pointermove', e => {
    if (!g || e.pointerId !== g.id) return;
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    // decide once, after a little movement: mostly sideways = page swipe. Once it's a page swipe, up/down wobble is ignored.
    if (g.lock == null) { if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return; g.lock = Math.abs(dx) > Math.abs(dy) * 1.1 ? 'x' : 'y'; }
    if (g.lock !== 'x') return;
    const i = at(g.scr.id), can = dx < 0 ? i < ORDER.length - 1 : i > 0;
    g.scr.style.transition = 'none';
    g.scr.style.transform = `translate3d(${dx * (can ? 0.35 : 0.1)}px,0,0)`;
    g.scr.style.opacity = String(1 - Math.min(0.4, Math.abs(dx) / 700));
  }, true);
  const end = e => {
    const t = g; g = null; if (!t || t.lock !== 'x') { if (t) reset(t.scr, true); return; }
    const dx = e.clientX - t.x, dy = e.clientY - t.y, v = Math.abs(dx) / Math.max(1, performance.now() - t.t);
    const i = at(t.scr.id), j = dx < 0 ? i + 1 : i - 1;
    const go = e.type === 'pointerup' && Math.abs(dy) < Math.abs(dx) * 1.2 && (Math.abs(dx) > innerWidth * 0.28 || (Math.abs(dx) > 55 && v > 0.45)) && j >= 0 && j < ORDER.length;
    if (!go) { reset(t.scr, true); return; }
    const dir = dx < 0 ? -1 : 1;
    t.scr.style.transition = 'transform .16s ease-in, opacity .16s'; t.scr.style.transform = `translate3d(${dir * 70}px,0,0)`; t.scr.style.opacity = '0';
    vib(8);
    setTimeout(() => {
      reset(t.scr, false);
      const next = ORDER[j][0];
      if (window.__goto) window.__goto(next); else location.hash = next;
      const el = document.getElementById(next); if (!el) return;
      el.style.transition = 'none'; el.style.transform = `translate3d(${-dir * 70}px,0,0)`; el.style.opacity = '0';
      requestAnimationFrame(() => requestAnimationFrame(() => reset(el, true)));
    }, 150);
  };
  document.addEventListener('pointerup', end, true);
  document.addEventListener('pointercancel', end, true);
})();

// ── Today's progress rings: neon ropes spinning around each other ──
function RingsWidget({ rings }) {
  // 3D rings: drag or flick to tumble them toward / away from you (up-down) or turn them (sideways). They coast,
  // then settle back. Opening Today makes them fly in from deep in the screen with one forward flip.
  const list = (rings || []).filter(r => r && r.display !== 'none');
  const puck = useRef(null), floor = useRef(null), [drawn, setDrawn] = useState(false);
  const st = useRef({ ax: 0, ay: 0, z: 0, vx: 0, vy: 0, drag: null, raf: 0 });
  const id = useRef('rg' + uid()).current, TILT = 16;
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const paint = () => { const s = st.current, el = puck.current; if (!el) return;
    el.style.transform = `translateZ(${s.z}px) rotateX(${TILT + s.ax}deg) rotateY(${s.ay}deg)`;
    const k = Math.abs(Math.cos((TILT + s.ax) * Math.PI / 180) * Math.cos(s.ay * Math.PI / 180));
    if (floor.current) { floor.current.style.transform = `scale(${0.45 + 0.55 * k}, ${0.6 + 0.4 * k})`; floor.current.style.opacity = String(0.35 + 0.65 * k * Math.max(0, 1 + s.z / 400)); } };
  const run = () => { const s = st.current; cancelAnimationFrame(s.raf);
    let last = performance.now(), dirX = Math.sign(s.vx), dirY = Math.sign(s.vy), tx = null, ty = null;
    const step = () => {
      if (s.drag) return;
      const now = performance.now(), f = Math.min(4, (now - last) / 16.67); last = now;   // same speed at 60 or 120 Hz
      if (tx == null && (Math.abs(s.vx) > 0.6 || Math.abs(s.vy) > 0.6)) { s.ax += s.vx * f; s.ay += s.vy * f; const fr = Math.pow(0.962, f); s.vx *= fr; s.vy *= fr; }
      else {
        // finish the turn in the direction it was going, then rest
        if (tx == null) { tx = (dirX > 0 ? Math.ceil : dirX < 0 ? Math.floor : Math.round)(s.ax / 360) * 360; ty = (dirY > 0 ? Math.ceil : dirY < 0 ? Math.floor : Math.round)(s.ay / 360) * 360; }
        const k = 1 - Math.pow(1 - 0.12, f);
        s.ax += (tx - s.ax) * k; s.ay += (ty - s.ay) * k;
        if (Math.abs(tx - s.ax) < 0.2 && Math.abs(ty - s.ay) < 0.2) { s.ax = s.ay = 0; paint(); return; }
      }
      paint(); s.raf = requestAnimationFrame(step);
    };
    s.raf = requestAnimationFrame(step); };
  const flyIn = () => { if (reduce) return; const s = st.current; cancelAnimationFrame(s.raf); s.vx = s.vy = 0; s.ay = 0;
    const t0 = performance.now(), D = 950, out = t => 1 - Math.pow(1 - t, 3);   // ease-out: one flip toward you as it comes forward
    const step = () => { if (s.drag) return; const k = out(Math.min(1, (performance.now() - t0) / D));
      s.ax = -360 * (1 - k); s.z = -360 * (1 - k); paint(); if (k < 1) s.raf = requestAnimationFrame(step); else { s.ax = s.z = 0; paint(); } };
    step(); };
  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), 60); paint(); flyIn();
    const onHash = () => { if ((location.hash || '#s02') === '#s02') flyIn(); };
    window.addEventListener('hashchange', onHash);
    return () => { clearTimeout(t); cancelAnimationFrame(st.current.raf); window.removeEventListener('hashchange', onHash); };
  }, []);
  const down = e => { if (reduce) return; const s = st.current; cancelAnimationFrame(s.raf); try { e.currentTarget.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
    s.drag = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 }; s.vx = s.vy = 0; };
  const move = e => { const s = st.current, d = s.drag; if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y, now = performance.now(), dt = Math.max(1, now - d.t);
    s.ax -= dy * 0.9; s.ay += dx * 0.9; d.moved += Math.abs(dx) + Math.abs(dy);
    s.vx = s.vx * 0.5 + (-dy * 0.9 / dt * 16) * 0.5; s.vy = s.vy * 0.5 + (dx * 0.9 / dt * 16) * 0.5;
    d.x = e.clientX; d.y = e.clientY; d.t = now; paint(); };
  const up = () => { const s = st.current, d = s.drag; s.drag = null; if (!d) return;
    if (d.moved < 6) { s.vx = -17; s.vy = 0; }                  // a tap = one flip toward you
    const cap = v => Math.max(-45, Math.min(45, v)); s.vx = cap(s.vx); s.vy = cap(s.vy);
    if (Math.abs(s.vx) + Math.abs(s.vy) > 3) vib(10); run(); };
  const ease = 'stroke-dashoffset 1.1s cubic-bezier(.2,.9,.25,1)';
  const fracOf = r => r.c ? 1 - r.off / r.c : 0;
  // Neon ropes: thicker rings on their own radii, each spinning on its own tilted axis (opposite directions, different
  // speeds) so they swing through each other like a gyroscope. The lit part = your progress, with light strands running along it.
  const GEO = { 1: [[78, 30]], 2: [[82, 26], [52, 26]], 3: [[86, 20], [62, 20], [38, 20]] }[list.length] || [];
  const SPIN = [['ropeA', 11], ['ropeB', 8.5], ['ropeC', 14]];
  const tube = (r0, i) => { const [rr, sw] = GEO[i] || [r0.r, r0.sw], frac = fracOf(r0), c = 2 * Math.PI * rr, r = { ...r0, r: rr, sw, c, off: c * (1 - frac) };
    const off = drawn ? r.off : r.c, lit = frac > 0, light = shade(r.tone, 0.7), hi = -r.sw * 0.2;
    const arc = (stroke, w, extra = {}) => <circle cx="100" cy="100" r={r.r} fill="none" stroke={stroke} strokeWidth={w} strokeLinecap="round" strokeDasharray={r.c} strokeDashoffset={off} style={{ transition: ease }} {...extra} />;
    const ring = (stroke, w, extra = {}) => <circle cx="100" cy="100" r={r.r} fill="none" stroke={stroke} strokeWidth={w} {...extra} />;
    const [anim, dur] = SPIN[i % 3];
    // Real 3D thickness: the tube is built from thin slices stacked through its depth, like slicing a doughnut.
    // Each slice's width follows a circle (widest in the middle, narrow at front and back), so turned edge-on the
    // ring shows a round cross-section. Front slices are lighter and back ones darker, which reads as a lit tube.
    const PX = 176 / 200, t = r.sw / 2, N = 11;
    const slices = Array.from({ length: N }, (_, k) => { const a = (k + 0.5) * Math.PI / N;
      return { z: -t * Math.cos(a) * PX, w: 2 * t * Math.sin(a) + 0.8, lite: -Math.cos(a) }; });   // back → front
    const svg = (z, kids, key) => <svg key={key} viewBox="0 0 200 200" width="176" height="176" style={{ position: 'absolute', inset: 0, overflow: 'visible', transform: `translateZ(${z.toFixed(2)}px)` }}>{kids}</svg>;
    const front = slices[N - 1];
    // the empty part of the ring: a solid, muted tube (see-through slices would show as stripes when tilted)
    const pale = window.__PAGE === 'light', track = lite => pale ? shade(r.tone, 0.72 + lite * 0.12) : shade(r.tone, -0.72 + lite * 0.1);
    return <div key={i} style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d', animation: reduce ? 'none' : `${anim} ${dur}s linear infinite${i % 2 ? ' reverse' : ''}` }}>
      {slices.map((sl, k) => { const tone = sl.lite < 0 ? shade(r.tone, sl.lite * 0.6) : shade(r.tone, sl.lite * 0.35);
        return svg(sl.z, <>
          {ring(track(sl.lite), sl.w)}
          {k === (N - 1) / 2 ? <g transform="rotate(-90 100 100)" opacity={lit ? 1 : 0}>{arc(r.tone, r.sw + 14, { filter: `url(#${id}glow)`, opacity: 0.8, className: "rglow" })}</g> : null}
          <g transform="rotate(-90 100 100)" opacity={lit ? 1 : 0}>{arc(tone, sl.w, { strokeLinecap: "butt" })}</g>
        </>, k); })}
      {svg(front.z + 0.3, <>
        <g transform="rotate(-90 100 100)" opacity={lit ? 1 : 0}>
          <g mask={`url(#${id}m${i})`}>
            <circle cx="100" cy="100" r={r.r} fill="none" stroke={light} strokeWidth={r.sw * 0.5} strokeDasharray="3 9" opacity=".5" style={{ animation: reduce ? 'none' : `ropeFlow ${1.6 + i * 0.4}s linear infinite` }} />
          </g>
        </g>
        <g transform={`translate(0 ${hi})`} opacity={lit ? 1 : 0}><g transform="rotate(-90 100 100)">
          {arc(light, r.sw * 0.2, { opacity: 0.75 })}
          {arc('#ffffff', Math.max(1, r.sw * 0.07), { opacity: 0.9, transform: `translate(0 ${hi * 0.4})` })}
        </g></g>
        {drawn && frac > 0.02 ? <circle cx={100 + r.r * Math.sin(frac * 2 * Math.PI)} cy={100 - r.r * Math.cos(frac * 2 * Math.PI) + hi * 0.5} r={r.sw * 0.3} fill="#ffffff" opacity=".9" filter={`url(#${id}glow)`} style={{ transition: 'opacity .8s .9s' }} /> : null}
        <defs><mask id={`${id}m${i}`} maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">{arc('#fff', front.w + 2, {})}</mask></defs>
      </>, 'top')}
    </div>; };
  return <div onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
    style={{ width: 176, height: 176, flex: 'none', position: 'relative', perspective: 700, touchAction: 'none', cursor: 'grab' }}>
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true"><defs>
      <filter id={id + 'glow'} x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="6" /></filter>
      <filter id={id + 'soft'} x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="5" /></filter>
    </defs></svg>
    <div ref={floor} style={{ position: 'absolute', left: 18, right: 18, bottom: -16, height: 22, borderRadius: '50%', background: `radial-gradient(closest-side, ${(list[0] && list[0].tone) || '#000'}66, transparent)`, filter: 'blur(5px)', pointerEvents: 'none' }} />
    <div style={{ position: 'absolute', inset: 0, animation: reduce ? 'none' : 'ringFloat 5s ease-in-out infinite', transformStyle: 'preserve-3d' }}>
      <div ref={puck} style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d', willChange: 'transform' }}>
        {list.map(tube)}
      </div>
    </div>
  </div>;
}
// lighten (amt > 0) or darken (amt < 0) a #rrggbb colour; anything else is returned as-is
function shade(h, amt) {
  const m = /^#([0-9a-f]{6})$/i.exec(String(h || '')); if (!m) return h;
  const n = parseInt(m[1], 16), t = amt < 0 ? 0 : 255, k = Math.abs(amt);
  return '#' + [n >> 16 & 255, n >> 8 & 255, n & 255].map(v => ('0' + Math.round(v + (t - v) * k).toString(16)).slice(-2)).join('');
}
window.RingsWidget = RingsWidget;

// ── Last night's sleep (Today) ──
// Saved under the date you woke up: st.sleepLog[date] = { bed: minutes, wake: minutes, q: 1-5 }.
const hhmmOf = m => pad2(Math.floor(m / 60) % 24) + ':' + pad2(m % 60);
const minOf = v => { const x = String(v || '').split(':'); return x.length === 2 ? (+x[0] % 24) * 60 + (+x[1] % 60) : null; };
const sleepDur = e => e && e.bed != null && e.wake != null ? (e.wake - e.bed + 1440) % 1440 : null;
const durText = m => Math.floor(m / 60) + 'h ' + pad2(m % 60) + 'm';
const QUAL = ['😫', '😕', '😐', '🙂', '😴'];
function SleepWidget({ app, st }) {
  const today = st && st.curDate, log = (st && st.sleepLog) || {}, e = today && log[today];
  const o = (st && st.setup) || {}, tBed = o.sleep != null ? o.sleep : 1350, tWake = o.wake != null ? o.wake : 390, target = (tWake - tBed + 1440) % 1440;
  const [edit, setEdit] = useState(false), [bed, setBed] = useState(hhmmOf(e ? e.bed : tBed)), [wake, setWake] = useState(hhmmOf(e ? e.wake : tWake)), [q, setQ] = useState(e ? e.q || 0 : 0);
  if (!app || !st) return null;
  const save = () => { const b = minOf(bed), w = minOf(wake); if (b == null || w == null) return; app.setState(s => ({ sleepLog: { ...(s.sleepLog || {}), [s.curDate]: { bed: b, wake: w, q: q || undefined } } })); setEdit(false); vib(10); };
  const nights = Array.from({ length: 7 }, (_, i) => { const d = addDaysIso(today, i - 6); return { d, m: sleepDur(log[d]) }; });
  const logged = nights.filter(n => n.m != null), avg = logged.length ? Math.round(logged.reduce((a, n) => a + n.m, 0) / logged.length) : null;
  const card = { background: C.card, border: '1px solid ' + C.line, borderRadius: 14, padding: 12 };
  const timeIn = (label, v, set) => <label style={{ flex: 1, minWidth: 0 }}><div style={{ ...T.label, marginBottom: 4 }}>{label}</div>
    <input type="time" value={v} onChange={ev => set(ev.target.value)} style={{ width: '100%', boxSizing: 'border-box', background: C.bg, border: '1px solid ' + C.line2, borderRadius: 10, color: C.text, font: `600 16px/1.2 ${F.body}`, padding: '9px 8px', outline: 'none' }} /></label>;
  if (!e || edit) {
    const b = minOf(bed), w = minOf(wake), dur = b != null && w != null ? (w - b + 1440) % 1440 : null;
    return <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><span style={{ ...T.label, color: C.blue }}>🌙 LAST NIGHT'S SLEEP</span><span style={T.label}>{dur != null ? durText(dur) : ''}</span></div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>{timeIn('WENT TO BED', bed, setBed)}{timeIn('WOKE UP', wake, setWake)}</div>
      <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center' }}><span style={{ ...T.label, marginRight: 2 }}>HOW WAS IT?</span>
        {QUAL.map((em, i) => <span key={i} role="button" onClick={() => setQ(q === i + 1 ? 0 : i + 1)} style={{ font: `400 20px/1 ${F.body}`, padding: '4px 3px', cursor: 'pointer', opacity: q && q !== i + 1 ? 0.35 : 1, transform: q === i + 1 ? 'scale(1.2)' : 'none', transition: 'transform .15s' }}>{em}</span>)}</div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        {e ? <Btn kind="ghost" tone={C.dim} onClick={() => setEdit(false)} style={{ flex: 1, minHeight: 42 }}>CANCEL</Btn> : null}
        <Btn tone={C.blue} ink={C.blueInk} onClick={save} style={{ flex: 2, minHeight: 42, fontSize: 15 }}>Save sleep</Btn>
      </div>
    </div>;
  }
  const dur = sleepDur(e), diff = dur - target, max = Math.max(target, ...logged.map(n => n.m)) * 1.1;
  return <div style={card} role="button" onClick={() => { setBed(hhmmOf(e.bed)); setWake(hhmmOf(e.wake)); setQ(e.q || 0); setEdit(true); }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><span style={{ ...T.label, color: C.blue }}>🌙 LAST NIGHT'S SLEEP</span><span style={{ ...T.label, color: C.blue }}>EDIT</span></div>
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginTop: 8 }}>
      <div style={{ flex: 1 }}>
        <div style={{ font: `700 26px/1 ${F.head}` }}>{durText(dur)} {e.q ? <span style={{ fontSize: 20 }}>{QUAL[e.q - 1]}</span> : null}</div>
        <div style={{ ...T.label, marginTop: 5 }}>{hhmmOf(e.bed)} → {hhmmOf(e.wake)} · <span style={{ color: Math.abs(diff) <= 20 ? C.olive : diff < 0 ? C.amber : C.dim }}>{diff === 0 ? 'ON TARGET' : (diff > 0 ? '+' : '−') + durText(Math.abs(diff)) + ' VS ' + durText(target)}</span></div>
        {avg != null ? <div style={{ ...T.label, marginTop: 3 }}>7-NIGHT AVERAGE {durText(avg)} · {logged.length}/7 LOGGED</div> : null}
      </div>
      <svg width="104" height="46" viewBox="0 0 104 46" style={{ flex: 'none' }}>
        <line x1="0" x2="104" y1={46 - 40 * target / max} y2={46 - 40 * target / max} stroke={C.dim} strokeDasharray="3 3" strokeWidth="1" />
        {nights.map((n, i) => { const h = n.m != null ? Math.max(3, 40 * n.m / max) : 3; return <rect key={i} x={i * 15 + 1} y={46 - h} width="11" height={h} rx="3" fill={n.m == null ? C.line2 : i === 6 ? C.blue : C.blue} opacity={n.m == null ? 1 : i === 6 ? 1 : 0.55} />; })}
      </svg>
    </div>
  </div>;
}
window.SleepWidget = SleepWidget;


// ── App colours: pick the core, secondary and accent colours (Habits & reminders) ──
const COLOR_PRESETS = [
  ['Default', null],
  ['Ocean', { core: '#3aa0ff', secondary: '#ffb347', accent: '#34d1bf' }],
  ['Sunset', { core: '#ff6b6b', secondary: '#ffd166', accent: '#f78c6b' }],
  ['Forest', { core: '#4caf7a', secondary: '#e9c46a', accent: '#8ecae6' }],
  ['Grape', { core: '#9b72ff', secondary: '#ff8fab', accent: '#7bdff2' }],
  ['Ember', { core: '#ff7a3d', secondary: '#ffcf5c', accent: '#c9e265' }],
  ['Mono', { core: '#c9ced8', secondary: '#9aa3b2', accent: '#7c8698' }]
];
// hex written as HX('...') so the light-theme build step leaves these exact colours alone
const HX = h => '#' + h;
const SWATCHES = ['4f8dff', '3aa0ff', '00d4ff', '22e3c4', '2ee86f', 'a8f25c', 'd7ff3a', 'ffe14d', 'ffc233', 'ff9f2e',
  'ff6b3d', 'ff5a5f', 'ff4f8b', 'ff6bd6', 'e05cff', 'b36bff', '8a6bff', '6b7dff', 'c9ced8', '8a93a6'].map(HX);
// hex ⇄ hue/saturation/lightness, for the "any other colour" sliders
const hexToHsl = h => { const n = parseInt(String(h).slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return { h: 0, s: 0, l: Math.round(l * 100) };
  const sat = d / (1 - Math.abs(2 * l - 1)), hue = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: Math.round(hue * 60), s: Math.round(sat * 100), l: Math.round(l * 100) }; };
const hslToHex = ({ h, s, l }) => { s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
  return '#' + [f(0), f(8), f(4)].map(v => ('0' + v.toString(16)).slice(-2)).join(''); };
// Any colour: hue, intensity and shade sliders + a hex box, and the phone's own picker as a real (tappable) input
function ColourMixer({ value, onChange, label }) {
  const [hsl, setHsl] = useState(() => hexToHsl(value)), [hex, setHex] = useState(value);
  useEffect(() => { if (hslToHex(hsl) !== value) { setHsl(hexToHsl(value)); } setHex(value); }, [value]);
  const put = next => { const v = { ...hsl, ...next }; setHsl(v); const h = hslToHex(v); setHex(h); onChange(h); };
  const slider = (k, max, bg, name) => <label style={{ display: 'block', marginTop: 10 }}>
    <div style={{ ...T.label, marginBottom: 6 }}>{name}</div>
    <input type="range" className="sh-range" min="0" max={max} value={hsl[k]} aria-label={label + ' ' + name} onChange={e => put({ [k]: +e.target.value })} style={{ background: bg }} />
  </label>;
  const typed = t => { setHex(t); const m = /^#?([0-9a-f]{6})$/i.exec(t.trim()); if (m) { const h = '#' + m[1].toLowerCase(); setHsl(hexToHsl(h)); onChange(h); } };
  return <div style={{ gridColumn: 'span 5', padding: '4px 0 2px' }}>
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: value, boxShadow: `0 0 16px ${value}88`, border: '2px solid rgba(255,255,255,.35)', flex: 'none' }} />
      <input value={hex} onChange={e => typed(e.target.value)} maxLength={7} spellCheck={false} autoCapitalize="characters" aria-label={label + ' hex code'}
        style={{ flex: 1, minWidth: 0, height: 44, boxSizing: 'border-box', borderRadius: 12, border: '1px solid ' + C.line2, color: C.text, padding: '0 12px', font: `600 16px/1 ${F.mono}`, letterSpacing: '.08em', outline: 'none' }} />
      <label style={{ position: 'relative', height: 44, padding: '0 12px', borderRadius: 12, border: '1px dashed ' + C.line2, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', ...T.mono, fontSize: 10, color: C.dim, flex: 'none', overflow: 'hidden' }}>
        <span style={{ width: 14, height: 14, borderRadius: 99, background: 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)' }} />PHONE
        <input type="color" value={value} onChange={e => typed(e.target.value)} aria-label={label + ' system colour picker'} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, border: 0, padding: 0, cursor: 'pointer' }} />
      </label>
    </div>
    {slider('h', 360, 'linear-gradient(90deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)', 'HUE')}
    {slider('s', 100, `linear-gradient(90deg,${hslToHex({ ...hsl, s: 0 })},${hslToHex({ ...hsl, s: 100 })})`, 'INTENSITY')}
    {slider('l', 100, `linear-gradient(90deg,#000,${hslToHex({ ...hsl, l: 50 })},#fff)`, 'SHADE')}
  </div>;
}
const readSets = () => { try { return JSON.parse(localStorage.getItem('sh.colorSets') || '[]') || []; } catch (e) { return []; } };
function CustomizeWidget() {
  let saved = null; try { saved = JSON.parse(localStorage.getItem('sh.colors') || 'null'); } catch (e) { /* ignore */ }
  const DEF = { core: HX('4f8dff'), secondary: HX('ffc233'), accent: HX('a8f25c') };
  const clean = v => ({ core: v.core, secondary: v.secondary, accent: v.accent });
  const [pick, setPick] = useState(saved ? clean(saved) : DEF), [open, setOpen] = useState(null);
  const [sets, setSets] = useState(readSets), [naming, setNaming] = useState(null);
  const [mixing, setMixing] = useState(null);
  const same = (x, y) => x && y && x.core === y.core && x.secondary === y.secondary && x.accent === y.accent;
  const changed = !same(pick, saved ? clean(saved) : DEF);
  const apply = p => { try { if (p) localStorage.setItem('sh.colors', JSON.stringify(p)); else localStorage.removeItem('sh.colors'); } catch (e) { /* ignore */ } location.reload(); };
  const keepSets = list => { setSets(list); try { localStorage.setItem('sh.colorSets', JSON.stringify(list)); } catch (e) { /* ignore */ } };
  const saveSet = () => { const name = (naming || '').trim().slice(0, 18); if (!name) return;
    keepSets(sets.filter(x => x.name.toLowerCase() !== name.toLowerCase()).concat({ name, ...pick })); setNaming(null); vib(10); };
  const ink = h => { const n = parseInt(h.slice(1), 16), l = (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255; return l > 0.6 ? HX('10131a') : HX('ffffff'); };
  const set = (k, v) => setPick(p => ({ ...p, [k]: v }));
  const row = (k, label, what) => { const on = open === k;
    return <div key={k} style={{ borderBottom: '1px solid ' + C.line }}>
      <div role="button" aria-expanded={on} onClick={() => { setOpen(on ? null : k); setMixing(null); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', cursor: 'pointer' }}>
        <div style={{ width: 34, height: 34, borderRadius: 999, background: pick[k], boxShadow: `0 0 16px ${pick[k]}88`, flex: 'none', border: '2px solid rgba(255,255,255,.35)' }} />
        <div style={{ flex: 1 }}><div style={T.name}>{label}</div><div style={{ ...T.label, marginTop: 2 }}>{what}</div></div>
        <span style={{ ...T.mono, fontSize: 12, color: C.dim }}>{pick[k].toUpperCase()}</span>
        <span style={{ color: C.dim, transition: 'transform .3s', transform: on ? 'rotate(180deg)' : 'none' }}>▾</span>
      </div>
      <div style={{ display: 'grid', gridTemplateRows: on ? '1fr' : '0fr', transition: 'grid-template-rows .32s cubic-bezier(.2,.9,.25,1)' }}><div style={{ overflow: 'hidden', minHeight: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, padding: '4px 2px 12px' }}>
          {SWATCHES.map(h => { const sel = pick[k] === h;
            return <div key={h} role="button" aria-label={label + ' ' + h} onClick={() => { set(k, h); vib(6); }} style={{ height: 40, borderRadius: 12, background: h, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: ink(h), font: `700 16px/1 ${F.mono}`,
              boxShadow: sel ? `0 0 0 2px ${C.solid}, 0 0 0 4px ${h}, 0 0 18px ${h}` : `0 0 10px -4px ${h}` }}>{sel ? '✓' : ''}</div>; })}
          {mixing === k
            ? <ColourMixer value={pick[k]} label={label} onChange={v => set(k, v)} />
            : <div role="button" onClick={() => setMixing(k)} style={{ gridColumn: 'span 5', height: 40, borderRadius: 12, border: '1px dashed ' + C.line2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', ...T.mono, fontSize: 11, color: C.dim }}>
              <span style={{ width: 14, height: 14, borderRadius: 99, background: 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)' }} />ANY OTHER COLOUR…</div>}
        </div>
      </div></div>
    </div>; };
  const chip = (name, v, del) => { const on = same(v, pick);
    return <div key={name} role="button" onClick={() => setPick(clean(v))} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: del ? '7px 4px 7px 10px' : '7px 10px', borderRadius: 999, border: '1px solid ' + (on ? C.text : C.line2), cursor: 'pointer' }}>
      <span style={{ display: 'flex' }}>{[v.core, v.secondary, v.accent].map((h, i) => <span key={i} style={{ width: 12, height: 12, borderRadius: 99, background: h, marginLeft: i ? -3 : 0, border: '1px solid ' + C.solid }} />)}</span>
      <span style={{ ...T.mono, fontSize: 10, color: on ? C.text : C.dim }}>{name.toUpperCase()}</span>
      {del ? <span role="button" aria-label={'Delete ' + name} onClick={e => { e.stopPropagation(); if (confirm('Delete “' + name + '”?')) keepSets(sets.filter(x => x.name !== name)); }} style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.faint, fontSize: 14 }}>×</span> : null}
    </div>; };
  return <div style={{ background: C.card, border: '1px solid ' + C.line, borderRadius: 14, padding: '6px 14px 14px' }}>
    {row('core', 'Core', 'BUTTONS, TODAY, WATER, TABS')}
    {row('secondary', 'Secondary', 'FOOD, HIGHLIGHTS, BANNERS')}
    {row('accent', 'Accent', 'TRAINING, MIND, SUCCESS')}
    <div style={{ ...T.label, margin: '12px 0 6px' }}>PRESETS</div>
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{COLOR_PRESETS.map(([name, p]) => chip(name, p || DEF, false))}</div>
    {sets.length ? <><div style={{ ...T.label, margin: '12px 0 6px' }}>MY SETUPS</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{sets.map(x => chip(x.name, x, true))}</div></> : null}
    {naming != null
      ? <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'flex-end' }}>
          <Field label="NAME THIS SETUP" value={naming} onChange={setNaming} placeholder="e.g. Night mode" autoFocus style={{ flex: 1 }} />
          <Btn kind="ghost" tone={C.dim} onClick={() => setNaming(null)} style={{ minHeight: 42, padding: '0 10px' }}>✕</Btn>
          <Btn tone={pick.core} ink={ink(pick.core)} disabled={!naming.trim()} onClick={saveSet} style={{ minHeight: 42, fontSize: 14 }}>SAVE</Btn>
        </div>
      : <div role="button" onClick={() => setNaming('')} style={{ marginTop: 12, padding: '11px 0', textAlign: 'center', borderRadius: 12, border: '1px dashed ' + C.line2, cursor: 'pointer', ...T.mono, fontSize: 11, color: C.dim }}>＋ SAVE THESE AS MY OWN SETUP</div>}
    <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
      {[['core', 'START'], ['secondary', '+ FOOD'], ['accent', 'FINISH']].map(([k, l]) => <div key={k} style={{ flex: 1, textAlign: 'center', padding: '10px 0', borderRadius: 12, background: pick[k], color: ink(pick[k]), boxShadow: `0 0 18px -4px ${pick[k]}`, font: `700 14px/1 ${F.head}`, letterSpacing: '.12em' }}>{l}</div>)}
    </div>
    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
      <Btn kind="ghost" tone={C.dim} onClick={() => apply(null)} style={{ flex: 1, minHeight: 42 }}>RESET</Btn>
      <Btn tone={pick.core} ink={ink(pick.core)} disabled={!changed} onClick={() => apply(same(pick, DEF) ? null : pick)} style={{ flex: 2, minHeight: 42, fontSize: 15 }}>{changed ? 'Apply colours' : 'Applied'}</Btn>
    </div>
    <div style={{ ...T.label, marginTop: 8, color: C.faint }}>WORKS IN BOTH LIGHT AND DARK · THE APP RELOADS TO APPLY</div>
  </div>;
}
window.CustomizeWidget = CustomizeWidget;

// ── Visual setup: three complete looks (style + colours + light/dark) in one tap, or just swap the style ──
// Saved in localStorage like the theme and colours: sh.style (neon|glass|matte, read by the head script in index.html).
const LOOKS = [
  { k: 'neon', name: 'Neon Night', what: 'GLOWING · DARK', style: 'neon', theme: 'dark', colors: null,
    show: { bg: HX('06070b'), card: 'rgba(255,255,255,.07)', dots: [HX('4f8dff'), HX('ffc233'), HX('a8f25c')], glow: true } },
  { k: 'glass', name: 'Soft Glass', what: 'FROSTED · LIGHT', style: 'glass', theme: 'light', colors: { core: HX('3aa0ff'), secondary: HX('ffb347'), accent: HX('34d1bf') },
    show: { bg: 'linear-gradient(160deg,' + HX('dfe9ff') + ',' + HX('f4f6fb') + ' 55%,' + HX('d9f5f0') + ')', card: 'rgba(255,255,255,.7)', dots: [HX('3aa0ff'), HX('ffb347'), HX('34d1bf')], glow: false } },
  { k: 'matte', name: 'Matte', what: 'SOLID · CALM · DARK', style: 'matte', theme: 'dark', colors: { core: HX('ff7a3d'), secondary: HX('ffcf5c'), accent: HX('c9e265') },
    show: { bg: HX('0e1015'), card: HX('1a1d24'), dots: [HX('ff7a3d'), HX('ffcf5c'), HX('c9e265')], glow: false } }
];
function LookWidget() {
  const get = (k, d) => { try { return localStorage.getItem(k) || d; } catch (e) { return d; } };
  const style = get('sh.style', 'neon'), theme = window.__themePref ? window.__themePref() : 'dark';
  let cols = null; try { cols = JSON.parse(get('sh.colors', 'null')); } catch (e) { /* ignore */ }
  const sameCols = (a, b) => (!a && !b) || (a && b && ['core', 'secondary', 'accent'].every(k => String(a[k]).toLowerCase() === String(b[k]).toLowerCase()));
  const active = LOOKS.find(L => L.style === style && L.theme === theme && sameCols(L.colors, cols));
  const reloadTo = th => {   // switch light/dark page if needed, otherwise just reload so the new look applies
    if (th && th !== window.__PAGE && window.__setTheme) window.__setTheme(th); else location.reload(); };
  const useLook = L => { vib(10);
    try { localStorage.setItem('sh.style', L.style); localStorage.setItem('sh.theme', L.theme);
      if (L.colors) localStorage.setItem('sh.colors', JSON.stringify(L.colors)); else localStorage.removeItem('sh.colors'); } catch (e) { /* ignore */ }
    reloadTo(L.theme); };
  const useStyle = k => { if (k === style) return; vib(6); try { localStorage.setItem('sh.style', k); } catch (e) { /* ignore */ } location.reload(); };
  return <div style={{ background: C.card, border: '1px solid ' + C.line, borderRadius: 14, padding: 12 }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {LOOKS.map(L => { const on = active === L, v = L.show;
        return <div key={L.k} role="button" aria-pressed={on} onClick={() => !on && useLook(L)} style={{ borderRadius: 12, padding: 4, cursor: 'pointer', border: '2px solid ' + (on ? v.dots[0] : 'transparent'), boxShadow: on ? `0 0 16px -4px ${v.dots[0]}` : 'none' }}>
          <div style={{ height: 78, borderRadius: 9, background: v.bg, position: 'relative', overflow: 'hidden', border: '1px solid rgba(127,127,127,.25)' }}>
            {v.glow ? <div style={{ position: 'absolute', width: 70, height: 70, left: -14, top: -20, borderRadius: 99, background: v.dots[0], filter: 'blur(22px)', opacity: 0.55 }} /> : null}
            <div style={{ position: 'absolute', left: 8, right: 8, bottom: 8, height: 30, borderRadius: 7, background: v.card, display: 'flex', alignItems: 'center', gap: 5, padding: '0 7px', boxShadow: v.glow ? 'none' : '0 4px 10px -6px rgba(0,0,0,.4)' }}>
              {v.dots.map((d, i) => <span key={i} style={{ width: 11, height: 11, borderRadius: 99, background: d, boxShadow: v.glow ? `0 0 8px ${d}` : 'none' }} />)}
            </div>
            <svg width="30" height="30" viewBox="0 0 30 30" style={{ position: 'absolute', right: 8, top: 7 }}>
              <circle cx="15" cy="15" r="11" fill="none" stroke={v.dots[0]} strokeOpacity=".22" strokeWidth="5" />
              <circle cx="15" cy="15" r="11" fill="none" stroke={v.dots[0]} strokeWidth="5" strokeLinecap="round" strokeDasharray="69" strokeDashoffset="22" transform="rotate(-90 15 15)" style={{ filter: v.glow ? `drop-shadow(0 0 3px ${v.dots[0]})` : 'none' }} />
            </svg>
          </div>
          <div style={{ font: `700 14px/1 ${F.head}`, letterSpacing: '.06em', textTransform: 'uppercase', color: C.text, marginTop: 7, textAlign: 'center' }}>{L.name}</div>
          <div style={{ ...T.label, fontSize: 8, marginTop: 3, textAlign: 'center', color: on ? C.text : C.faint }}>{on ? '✓ IN USE' : L.what}</div>
        </div>; })}
    </div>
    <div style={{ ...T.label, margin: '14px 0 6px' }}>STYLE ONLY · KEEPS YOUR COLOURS</div>
    <div style={{ display: 'flex', gap: 6 }}>
      {[['neon', 'NEON'], ['glass', 'GLASS'], ['matte', 'MATTE']].map(([k, l]) => <div key={k} role="button" aria-pressed={style === k} onClick={() => useStyle(k)}
        style={{ flex: 1, minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, cursor: 'pointer', ...T.mono, fontSize: 11,
          border: '1px solid ' + (style === k ? C.blue : C.line2), background: style === k ? C.blue : 'transparent', color: style === k ? C.blueInk : C.dim }}>{l}</div>)}
    </div>
    <div style={{ ...T.label, marginTop: 8, color: C.faint }}>A SETUP SETS STYLE, COLOURS AND LIGHT/DARK · TWEAK ANY OF THEM BELOW</div>
  </div>;
}
window.LookWidget = LookWidget;
