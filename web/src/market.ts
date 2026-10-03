// ── Marketplace ────────────────────────────────────────────────
// Browse + download go through raw.githubusercontent.com, so they
// cost nothing against the API quota and need no token at all.
//
// Submit goes through a PR. GitHub's REST API has no issue-attachment
// endpoint (verified: /issues/{n}/attachments and
// /issues/{n}/comments/{cid}/attachments both return 404), so files
// are pushed with PUT /contents onto a per-submission branch instead.

const REPO = 'mouse114514/cublocky-market';
const BRANCH = 'main';
const RAW = 'https://raw.githubusercontent.com/' + REPO + '/' + BRANCH;
const API = 'https://api.github.com/repos/' + REPO;
const CACHE_KEY = 'cublocky-market-manifest';
const CACHE_MS = 15 * 60 * 1000;
const TOK_SESSION = 'cublocky-github-token';
const TOK_LOCAL = 'cublocky-github-token-persist';

export interface MarketEntry {
  slug: string;
  name: string;
  author?: string;
  version?: string;
  description?: string;
  license?: string;
  icon?: string;
  cbp?: string;
  cbpSize?: number;
  cbpSha256?: string;
  parts?: { path: string; size: number; sha256: string }[];
  assetsPath?: string;
  assets?: string[];
  added?: string;
}

export interface SubmissionMeta {
  name: string;
  author: string;
  version: string;
  description: string;
  license: string;
}

export interface SubmitResult {
  number: number;
  url: string;
}

// ── Browse / download ──

export async function fetchManifest(force = false): Promise<MarketEntry[]> {
  if (!force) {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      try {
        const c = JSON.parse(raw);
        if (Date.now() - c.t < CACHE_MS && Array.isArray(c.entries)) return c.entries;
      } catch { /* stale or corrupt: refetch */ }
    }
  }
  const res = await fetch(RAW + '/projects/manifest.json?_=' + Date.now());
  if (!res.ok) throw new Error('HTTP ' + res.status + ' fetching manifest');
  const data = await res.json();
  const entries = Array.isArray(data) ? data : [];
  localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), entries }));
  return entries;
}

export async function rawText(path: string): Promise<string> {
  const res = await fetch(RAW + '/' + encodeURI(path) + '?_=' + Date.now());
  if (!res.ok) throw new Error('HTTP ' + res.status + ' fetching ' + path);
  return res.text();
}

export async function rawBlob(path: string): Promise<Blob> {
  const res = await fetch(RAW + '/' + encodeURI(path) + '?_=' + Date.now());
  if (!res.ok) throw new Error('HTTP ' + res.status + ' fetching ' + path);
  return res.blob();
}

// Normally one file. If a submission exceeded partSizeMb the .cbp was
// split into part001…partNNN, which are concatenated back in order.
export async function cbpText(e: MarketEntry): Promise<string> {
  if (e.cbp) return rawText(e.cbp);
  const parts = e.parts || [];
  if (parts.length === 0) throw new Error('invalid entry: no .cbp');
  let out = '';
  for (const p of parts) out += await rawText(p.path);
  return out;
}
export const assetDir = (e: MarketEntry) => e.assetsPath || `projects/${e.slug}/assets`;
export const iconUrl = (e: MarketEntry): string | undefined =>
  e.icon ? (e.icon.startsWith('http') ? e.icon : RAW + '/' + e.icon) : undefined;

// ── Token ──

export function getToken(): string {
  return sessionStorage.getItem(TOK_SESSION) || localStorage.getItem(TOK_LOCAL) || '';
}

export function setToken(token: string, remember: boolean) {
  if (remember) {
    localStorage.setItem(TOK_LOCAL, token);
    sessionStorage.removeItem(TOK_SESSION);
  } else {
    sessionStorage.setItem(TOK_SESSION, token);
    localStorage.removeItem(TOK_LOCAL);
  }
}

export function clearToken() {
  sessionStorage.removeItem(TOK_SESSION);
  localStorage.removeItem(TOK_LOCAL);
}

export function maskToken(t: string): string {
  return t.length <= 8 ? t : '…' + t.slice(-8);
}

