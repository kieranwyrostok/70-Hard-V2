// POST /api/coach  { messages: [{role, content}], context: {...}, code? }
//   -> { text, actions: [{ name, input }] }
// Calls Claude with the app's data as context. Claude can answer, and can ask the app to do things
// (log food, change targets, …) through the tools below; the app carries those out and shows Undo.
import { readBody } from '../lib/shared.mjs';

const MODEL = () => process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';

const SLOT = { type: 'string', description: 'The id of one of the user\'s meal sections from context.meal_sections (they can rename, add or remove sections)' };
const DAY = { type: 'string', enum: ['today', 'yesterday'], description: 'Which diary day. Default today.' };
export const TOOLS = [
  {
    name: 'log_saved_meal',
    description: 'Log one of the user\'s saved meals (from context.saved_meals) into the food diary. Use when the user refers to a saved meal by name, e.g. "usual breakfast".',
    input_schema: { type: 'object', properties: { meal_name: { type: 'string', description: 'Exact name from context.saved_meals' }, slot: SLOT, day: DAY }, required: ['meal_name'] }
  },
  {
    name: 'log_foods',
    description: 'Log foods into the diary. Prefer foods from context.my_foods / recent_foods and scale their values exactly; otherwise estimate realistic nutrition (USDA-style averages). Give per-item totals for the amount eaten.',
    input_schema: {
      type: 'object', required: ['items'], properties: {
        day: DAY,
        items: { type: 'array', items: { type: 'object', required: ['name', 'slot', 'kcal', 'protein_g', 'carbs_g', 'fat_g'], properties: {
          name: { type: 'string' }, slot: SLOT, amount: { type: 'string', description: 'e.g. "2 eggs", "150 g", "1 cup"' }, grams: { type: 'number' },
          kcal: { type: 'number' }, protein_g: { type: 'number' }, carbs_g: { type: 'number' }, fat_g: { type: 'number' } } } }
      }
    }
  },
  {
    name: 'set_targets',
    description: 'Change the daily nutrition targets. Only when the user asks for it or clearly agrees to your suggested change.',
    input_schema: { type: 'object', properties: { kcal: { type: 'number' }, protein_g: { type: 'number' }, carbs_g: { type: 'number' }, fat_g: { type: 'number' } } }
  },
  { name: 'set_water_goal', description: 'Change the daily water goal (ml). Only when asked.', input_schema: { type: 'object', required: ['ml'], properties: { ml: { type: 'number' } } } },
  { name: 'add_water', description: 'Log water drunk today (ml).', input_schema: { type: 'object', required: ['ml'], properties: { ml: { type: 'number' } } } },
  {
    name: 'complete_rule', description: 'Tick off one of today\'s challenge rules (context.today.rules) when the user says they did it.',
    input_schema: { type: 'object', required: ['rule_key'], properties: { rule_key: { type: 'string' } } }
  },
  {
    name: 'set_reminder', description: 'Change a rule\'s reminder time or turn it on/off.',
    input_schema: { type: 'object', required: ['rule_key'], properties: { rule_key: { type: 'string' }, time: { type: 'string', description: '24h HH:MM' }, on: { type: 'boolean' } } }
  },
  {
    name: 'save_meal', description: 'Save a named one-tap meal made of foods (for the user\'s saved meals list).',
    input_schema: { type: 'object', required: ['name', 'slot', 'items'], properties: { name: { type: 'string' }, slot: SLOT, items: { type: 'array', items: { type: 'object', required: ['name', 'kcal', 'protein_g', 'carbs_g', 'fat_g'], properties: {
      name: { type: 'string' }, amount: { type: 'string' }, grams: { type: 'number' }, kcal: { type: 'number' }, protein_g: { type: 'number' }, carbs_g: { type: 'number' }, fat_g: { type: 'number' } } } } } }
  }
];

