import { useState, useEffect, useRef } from 'react';
import { listAssets, uploadAsset, deleteAsset, type AssetInfo } from '../api';
import { useI18n } from '../i18n';

interface Props {
  mode: 'manage' | 'pick';
  onSelect?: (name: string) => void;
  onClose: () => void;
}

export default function AssetManager({ mode, onSelect, onClose }: Props) {
  const { t } = useI18n();
  const [assets, setAssets] = useState<AssetInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try { setAssets(await listAssets()); } catch { }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadAsset(file);
      await load();
    } catch (e) { console.warn('upload failed', e); }
    if (fileRef.current) fileRef.current.value = '';
    setUploading(false);
  };

  const handleDelete = async (name: string) => {
    try {
      await deleteAsset(name);
      await load();
    } catch (e) { console.warn('delete failed', e); }
  };

  const handleSelect = (name: string) => {
    onSelect?.(name);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal asset-modal" onClick={e => e.stopPropagation()}>
        <h3>{mode === 'pick' ? t('asset.pickTitle') : t('asset.manageTitle')}</h3>
        <div className="asset-toolbar">
          <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.bmp,image/*" style={{ display: 'none' }} onChange={handleUpload} />
          <button className="build-btn" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? t('asset.uploading') : t('asset.upload')}
          </button>
          <span className="asset-count">{assets.length} {t('asset.files')}</span>
        </div>
        {loading ? (
          <div className="asset-empty">{t('asset.loading')}</div>
        ) : assets.length === 0 ? (
          <div className="asset-empty">{t('asset.empty')}</div>
        ) : (
          <div className="asset-grid">
            {assets.map(a => (
              <div key={a.name} className="asset-card" onClick={() => mode === 'pick' ? handleSelect(a.name) : undefined}>
                <img src={`/api/assets/raw/${encodeURIComponent(a.name)}`} alt={a.name} className="asset-thumb" />
                <div className="asset-name" title={a.name}>{a.name}</div>
                {mode === 'manage' && (
                  <button className="asset-del" title={t('asset.delete')} onClick={e => { e.stopPropagation(); handleDelete(a.name); }}>×</button>
                )}
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
