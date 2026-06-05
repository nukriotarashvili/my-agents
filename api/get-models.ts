import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AVAILABLE_MODELS } from '../src/lib/ai-models';

function json(res: VercelResponse, status: number, body: unknown) {
  return res.status(status).json(body);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return json(res, 405, { success: false, error: 'Method not allowed' });
  }

  return json(res, 200, { success: true, models: AVAILABLE_MODELS });
}
