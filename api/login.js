import { configured, passwordMatches, setSession } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!configured()) return res.status(503).json({ error: 'Admin is not set up yet. Add ADMIN_PASSWORD, GITHUB_TOKEN and GITHUB_REPO in Vercel.' });
  if (!passwordMatches(req.body?.password)) {
    await new Promise(r => setTimeout(r, 800));   // slow down guessing
    return res.status(401).json({ error: 'Wrong password.' });
  }
  setSession(res);
  res.status(200).json({ ok: true });
}
