// GET /api/food-search?q=chicken%20thigh  ->  { foods: [...], sources: {...} }
// Searches three databases at once and merges them, Canadian sources first:
//   1. Health Canada's Canadian Nutrient File — generic foods with Canadian data and serving sizes
//   2. Open Food Facts, products sold in Canada — branded/packaged foods (Canadian brands and barcodes)
//   3. USDA FoodData Central — fills the gaps (huge generic + US branded list)
// One source being down or slow never blocks the others.
import { normUsda, normOff } from '../lib/food.mjs';
import { cnfSearch } from '../lib/cnf.mjs';

const USDA = 'https://api.nal.usda.gov/fdc/v1/foods/search';
const TYPES = ['Foundation', 'SR Legacy', 'Survey (FNDDS)', 'Branded'];

async function usdaSearch(q) {
  const key = String(process.env.USDA_API_KEY || '').trim() || 'DEMO_KEY';
  const r = await fetch(`${USDA}?query=${encodeURIComponent(q)}&pageSize=25&dataType=${TYPES.map(encodeURIComponent).join(',')}&api_key=${encodeURIComponent(key)}`,
    { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(7000) });
  if (!r.ok) {
    let code = ''; try { const e = await r.json(); code = (e.error && e.error.code) || ''; } catch (e) { /* not json */ }
    throw new Error(code === 'API_KEY_INVALID' || code === 'API_KEY_MISSING' ? 'USDA says the USDA_API_KEY in Netlify is invalid — re-paste it (no spaces)'
      : code === 'OVER_RATE_LIMIT' || r.status === 429 ? (key === 'DEMO_KEY' ? 'USDA demo key limit reached — no USDA_API_KEY set for this deploy' : 'USDA key hourly limit reached')
      : 'USDA error ' + r.status);
  }
  const j = await r.json();
  return (j.foods || []).map(normUsda).filter(Boolean);
}

async function offCanadaSearch(q) {
  const url = 'https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&json=1&page_size=24&lc=en'
    + '&tagtype_0=countries&tag_contains_0=contains&tag_0=canada&search_terms=' + encodeURIComponent(q)
    + '&fields=code,product_name,product_name_en,generic_name,brands,nutriments,serving_size,serving_quantity';
  const r = await fetch(url, { headers: { 'user-agent': 'SeventyHard/1.0 (personal habit tracker)', accept: 'application/json' }, signal: AbortSignal.timeout(7000) });
  if (!r.ok) throw new Error('Open Food Facts ' + r.status);
  const j = await r.json();
  return (j.products || []).map(p => { const f = normOff({ ...p, product_name: p.product_name_en || p.product_name }, p.code); return f && { ...f, source: 'Open Food Facts · Canada' }; })
    .filter(f => f && f.name && f.name !== 'Scanned product');
}

export default async (req) => {
  const q = (new URL(req.url).searchParams.get('q') || '').trim().slice(0, 80);
  if (q.length < 2) return Response.json({ foods: [] });
  const [cnf, off, usda] = await Promise.allSettled([cnfSearch(q), offCanadaSearch(q), usdaSearch(q)]);
  const val = x => x.status === 'fulfilled' ? x.value : [];
  const U = val(usda), usdaGeneric = U.filter(f => f.source === 'USDA'), usdaBranded = U.filter(f => f.source !== 'USDA');
  // Canadian generic → Canadian products → USDA generic → US branded, no duplicates
  const seen = new Set(), foods = [];
  for (const [list, max] of [[val(cnf), 6], [val(off), 8], [usdaGeneric, 5], [usdaBranded, 6]]) {
    let n = 0;
    for (const f of list) {
      const k = (f.name + '|' + f.brand).toLowerCase();
      if (seen.has(k) || n >= max) continue;
      seen.add(k); foods.push(f); n++;
    }
  }
  const sources = { canada: cnf.status === 'fulfilled', canadianProducts: off.status === 'fulfilled', usda: usda.status === 'fulfilled' };
  if (!foods.length && [cnf, off, usda].every(x => x.status === 'rejected')) {
    return Response.json({ foods: [], sources, error: usda.reason ? String(usda.reason.message || usda.reason) : 'Food databases unreachable' }, { status: 502 });
  }
  return Response.json({ foods: foods.slice(0, 25), sources }, { headers: { 'cache-control': 'public, max-age=86400' } });
};

export const config = { path: '/api/food-search' };
