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
const SUB_DIR = 'submissions';
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

export const cbpPath = (e: MarketEntry) => e.cbp || `projects/${e.slug}.cbp`;
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
  return new Uint8Array(await res.arrayBuffer());
}

export async function assetBytes(name: string, assetName: string): Promise<Uint8Array> {
  const res = await fetch(
    '/api/projects/' + encodeURIComponent(name) + '/assets/raw/' + encodeURIComponent(assetName),
  );
  if (!res.ok) throw new Error('HTTP ' + res.status + ' reading asset ' + assetName);
  return new Uint8Array(await res.arrayBuffer());
}

// Pushes a local project onto a fresh branch and opens a draft PR. The
// .cbp becomes part001…partNNN; assets and the icon go alongside. The
// manifest records each part's size and sha256 so the reviewer can
// reassemble and verify.
export async function submitProject(
  projectName: string,
  iconFile: File | null,
  meta: SubmissionMeta,
  partSizeMb: number,
): Promise<SubmitResult> {
  const size = Math.max(1, partSizeMb) * 1024 * 1024;
  const bytes = await projectCbpBytes(projectName);
  const nonce = Date.now().toString(36);
  const slug = projectName.replace(/[^A-Za-z0-9._-]/g, '_') || 'submission';
  const branch = 'sub/' + slug + '-' + nonce;
  const base = SUB_DIR + '/' + slug + '/';
  const encName = encodeURIComponent(projectName);

  const mainSha = (await gh<{ object: { sha: string } }>(API + '/git/refs/heads/' + BRANCH)).object.sha;
  await gh(API + '/git/refs', {
    method: 'POST',
    body: JSON.stringify({ ref: 'refs/heads/' + branch, sha: mainSha }),
  });

  const parts: { index: number; size: number; sha256: string }[] = [];
  for (let off = 0, n = 1; off < bytes.length; off += size, n++) {
    const part = bytes.subarray(off, Math.min(off + size, bytes.length));
    parts.push({ index: n - 1, size: part.length, sha256: await sha256Hex(part) });
    const pad = n.toString().padStart(3, '0');
    await gh(API + '/contents/' + base + 'part' + pad + '.cbp', {
      method: 'PUT',
      body: JSON.stringify({ content: bytesToBase64(part), message: 'part ' + pad, branch }),
    });
  }

  const names: string[] = [];
  for (const a of await listAssets(projectName)) {
    const b64 = bytesToBase64(await assetBytes(projectName, a.name));
    await gh(API + '/contents/' + base + 'assets/' + encodeURIComponent(a.name), {
      method: 'PUT',
      body: JSON.stringify({ content: b64, message: 'asset ' + a.name, branch }),
    });
    names.push(a.name);
  }

  if (iconFile) {
    const b64 = bytesToBase64(new Uint8Array(await iconFile.arrayBuffer()));
    await gh(API + '/contents/' + base + 'icon.png', {
      method: 'PUT',
      body: JSON.stringify({ content: b64, message: 'icon', branch }),
    });
  }

  const p = encodeURIComponent(slug);
  const manifest = JSON.stringify({
    slug,
    name: meta.name,
    author: meta.author,
    version: meta.version,
    description: meta.description,
    license: meta.license,
    ...(iconFile ? { icon: 'projects/' + p + '.icon.png' } : {}),
    cbp: 'projects/' + p + '.cbp',
    assetsPath: 'projects/' + p + '/assets',
    assets: names,
    parts,
  }, null, 2);

  await gh(API + '/contents/' + base + 'MANIFEST.json', {
    method: 'PUT',
    body: JSON.stringify({
      content: bytesToBase64(new TextEncoder().encode(manifest)),
      message: 'manifest',
      branch,
    }),
  });

  const pr = await gh<{ html_url: string; number: number }>(API + '/pulls', {
    method: 'POST',
    body: JSON.stringify({
      title: 'Submit: ' + meta.name,
      head: branch,
      base: BRANCH,
      draft: true,
      body: 'Submitted via CuBlocky.\n\n```json\n' + manifest + '\n```',
    }),
  });

  return { number: pr.number, url: pr.html_url };
}

// ── Install ──

// Imports the .cbp then uploads each asset. Assets are separate files
// on disk, so importing the .cbp alone would leave every sprite blank.
export async function installEntry(entry: MarketEntry): Promise<{ name: string; assets: number }> {
  const text = await rawText(cbpPath(entry));
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
