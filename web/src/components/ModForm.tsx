import type { ModMeta } from '../types';
import { useI18n } from '../i18n';

interface Props {
  mod: ModMeta;
  onChange: (next: ModMeta) => void;
}

export function ModForm({ mod, onChange }: Props) {
  const { t } = useI18n();
  const set = <K extends keyof ModMeta>(k: K, v: ModMeta[K]) =>
    onChange({ ...mod, [k]: v });

  return (
    <div className="form">
      <div className="form-row">
        <label>{t('mod.guid')}<input value={mod.guid} onChange={e => set('guid', e.target.value)} /></label>
        <label>{t('mod.name')}<input value={mod.name} onChange={e => set('name', e.target.value)} /></label>
      </div>
      <div className="form-row">
        <label>{t('mod.version')}<input value={mod.version} onChange={e => set('version', e.target.value)} /></label>
        <label>{t('mod.author')}<input value={mod.author} onChange={e => set('author', e.target.value)} /></label>
      </div>
      <label className="full">{t('mod.desc')}
        <textarea value={mod.description} onChange={e => set('description', e.target.value)} />
      </label>
      <label className="full">{t('mod.namespace')}
        <input value={mod.rootNamespace} onChange={e => set('rootNamespace', e.target.value)} />
      </label>
      <div className="form-note">{t('mod.guidHint')}</div>
    </div>
  );
}
