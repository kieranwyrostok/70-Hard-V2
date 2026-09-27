// GET /api/food-search?q=chicken%20thigh  ->  { foods: [...] }
import { normUsda, rankFoods } from '../lib/food.mjs';

const USDA = 'https://api.nal.usda.gov/fdc/v1/foods/search';
const TYPES = ['Foundation', 'SR Legacy', 'Survey (FNDDS)', 'Branded'];

export default async (req) => {
  const q = (new URL(req.url).searchParams.get('q') || '').trim().slice(0, 80);
  if (q.length < 2) return Response.json({ foods: [] });
  const key = String(process.env.USDA_API_KEY || '').trim() || 'DEMO_KEY';
  const usingDemo = key === 'DEMO_KEY';
  const url = `${USDA}?query=${encodeURIComponent(q)}&pageSize=30&dataType=${TYPES.map(encodeURIComponent).join(',')}&api_key=${encodeURIComponent(key)}`;
  try {
    const r = await fetch(url, { headers: { accept: 'application/json' } });
    if (!r.ok) {
      let code = ''; try { const e = await r.json(); code = (e.error && e.error.code) || ''; } catch (e) { /* not json */ }
      const hint = code === 'API_KEY_INVALID' || code === 'API_KEY_MISSING' ? 'USDA says the USDA_API_KEY in Netlify is invalid — re-paste it (no spaces)'
        : code === 'API_KEY_DISABLED' || code === 'API_KEY_UNAUTHORIZED' ? 'USDA key is disabled — get a new one at api.data.gov/signup'
        : code === 'OVER_RATE_LIMIT' || r.status === 429 ? (usingDemo ? 'USDA demo key limit reached — no USDA_API_KEY set for this deploy' : 'USDA key hourly limit reached — try again later')
        : 'USDA error ' + r.status + (code ? ' (' + code + ')' : '');
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
