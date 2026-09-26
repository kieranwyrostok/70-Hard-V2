// GET /api/food-barcode?code=0123456789012  ->  { food: {...} | null }
// Looks the barcode up in Open Food Facts first, then USDA's branded foods.
import { normOff, normUsda, sameUpc } from '../lib/food.mjs';

export default async (req) => {
  const code = (new URL(req.url).searchParams.get('code') || '').replace(/\D/g, '');
  if (code.length < 6 || code.length > 14) return Response.json({ food: null, error: 'bad code' }, { status: 400 });

  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,generic_name,brands,nutriments,serving_size,serving_quantity`, {
      headers: { 'user-agent': 'SeventyHard/1.0 (personal habit tracker)', accept: 'application/json' }
    });
    if (r.ok) {
      const j = await r.json();
      if (j && (j.status === 1 || j.status === 'success') && j.product) {
        const food = normOff(j.product, code);
        if (food) return Response.json({ food }, { headers: { 'cache-control': 'public, max-age=604800' } });
      }
    }
  } catch (e) { /* fall through to USDA */ }

  try {
    const key = String(process.env.USDA_API_KEY || '').trim() || 'DEMO_KEY';
    const r = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?query=${code}&dataType=Branded&pageSize=5&api_key=${encodeURIComponent(key)}`);
    if (r.ok) {
      const j = await r.json();
      const hit = (j.foods || []).find(f => sameUpc(f.gtinUpc, code));
      const food = hit ? normUsda(hit) : null;
      if (food) return Response.json({ food }, { headers: { 'cache-control': 'public, max-age=604800' } });
    }
  } catch (e) { /* not found */ }

  return Response.json({ food: null });
};

export const config = { path: '/api/food-barcode' };
