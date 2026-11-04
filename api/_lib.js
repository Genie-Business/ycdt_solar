// Shared helpers for the admin API. Files starting with "_" are not exposed as routes on Vercel.
import crypto from 'node:crypto';

const COOKIE = 'ycdt_admin';
const SESSION_HOURS = 12;

export const repo = () => process.env.GITHUB_REPO || '';
export const branch = () => process.env.GITHUB_BRANCH || 'main';
const apiBase = () => process.env.GITHUB_API_URL || 'https://api.github.com';

export function configured() {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.GITHUB_TOKEN && process.env.GITHUB_REPO);
}

function secret() {
  return process.env.ADMIN_SECRET || crypto.createHash('sha256').update(`${process.env.ADMIN_PASSWORD}|${process.env.GITHUB_TOKEN}`).digest('hex');
}
const sign = payload => crypto.createHmac('sha256', secret()).update(payload).digest('base64url');

export function passwordMatches(input) {
  const a = crypto.createHash('sha256').update(String(input ?? '')).digest();
  const b = crypto.createHash('sha256').update(String(process.env.ADMIN_PASSWORD ?? '')).digest();
  return crypto.timingSafeEqual(a, b);
}

export function setSession(res) {
  const exp = Date.now() + SESSION_HOURS * 3600e3;
  const payload = String(exp);
  const secure = process.env.ALLOW_INSECURE_COOKIE ? '' : ' Secure;';
  res.setHeader('Set-Cookie', `${COOKIE}=${payload}.${sign(payload)}; Path=/; HttpOnly;${secure} SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}`);
}
export function clearSession(res) {
  const secure = process.env.ALLOW_INSECURE_COOKIE ? '' : ' Secure;';
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly;${secure} SameSite=Strict; Max-Age=0`);
}
export function isAuthed(req) {
  if (!configured()) return false;
  const m = (req.headers.cookie || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!m) return false;
  const [payload, mac] = m[1].split('.');
  if (!payload || !mac) return false;
  const expected = Buffer.from(sign(payload)), given = Buffer.from(mac);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return false;
  return Number(payload) > Date.now();
}

/* Only these files can ever be read or written through the admin. */
const PAGES = /^(index|solutions|projects|about|contact)\.html$/;
const SETTINGS = 'assets/js/settings.js';
const UPLOAD = /^assets\/img\/uploads\/[a-z0-9][a-z0-9._-]*\.(jpg|jpeg|png|webp)$/;
export const readable = p => PAGES.test(p) || p === SETTINGS;
export const writable = p => PAGES.test(p) || p === SETTINGS || UPLOAD.test(p);

export async function gh(path, opts = {}) {
  const res = await fetch(`${apiBase()}/repos/${repo()}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: opts.accept || 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'ycdt-solar-admin',
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`GitHub ${res.status}: ${text.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
  return res;
}

/* Commit a set of files as one atomic commit on the configured branch. */
export async function commitFiles(files, message) {
  const b = branch();
  const ref = await (await gh(`/git/ref/heads/${b}`)).json();
  const head = ref.object.sha;
  const base = await (await gh(`/git/commits/${head}`)).json();
  const tree = [];
  for (const f of files) {
    const blob = await (await gh('/git/blobs', { method: 'POST', body: JSON.stringify({ content: f.content, encoding: f.encoding === 'base64' ? 'base64' : 'utf-8' }) })).json();
    tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
  }
  const newTree = await (await gh('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: base.tree.sha, tree }) })).json();
  const commit = await (await gh('/git/commits', { method: 'POST', body: JSON.stringify({ message, tree: newTree.sha, parents: [head] }) })).json();
  await gh(`/git/refs/heads/${b}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha }) });
  return commit.sha;
}
