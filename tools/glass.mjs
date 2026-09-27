// "Liquid glass" look, applied at build time (after the light-theme swap) so src/ keeps its plain colours.
//  1. Solid surfaces inside the app become see-through glass: page backgrounds turn transparent, cards and
//     fields become translucent tints, lines become soft light hairlines. Only `background:` and border colours
//     are touched, so text colours never change.
//  2. GLASS_CSS adds the moving colour glow behind the app (#aurora), frosted tab bar, card highlights,
//     screen/sheet entrance animations and the press effect. Neon glows for the accent colours are added at
//     runtime by the head script in src/index.html (they follow the custom colours).
// ui.jsx does the same for the React screens' colour tokens (C.bg, C.card, C.line …).

const SURF = {
  dark: {
    bg: {
      '#15181d': 'transparent', '#111419': 'rgba(9,11,18,.5)', '#171a20': 'rgba(255,255,255,.035)',
      '#1a1e24': 'rgba(255,255,255,.05)', '#1b1f26': 'rgba(255,255,255,.055)', '#1c2029': 'rgba(255,255,255,.05)',
      '#1e232a': 'rgba(255,255,255,.06)', '#20252c': 'rgba(255,255,255,.07)', '#272c34': 'rgba(255,255,255,.08)',
      '#282d36': 'rgba(255,255,255,.09)', '#2b3039': 'rgba(255,255,255,.1)'
    },
    line: { '#2b3039': 'rgba(255,255,255,.09)', '#272c34': 'rgba(255,255,255,.08)', '#30363f': 'rgba(255,255,255,.12)', '#353b45': 'rgba(255,255,255,.14)', '#3d4450': 'rgba(255,255,255,.17)' }
  },
  light: {
    bg: {
      '#f3f4f7': 'transparent', '#ffffff': 'rgba(255,255,255,.62)', '#eceef2': 'rgba(255,255,255,.42)',
      '#eef0f4': 'rgba(255,255,255,.5)', '#f0f2f6': 'rgba(255,255,255,.55)', '#e7eaef': 'rgba(255,255,255,.6)',
      '#eceff3': 'rgba(255,255,255,.72)', '#e1e5eb': 'rgba(30,45,90,.07)'
    },
    line: { '#e1e5eb': 'rgba(30,45,90,.1)', '#e7eaef': 'rgba(30,45,90,.08)', '#d8dde4': 'rgba(30,45,90,.13)', '#cdd3dc': 'rgba(30,45,90,.15)', '#c4cbd6': 'rgba(30,45,90,.18)' }
  }
};

