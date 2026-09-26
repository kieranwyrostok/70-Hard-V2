// The reminder loop, separate from the scheduled function so it can be tested.
import { store, DEV_PREFIX, localNow, dueReminders, reminderPayload, sendPush } from './shared.mjs';

export async function runOnce(at = new Date(), siteUrl) {
  const s = store();
  const { blobs } = await s.list({ prefix: DEV_PREFIX });
  const report = { devices: blobs.length, sent: 0, removed: 0, errors: 0 };
  for (const { key } of blobs) {
    const dev = await s.get(key, { type: 'json' });
    if (!dev || !dev.sub) continue;
    const now = localNow(dev.tz, at);
    const due = dueReminders(dev, now);
    if (!due.length) continue;
    let gone = false;
    for (const r of due) {
      try {
        await sendPush(dev.sub, reminderPayload(r, dev, now), siteUrl);
        report.sent++;
      } catch (e) {
        if (e && (e.statusCode === 404 || e.statusCode === 410)) { gone = true; break; }
        report.errors++;
        console.error('push failed', key, r.id, e && (e.statusCode || e.message));
      }
      dev.lastSent = { ...(dev.lastSent || {}), [r.id]: now.date };
    }
    if (gone) { await s.delete(key); report.removed++; }
    else await s.setJSON(key, dev);
  }
  return report;
}

