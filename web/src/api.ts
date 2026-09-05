import type { Blueprint } from './types';

export async function compileRegister(bp: Blueprint): Promise<string> {
  const res = await fetch('/api/compile/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bp),
  });
  if (!res.ok) throw new Error('compile failed: ' + res.status);
  const data = await res.json();
  return data.registerContent as string;
}

export async function compileProject(bp: Blueprint): Promise<Record<string, string>> {
  const res = await fetch('/api/compile/project', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bp),
  });
  if (!res.ok) throw new Error('project compile failed: ' + res.status);
  const data = await res.json();
  return data.files as Record<string, string>;
}

export interface BuildResult {
  success: boolean;
  message: string;
  dllPath?: string;
  buildDir?: string;
}

export async function buildProject(bp: Blueprint): Promise<BuildResult> {
  const res = await fetch('/api/build', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bp),
  });
  if (!res.ok) throw new Error('build failed: ' + res.status);
  return await res.json() as BuildResult;
}

export function download(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function saveProject(name: string, bp: Blueprint): Promise<void> {
  const res = await fetch(`/api/projects/${encodeURIComponent(name)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bp),
  });
  if (!res.ok) throw new Error('save failed: ' + res.status);
}

// ── Asset management ──
export interface AssetInfo {
  name: string;
  size: number;
  uploaded: string;
}

export async function listAssets(): Promise<AssetInfo[]> {
  const res = await fetch('/api/assets');
  if (!res.ok) throw new Error('list assets failed');
  return await res.json() as AssetInfo[];
}

export async function uploadAsset(file: File): Promise<{ assetId: string; name: string }> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: form });
  if (!res.ok) throw new Error('upload failed');
  return await res.json();
}

export async function deleteAsset(name: string): Promise<void> {
  const res = await fetch(`/api/assets/${encodeURIComponent(name)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('delete failed');
}
