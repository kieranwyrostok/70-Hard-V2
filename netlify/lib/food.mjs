// Normalises USDA FoodData Central and Open Food Facts records into one shape:
// { id, name, brand, source, per100: { kcal, p, c, f }, g, serv, upc }
const r1 = v => Math.round(v * 10) / 10;
const r2 = v => Math.round(v * 100) / 100; // per-100 g values keep 2 decimals

const SMALL = new Set(['a', 'an', 'and', 'or', 'of', 'with', 'in', 'on', 'to', 'for', 'the']);
export function tidyName(s) {
  s = String(s || '').trim().replace(/\s+/g, ' ');
  if (!s) return 'Food';
  const shouting = s === s.toUpperCase() && /[A-Z]/.test(s);
  if (!shouting) return s.charAt(0).toUpperCase() + s.slice(1);
  return s.toLowerCase().split(' ').map((w, i) => (i && SMALL.has(w)) ? w : w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function usdaNutrient(food, ids, nums) {
  for (const n of food.foodNutrients || []) {
    const id = n.nutrientId ?? (n.nutrient && n.nutrient.id);
    const num = String(n.nutrientNumber ?? (n.nutrient && n.nutrient.number) ?? '');
    const unit = String(n.unitName ?? (n.nutrient && n.nutrient.unitName) ?? '');
    if (!(ids.includes(id) || nums.includes(num))) continue;
    if (/kj/i.test(unit)) continue;
    const v = typeof n.value === 'number' ? n.value : typeof n.amount === 'number' ? n.amount : null;
    if (v != null) return v;
  }
  return null;
}

export function normUsda(f) {
  if (!f) return null;
  const p = usdaNutrient(f, [1003], ['203']);
  const fat = usdaNutrient(f, [1004], ['204']);
  const c = usdaNutrient(f, [1005], ['205']);
  let kcal = usdaNutrient(f, [1008], ['208']);
  if (kcal == null) kcal = usdaNutrient(f, [2047, 2048], ['957', '958']);
  if (p == null && fat == null && c == null) return null;
  if (kcal == null) kcal = 4 * (p || 0) + 4 * (c || 0) + 9 * (fat || 0);
  const unit = String(f.servingSizeUnit || '').toLowerCase();
  let g = 100, serv = '100 g';
  if (f.servingSize && ['g', 'grm', 'gm', 'ml', 'mlt'].includes(unit)) {
    g = r1(Number(f.servingSize));
    const house = String(f.householdServingFullText || '').trim();
    serv = house ? `${house} (${g} g)` : `${g} g`;
  }
  const branded = f.dataType === 'Branded';
  return {
    id: 'usda:' + f.fdcId,
    name: tidyName(f.description),
    brand: branded ? tidyName(f.brandName || f.brandOwner || '') : '',
    source: branded ? 'USDA branded' : 'USDA',
    per100: { kcal: r1(kcal), p: r2(p || 0), c: r2(c || 0), f: r2(fat || 0) },
    g, serv,
    upc: f.gtinUpc || undefined
  };
}

export function normOff(product, code) {
  if (!product) return null;
  const n = product.nutriments || {};
  const num = k => (typeof n[k] === 'number' ? n[k] : n[k] != null && n[k] !== '' && !isNaN(Number(n[k])) ? Number(n[k]) : null);
  const p = num('proteins_100g'), c = num('carbohydrates_100g'), fat = num('fat_100g');
  let kcal = num('energy-kcal_100g');
  if (kcal == null && num('energy_100g') != null) kcal = num('energy_100g') / 4.184;
  if (p == null && c == null && fat == null && kcal == null) return null;
  if (kcal == null) kcal = 4 * (p || 0) + 4 * (c || 0) + 9 * (fat || 0);
  const sq = Number(product.serving_quantity);
  const hasServing = sq > 0 && sq < 5000;
  const g = hasServing ? r1(sq) : 100;
  const label = String(product.serving_size || '').trim();
  return {
    id: 'off:' + code,
    name: tidyName(product.product_name || product.generic_name || 'Scanned product'),
    brand: tidyName(String(product.brands || '').split(',')[0] || ''),
    source: 'Open Food Facts',
    per100: { kcal: r1(kcal), p: r2(p || 0), c: r2(c || 0), f: r2(fat || 0) },
    g,
    serv: hasServing ? (label && !/^\d+(\.\d+)?\s*g$/i.test(label) ? `${label} (${g} g)` : `${g} g`) : '100 g',
    upc: code
  };
}

// Generic foods first (they're what you usually mean), then branded, both in USDA's relevance order.
export function rankFoods(list, limit = 12) {
  const seen = new Set();
  const uniq = list.filter(f => {
    const k = (f.name + '|' + f.brand).toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });
  const generic = uniq.filter(f => f.source === 'USDA');
  const branded = uniq.filter(f => f.source !== 'USDA');
  return generic.slice(0, 7).concat(branded).slice(0, limit);
}

export const sameUpc = (a, b) => String(a || '').replace(/^0+/, '') === String(b || '').replace(/^0+/, '') && !!a;
