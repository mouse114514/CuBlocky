import { useState, useRef, useCallback, useEffect } from 'react';
import type { Blueprint } from './types';
import { defaultBlueprint } from './types';
import { useI18n } from './i18n';
import { BlockEditor } from './components/BlockEditor';
import WelcomePage from './components/WelcomePage';
import { download, buildProject, type BuildResult } from './api';
import * as Blockly from 'blockly/core';
import { csharpGenerator } from './blocklySetup';

export function App() {
  const { t } = useI18n();
  const [inEditor, setInEditor] = useState(false);
  const [bp, setBp] = useState<Blueprint>(() => defaultBlueprint());
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [building, setBuilding] = useState(false);
  const [buildResult, setBuildResult] = useState<BuildResult | null>(null);
  const wsRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const bpRef = useRef(bp);
  bpRef.current = bp;

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      localStorage.setItem('cublocky', JSON.stringify(bpRef.current));
    }, 500);
  }, []);

  useEffect(() => { if (inEditor) scheduleAutoSave(); }, [bp, scheduleAutoSave, inEditor]);

  const saveLocal = () => localStorage.setItem('cublocky', JSON.stringify(bp));

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

  const openProject = (projectBp: Blueprint) => {
    setBp(projectBp);
    setInEditor(true);
    restoreWorkspace(projectBp.eventHandlersXml);
  };

  if (!inEditor) {
    return <WelcomePage onOpenProject={openProject} />;
  }

  return (
    <div className="app">
      <header className="toolbar">
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
        <button className={`code-toggle ${showCode ? 'active' : ''}`} onClick={() => setShowCode(!showCode)}>
          {t('code.toggle')}
        </button>
      </header>

      <div className="editor-full">
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
        <div className="modal-overlay" onClick={() => setBuildResult(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{buildResult.success ? t('app.buildOk') : t('app.buildFail')}</h3>
            {buildResult.success ? (
              <>
                <p className="modal-label">{t('app.dllPath')}</p>
                <pre className="modal-path">{buildResult.dllPath}</pre>
                <p className="modal-label">{t('app.buildDir')}</p>
                <pre className="modal-path">{buildResult.buildDir}</pre>
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
    </div>
  );
}
