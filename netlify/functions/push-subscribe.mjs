// POST /api/push-subscribe
// Body: { id, sub?, tz, startDate, schedule: [{id,name,on,t,days,rule}], done: {date, keys}, remove? }
// Saves (or updates) one phone's push subscription and reminder schedule.
import { store, DEV_PREFIX, validId, readBody } from '../lib/shared.mjs';

const clean = s => ({
  id: String(s.id || '').slice(0, 40),
  name: String(s.name || '').slice(0, 60),
  on: !!s.on,
  t: Math.max(0, Math.min(1439, Math.round(Number(s.t) || 0))),
  days: Array.isArray(s.days) ? s.days.slice(0, 7).map(d => (d ? 1 : 0)) : [1, 1, 1, 1, 1, 1, 1],
  rule: !!s.rule
});

export default async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 });
  let b;
  try { b = await readBody(req); } catch (e) { return Response.json({ error: 'bad body' }, { status: 400 }); }
  if (!validId(b.id)) return Response.json({ error: 'bad id' }, { status: 400 });

  const s = store();
  const key = DEV_PREFIX + b.id;
  if (b.remove) { await s.delete(key); return Response.json({ ok: true, removed: true }); }

  const old = (await s.get(key, { type: 'json' })) || null;
  const sub = b.sub && b.sub.endpoint && b.sub.keys ? { endpoint: String(b.sub.endpoint), keys: { p256dh: String(b.sub.keys.p256dh), auth: String(b.sub.keys.auth) } } : old && old.sub;
  if (!sub) return Response.json({ error: 'no subscription — turn notifications on first' }, { status: 409 });

  const dev = {
    sub,
    tz: typeof b.tz === 'string' ? b.tz.slice(0, 64) : (old && old.tz) || 'UTC',
    startDate: /^\d{4}-\d{2}-\d{2}$/.test(b.startDate || '') ? b.startDate : null,
    schedule: Array.isArray(b.schedule) ? b.schedule.slice(0, 40).map(clean) : (old && old.schedule) || [],
    done: b.done && /^\d{4}-\d{2}-\d{2}$/.test(b.done.date || '') ? { date: b.done.date, keys: (b.done.keys || []).slice(0, 40).map(String) } : (old && old.done) || null,
    lastSent: (old && old.lastSent) || {},
    updated: new Date().toISOString()
  };
  await s.setJSON(key, dev);
  return Response.json({ ok: true });
};

export const config = { path: '/api/push-subscribe' };
