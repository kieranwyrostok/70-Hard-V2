// Health Canada's Canadian Nutrient File (CNF): ~5,700 generic foods as eaten in Canada, with Canadian serving sizes.
// The API has no search, so the full food list is downloaded once, kept in Netlify Blobs, and searched here.
// Nutrients and servings for each food are fetched on demand and cached too.
import { getStore } from '@netlify/blobs';
import { tidyName } from './food.mjs';

const BASE = 'https://food-nutrient.canada.ca/api/canadian-nutrient-file/';
const store = () => getStore('seventy-hard-food');
const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;
const get = (url, ms = 6000) => fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(ms) }).then(r => { if (!r.ok) throw new Error('CNF ' + r.status); return r.json(); });

let LIST = null;   // kept in memory while the function stays warm
async function foodList() {
  if (LIST) return LIST;
  const s = store();
  try {
    const cached = await s.get('cnf-foods-en', { type: 'json' });
    if (cached && cached.foods && Date.now() - cached.at < 30 * 864e5) return (LIST = cached.foods);
  } catch (e) { /* no cache yet */ }
  const all = await get(BASE + 'food/?lang=en&type=json', 9000);
  const foods = (Array.isArray(all) ? all : []).map(f => [f.food_code, String(f.food_description || '')]).filter(f => f[0] && f[1]);
  if (foods.length) { LIST = foods; s.setJSON('cnf-foods-en', { at: Date.now(), foods }).catch(() => {}); }
  return foods;
}

// "chicken thighs" → every word must appear at the start of a word in the description; earlier + shorter wins.
const stem = w => w.replace(/(ies)$/, 'y').replace(/(es|s)$/, '');
function score(desc, words) {
  const d = desc.toLowerCase(), toks = d.split(/[^a-z0-9%]+/).filter(Boolean), head = d.split(',')[0];
  let sc = 0;
  for (const w of words) {
    const i = toks.findIndex(t => t.startsWith(w) || stem(t) === w);
    if (i < 0) return -1;
    sc += 10 - Math.min(i, 9) + (head.includes(w) ? 8 : 0);
  }
  if (/\braw\b/.test(d)) sc += 1;
  return sc - d.length / 40;
}

async function details(code) {
  const s = store(), key = 'cnf-n-' + code;
  try { const c = await s.get(key, { type: 'json' }); if (c) return c; } catch (e) { /* not cached */ }
  const [amounts, servings] = await Promise.all([
    get(`${BASE}nutrientamount/?id=${code}&lang=en&type=json`),
    get(`${BASE}servingsize/?id=${code}&lang=en&type=json`).catch(() => [])
  ]);
  const pick = (ids, rx, unitRx) => {
    for (const n of amounts || []) {
      const name = String(n.nutrient_web_name || ''), unit = String(n.unit || '');
      if ((ids.includes(Number(n.nutrient_name_id)) || rx.test(name)) && (!unitRx || unitRx.test(unit) || ids.includes(Number(n.nutrient_name_id)))) {
        const v = Number(n.nutrient_value); if (!isNaN(v)) return v;
      }
    }
    return null;
  };
  const kcal = pick([208], /^energy/i, /kcal/i), p = pick([203], /^protein/i), fat = pick([204], /^(total )?fat|fat.*total/i), c = pick([205], /^carbohydrate/i);
  const serv = (Array.isArray(servings) ? servings : []).map(x => ({ g: r1(Number(x.conversion_factor_value) * 100), name: String(x.measure_name || '').trim() }))
    .find(x => x.g > 0 && x.name && !/^100\s*(g|ml)$/i.test(x.name));
  const out = { kcal, p, c, f: fat, serv };
  if (kcal != null || p != null) s.setJSON(key, out).catch(() => {});
  return out;
}

export async function cnfSearch(q, limit = 6) {
  const words = q.toLowerCase().split(/[^a-z0-9%]+/).filter(w => w.length > 1).map(stem);
  if (!words.length) return [];
  const list = await foodList();
  const hits = list.map(([code, desc]) => ({ code, desc, sc: score(desc, words) })).filter(x => x.sc >= 0).sort((a, b) => b.sc - a.sc).slice(0, limit);
  const rows = await Promise.all(hits.map(h => details(h.code).then(d => ({ h, d })).catch(() => null)));
  return rows.filter(x => x && (x.d.kcal != null || x.d.p != null)).map(({ h, d }) => {
    const kcal = d.kcal != null ? d.kcal : 4 * (d.p || 0) + 4 * (d.c || 0) + 9 * (d.f || 0);
    const g = d.serv ? d.serv.g : 100;
    return {
      id: 'cnf:' + h.code, name: tidyName(h.desc), brand: '', source: 'Health Canada',
      per100: { kcal: r1(kcal), p: r2(d.p || 0), c: r2(d.c || 0), f: r2(d.f || 0) },
      g, serv: d.serv ? `${d.serv.name} (${g} g)` : '100 g'
    };
  });
}