const BG_RX = /(background(?:-color)?\s*:\s*'?)(#[0-9a-fA-F]{6})(?![0-9a-fA-F])/g;
const GRAD_RX = /background:\s*linear-gradient\([^;"']*?\)(?=[;"'])/g;   // header fades
const PROP_RX = /\b(\w*(?:bg|Bg|border|Border|lineTop|lineBottom))\s*:\s*([^,}\n]*)/g;
const LINE_RX = /(border(?:-top|-bottom|-left|-right)?\s*:\s*'?[0-9.]+px (?:solid|dashed) )(#[0-9a-fA-F]{6})(?![0-9a-fA-F])/g;
export function glassify(text, theme) {
  const S = SURF[theme];
  return text.replace(GRAD_RX, m => m.replace(/#[0-9a-fA-F]{6}(?![0-9a-fA-F])/g, h => S.bg[h.toLowerCase()] || h))
    .replace(BG_RX, (m, a, h) => S.bg[h.toLowerCase()] ? a + S.bg[h.toLowerCase()] : m)
    .replace(LINE_RX, (m, a, h) => S.line[h.toLowerCase()] ? a + S.line[h.toLowerCase()] : m)
    // colours picked in code, e.g. { bg: on ? '#171a20' : '#1e232a', border: '#2b3039' }
    .replace(PROP_RX, (m, k, v) => { const M = /bg$/i.test(k) ? S.bg : S.line;
      return k + ': ' + v.replace(/'(#[0-9a-fA-F]{6})'/g, (q, h) => M[h.toLowerCase()] ? "'" + M[h.toLowerCase()] + "'" : q); });
}
// the page: only the app markup (<x-dc>…</x-dc>), never the <style> for html/body
export function glassPage(html, theme) {
  const a = html.indexOf('<x-dc>'), b = html.indexOf('</x-dc>');
  if (a < 0 || b < 0) return html;
  return html.slice(0, a) + glassify(html.slice(a, b), theme) + html.slice(b);
}

// both spellings of a colour in a style attribute: as written in the page, and as the browser writes React's
const both = v => { const m = v.match(/rgba\((\d+),(\d+),(\d+),([.\d]+)\)/); const a = m[4].startsWith('.') ? '0' + m[4] : m[4];
  return [`[style*="${v}"]`, `[style*="rgba(${m[1]}, ${m[2]}, ${m[3]}, ${a})"]`]; };

export function glassCss(theme) {
  const L = theme === 'light';
  const cards = ['rgba(255,255,255,.055)', 'rgba(255,255,255,.06)', 'rgba(255,255,255,.62)'].flatMap(both).map(s => '.app-frame ' + s + ',body>' + s).join(',');
  const tints = (L ? ['rgba(255,255,255,.42)', 'rgba(255,255,255,.5)', 'rgba(255,255,255,.55)', 'rgba(255,255,255,.72)']
    : ['rgba(255,255,255,.035)', 'rgba(255,255,255,.05)', 'rgba(255,255,255,.07)', 'rgba(255,255,255,.09)']).flatMap(both).join(',');
  return `
/* ── liquid glass (tools/glass.mjs) ── */
html,body{background:${L ? '#e9edf6' : '#06070b'}}
#aurora{position:fixed;inset:-20%;z-index:0;pointer-events:none;overflow:hidden;background:${L
    ? 'radial-gradient(120% 80% at 50% 0%,#f7f9ff 0%,#e9edf6 60%)' : 'radial-gradient(120% 80% at 50% 0%,#10131d 0%,#06070b 65%)'}}
#aurora i{position:absolute;width:62vmax;height:62vmax;border-radius:50%;filter:blur(${L ? 70 : 80}px);opacity:${L ? .45 : .34};will-change:transform}
#aurora i:nth-child(1){background:var(--n1);left:-8%;top:2%;animation:aur1 26s ease-in-out infinite alternate}
#aurora i:nth-child(2){background:var(--n${L ? 2 : 1});${L ? '' : 'filter:blur(80px) hue-rotate(75deg);'}right:-12%;top:34%;opacity:${L ? .2 : .26};animation:aur2 32s ease-in-out infinite alternate}
#aurora i:nth-child(3){background:var(--n3);left:10%;bottom:-6%;opacity:${L ? .22 : .13};animation:aur3 29s ease-in-out infinite alternate}
/* tiny twinkling specks in the background glow */
#aurora b{position:absolute;width:3px;height:3px;border-radius:50%;background:${L ? 'var(--n1)' : '#fff'};box-shadow:0 0 7px 1px var(--n1);opacity:0;animation:twinkle 5s ease-in-out infinite}
#aurora b:nth-of-type(1){left:42%;top:80%;animation-delay:-0.9s;animation-duration:5.8s}#aurora b:nth-of-type(2){left:26%;top:72%;animation-delay:-3.2s;animation-duration:4.8s}#aurora b:nth-of-type(3){left:25%;top:78%;animation-delay:-3.0s;animation-duration:3.6s}#aurora b:nth-of-type(4){left:49%;top:46%;animation-delay:-0.4s;animation-duration:3.8s}#aurora b:nth-of-type(5){left:49%;top:23%;animation-delay:-5.0s;animation-duration:3.9s}#aurora b:nth-of-type(6){left:36%;top:60%;animation-delay:-3.8s;animation-duration:6.8s}#aurora b:nth-of-type(7){left:58%;top:57%;animation-delay:-2.4s;animation-duration:6.9s}#aurora b:nth-of-type(8){left:24%;top:55%;animation-delay:-5.2s;animation-duration:4.5s}#aurora b:nth-of-type(9){left:31%;top:54%;animation-delay:-0.7s;animation-duration:4.6s}#aurora b:nth-of-type(10){left:74%;top:63%;animation-delay:-1.1s;animation-duration:5.5s}#aurora b:nth-of-type(11){left:62%;top:32%;animation-delay:-2.2s;animation-duration:5.4s}#aurora b:nth-of-type(12){left:26%;top:56%;animation-delay:-0.4s;animation-duration:4.2s}
@keyframes twinkle{0%,100%{opacity:0;transform:scale(.4)}50%{opacity:${L ? .55 : .8};transform:scale(1)}}
/* a short neon dash after each section title */
[style*="letter-spacing:.16em;text-transform:uppercase"]::after,[style*="letter-spacing: 0.16em; text-transform: uppercase"]::after{content:"";display:inline-block;width:16px;height:3px;margin-left:10px;vertical-align:middle;border-radius:3px;background:linear-gradient(90deg,var(--n1),var(--n3));box-shadow:0 0 8px var(--n1)}
@keyframes aur1{to{transform:translate3d(28vw,22vh,0) scale(1.15)}}
@keyframes aur2{to{transform:translate3d(-30vw,-18vh,0) scale(.85)}}
@keyframes aur3{to{transform:translate3d(18vw,-26vh,0) scale(1.2)}}
.screen{z-index:1}
#boot{background:transparent!important}
/* behind the iPhone clock / Dynamic Island: iOS draws the time and battery in white there, so this strip is a deep
   version of your core colour (→ a violet shift) that keeps them readable, fading softly into the app below */
@media (display-mode: standalone){body::before{content:"";position:fixed;z-index:98;top:0;left:0;right:0;pointer-events:none;
  height:env(safe-area-inset-top, 0px);
  background:linear-gradient(100deg,var(--sb1,#1b2130),var(--sb2,#1b2130));${L ? '' : 'filter:brightness(.8);'}
  -webkit-mask-image:linear-gradient(#000 calc(100% - 12px),transparent);mask-image:linear-gradient(#000 calc(100% - 12px),transparent)}}
/* frosted tab bar */
.tabbar{position:relative;background:${L ? 'rgba(255,255,255,.55)' : 'rgba(12,14,22,.5)'}!important;-webkit-backdrop-filter:blur(26px) saturate(180%);backdrop-filter:blur(26px) saturate(180%);border-top:1px solid ${L ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.08)'}!important;box-shadow:0 -10px 30px -18px ${L ? 'rgba(30,45,90,.35)' : 'rgba(0,0,0,.8)'}}
/* glass cards: a bright top edge (the "specular" highlight) and a soft drop */
${cards}{box-shadow:inset 0 1px 0 ${L ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.09)'},0 10px 30px -16px ${L ? 'rgba(30,45,90,.28)' : 'rgba(0,0,0,.7)'}}
${tints}{box-shadow:inset 0 1px 0 ${L ? 'rgba(255,255,255,.8)' : 'rgba(255,255,255,.05)'}}
input::placeholder,textarea::placeholder{color:${L ? 'rgba(30,45,90,.3)' : 'rgba(255,255,255,.26)'};opacity:1}
input,textarea,select{background-color:${L ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.06)'}}
/* motion */
@keyframes scrIn{from{opacity:0;transform:translate3d(0,14px,0) scale(.985)}to{opacity:1;transform:none}}
@keyframes shIn{from{opacity:0;transform:translate3d(28px,0,0)}to{opacity:1;transform:none}}
@keyframes asUp{from{transform:translate3d(0,40px,0);opacity:0}to{transform:none;opacity:1}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes ringBob{0%,100%{transform:translate3d(0,-2.5px,0) rotate(-1.5deg)}50%{transform:translate3d(0,2.5px,0) rotate(1.5deg)}}
@keyframes ringFloat{0%,100%{transform:translate3d(0,-3px,0)}50%{transform:translate3d(0,3px,0)}}
.screen [style*="overflow:auto"]{animation:scrIn .42s cubic-bezier(.2,.9,.25,1) backwards}
.screen [style*="overflow:auto"]>*>*{animation:scrIn .5s cubic-bezier(.2,.9,.25,1) backwards}
.screen [style*="overflow:auto"]>*>*:nth-child(2){animation-delay:.04s}.screen [style*="overflow:auto"]>*>*:nth-child(3){animation-delay:.08s}
.screen [style*="overflow:auto"]>*>*:nth-child(4){animation-delay:.12s}.screen [style*="overflow:auto"]>*>*:nth-child(5){animation-delay:.16s}
.screen [style*="overflow:auto"]>*>*:nth-child(n+6){animation-delay:.2s}
[role=button],.app-frame [style*="cursor:pointer"],.app-frame [style*="cursor: pointer"]{transition:transform .22s cubic-bezier(.2,.9,.25,1),filter .22s}
[role=button]:active,.app-frame [style*="cursor:pointer"]:active,.app-frame [style*="cursor: pointer"]:active{transform:scale(.965);filter:brightness(1.12);transition-duration:.06s}
@media (prefers-reduced-motion: reduce){#aurora b{display:none}#aurora i,.screen [style*="overflow:auto"],.screen [style*="overflow:auto"]>*>*{animation:none!important}}
`;
}
export const AURORA = '<div id="aurora" aria-hidden="true"><i></i><i></i><i></i>' + '<b></b>'.repeat(12) + '</div>';
