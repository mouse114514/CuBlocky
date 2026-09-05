import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react';
import type { Blueprint } from './types';
import { defaultBlueprint } from './types';
import { useI18n } from './i18n';
import { BlockEditor } from './components/BlockEditor';
import WelcomePage from './components/WelcomePage';
import AssetManager from './components/AssetManager';
import { download, buildProject, saveProject, type BuildResult } from './api';
import * as Blockly from 'blockly/core';
import { csharpGenerator, pickSprite, setSpritePickCallback, createSpriteBlock } from './blocklySetup';

function CopyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

function CopyBlock({ children }: { children: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const text = typeof children === 'string' ? children : '';
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); } catch { return; }
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <div className="modal-path-wrap">
      <button className={`copy-btn${copied ? ' copied' : ''}`} onClick={copy} title="Copy">
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
      <pre className="modal-path">{children}</pre>
    </div>
  );
}

export function App() {
  const { t, toggle: toggleLang } = useI18n();
  const [inEditor, setInEditor] = useState(false);
  const [bp, setBp] = useState<Blueprint>(() => defaultBlueprint());
  const [currentProjectName, setCurrentProjectName] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [building, setBuilding] = useState(false);
  const [buildResult, setBuildResult] = useState<BuildResult | null>(null);
  const [showSpritePicker, setShowSpritePicker] = useState(false);
  const [showAssetManager, setShowAssetManager] = useState(false);
  const wsRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const bpRef = useRef(bp);
  bpRef.current = bp;

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      const snapshot = bpRef.current;
      localStorage.setItem('cublocky', JSON.stringify(snapshot));
      if (currentProjectName) {
        saveProject(currentProjectName, snapshot).catch(() => {});
      }
    }, 500);
  }, [currentProjectName]);

  useEffect(() => { if (inEditor) scheduleAutoSave(); }, [bp, scheduleAutoSave, inEditor]);

  // Listen for sprite picker events from Blockly fields
  useEffect(() => {
    const handler = () => setShowSpritePicker(true);
    window.addEventListener('cublocky:open-sprite-picker', handler);
    return () => window.removeEventListener('cublocky:open-sprite-picker', handler);
  }, []);

  const saveLocal = () => {
    localStorage.setItem('cublocky', JSON.stringify(bp));
    if (currentProjectName) {
      saveProject(currentProjectName, bp).catch(() => {});
    }
  };

  const saveAs = () => {
    const name = bp.mod.name.replace(/[^a-zA-Z0-9_-]/g, '_') + '.cbp';
    download(name, JSON.stringify(bp, null, 2));
  };

  const openFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.cbp,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const parsed = JSON.parse(text) as Blueprint;
        setBp(parsed);
        setInEditor(true);
        restoreWorkspace(parsed.eventHandlersXml);
      } catch { alert('Invalid .cbp file'); }
    };
    input.click();
  };

  const restoreWorkspace = useCallback((xml?: string) => {
    const ws = wsRef.current;
    if (!ws || !xml) return;
    try {
      ws.clear();
      const dom = Blockly.utils.xml.textToDom(xml);
      Blockly.Xml.domToWorkspace(dom, ws);
    } catch (e) {
      console.warn('Failed to restore workspace:', e);
    }
  }, []);

  const handleBuild = async () => {
    setBuilding(true);
    setBuildResult(null);
    try {
      let eventHandlers = bp.eventHandlers || '';
      if (wsRef.current) {
        eventHandlers = csharpGenerator.workspaceToCode(wsRef.current);
      }
      const r = await buildProject({ ...bp, eventHandlers });
      setBuildResult(r);
    } catch (e: any) {
      setBuildResult({ success: false, message: e.message });
    } finally {
      setBuilding(false);
    }
  };

  const openProject = (projectBp: Blueprint, projectName: string) => {
    setBp(projectBp);
    setCurrentProjectName(projectName);
    setInEditor(true);
    restoreWorkspace(projectBp.eventHandlersXml);
  };

  if (!inEditor) {
    return <WelcomePage onOpenProject={openProject} />;
  }

  return (
    <div className="app">
      <div className="editor-full">
        <header className="toolbar editor-toolbar">
          <span className="logo">{t('app.title')}</span>
          <button onClick={openFile}>{t('app.open')}</button>
          <button onClick={saveLocal}>{t('app.save')}</button>
          <button onClick={saveAs}>{t('app.saveAs')}</button>
          <button className="build-btn" onClick={handleBuild} disabled={building}>
            {building ? t('app.building') : t('app.build')}
          </button>
          {buildResult && (
            <span className={`build-result ${buildResult.success ? 'ok' : 'err'}`}>
              {buildResult.success ? '✓' : '✗'} {buildResult.message}
            </span>
          )}
          <span className="spacer" />
          <button onClick={() => setShowAssetManager(true)} disabled={!currentProjectName}>{t('asset.manageTitle')}</button>
          <button className={`code-toggle ${showCode ? 'active' : ''}`} onClick={() => setShowCode(!showCode)}>
            {t('code.toggle')}
          </button>
        </header>

        <BlockEditor
          onCodeChange={(c) => { setCode(c); setBp(prev => ({ ...prev, eventHandlers: c })); }}
          onBlocksChange={(xml) => { setBp(prev => ({ ...prev, eventHandlersXml: xml })); }}
          onWorkspaceReady={(ws) => { wsRef.current = ws; restoreWorkspace(bp.eventHandlersXml); }}
        />
      </div>

      {showCode && (
        <div className="code-panel">
          <pre>{code}</pre>
        </div>
      )}

      {buildResult && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{buildResult.success ? t('app.buildOk') : t('app.buildFail')}</h3>
            {buildResult.success ? (
              <>
                <p className="modal-label">{t('app.dllPath')}</p>
                <CopyBlock>{buildResult.dllPath || ''}</CopyBlock>
                <p className="modal-label">{t('app.buildDir')}</p>
                <CopyBlock>{buildResult.buildDir || ''}</CopyBlock>
              </>
            ) : (
              <pre className="modal-err">{buildResult.message}</pre>
            )}
            <div className="modal-actions">
              <button onClick={() => setBuildResult(null)}>{t('app.close')}</button>
            </div>
          </div>
        </div>
      )}

      {showSpritePicker && currentProjectName && (
        <AssetManager
          projectName={currentProjectName}
          mode="pick"
          onSelect={(name) => pickSprite(name)}
          onClose={() => { setSpritePickCallback(null); setShowSpritePicker(false); }}
        />
      )}

      {showAssetManager && currentProjectName && (
        <AssetManager
          projectName={currentProjectName}
          mode="manage"
          onGenerate={(name) => {
            const ws = wsRef.current;
            if (ws) createSpriteBlock(name, ws);
          }}
          onClose={() => setShowAssetManager(false)}
        />
      )}
    </div>
  );
}
