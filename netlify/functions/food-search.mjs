// GET /api/food-search?q=chicken%20thigh  ->  { foods: [...] }
import { normUsda, rankFoods } from '../lib/food.mjs';

const USDA = 'https://api.nal.usda.gov/fdc/v1/foods/search';
const TYPES = ['Foundation', 'SR Legacy', 'Survey (FNDDS)', 'Branded'];

export default async (req) => {
  const q = (new URL(req.url).searchParams.get('q') || '').trim().slice(0, 80);
  if (q.length < 2) return Response.json({ foods: [] });
  const key = process.env.USDA_API_KEY || 'DEMO_KEY';
  const url = `${USDA}?query=${encodeURIComponent(q)}&pageSize=30&dataType=${TYPES.map(encodeURIComponent).join(',')}&api_key=${encodeURIComponent(key)}`;
  try {
    const r = await fetch(url, { headers: { accept: 'application/json' } });
    if (!r.ok) {
      const hint = r.status === 429 || r.status === 403 ? 'USDA rate limit — add your own USDA_API_KEY in Netlify' : 'USDA error ' + r.status;
      return Response.json({ foods: [], error: hint }, { status: 502 });
    }
    const j = await r.json();
    const foods = rankFoods((j.foods || []).map(normUsda).filter(Boolean));
    return Response.json({ foods }, { headers: { 'cache-control': 'public, max-age=86400' } });
  } catch (e) {
    return Response.json({ foods: [], error: 'USDA unreachable' }, { status: 502 });
  }
};

export const config = { path: '/api/food-search' };
