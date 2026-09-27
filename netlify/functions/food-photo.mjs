// POST /api/food-photo  { image: base64, media_type, hint?, code? }  or  { text: 'what I ate', hint? }  ->  { items: [...], note }
// (text = voice logging: the user said what they ate)
// Claude looks at a meal photo and estimates each food's portion and macros. The app shows the
// result as an editable list before anything is logged.
import { readBody } from '../lib/shared.mjs';

const MODEL = () => process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
const REPORT = {
  name: 'report_foods',
  description: 'Report every distinct food or drink in the photo (or that the user described) with the estimated portion and nutrition for that whole portion.',
  input_schema: {
    type: 'object', required: ['items'],
    properties: {
      items: { type: 'array', items: { type: 'object', required: ['name', 'grams', 'kcal', 'protein_g', 'carbs_g', 'fat_g'], properties: {
        name: { type: 'string', description: 'Short food name, e.g. "Grilled chicken breast"' },
        amount: { type: 'string', description: 'Household amount, e.g. "1 fillet", "1 cup", "2 slices"' },
        grams: { type: 'number', description: 'Estimated edible weight in grams (ml for drinks)' },
        kcal: { type: 'number' }, protein_g: { type: 'number' }, carbs_g: { type: 'number' }, fat_g: { type: 'number' },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] }
      } } },
      note: { type: 'string', description: 'One short line: assumptions made (e.g. cooking oil), or why nothing was found.' }
    }
  }
};

export default async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return Response.json({ error: 'no_key', message: 'Photo logging needs the ANTHROPIC_API_KEY environment variable in Netlify.' }, { status: 503 });
  let b;
  try { b = await readBody(req, 4500000); } catch (e) { return Response.json({ error: 'bad body', message: 'That photo is too large.' }, { status: 400 }); }
  if (process.env.COACH_CODE && b.code !== process.env.COACH_CODE) return Response.json({ error: 'code', message: 'Enter your coach passcode.' }, { status: 401 });
  const media = ['image/jpeg', 'image/png', 'image/webp'].includes(b.media_type) ? b.media_type : 'image/jpeg';
  const said = typeof b.text === 'string' ? b.text.trim().slice(0, 600) : '';
  if (!said && (typeof b.image !== 'string' || b.image.length < 100)) return Response.json({ error: 'bad image', message: 'No photo received.' }, { status: 400 });

  const hint = String(b.hint || '').slice(0, 300);
  const prompt = 'Identify each food and drink in this meal photo and estimate the portion actually shown (use plate/utensil/hand size for scale). '
    + 'Use realistic USDA-style values for the prepared food, and include visible oils, sauces, dressings or toppings as separate items when they add meaningful calories. '
    + 'Keep names short. If there is no food, return an empty list and say so in note.'
    + (hint ? '\nThe user adds: ' + hint : '');
  const spoken = 'The user said what they ate (speech-to-text, may have small transcription mistakes): "' + said + '"\n'
    + 'List each food and drink they mentioned with the amount they said (or a typical single portion if they gave none). '
    + 'Use realistic USDA/Canadian Nutrient File values for the food as prepared; brands or restaurant items at their published values when you know them. '
    + 'Keep names short. If nothing edible was mentioned, return an empty list and say so in note.' + (hint ? '\nThe user adds: ' + hint : '');
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL(), max_tokens: 1200, tools: [REPORT], tool_choice: { type: 'tool', name: 'report_foods' },
        messages: [{ role: 'user', content: said ? [{ type: 'text', text: spoken }] : [{ type: 'image', source: { type: 'base64', media_type: media, data: b.image } }, { type: 'text', text: prompt }] }]
      })
    });
    const j = await r.json();
    if (!r.ok) return Response.json({ error: 'api', message: (j && j.error && j.error.message) || ('Claude API error ' + r.status) }, { status: 502 });
    const use = (j.content || []).find(c => c.type === 'tool_use' && c.name === 'report_foods');
    const out = use ? use.input : { items: [] };
    const n = v => Math.max(0, Number(v) || 0);
    const items = (out.items || []).slice(0, 15).map(i => ({
      name: String(i.name || 'Food').slice(0, 80), amount: i.amount ? String(i.amount).slice(0, 40) : '', grams: Math.round(n(i.grams)),
      kcal: Math.round(n(i.kcal)), p: Math.round(n(i.protein_g) * 10) / 10, c: Math.round(n(i.carbs_g) * 10) / 10, f: Math.round(n(i.fat_g) * 10) / 10,
      confidence: i.confidence || 'medium'
    }));
    return Response.json({ items, note: out.note ? String(out.note).slice(0, 300) : '' });
  } catch (e) {
    return Response.json({ error: 'network', message: 'Couldn’t reach Claude. Try again.' }, { status: 502 });
  }
};

export const config = { path: '/api/food-photo' };
