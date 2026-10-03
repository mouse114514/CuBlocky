import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useI18n } from '../i18n';
import { getConfig } from '../api';
import {
  TOKEN_URL,
  fetchManifest, submitProject, installEntry,
  listProjects, listAssets, fetchBlueprint, projectCbpBytes,
  getToken, setToken, clearToken, maskToken, iconUrl,
  type MarketEntry, type ServerProject, type ServerAsset,
} from '../market';

const fmtBytes = (n: number) =>
  n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB'
  : n >= 1024 ? (n / 1024).toFixed(1) + ' KB'
  : n + ' B';

function CardIcon({ src }: { src?: string }) {
  const [ok, setOk] = useState(true);
  if (!src || !ok) return <span className="mt-card-icon">?</span>;
  return (
    <span className="mt-card-icon">
      <img src={src} alt="" onError={() => setOk(false)} />
    </span>
  );
}

export default function Marketplace({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();

  const [entries, setEntries] = useState<MarketEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<Record<string, string>>({});

  const [showSubmit, setShowSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState('');
  const [pr, setPr] = useState<{ number: number; url: string } | null>(null);

  const [tokInput, setTokInput] = useState('');
  const [tokSaved, setTokSaved] = useState(getToken());
  const [tokErr, setTokErr] = useState('');

  const [projList, setProjList] = useState<ServerProject[]>([]);
  const [projName, setProjName] = useState('');
  const [projAssets, setProjAssets] = useState<ServerAsset[]>([]);
  const [projCbp, setProjCbp] = useState(0);
  const [projMeta, setProjMeta] = useState<{ name: string; version: string } | null>(null);

  const [desc, setDesc] = useState('');
  const [author, setAuthor] = useState('');
  const [license, setLicense] = useState('MIT');
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState('');

  const [partSize, setPartSize] = useState(9);

  useEffect(() => {
    (async () => {
      try {
        const [cfg, manifest] = await Promise.all([
          getConfig().catch(() => null),
          fetchManifest(),
        ]);
        if (cfg && cfg.partSizeMb) setPartSize(cfg.partSizeMb);
        setEntries(manifest);
      } catch (e: any) {
        setErr(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return entries;
    return entries.filter(e =>
      e.slug.toLowerCase().includes(s) ||
      (e.name || '').toLowerCase().includes(s) ||
      (e.author || '').toLowerCase().includes(s));
  }, [entries, q]);

  async function onInstall(e: MarketEntry) {
    setErr('');
    setBusy(b => ({ ...b, [e.slug]: t('market.installing') }));
    try {
      const r = await installEntry(e);
      setBusy(b => ({ ...b, [e.slug]: t('market.installed', { name: r.name, count: String(r.assets) }) }));
    } catch (ex: any) {
      setBusy(b => ({ ...b, [e.slug]: '' }));
      setErr(t('market.error', { msg: String(ex?.message || ex) }));
    }
  }

  function openSubmit() {
    setTokErr('');
    setSubmitErr('');
    setPr(null);
    setTokSaved(getToken());
    setShowSubmit(true);
    listProjects()
      .then(setProjList)
      .catch((e: any) => setSubmitErr(String(e?.message || e)));
  }

  function closeSubmit() {
    setShowSubmit(false);
    setProjName('');
    setProjAssets([]);
    setProjCbp(0);
    setProjMeta(null);
    setDesc('');
    setAuthor('');
    setLicense('MIT');
    setIconFile(null);
    setTokInput('');
    if (iconPreview) URL.revokeObjectURL(iconPreview);
    setIconPreview('');
    setTokSaved(getToken());
  }

  async function onPickProject(sel: string) {
    setProjName(sel);
    setProjAssets([]);
    setProjCbp(0);
    setProjMeta(null);
    setSubmitErr('');
    if (!sel) return;
    try {
      const [bp, assets] = await Promise.all([fetchBlueprint(sel), listAssets(sel)]);
      setProjAssets(assets);
      setProjCbp((await projectCbpBytes(sel)).length);
      if (bp && bp.mod) {
        setProjMeta({
          name: typeof bp.mod.name === 'string' ? bp.mod.name : sel,
          version: typeof bp.mod.version === 'string' ? bp.mod.version : '',
        });
        if (typeof bp.mod.description === 'string') setDesc(bp.mod.description);
      } else {
        setProjMeta({ name: sel, version: '' });
      }
    } catch (e: any) {
      setSubmitErr(String(e?.message || e));
    }
  }

  function onIcon(ev: ChangeEvent<HTMLInputElement>) {
    const f = ev.target.files && ev.target.files[0];
    if (iconPreview) URL.revokeObjectURL(iconPreview);
    setIconPreview(f ? URL.createObjectURL(f) : '');
    setIconFile(f || null);
  }

  function onSaveTok() {
    const v = tokInput.trim();
    setTokErr('');
    if (!v) { setTokErr(t('market.tokenRequired')); return; }
    setToken(v, false);
    setTokInput('');
    setTokSaved(getToken());
  }

  function onClearTok() {
    clearToken();
    setTokSaved('');
  }

  async function onDoSubmit() {
    if (!tokSaved || !projName) return;
    setSubmitting(true);
    setSubmitErr('');
    setPr(null);
    try {
      const r = await submitProject(projName, iconFile, {
        name: projMeta?.name || projName,
        author,
        version: projMeta?.version || '1.0.0',
        description: desc,
        license: license || 'MIT',
      }, partSize);
      setPr(r);
    } catch (e: any) {
      setSubmitErr(String(e?.message || e));
    } finally {
      setSubmitting(false);
    }
  }

  const assetTotal = projAssets.reduce((s, a) => s + a.size, 0);
  const canSubmit = !!(tokSaved && projName && !submitting);

  return (
    <div className="mt-page">
      <header className="toolbar">
        <span className="logo">CuBlocky</span>
        <button onClick={onBack}>{t('market.back')}</button>
        <span className="spacer" />
        <input className="block-search" type="text" value={q} onChange={e => setQ(e.target.value)} placeholder={t('market.search')} />
        <button className="build-btn" onClick={openSubmit}>{t('market.submit')}</button>
      </header>

      <div className="mt-body">
        <div className="mt-head">
          <h2 className="mt-title">{t('market.title')}</h2>
          <p className="mt-sub">{t('market.sub')}</p>
        </div>

        {err && <div className="wp-error" style={{ width: '100%', maxWidth: 1000 }}>{err}</div>}

        {loading ? (
          <div className="mt-empty">{t('market.loading')}</div>
        ) : shown.length === 0 ? (
          <div className="mt-empty">{entries.length === 0 ? t('market.empty') : t('market.search')}</div>
        ) : (
          <div className="mt-grid">
            {shown.map(e => (
              <div key={e.slug} className="mt-card">
                <div className="mt-card-head">
                  <CardIcon src={iconUrl(e)} />
                  <div className="mt-card-title">
                    <div className="mt-card-name">{e.name || e.slug}</div>
                    {e.author && <div className="mt-card-meta">{e.author}{e.version ? ' · v' + e.version : ''}</div>}
                  </div>
                </div>
                {e.description && <div className="mt-card-desc">{e.description}</div>}
                <div className="mt-card-foot">
                  <span className="mt-card-assets">{(e.assets || []).length} {(e.assets || []).length === 1 ? 'asset' : 'assets'}</span>
                  <button className="mt-btn mt-btn-primary mt-btn-sm" onClick={() => onInstall(e)} disabled={!!busy[e.slug]}>
                    {busy[e.slug] || t('market.install')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showSubmit && (
        <div className="modal-overlay" onClick={closeSubmit}>
          <div className="modal mt-modal" onClick={e => e.stopPropagation()}>
            <div className="mt-modal-head">
              <h3>{t('market.submitTitle')}</h3>
              <button className="mt-close" onClick={closeSubmit}>×</button>
            </div>
            <div className="mt-modal-body">
              <p className="mt-section-desc">{t('market.submitDesc')}</p>

              <div className="mt-section">
                <div className="mt-section-title">{t('market.token')}</div>
                {tokSaved ? (
                  <div className="mt-token-row">
                    <span className="mt-token-info">{maskToken(tokSaved)}</span>
                    <button className="mt-btn mt-btn-ghost mt-btn-sm" onClick={onClearTok}>{t('market.forgetToken')}</button>
                  </div>
                ) : (
                  <>
                    <div className="mt-token-row">
                      <input className="mt-token-info" type="text" value={tokInput} placeholder={t('market.tokenPlaceholder')} onChange={e => setTokInput(e.target.value)} />
                      <button className="mt-btn mt-btn-sm" onClick={onSaveTok} disabled={!tokInput.trim()}>{t('market.save')}</button>
                    </div>
                    <a className="mt-btn mt-btn-ghost mt-btn-sm mt-token-link" href={TOKEN_URL} target="_blank" rel="noreferrer">
                      {t('market.tokenLink')} →
                    </a>
                    <div className="mt-hint">{t('market.tokenScope')}</div>
                    <div className="mt-hint">{t('market.tokenHint')}</div>
                    {tokErr && <div className="modal-err">{tokErr}</div>}
                  </>
                )}
              </div>

              <div className="wp-form">
                <label>
                  <span className="wp-field-label">{t('market.pickServer')}</span>
                  {projList.length === 0 ? (
                    <span className="mt-hint">{t('market.noProjects')}</span>
                  ) : (
                    <select value={projName} onChange={e => onPickProject(e.target.value)}>
                      <option value="">{t('market.pickServer')}</option>
                      {projList.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                    </select>
                  )}
                </label>

                {projName && (
                  <div className="mt-pick-label has" style={{ borderStyle: 'solid' }}>
                    <span className="txt">
                      {projMeta ? projMeta.name : projName}
                      {projMeta && projMeta.version ? ' · v' + projMeta.version : ''}
                    </span>
                    <span style={{ flex: 1 }} />
                    <span className="mt-card-assets">
                      {t('market.summary', {
                        cbp: projCbp ? fmtBytes(projCbp) : '…',
                        count: String(projAssets.length),
                        assets: fmtBytes(assetTotal),
                      })}
                    </span>
                  </div>
                )}

                <label>
                  <span className="wp-field-label">{t('market.author')}</span>
                  <input type="text" value={author} onChange={e => setAuthor(e.target.value)} />
                </label>

                <label>
                  <span className="wp-field-label">{t('market.description')}</span>
                  <textarea value={desc} onChange={e => setDesc(e.target.value)} />
                </label>

                <div className="form-row">
                  <label>
                    <span className="wp-field-label">{t('market.license')}</span>
                    <input type="text" value={license} placeholder={t('market.licenseDefault')} onChange={e => setLicense(e.target.value)} />
                  </label>
                  <label className="mt-pick">
                    <input type="file" accept="image/png,image/jpeg,image/jpg,image/bmp" onChange={onIcon} />
                    <span className="mt-pick-label">
                      {iconPreview ? <span className="mt-thumb"><img src={iconPreview} alt="" /></span> : <span className="mt-thumb">?</span>}
                      <span className="txt">{t('market.icon')}</span>
                    </span>
                    <span className="mt-hint">{t('market.iconHint')}</span>
                  </label>
                </div>
              </div>

              {pr && (
                <div className="mt-status ok">
                  {t('market.submitted', { num: String(pr.number) })}{' '}
                  <a href={pr.url} target="_blank" rel="noreferrer">{t('market.openPr')}</a>
                </div>
              )}
              {submitErr && <div className="modal-err">{submitErr}</div>}
            </div>

            <div className="mt-actions">
              <button className="mt-btn mt-btn-ghost" onClick={closeSubmit}>{t('market.back')}</button>
              <button className="mt-btn mt-btn-primary" onClick={onDoSubmit} disabled={!canSubmit}>
                {submitting ? t('market.submitting') : t('market.submit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
