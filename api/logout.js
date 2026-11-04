import { clearSession } from './_lib.js';

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  clearSession(res);
  res.status(200).json({ ok: true });
}
