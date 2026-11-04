// Returns the latest committed version of a page, so the admin always edits what's in GitHub
// even if the most recent save is still deploying.
import { branch, gh, isAuthed, readable } from './_lib.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAuthed(req)) return res.status(401).json({ error: 'Please sign in.' });
  const path = String(req.query?.path || '');
  if (!readable(path)) return res.status(400).json({ error: 'That file cannot be edited.' });
  try {
    const r = await gh(`/contents/${path}?ref=${encodeURIComponent(branch())}`, { accept: 'application/vnd.github.raw+json' });
    res.status(200).json({ path, content: await r.text() });
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: 'Could not read from GitHub. Check GITHUB_TOKEN and GITHUB_REPO.' });
  }
}
