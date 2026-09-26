// GET /api/push-config  ->  { publicKey }
import { vapidKeys } from '../lib/shared.mjs';

export default async () => {
  const k = await vapidKeys();
  return Response.json({ publicKey: k.publicKey });
};

export const config = { path: '/api/push-config' };
