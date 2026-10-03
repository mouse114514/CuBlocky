import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import type { Blueprint } from '../types';
import { defaultBlueprint, isValidProjectName } from '../types';
import { useI18n, type Lang } from '../i18n';
import GradientBg from './GradientBg';
import { LangPicker } from './LangPicker';
import { getConfig, updateConfig, type ServerConfig } from '../api';
import SPLASH_TEXTS from '../splashTexts';

function pickSplash(lang: Lang): string {
  const entry = SPLASH_TEXTS[Math.floor(Math.random() * SPLASH_TEXTS.length)];
  const idx = lang === 'zh' ? 0 : lang === 'ru' ? 2 : 1;
  return entry[idx];
}

interface ProjectInfo {
  name: string;
  cbpFile: string | null;
}

interface Props {
  onOpenProject: (bp: Blueprint, name: string) => void;
}

const API = '';

export default function WelcomePage({ onOpenProject }: Props) {
  const { lang, t, setLang } = useI18n();
  const [showNew, setShowNew] = useState(false);
  const [showOpen, setShowOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGuid, setNewGuid] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [gamePath, setGamePath] = useState('');
  const [showLang, setShowLang] = useState(false);
  const [firstLang, setFirstLang] = useState(() => localStorage.getItem('cublocky-lang-chosen') !== '1');
  const [showLangHint, setShowLangHint] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [splashText, setSplashText] = useState(() => pickSplash(lang));
  const [showSplash, setShowSplash] = useState(() => {
    return localStorage.getItem('cublocky-splash') !== 'off';
  });

  const refreshSplash = () => setSplashText(pickSplash(lang));

  useEffect(() => { if (showSplash) setSplashText(pickSplash(lang)); }, [lang]);

  const titleRef = useRef<HTMLHeadingElement>(null);
  const splashRef = useRef<HTMLSpanElement>(null);
  const [splashLeft, setSplashLeft] = useState(0);
  const [splashTop, setSplashTop] = useState(8);

  useLayoutEffect(() => {
    if (!showSplash || !titleRef.current || !splashRef.current) return;
    const splashW = splashRef.current.offsetWidth;
    const angle = 12 * Math.PI / 180;
    const dx = splashW * Math.cos(angle);
    const dy = splashW * Math.sin(angle);
    setSplashLeft(-dx / 2);
    setSplashTop(8 + dy / 2);
  }, [showSplash, splashText, lang]);

  const toggleSplash = () => {
    const next = !showSplash;
    setShowSplash(next);
    localStorage.setItem('cublocky-splash', next ? 'on' : 'off');
    if (next) refreshSplash();
  };

  const openSettings = () => {
    getConfig().then(cfg => setGamePath(cfg.gamePath)).catch(() => {});
    setShowSettings(true);
  };

  const saveSettings = async () => {
    try {
      await updateConfig({ gamePath });
      setShowSettings(false);
    } catch { /* ignore */ }
  };

  const fetchProjects = useCallback(() => {
    fetch(`${API}/api/projects`)
      .then(r => r.json())
      .then((data: ProjectInfo[]) => setProjects(data))
      .catch(() => {});
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const loadProjects = () => {
    fetchProjects();
    setShowOpen(true);
  };

  const chooseLang = (l: Lang) => {
    setLang(l);
    if (firstLang) {
      localStorage.setItem('cublocky-lang-chosen', '1');
      setFirstLang(false);
      setShowLangHint(true);
    }
    setShowLang(false);
  };

  // Give the first-run hint time to be read, then clear it.
  useEffect(() => {
    if (!showLangHint) return;
    const id = setTimeout(() => setShowLangHint(false), 20000);
    return () => clearTimeout(id);
  }, [showLangHint]);

  // Auto-clear the import status message.
  useEffect(() => {
    if (!importMsg) return;
    const id = setTimeout(() => setImportMsg(null), 12000);
    return () => clearTimeout(id);
  }, [importMsg]);

  const doImport = async (files: FileList | null) => {
    const list = files ? Array.from(files) : [];
    if (list.length === 0) return;
    setImporting(true);
    setImportMsg(null);
    let ok = 0;
    const bad: string[] = [];
    const renamed: string[] = [];
    for (const f of list) {
      try {
        const bp = JSON.parse(await f.text()) as Blueprint;
        if (!bp || typeof bp !== 'object' || !bp.mod || !bp.mod.name) throw new Error('bad');
        const res = await fetch(`${API}/api/projects/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bp),
        });
        if (!res.ok) throw new Error((await res.text()) || 'failed');
        const data = await res.json() as { name: string; renamed: boolean };
        if (data.renamed) renamed.push(data.name);
        ok++;
      } catch {
        bad.push(f.name);
      }
    }
    setImporting(false);
    const parts: string[] = [];
    if (ok > 0) parts.push(t('app.importDone', { count: String(ok) }));
    for (const n of renamed) parts.push(t('app.importRenamed', { name: n }));
    if (bad.length > 0) parts.push(t('app.importBad', { names: bad.join(', ') }));
    if (parts.length > 0) setImportMsg(parts.join(' · '));
    if (ok > 0) fetchProjects();
  };

  const loadProject = async (name: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/projects/${encodeURIComponent(name)}`);
      if (!res.ok) throw new Error('failed');
      const bp = await res.json();
      onOpenProject(bp, name);
    } catch {} finally {
      setLoading(false);
    }
  };

  const toggleSelect = (name: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === projects.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(projects.map(p => p.name)));
    }
  };

  const deleteSelected = async () => {
    setLoading(true);
    try {
      for (const name of selected) {
        await fetch(`${API}/api/projects/${encodeURIComponent(name)}`, { method: 'DELETE' });
      }
      setSelected(new Set());
      setShowDeleteConfirm(false);
      loadProjects();
    } catch {} finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    const name = newName.trim();
    if (!isValidProjectName(name) || !newGuid.trim()) return;
    setLoading(true);
    try {
      const bp = defaultBlueprint();
      bp.mod.name = name;
      bp.mod.guid = newGuid.trim();
      bp.mod.description = newDesc;
      const res = await fetch(`${API}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bp),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      onOpenProject(bp, data.name);
    } catch {} finally {
      setLoading(false);
    }
  };

  const nameTrimmed = newName.trim();
  const nameBad = nameTrimmed.length > 0 && !isValidProjectName(nameTrimmed);

  return (
    <div className="wp-root">
      <header className="toolbar">
        <span className="logo">CuBlocky</span>
        <span className="spacer" />
        <button onClick={openSettings}>{t('app.settings')}</button>
        <button className={`nav-lang${showLangHint ? ' hl' : ''}`} onClick={() => setShowLang(true)}>
          {t('app.lang')}
        </button>
      </header>
      <input
        ref={importInputRef}
        type="file"
        accept=".cbp,.json,application/json"
        multiple
        className="wp-file-input"
        onChange={e => { doImport(e.target.files); e.target.value = ''; }}
      />

      <div className="wp-body">
        <GradientBg />
        <h1 className="wp-title" ref={titleRef}>
          CuBlocky
          {showSplash && (
            <span
              className="wp-splash"
              ref={splashRef}
              style={{ left: splashLeft, top: splashTop }}
              onClick={refreshSplash}
            >
              {splashText}
            </span>
          )}
        </h1>
        <p className="wp-sub">{t('app.subtitle')}</p>
        <div className="wp-actions">
          <button onClick={() => setShowNew(true)}>{t('app.newProject')}</button>
          <button onClick={loadProjects}>{t('app.openProject')}</button>
        </div>
      </div>

      {showNew && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{showNew ? t('app.newProject') : t('app.openProject')}</h3>
            <div className="wp-form">
              <label>
                <span className="wp-field-label">
                  {t('mod.name')}
                  <span className="i-btn" tabIndex={0}>
                    i
                    <span className="i-tip">{t('mod.nameHint')}</span>
                  </span>
                </span>
                <input
                  placeholder={t('app.placeholder.name')}
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createProject()}
                  autoFocus
                />
              </label>
              {nameBad && <div className="form-note form-note-err">{t('mod.nameInvalid')}</div>}
              <label>
                {t('mod.guid')}
                <input
                  placeholder={t('app.placeholder.guid')}
                  value={newGuid}
                  onChange={e => setNewGuid(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createProject()}
                />
              </label>
              <label>
                {t('mod.desc')}
                <input
                  placeholder={t('app.placeholder.desc')}
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createProject()}
                />
              </label>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowNew(false)}>{t('app.close')}</button>
              <button onClick={createProject} disabled={loading || !isValidProjectName(nameTrimmed) || !newGuid.trim()}>{t('app.create')}</button>
            </div>
          </div>
        </div>
      )}

      {showOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{t('app.openProject')}</h3>
            <div className="wp-import-row">
              <button
                className="wp-import-btn"
                onClick={() => importInputRef.current?.click()}
                disabled={importing}
                title={t('app.importHint')}
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 16V4" />
                  <path d="m7 9 5-5 5 5" />
                  <path d="M4 20h16" />
                </svg>
                {importing ? t('app.importing') : t('app.importProject')}
              </button>
              {importMsg && <span className="wp-import-msg">{importMsg}</span>}
            </div>
            <div className="wp-project-list">
              {projects.length === 0 ? (
                <div className="wp-empty">{t('app.noProjects')}</div>
              ) : (
                <>
                  <div className="wp-item wp-item-header">
                    <label className="wp-item-select">
                      <input
                        type="checkbox"
                        checked={selected.size === projects.length && projects.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </label>
                    <span className="wp-item-name" />
                  </div>
                  {projects.map(p => (
                    <div
                      key={p.name}
                      className={`wp-item${selected.has(p.name) ? ' selected' : ''}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => loadProject(p.name)}
                    >
                      <label className="wp-item-select" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(p.name)}
                          onChange={() => toggleSelect(p.name)}
                        />
                      </label>
                      <span className="wp-item-name">
                        {p.name}
                      </span>
                      <span className="wp-item-meta">{p.cbpFile}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
            <div className="modal-actions">
              {selected.size > 0 && (
                <span className="wp-selected-count">{t('app.selected', { count: String(selected.size) })}</span>
              )}
              <button onClick={() => setShowOpen(false)}>{t('app.close')}</button>
              {selected.size > 0 && (
                <button className="wp-delete-btn" onClick={() => setShowDeleteConfirm(true)}>
                  {t('app.deleteProject')} ({selected.size})
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{t('app.deleteProject')}</h3>
            <p>{t('app.deleteConfirm', { count: String(selected.size) })}</p>
            <div className="modal-actions">
              <button onClick={() => setShowDeleteConfirm(false)}>{t('app.close')}</button>
              <button className="wp-delete-btn" onClick={deleteSelected} disabled={loading}>
                {t('app.deleteProject')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{t('app.settingsTitle')}</h3>
            <p className="modal-label">{t('app.gamePath')}</p>
            <p className="modal-hint">{t('app.gamePathDesc')}</p>
            <input
              className="modal-input"
              value={gamePath}
              onChange={(e) => setGamePath(e.target.value)}
              placeholder="C:\Program Files (x86)\Steam\steamapps\common\Casualties Unknown Demo"
            />
            <div className="wp-setting-row">
              <label className="wp-toggle-label">
                <span>{t('app.splash')}</span>
                <span className="modal-hint">{t('app.splashDesc')}</span>
              </label>
              <button
                className={`wp-toggle-btn${showSplash ? ' on' : ''}`}
                onClick={toggleSplash}
              >
                {showSplash ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowSettings(false)}>{t('app.close')}</button>
              <button className="build-btn" onClick={saveSettings}>{t('app.saveSettings')}</button>
            </div>
          </div>
        </div>
      )}

      {showLang && !firstLang && (
        <LangPicker
          title={t('lang.title')}
          current={lang}
          onPick={chooseLang}
          onClose={() => setShowLang(false)}
        />
      )}

      {firstLang && (
        <LangPicker
          title={t('lang.firstTitle')}
          desc={t('lang.firstDesc')}
          current={lang}
          onPick={chooseLang}
        />
      )}

      {showLangHint && (
        <div className="lang-hint" onClick={() => setShowLangHint(false)}>
          {t('lang.firstHint')}
        </div>
      )}
    </div>
  );
}
