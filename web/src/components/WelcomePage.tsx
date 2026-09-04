import { useState } from 'react';
import type { Blueprint } from '../types';
import { defaultBlueprint } from '../types';
import { useI18n } from '../i18n';

interface ProjectInfo {
  name: string;
  cbpFile: string | null;
}

interface Props {
  onOpenProject: (bp: Blueprint, name: string) => void;
}

const API = '';

export default function WelcomePage({ onOpenProject }: Props) {
  const { t, toggle: toggleLang } = useI18n();
  const [showNew, setShowNew] = useState(false);
  const [showOpen, setShowOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGuid, setNewGuid] = useState('');
  const [newDesc, setNewDesc] = useState('');

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
        <button onClick={toggleLang}>{t('app.lang')}</button>
      </header>

      <div className="wp-body">
        <h1 className="wp-title">CuBlocky</h1>
        <p className="wp-sub">{t('app.subtitle')}</p>
        <div className="wp-actions">
          <button onClick={() => setShowNew(true)}>{t('app.newProject')}</button>
          <button onClick={loadProjects}>{t('app.openProject')}</button>
        </div>
      </div>

      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{showNew ? t('app.newProject') : t('app.openProject')}</h3>
            <div className="wp-form">
              <label>
                {t('mod.name')}
                <input
                  placeholder="请在此处输入项目名称"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createProject()}
                  autoFocus
                />
              </label>
              <label>
                {t('mod.guid')}
                <input
                  placeholder="例如 com.author.modname"
                  value={newGuid}
                  onChange={e => setNewGuid(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createProject()}
                />
              </label>
              <label>
                {t('mod.desc')}
                <input
                  placeholder="可选，简要说明插件功能"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createProject()}
                />
              </label>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowNew(false)}>{t('app.close')}</button>
              <button onClick={createProject} disabled={loading || !newName.trim() || !newGuid.trim()}>创建</button>
            </div>
          </div>
        </div>
      )}

      {showOpen && (
        <div className="modal-overlay" onClick={() => setShowOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>打开项目</h3>
            <div className="wp-project-list">
              {projects.length === 0 ? (
                <div className="wp-empty">暂无项目</div>
              ) : (
                projects.map(p => (
                  <div key={p.name} className="wp-item" onClick={() => loadProject(p.name)}>
                    <span className="wp-item-name">{p.name}</span>
                    <span className="wp-item-meta">{p.cbpFile}</span>
                  </div>
                ))
              )}
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowOpen(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