async function gh<T = unknown>(url: string, init?: RequestInit, json = true): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
  if (!(init?.body instanceof FormData || init?.body instanceof Blob || init?.body instanceof ArrayBuffer)) {
    headers['Content-Type'] = 'application/json';
  }
  const tok = getToken();
  if (tok) headers['Authorization'] = 'Bearer ' + tok;
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    throw new Error(ghMessage(await res.text().catch(() => ''), res.status));
  }
  if (!json || res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// GitHub errors are JSON: {"message":"...","documentation_url":"..."}.
// Surface the human-readable parts instead of the raw envelope.
function ghMessage(txt: string, status: number): string {
  try {
    const o = JSON.parse(txt);
    if (typeof o.message === 'string') {
      return (o.status ? o.status + ': ' : '') + o.message +
        (typeof o.documentation_url === 'string' ? '\n' + o.documentation_url : '');
    }
  } catch { /* not JSON */ }
  return txt || 'HTTP ' + status;
}

// Chunked: String.fromCharCode.apply with >64k args blows the stack.
function bytesToBase64(b: Uint8Array): string {
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < b.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, Array.from(b.subarray(i, i + CHUNK)));
  }
  return btoa(bin);
}

async function sha256Hex(data: ArrayBuffer | Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data as ArrayBuffer);
  return Array.from(new Uint8Array(digest)).map(x => x.toString(16).padStart(2, '0')).join('');
}

// ── Submit ──

// Classic tokens accept scopes in the query string, so the submitter
// opens one link and comes back with exactly what we need.
export const TOKEN_URL =
  'https://github.com/settings/tokens/new?scopes=repo&description=CuBlocky';

export interface ServerProject { name: string; cbpFile: string | null }
export interface ServerAsset { name: string; size: number; uploaded: string }

