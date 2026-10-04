import { useState, useEffect, useRef } from 'react';
import { listAssets, uploadAsset, deleteAsset, assetRawUrl, type AssetInfo } from '../api';
import { useI18n } from '../i18n';

interface Props {
  projectName: string;
  mode: 'manage' | 'pick';
  accept?: 'image' | 'audio';
  onSelect?: (name: string) => void;
  onGenerate?: (name: string) => void;
  onClose: () => void;
}

export default function AssetManager({ projectName, mode, accept = 'image', onSelect, onGenerate, onClose }: Props) {
  const { t } = useI18n();
  const [assets, setAssets] = useState<AssetInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  // Multi-select in manage mode; click order = animation frame order.
  const [selected, setSelected] = useState<string[]>([]);
  const [frameW, setFrameW] = useState(16);
  const [frameH, setFrameH] = useState(16);
  const [cols, setCols] = useState(2);
  const [rows, setRows] = useState(1);
  const [mergeName, setMergeName] = useState('sheet.png');
  const [merging, setMerging] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);

  const togglePlay = (name: string) => {
    const cur = audioRef.current;
    if (!cur) return;
    if (playing === name) { cur.pause(); cur.currentTime = 0; setPlaying(null); return; }
    cur.src = assetRawUrl(projectName, name);
    cur.volume = 0.7;
    cur.play().then(() => setPlaying(name)).catch(() => setPlaying(null));
  };

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  const isAudio = (name: string) => /\.(wav|mp3|mp1|mp2|aif|aiff|cue)$/i.test(name);
  const matchesAccept = (name: string) => accept === 'audio' ? isAudio(name) : !isAudio(name);
  const imageSel = selected.filter(n => !isAudio(n));
  // In pick mode only show the kind being picked (sprite vs. audio clip).
  const visible = mode === 'pick' ? assets.filter(a => matchesAccept(a.name)) : assets;

  const load = async () => {
    setLoading(true);
    try { setAssets(await listAssets(projectName)); } catch { }
    setLoading(false);
  };
  useEffect(() => { load(); setSelected([]); }, [projectName]);

  const loadImage = (name: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed: ' + name));
    img.src = assetRawUrl(projectName, name);
  });

  // Default frame size = max selected sprite size (merged sheet needs no scaling).
  useEffect(() => {
    if (imageSel.length === 0) return;
    let dead = false;
    Promise.all(imageSel.map(n => loadImage(n).catch(() => null))).then(list => {
      const imgs = list.filter((i): i is HTMLImageElement => !!i);
      if (dead || imgs.length === 0) return;
      setFrameW(Math.max(...imgs.map(i => i.naturalWidth)));
      setFrameH(Math.max(...imgs.map(i => i.naturalHeight)));
    });
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // Default grid: closest to square that fits the selected frames.
  useEffect(() => {
    const n = imageSel.length;
    if (n === 0) return;
    const c = Math.max(1, Math.ceil(Math.sqrt(n)));
    setCols(c);
    setRows(Math.max(1, Math.ceil(n / c)));
  }, [selected]);

  // Live preview of how the selected frames lay out in the grid.
  useEffect(() => {
    const c = previewRef.current;
    if (!c || imageSel.length === 0) return;
    let dead = false;
    Promise.all(imageSel.map(n => loadImage(n).catch(() => null))).then(list => {
      if (dead) return;
      const imgs = list.filter((i): i is HTMLImageElement => !!i);
      if (imgs.length === 0) return;
      const cl = Math.max(1, Math.floor(cols) || 1);
      const rl = Math.max(1, Math.floor(rows) || 1);
      const fw = Math.max(1, Math.floor(frameW) || 16);
      const fh = Math.max(1, Math.floor(frameH) || 16);
      c.width = fw * cl;
      c.height = fh * rl;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, c.width, c.height);
      imgs.forEach((img, i) => {
        const s = Math.min(fw / img.naturalWidth, fh / img.naturalHeight);
        const dw = Math.max(1, Math.round(img.naturalWidth * s));
        const dh = Math.max(1, Math.round(img.naturalHeight * s));
        ctx.drawImage(img, (i % cl) * fw + Math.round((fw - dw) / 2), Math.floor(i / cl) * fh + Math.round((fh - dh) / 2), dw, dh);
      });
    });
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, cols, rows, frameW, frameH]);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadErr(null);
    try {
      await uploadAsset(projectName, file);
      await load();
    } catch (e) { setUploadErr((e as Error).message || 'upload failed'); }
    if (fileRef.current) fileRef.current.value = '';
    setUploading(false);
  };

  const handleDeleteMany = async () => {
    if (selected.length === 0 || deleting) return;
    if (selected.length > 1 && !window.confirm(`${t('asset.delete')} (${selected.length})`)) return;
    setDeleting(true);
    for (const n of selected) {
      try { await deleteAsset(projectName, n); } catch (e) { console.warn('delete failed', n, e); }
    }
    setSelected([]);
    await load();
    setDeleting(false);
  };

  const handleMerge = async () => {
    if (imageSel.length < 2 || merging) return;
    const fw = Math.max(1, Math.floor(frameW) || 16);
    const fh = Math.max(1, Math.floor(frameH) || 16);
    setMerging(true);
    try {
      const imgs = await Promise.all(imageSel.map(loadImage));
      const cl = Math.max(1, Math.floor(cols) || 1);
      const rl = Math.max(1, Math.floor(rows) || 1);
      const canvas = document.createElement('canvas');
      canvas.width = fw * cl;
      canvas.height = fh * rl;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no 2d context');
      ctx.imageSmoothingEnabled = false;
      imgs.forEach((img, i) => {
        // Contain-fit centered in its frame cell; nearest-neighbor keeps pixel art crisp.
        const s = Math.min(fw / img.naturalWidth, fh / img.naturalHeight);
        const dw = Math.max(1, Math.round(img.naturalWidth * s));
        const dh = Math.max(1, Math.round(img.naturalHeight * s));
        const gx = (i % cl) * fw;
        const gy = Math.floor(i / cl) * fh;
        ctx.drawImage(img, gx + Math.round((fw - dw) / 2), gy + Math.round((fh - dh) / 2), dw, dh);
      });
      const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png'));
      if (!blob) throw new Error('canvas.toBlob failed');
      let name = mergeName.trim() || 'sheet.png';
      if (!/\.png$/i.test(name)) name += '.png';
      const base = name.replace(/\.png$/i, '');
      let uniq = name, k = 1;
      while (assets.some(a => a.name === uniq)) { uniq = `${base}_${k}.png`; k++; }
      const res = await uploadAsset(projectName, new File([blob], uniq, { type: 'image/png' }));
      await load();
      setSelected(res?.name ? [res.name] : []);
    } catch (e) {
      console.warn('merge failed', e);
      window.alert(t('asset.mergeFailed'));
    }
    setMerging(false);
  };

  const handleSelect = (name: string) => {
    onSelect?.(name);
    onClose();
  };

  const handleCardClick = (name: string) => {
    if (mode === 'pick') { handleSelect(name); return; }
    setSelected(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const selectAll = () => setSelected(assets.map(a => a.name));
  const clearSel = () => setSelected([]);

  return (
    <div className="modal-overlay">
      <div className="modal asset-modal">
        <h3>{mode === 'pick' ? t('asset.pickTitle') : t('asset.manageTitle')}</h3>
        <div className="asset-toolbar">
          <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.bmp,.wav,.mp3,.aif,.aiff" style={{ display: 'none' }} onChange={handleUpload} />
          <audio ref={audioRef} />
          <button className="build-btn" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? t('asset.uploading') : t('asset.upload')}
          </button>
          {mode === 'manage' && assets.length > 0 && (
            <>
              <button className="asset-action-btn" onClick={selectAll}>{t('asset.selectAll')}</button>
              {selected.length > 0 && <button className="asset-action-btn" onClick={clearSel}>{t('asset.clearSel')}</button>}
            </>
          )}
          <span className="asset-count">
            {visible.length} {t('asset.files')}{mode === 'manage' && selected.length > 0 ? ` · ${selected.length} ${t('asset.selected')}` : ''}
          </span>
        </div>
        {uploadErr && <div className="asset-error">{uploadErr}</div>}
        {mode === 'manage' && selected.length > 0 && (
          <div className="asset-action-bar">
            <span className="asset-action-name">
              {selected.length === 1 ? selected[0] : `${selected.length} ${t('asset.selected')}`}
            </span>
            {selected.length === 1 && (
              <button className="asset-action-btn" onClick={() => onGenerate?.(selected[0])}>{t('asset.generate')}</button>
            )}
            <button className="asset-action-btn danger" onClick={handleDeleteMany} disabled={deleting}>
              {t('asset.delete')}{selected.length > 1 && !deleting ? ` (${selected.length})` : ''}
            </button>
          </div>
        )}
        {mode === 'manage' && imageSel.length >= 1 && (
          <div className="asset-merge-bar">
            <label>{t('asset.frameW')}
              <input type="number" min={1} value={frameW} onChange={e => setFrameW(Math.max(1, Number(e.target.value) || 1))} />
            </label>
            <label>{t('asset.frameH')}
              <input type="number" min={1} value={frameH} onChange={e => setFrameH(Math.max(1, Number(e.target.value) || 1))} />
            </label>
            <label>{t('asset.cols')}
              <input type="number" min={1} value={cols} onChange={e => setCols(Math.max(1, Number(e.target.value) || 1))} />
            </label>
            <label>{t('asset.rows')}
              <input type="number" min={1} value={rows} onChange={e => setRows(Math.max(1, Number(e.target.value) || 1))} />
            </label>
            <label>{t('asset.mergeName')}
              <input type="text" value={mergeName} onChange={e => setMergeName(e.target.value)} />
            </label>
            <button className="asset-action-btn" onClick={handleMerge} disabled={merging || imageSel.length < 2}>
              {merging ? t('asset.merging') : t('asset.merge')}
            </button>
            <span className="asset-merge-hint">{t('asset.mergeHint')}</span>
          </div>
        )}
        {mode === 'manage' && imageSel.length >= 1 && (
          <div className="asset-preview-wrap">
            <canvas ref={previewRef} className="asset-preview" />
          </div>
        )}
        {loading ? (
          <div className="asset-empty">{t('asset.loading')}</div>
        ) : visible.length === 0 ? (
          <div className="asset-empty">{t('asset.empty')}</div>
        ) : (
          <div className="asset-grid">
            {visible.map(a => {
              const idx = selected.indexOf(a.name);
              return (
                <div key={a.name} className={`asset-card${idx >= 0 ? ' selected' : ''}`} onClick={() => handleCardClick(a.name)}>
                  {mode === 'manage' && idx >= 0 && <span className="asset-badge">{idx + 1}</span>}
                  {isAudio(a.name) ? (
                    <div className="asset-thumb asset-thumb-audio">
                      🎵
                      <button className="asset-play" title={t('asset.preview')}
                        onClick={(e) => { e.stopPropagation(); togglePlay(a.name); }}>
                        {playing === a.name ? '⏸' : '▶'}
                      </button>
                    </div>
                  ) : (
                    <img src={assetRawUrl(projectName, a.name)} alt={a.name} className="asset-thumb" />
                  )}
                  <div className="asset-name" title={a.name}>{a.name}</div>
                </div>
              );
            })}
          </div>
        )}
        <div className="modal-actions">
          <button onClick={onClose}>{t('app.close')}</button>
        </div>
      </div>
    </div>
  );
}
