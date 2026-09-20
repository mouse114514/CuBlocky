import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import type { Blueprint } from '../types';
import { defaultBlueprint } from '../types';
import { useI18n, LANG_LABELS, type Lang } from '../i18n';
import GradientBg from './GradientBg';
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

  const loadProjects = () => {
    fetch(`${API}/api/projects`)
      .then(r => r.json())
      .then((data: ProjectInfo[]) => { setProjects(data); setShowOpen(true); })
      .catch(() => {});
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
    if (!newName.trim() || !newGuid.trim()) return;
    setLoading(true);
    try {
      const bp = defaultBlueprint();
      bp.mod.name = newName.trim();
      bp.mod.guid = newGuid.trim() || `com.user.${newName.toLowerCase().replace(/\s+/g, '')}`;
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

  return (
    <div className="wp-root">
      <header className="toolbar">
        <span className="logo">CuBlocky</span>
        <span className="spacer" />
        <button onClick={openSettings}>{t('app.settings')}</button>
        <button onClick={() => setShowLang(true)}>{t('app.lang')}</button>
      </header>

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
                {t('mod.name')}
                <input
                  placeholder={t('app.placeholder.name')}
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createProject()}
                  autoFocus
                />
              </label>
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
              <button onClick={createProject} disabled={loading || !newName.trim() || !newGuid.trim()}>{t('app.create')}</button>
            </div>
          </div>
        </div>
      )}

      {showOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{t('app.openProject')}</h3>
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
                    >
                      <label className="wp-item-select" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(p.name)}
                          onChange={() => toggleSelect(p.name)}
                        />
                      </label>
                      <span className="wp-item-name" onClick={() => loadProject(p.name)}>
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

      {showLang && (
        <div className="modal-overlay" onClick={() => setShowLang(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{t('lang.title')}</h3>
            <div className="lang-list">
              {(Object.keys(LANG_LABELS) as Lang[]).map(l => (
                <button
                  key={l}
                  className={`lang-option${l === lang ? ' active' : ''}`}
                  onClick={() => { setLang(l); setShowLang(false); }}
                >
                  {LANG_LABELS[l]}
                </button>
              ))}
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowLang(false)}>{t('app.close')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
