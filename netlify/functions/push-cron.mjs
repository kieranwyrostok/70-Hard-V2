// Runs every 5 minutes on Netlify and sends any reminder that is due.
import { runOnce } from '../lib/cron.mjs';

export default async (req, context) => {
  const report = await runOnce(new Date(), context && context.site && context.site.url);
  console.log('push-cron', JSON.stringify(report));
};

export const config = { schedule: '*/5 * * * *' };
