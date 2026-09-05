import { useState, useEffect, useRef } from 'react';
import { listAssets, uploadAsset, deleteAsset, assetRawUrl, type AssetInfo } from '../api';
import { useI18n } from '../i18n';

interface Props {
  projectName: string;
  mode: 'manage' | 'pick';
  onSelect?: (name: string) => void;
  onGenerate?: (name: string) => void;
  onClose: () => void;
}

export default function AssetManager({ projectName, mode, onSelect, onGenerate, onClose }: Props) {
  const { t } = useI18n();
  const [assets, setAssets] = useState<AssetInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try { setAssets(await listAssets(projectName)); } catch { }
    setLoading(false);
  };
  useEffect(() => { load(); }, [projectName]);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadAsset(projectName, file);
      await load();
    } catch (e) { console.warn('upload failed', e); }
    if (fileRef.current) fileRef.current.value = '';
    setUploading(false);
  };

  const handleDelete = async (name: string) => {
    try {
      await deleteAsset(projectName, name);
      setSelected(null);
      await load();
    } catch (e) { console.warn('delete failed', e); }
  };

  const handleSelect = (name: string) => {
    onSelect?.(name);
    onClose();
  };

  const handleCardClick = (name: string) => {
    if (mode === 'pick') { handleSelect(name); return; }
    setSelected(selected === name ? null : name);
  };

  return (
    <div className="modal-overlay">
      <div className="modal asset-modal">
        <h3>{mode === 'pick' ? t('asset.pickTitle') : t('asset.manageTitle')}</h3>
        <div className="asset-toolbar">
          <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.bmp,image/*" style={{ display: 'none' }} onChange={handleUpload} />
          <button className="build-btn" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? t('asset.uploading') : t('asset.upload')}
          </button>
          <span className="asset-count">{assets.length} {t('asset.files')}</span>
        </div>
        {selected && (
          <div className="asset-action-bar">
            <span className="asset-action-name">{selected}</span>
            <button className="asset-action-btn" onClick={() => onGenerate?.(selected)}>{t('asset.generate')}</button>
            <button className="asset-action-btn danger" onClick={() => handleDelete(selected)}>{t('asset.delete')}</button>
          </div>
        )}
        {loading ? (
          <div className="asset-empty">{t('asset.loading')}</div>
        ) : assets.length === 0 ? (
          <div className="asset-empty">{t('asset.empty')}</div>
        ) : (
          <div className="asset-grid">
            {assets.map(a => (
              <div key={a.name} className={`asset-card${selected === a.name ? ' selected' : ''}`} onClick={() => handleCardClick(a.name)}>
                <img src={assetRawUrl(projectName, a.name)} alt={a.name} className="asset-thumb" />
                <div className="asset-name" title={a.name}>{a.name}</div>
              </div>
            ))}
          </div>
        )}
        <div className="modal-actions">
          <button onClick={onClose}>{t('app.close')}</button>
        </div>
      </div>
    </div>
  );
}
