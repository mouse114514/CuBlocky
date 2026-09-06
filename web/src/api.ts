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

// ── Project-scoped asset management ──
export interface AssetInfo {
  name: string;
  size: number;
  uploaded: string;
}

export async function listAssets(projectName: string): Promise<AssetInfo[]> {
  const res = await fetch(`/api/projects/${encodeURIComponent(projectName)}/assets`);
  if (!res.ok) throw new Error('list assets failed');
  return await res.json() as AssetInfo[];
}

export async function uploadAsset(projectName: string, file: File): Promise<{ assetId: string; name: string }> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`/api/projects/${encodeURIComponent(projectName)}/assets/upload`, { method: 'POST', body: form });
  if (!res.ok) throw new Error('upload failed');
  return await res.json();
}

export async function deleteAsset(projectName: string, assetName: string): Promise<void> {
  const res = await fetch(`/api/projects/${encodeURIComponent(projectName)}/assets/${encodeURIComponent(assetName)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('delete failed');
}

export function assetRawUrl(projectName: string, assetName: string): string {
  return `/api/projects/${encodeURIComponent(projectName)}/assets/raw/${encodeURIComponent(assetName)}`;
}

// ── Config ──
export interface ServerConfig {
  gamePath: string;
}

export async function getConfig(): Promise<ServerConfig> {
  const res = await fetch('/api/config');
  if (!res.ok) throw new Error('get config failed');
  return await res.json() as ServerConfig;
}

export async function updateConfig(cfg: ServerConfig): Promise<ServerConfig> {
  const res = await fetch('/api/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cfg),
  });
  if (!res.ok) throw new Error('update config failed');
  return await res.json() as ServerConfig;
}
