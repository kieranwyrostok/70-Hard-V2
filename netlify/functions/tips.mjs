// POST /api/tips  { ctx, code? }  ->  { items: [{ title, detail, area }], tokens: { in, out } }
// Once a day the app sends a small summary of the last 7 days and gets up to 3 short, specific suggestions back.
// Kept deliberately cheap: small summary in, short answer out, Haiku by default (~2,000 tokens per day).
import { readBody } from '../lib/shared.mjs';

const MODEL = () => process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
const TOOL = {
  name: 'give_tips',
  description: 'Give the user up to 3 short, specific suggestions for today based on their recent data.',
  input_schema: { type: 'object', required: ['items'], properties: { items: { type: 'array', maxItems: 3, items: { type: 'object', required: ['title', 'detail', 'area'], properties: {
    title: { type: 'string', description: 'At most 6 words, e.g. "Add 30 g protein at breakfast"' },
    detail: { type: 'string', description: 'One sentence, at most 25 words: what to do and the number from their data that shows why.' },
    area: { type: 'string', enum: ['food', 'training', 'habits', 'recovery'] }
  } } } } }
};
const SYSTEM = `You are Hercules, the hyped, big-hearted gym-bro coach in a 70-day habit challenge app, writing today's "suggestions" card. From the JSON summary of the user's last days, give up to 3 suggestions for today that are most likely to help them hit their own goal and targets. Rules:
- Voice: short, punchy, encouraging gym-bro energy ("lock in", "easy W", "let's get it") — but the substance stays exact and practical. No more than one emoji per item.
- Be specific and doable today; quote their real numbers (e.g. "protein averaged 118 g vs 160 g target"). No generic advice, no repeating what they already do well unless it's a streak worth keeping.
- If there is too little data, give fewer items (even 0) rather than guessing.
- If current_injuries is present: suggest training around them and keeping up the rehab, never pushing through pain.
- Safety: no medical diagnoses; point to a doctor for pain or injury. Never suggest eating below ~1,500 kcal (men) / 1,200 kcal (women), losing more than ~1% bodyweight per week, or extreme restriction. If the data suggests disordered eating, give one gentle, non-numeric suggestion to talk to someone they trust or a professional.`;

export default async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return Response.json({ error: 'no_key' }, { status: 503 });
  let b;
  try { b = await readBody(req, 30000); } catch (e) { return Response.json({ error: 'bad body' }, { status: 400 }); }
  if (process.env.COACH_CODE && b.code !== process.env.COACH_CODE) return Response.json({ error: 'code' }, { status: 401 });
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: AbortSignal.timeout(20000),
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL(), max_tokens: 500, system: SYSTEM, tools: [TOOL], tool_choice: { type: 'tool', name: 'give_tips' },
        messages: [{ role: 'user', content: JSON.stringify(b.ctx || {}).slice(0, 12000) }] })
    });
    const j = await r.json();
    if (!r.ok) return Response.json({ error: 'api', message: (j.error && j.error.message) || 'Claude API error ' + r.status }, { status: 502 });
    const use = (j.content || []).find(c => c.type === 'tool_use');
    const items = ((use && use.input && use.input.items) || []).slice(0, 3).map(i => ({
      title: String(i.title || '').slice(0, 60), detail: String(i.detail || '').slice(0, 220), area: ['food', 'training', 'habits', 'recovery'].includes(i.area) ? i.area : 'habits'
    })).filter(i => i.title);
    return Response.json({ items, tokens: { in: (j.usage && j.usage.input_tokens) || 0, out: (j.usage && j.usage.output_tokens) || 0 } });
  } catch (e) {
    return Response.json({ error: 'network' }, { status: 502 });
  }
};

export const config = { path: '/api/tips' };
