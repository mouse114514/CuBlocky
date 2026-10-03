import { useI18n, LANG_LABELS, type Lang } from '../i18n';

interface Props {
  title: string;
  desc?: string;
  current: Lang;
  onPick: (l: Lang) => void;
  // Omit to make the modal undismissable (first-run language choice).
  onClose?: () => void;
}

export function LangPicker({ title, desc, current, onPick, onClose }: Props) {
  const { t } = useI18n();
  return (
    <div className="modal-overlay">
      <div className="modal lang-picker" onClick={e => e.stopPropagation()}>
        <h3>{title}</h3>
        {desc && <p className="modal-hint">{desc}</p>}
        <div className="lang-list">
          {(Object.keys(LANG_LABELS) as Lang[]).map(l => (
            <button
              key={l}
              className={`lang-option${l === current ? ' active' : ''}`}
              onClick={() => onPick(l)}
            >
              {LANG_LABELS[l]}
            </button>
          ))}
        </div>
        {onClose && (
          <div className="modal-actions">
            <button onClick={onClose}>{t('app.close')}</button>
          </div>
        )}
      </div>
    </div>
  );
}
