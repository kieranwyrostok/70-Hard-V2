// Shared helpers for the Seventy Hard server functions.
import webpush from 'web-push';
import { getStore } from '@netlify/blobs';

export const store = () => getStore('seventy-hard-push');
export const DEV_PREFIX = 'dev:';
export const validId = id => typeof id === 'string' && /^[a-z0-9]{8,64}$/i.test(id);

export const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

// VAPID keys identify this server to Apple/Google push services. They are
// created automatically the first time and kept in Netlify Blobs, unless you
// set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY environment variables yourself.
export async function vapidKeys() {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  }
  const s = store();
  let k = await s.get('_vapid', { type: 'json' });
  if (!k || !k.publicKey || !k.privateKey) {
    k = webpush.generateVAPIDKeys();
    await s.setJSON('_vapid', k);
  }
  return k;
}

export async function sendPush(subscription, payload, siteUrl) {
  const k = await vapidKeys();
  const subject = process.env.VAPID_SUBJECT
    || (siteUrl && /^https:\/\//.test(siteUrl) ? siteUrl : 'mailto:seventy-hard@users.noreply.github.com');
  return webpush.sendNotification(subscription, JSON.stringify(payload), {
    vapidDetails: { subject, publicKey: k.publicKey, privateKey: k.privateKey },
    TTL: 60 * 60,
    urgency: 'high'
  });
}

// Wall-clock time in the phone's time zone.
export function localNow(tz, at = new Date()) {
  let parts;
  try {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short'
    }).formatToParts(at);
  } catch (e) {
    return localNow('UTC', at);
  }
  const g = t => (parts.find(p => p.type === t) || {}).value;
  const WD = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  return { date: `${g('year')}-${g('month')}-${g('day')}`, min: Number(g('hour')) * 60 + Number(g('minute')), wd: WD[g('weekday')] };
}

const LATE_WINDOW = 25; // minutes: a reminder still fires if the cron runs a little late

// Which reminders should fire right now for one phone.
export function dueReminders(dev, now) {
  const out = [];
  const sent = dev.lastSent || {};
  const doneToday = dev.done && dev.done.date === now.date ? new Set(dev.done.keys || []) : new Set();
  for (const r of dev.schedule || []) {
    if (!r || !r.on || !Array.isArray(r.days) || !r.days[now.wd]) continue;
    const lag = now.min - Number(r.t);
    if (!(lag >= 0 && lag <= LATE_WINDOW)) continue;
    if (sent[r.id] === now.date) continue;
    if (r.rule && doneToday.has(r.id)) continue; // already cleared today
    out.push(r);
  }
  return out;
}

const pad = n => String(n).padStart(2, '0');
export const hhmm = t => pad(Math.floor(t / 60) % 24) + ':' + pad(t % 60);

export function dayNumber(startDate, today) {
  if (!startDate) return null;
  const d = Math.round((new Date(today + 'T12:00:00Z') - new Date(startDate + 'T12:00:00Z')) / 864e5) + 1;
  return d >= 1 && d <= 70 ? d : null;
}

export function reminderPayload(r, dev, now) {
  const n = dayNumber(dev.startDate, now.date);
  // alarms (Habits & reminders → Alarms): 'al:<id>' at the set time, 'al:<id>:2' a nudge 5 min later unless stopped in the app
  if (String(r.id).startsWith('al:')) {
    const [, aid, again] = String(r.id).split(':');
    return { title: (again ? '⏰ Still in bed? ' : '⏰ ') + (r.name || 'Alarm'), body: again ? 'Your ' + hhmm(r.t - 5) + ' alarm · tap to stop it' : 'Alarm · ' + hhmm(r.t) + ' · tap to stop it',
      tag: 'alarm-' + aid, url: './?alarm=' + encodeURIComponent(aid) + '#s02', sticky: true };
  }
  if (r.id === 'weekly') return { title: 'Your weekly report is ready 📊', body: 'Workouts, PRs, food, water and rules from last week. Tap to see it.', tag: 'weekly', url: './?report=1#s02' };
  return {
    title: r.name || 'Seventy Hard',
    body: r.rule
      ? (n ? `Day ${n} · ` : '') + 'Not cleared yet — ' + hhmm(r.t)
      : 'Reminder · ' + hhmm(r.t),
    tag: 'rem-' + r.id,
    url: './#s02'
  };
}

export async function readBody(req, max = 20000) {
  const text = await req.text();
  if (text.length > max) throw new Error('too large');
  return JSON.parse(text || '{}');
}
