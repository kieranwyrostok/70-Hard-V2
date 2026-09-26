// POST /api/push-test  { id }  ->  sends a notification right now
import { store, DEV_PREFIX, validId, sendPush, readBody } from '../lib/shared.mjs';

export default async (req, context) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 });
  let b;
  try { b = await readBody(req, 2000); } catch (e) { return Response.json({ error: 'bad body' }, { status: 400 }); }
  if (!validId(b.id)) return Response.json({ error: 'bad id' }, { status: 400 });
  const s = store();
  const dev = await s.get(DEV_PREFIX + b.id, { type: 'json' });
  if (!dev || !dev.sub) return Response.json({ error: 'not subscribed' }, { status: 404 });
  try {
    await sendPush(dev.sub, { title: 'Seventy Hard', body: 'Notifications are working. Reminders will arrive at their set times.', tag: 'test', url: './#s10' }, context && context.site && context.site.url);
    return Response.json({ ok: true });
  } catch (e) {
    if (e && (e.statusCode === 404 || e.statusCode === 410)) await s.delete(DEV_PREFIX + b.id);
    return Response.json({ error: 'push failed: ' + (e && (e.statusCode || e.message)) }, { status: 502 });
  }
};

export const config = { path: '/api/push-test' };