export async function listProjects(): Promise<ServerProject[]> {
  const res = await fetch('/api/projects');
  if (!res.ok) throw new Error('HTTP ' + res.status + ' listing projects');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function listAssets(name: string): Promise<ServerAsset[]> {
  const res = await fetch('/api/projects/' + encodeURIComponent(name) + '/assets');
  if (!res.ok) throw new Error('HTTP ' + res.status + ' listing assets');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchBlueprint(name: string): Promise<any> {
  const res = await fetch('/api/projects/' + encodeURIComponent(name));
  if (!res.ok) throw new Error('HTTP ' + res.status + ' reading ' + name);
  return res.json();
}

// Straight from the project directory, so nothing has to be located by hand.
export async function projectCbpBytes(name: string): Promise<Uint8Array> {
  const res = await fetch('/api/projects/' + encodeURIComponent(name) + '/cbp');
  if (!res.ok) throw new Error('HTTP ' + res.status + ' reading ' + name + '.cbp');
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.length === 0) throw new Error('empty .cbp for ' + name);
  return buf;
}

export async function assetBytes(name: string, assetName: string): Promise<Uint8Array> {
  const res = await fetch(
    '/api/projects/' + encodeURIComponent(name) + '/assets/raw/' + encodeURIComponent(assetName),
  );
  if (!res.ok) throw new Error('HTTP ' + res.status + ' reading asset ' + assetName);
  return new Uint8Array(await res.arrayBuffer());
}

// PUT /contents rejects the request when the path already exists on main
// and no sha is given, so look the blob sha up for every write.
async function putFile(branch: string, path: string, data: Uint8Array, message: string): Promise<void> {
  const sha = await mainShaOf(path);
  await gh(API + '/contents/' + path, {
    method: 'PUT',
    body: JSON.stringify({ content: bytesToBase64(data), message, branch, ...(sha ? { sha } : {}) }),
  });
}

// PUT /contents needs the current blob sha when the file already exists
// on main, or it fails with a 409 conflict.
async function mainShaOf(path: string): Promise<string | undefined> {
  try {
    return (await gh<{ sha: string }>(API + '/contents/' + path)).sha;
  } catch {
    return undefined; // not on main yet: a fresh create needs no sha
  }
}

// The PR is already publishable: files go straight into projects/ and
// projects/manifest.json is updated in the same commit. Merging it is
// the whole job - there is no post-merge step.
export async function submitProject(
  projectName: string,
  iconFile: File | null,
  meta: SubmissionMeta,
  partSizeMb: number,
): Promise<SubmitResult> {
  const size = Math.max(1, partSizeMb) * 1024 * 1024;
  const bytes = await projectCbpBytes(projectName);
  const slug = projectName.replace(/[^A-Za-z0-9._-]/g, '_') || 'submission';
  const p = encodeURIComponent(slug);
  const branch = 'sub/' + slug + '-' + Date.now().toString(36);

  const mainSha = (await gh<{ object: { sha: string } }>(API + '/git/refs/heads/' + BRANCH)).object.sha;
  await gh(API + '/git/refs', {
    method: 'POST',
    body: JSON.stringify({ ref: 'refs/heads/' + branch, sha: mainSha }),
  });

  const entry: MarketEntry = {
    slug,
    name: meta.name,
    author: meta.author,
    version: meta.version,
    description: meta.description,
    license: meta.license,
  };

  // One file when it fits; split into part001…partNNN above partSizeMb.
  if (bytes.length <= size) {
    entry.cbp = 'projects/' + p + '.cbp';
    entry.cbpSize = bytes.length;
    entry.cbpSha256 = await sha256Hex(bytes);
    await putFile(branch, entry.cbp, bytes, 'cbp');
  } else {
    entry.parts = [];
    for (let off = 0, n = 1; off < bytes.length; off += size, n++) {
      const part = bytes.subarray(off, Math.min(off + size, bytes.length));
      const path = 'projects/' + p + '.cbp.part' + n.toString().padStart(3, '0');
      await putFile(branch, path, part, 'cbp part ' + path);
      entry.parts.push({ path, size: part.length, sha256: await sha256Hex(part) });
    }
  }

  const names: string[] = [];
  for (const a of await listAssets(projectName)) {
    const path = 'projects/' + p + '/assets/' + encodeURIComponent(a.name);
    await putFile(branch, path, await assetBytes(projectName, a.name), 'asset ' + a.name);
    names.push(a.name);
  }
  entry.assets = names;
  entry.assetsPath = 'projects/' + p + '/assets';

  if (iconFile) {
    const path = 'projects/' + p + '.icon.png';
    await putFile(branch, path, new Uint8Array(await iconFile.arrayBuffer()), 'icon');
    entry.icon = path;
  }

  // Append to main's manifest, replacing any older entry with the same
  // slug, so the reviewer sees the list change in the PR diff.
  const manifestPath = 'projects/manifest.json';
  let list: MarketEntry[] = [];
  try {
    const parsed = JSON.parse(await rawText(manifestPath));
    if (Array.isArray(parsed)) list = parsed;
  } catch { /* manifest missing: start a fresh list */ }
  list = list.filter(e => !e || !e.slug || e.slug !== slug);
  list.push(entry);
  const manifestText = new TextEncoder().encode(JSON.stringify(list, null, 2));
  await putFile(branch, manifestPath, manifestText, 'manifest');

  const pr = await gh<{ html_url: string; number: number }>(API + '/pulls', {
    method: 'POST',
    body: JSON.stringify({
      title: 'Submit: ' + meta.name,
      head: branch,
      base: BRANCH,
      body: 'Submitted via CuBlocky. Merging publishes this project.\n\n```json\n'
        + JSON.stringify(entry, null, 2) + '\n```',
    }),
  });

  return { number: pr.number, url: pr.html_url };
}

// ── Install ──

// Imports the .cbp then uploads each asset. Assets are separate files
// on disk, so importing the .cbp alone would leave every sprite blank.
export async function installEntry(entry: MarketEntry): Promise<{ name: string; assets: number }> {
  const text = await cbpText(entry);
  let obj: unknown;
  try { obj = JSON.parse(text); } catch { throw new Error('invalid .cbp: not JSON'); }
  if (!obj || typeof obj !== 'object' || !(obj as any).mod || !(obj as any).mod.name) {
    throw new Error('invalid .cbp: missing mod.name');
  }

  const res = await fetch('/api/projects/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj),
  });
  if (!res.ok) throw new Error(await res.text() || 'HTTP ' + res.status);
  const data = (await res.json()) as { name: string };

  let assets = 0;
  for (const n of entry.assets || []) {
    const blob = await rawBlob(assetDir(entry) + '/' + encodeURI(n));
    const form = new FormData();
    form.append('file', new File([blob], n, { type: blob.type || 'application/octet-stream' }));
    await fetch('/api/projects/' + encodeURIComponent(data.name) + '/assets/upload', {
      method: 'POST',
      body: form,
    });
    assets++;
  }

  return { name: data.name, assets };
}
