import { useState, useEffect, useCallback } from 'react';
import type { Blueprint } from '../types';
import { compileRegister, compileProject, download } from '../api';

interface Props {
  blueprint: Blueprint;
}

export function CodePreview({ blueprint }: Props) {
  const [tab, setTab] = useState<'register' | 'project'>('register');
  const [code, setCode] = useState('// add items or recipes to preview');
  const [projectFiles, setProjectFiles] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doCompile = useCallback(async () => {
    try {
      setBusy(true);
      setError(null);
      const [regCode, projFiles] = await Promise.all([
        compileRegister(blueprint),
        compileProject(blueprint),
      ]);
      setCode(regCode);
      setProjectFiles(projFiles);
    } catch (e: any) {
      setError(e.message || 'compile error');
    } finally {
      setBusy(false);
    }
  }, [blueprint]);

  // Auto-compile on change (debounced)
  useEffect(() => {
    const t = setTimeout(doCompile, 600);
    return () => clearTimeout(t);
  }, [doCompile]);

  const exportCs = () => download('RegisterContent.cs', code);

  const exportAll = async () => {
    // Download each project file individually (M5 will zip them)
    for (const [name, content] of Object.entries(projectFiles)) {
      download(name, content);
    }
  };

  return (
    <div className="code-preview">
      <div className="code-tabs">
        <button className={tab === 'register' ? 'active' : ''} onClick={() => setTab('register')}>
          RegisterContent.cs
        </button>
        <button className={tab === 'project' ? 'active' : ''} onClick={() => setTab('project')}>
          Project Files
        </button>
        <span className="spacer" />
        {busy && <span className="busy">compiling...</span>}
        {error && <span className="error">{error}</span>}
        <button onClick={exportCs}>Export .cs</button>
        <button onClick={exportAll}>Export All</button>
      </div>
      {tab === 'register' && (
        <pre className="code-block"><code>{code}</code></pre>
      )}
      {tab === 'project' && (
        <div className="project-files">
          {Object.keys(projectFiles).length === 0 && <p className="empty">No files generated.</p>}
          {Object.entries(projectFiles).map(([name, content]) => (
            <div key={name} className="file-card">
              <div className="file-header">
                <span className="file-name">{name}</span>
                <button className="small" onClick={() => download(name, content)}>Download</button>
              </div>
              <pre className="code-block small"><code>{content}</code></pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
