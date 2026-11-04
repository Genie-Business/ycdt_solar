// Commits edited files to GitHub. Vercel then redeploys the site automatically.
import { commitFiles, isAuthed, writable } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAuthed(req)) return res.status(401).json({ error: 'Your session has ended. Please sign in again.' });
  const { files, message } = req.body || {};
  if (!Array.isArray(files) || !files.length || files.length > 20) return res.status(400).json({ error: 'Nothing to save.' });
  for (const f of files) {
    if (typeof f?.path !== 'string' || typeof f?.content !== 'string' || !writable(f.path)) {
      return res.status(400).json({ error: `Not allowed: ${f?.path}` });
    }
  }
  try {
    const clean = String(message || 'Website edit').replace(/[\r\n]+/g, ' ').slice(0, 120);
    const sha = await commitFiles(files, `Admin: ${clean}`);
    res.status(200).json({ ok: true, sha });
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: e.status === 409 || e.status === 422 ? 'Someone else just saved. Please try again.' : 'Could not save to GitHub. Check GITHUB_TOKEN permissions.' });
  }
}