export function systemPrompt(ctx) {
  return `You are Hercules, the AI coach inside "Seventy Hard", ${ctx && ctx.profile && ctx.profile.name ? ctx.profile.name + '\'s' : 'the user\'s'} 70-day habit challenge app (daily rules, food diary, training, body measurements).

Personality: you're a hyped, big-hearted gym bro — enthusiastic, encouraging, a little banter ("let's GO", "lock in", "that's a W", "light work"). Celebrate wins loudly, call out slacking with love, never mean or preachy. Keep the hype to the opening and closing line; the advice in between stays clear, exact and practical. One or two emoji at most. If you're asked your name, you're Hercules. Hype never overrides safety: with pain or injury you're the bro who says "rack it and get it checked".

How to help:
- Be brief and practical: short paragraphs or a few bullets, phone-sized. Use the user's units (${ctx && ctx.profile && ctx.profile.units === 'imperial' ? 'lb/in, but food in g is fine' : 'metric'}). Give exact numbers from the data, not vague ranges.
- Logging: when the user describes what they ate ("usual breakfast", "2 eggs and toast for lunch"), call a tool right away instead of asking, unless it's truly ambiguous. Match saved meals and the user's own foods first (scale their values exactly); otherwise estimate realistically. Pick the meal slot from the words or the current time (${ctx && ctx.now ? ctx.now : ''}). After logging, confirm in one line with the totals.
- Goals and "why" questions (e.g. not gaining weight, stalled lifts, missed days): look at the numbers in context — average intake vs target over the logged days, protein per kg, days with nothing logged, weight trend from the measurements, training frequency, rule misses — and give 2–4 specific, doable changes (foods to add or swap with amounts and calories, timing, habits). Say which numbers you're basing it on, and if logging is patchy, say that the data may undercount.
- Only change targets, water goal or reminders when the user asks or agrees. Never log anything the user didn't say they ate or did.
- Safety: no medical diagnoses; suggest a doctor or dietitian for medical issues, pain or injury. Don't suggest intakes below about 1,500 kcal (men) / 1,200 kcal (women), rapid loss over ~1% bodyweight per week, or extreme restriction. If the user shows signs of disordered eating, respond with care and don't give numbers.

App data (JSON, may be partial):
${JSON.stringify(ctx || {}).slice(0, 24000)}`;
}

export default async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return Response.json({ error: 'no_key', message: 'Hercules isn’t set up yet: add an ANTHROPIC_API_KEY environment variable in Netlify, then redeploy.' }, { status: 503 });
  let b;
  try { b = await readBody(req, 120000); } catch (e) { return Response.json({ error: 'bad body' }, { status: 400 }); }
  if (process.env.COACH_CODE && b.code !== process.env.COACH_CODE) return Response.json({ error: 'code', message: 'Enter your Hercules passcode.' }, { status: 401 });

  const msgs = (Array.isArray(b.messages) ? b.messages : []).slice(-16)
    .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '').slice(0, 4000) }))
    .filter(m => m.content.trim());
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  // merge consecutive same-role turns (the API wants them alternating)
  const turns = [];
  for (const m of msgs) { if (turns.length && turns[turns.length - 1].role === m.role) turns[turns.length - 1].content += '\n\n' + m.content; else turns.push({ ...m }); }
  if (!turns.length || turns[turns.length - 1].role !== 'user') return Response.json({ error: 'no question' }, { status: 400 });

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL(), max_tokens: 1200, system: systemPrompt(b.context), tools: TOOLS, messages: turns })
    });
    const j = await r.json();
    if (!r.ok) {
      const msg = (j && j.error && j.error.message) || ('Claude API error ' + r.status);
      return Response.json({ error: 'api', message: msg }, { status: 502 });
    }
    const text = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n').trim();
    const actions = (j.content || []).filter(c => c.type === 'tool_use').map(c => ({ name: c.name, input: c.input || {} }));
    return Response.json({ text, actions, usage: j.usage });
  } catch (e) {
    return Response.json({ error: 'network', message: 'Couldn’t reach Claude. Try again in a moment.' }, { status: 502 });
  }
};

export const config = { path: '/api/coach' };
