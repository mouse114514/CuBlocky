import { useState } from 'react';
import type { ItemEntry } from '../types';
import { useI18n } from '../i18n';
import { BlockEditor } from './BlockEditor';

const CATEGORIES = ['food', 'tool', 'weapon', 'medicine', 'nospawn', 'trash'];

interface Props {
  item: ItemEntry;
  onChange: (next: ItemEntry) => void;
  onDelete: () => void;
}

type Tab = 'props' | 'onUse' | 'onUseLimb';

export function ItemForm({ item, onChange, onDelete }: Props) {
  const { t, lang } = useI18n();
  const [tab, setTab] = useState<Tab>('props');
  const set = <K extends keyof ItemEntry>(k: K, v: ItemEntry[K]) =>
    onChange({ ...item, [k]: v });

  return (
    <div className="item-editor">
      {/* ── Tab bar ── */}
      <div className="item-tabs">
        <button
          className={`item-tab${tab === 'props' ? ' active' : ''}`}
          onClick={() => setTab('props')}
        >
          {t('tab.props')}
        </button>
        <button
          className={`item-tab${tab === 'onUse' ? ' active' : ''}`}
          onClick={() => setTab('onUse')}
        >
          {t('tab.onUse')}
          {item.useAction && item.useAction.trim() && <span className="tab-badge">✓</span>}
        </button>
        <button
          className={`item-tab${tab === 'onUseLimb' ? ' active' : ''}`}
          onClick={() => setTab('onUseLimb')}
        >
          {t('tab.onUseLimb')}
          {item.useLimbAction && item.useLimbAction.trim() && <span className="tab-badge">✓</span>}
        </button>
        <span className="spacer" />
        <button className="danger small" onClick={onDelete}>{t('item.delete')}</button>
      </div>

      {/* ── Tab content ── */}
      {tab === 'props' && (
        <div className="form item-props">
          <div className="form-row">
            <label>{t('item.id')}<input value={item.id} onChange={e => set('id', e.target.value)} /></label>
            <label>{t('item.fullName')}<input value={item.fullName} onChange={e => set('fullName', e.target.value)} /></label>
          </div>
          <label className="full">{t('item.desc')}
            <textarea value={item.description} onChange={e => set('description', e.target.value)} />
          </label>
          <div className="form-row">
            <label>{t('item.category')}
              <select value={item.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label>{t('item.weight')}<input type="number" step="0.1" value={item.weight} onChange={e => set('weight', parseFloat(e.target.value) || 0)} /></label>
            <label>{t('item.value')}<input type="number" value={item.value} onChange={e => set('value', parseInt(e.target.value) || 0)} /></label>
          </div>
          <div className="form-row">
            <label>{t('item.decay')}<input type="number" value={item.decayMinutes} onChange={e => set('decayMinutes', parseFloat(e.target.value) || 0)} /></label>
            <label>{t('item.recognition')}<input type="number" value={item.recognition} onChange={e => set('recognition', parseInt(e.target.value) || 0)} /></label>
            <label>{t('item.spawnFreq')}<input type="number" value={item.spawnFrequency} onChange={e => set('spawnFrequency', parseInt(e.target.value) || 0)} /></label>
          </div>
          <label className="full">{t('item.tags')}
            <input value={item.tags} onChange={e => set('tags', e.target.value)} />
          </label>
          <div className="form-note">{t('item.spriteHint', { id: item.id })}</div>
        </div>
      )}

      {tab === 'onUse' && (
        <BlockEditor
          onCodeChange={code => set('useAction', code)}
          onBlocksChange={xml => set('useActionXml', xml)}
        />
      )}

      {tab === 'onUseLimb' && (
        <BlockEditor
          onCodeChange={code => set('useLimbAction', code)}
          onBlocksChange={xml => set('useLimbActionXml', xml)}
        />
      )}
    </div>
  );
}
