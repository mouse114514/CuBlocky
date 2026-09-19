import { useState, useRef, useCallback, type DragEvent, type MouseEvent } from 'react';
import type { UIControl } from '../types';
import { useI18n } from '../i18n';

const REF_W = 1920;
const REF_H = 1080;

const PALETTE: { type: UIControl['type']; icon: string; key: string }[] = [
  { type: 'button', icon: '▣', key: 'ui.button' },
  { type: 'textfield', icon: '▭', key: 'ui.textfield' },
  { type: 'toggle', icon: '◐', key: 'ui.toggle' },
];

function defaultProps(type: UIControl['type'], xPct: number, yPct: number, idx: number): UIControl {
  const base = {
    id: `${type}${idx}`,
    x: Math.max(0, xPct - 0.03),
    y: Math.max(0, yPct - 0.015),
    fontSize: 14,
    textColor: '#FFFFFF',
    backgroundColor: '#2a2a3e',
    strokeColor: '#555577',
    strokeWidth: 1,
    cornerRadius: 4,
    opacity: 1,
    visible: true,
  };
  if (type === 'button') return { ...base, type, width: 0.063, height: 0.030, text: `Button${idx}` };
  if (type === 'textfield') return { ...base, type, width: 0.083, height: 0.024, text: '' };
  return { ...base, type, width: 0.073, height: 0.024, text: `Toggle${idx}` };
}

interface Props {
  controls: UIControl[];
  onChange: (controls: UIControl[]) => void;
  onBack: () => void;
}

export function UIEditor({ controls, onChange, onBack }: Props) {
  const { t } = useI18n();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  const selected = controls.find(c => c.id === selectedId) || null;

  const updateControl = useCallback((id: string, patch: Partial<UIControl>) => {
    onChange(controls.map(c => (c.id === id ? { ...c, ...patch } : c)));
  }, [controls, onChange]);

  const deleteControl = useCallback((id: string) => {
    onChange(controls.filter(c => c.id !== id));
    if (selectedId === id) setSelectedId(null);
  }, [controls, onChange, selectedId]);

  const duplicateControl = useCallback((id: string) => {
    const orig = controls.find(c => c.id === id);
    if (!orig) return;
    let idx = 1;
    let newId = `${orig.type}${idx}`;
    while (controls.some(c => c.id === newId)) { idx++; newId = `${orig.type}${idx}`; }
    const copy: UIControl = { ...orig, id: newId, x: Math.min(1, orig.x + 0.02), y: Math.min(1, orig.y + 0.02) };
    onChange([...controls, copy]);
    setSelectedId(newId);
  }, [controls, onChange]);

  const handlePaletteDragStart = (e: DragEvent, type: UIControl['type']) => {
    e.dataTransfer.setData('text/cublocky-ui-palette', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const getCanvasPct = (e: DragEvent | MouseEvent): { x: number; y: number } => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: ((e as any).clientX - rect.left) / rect.width,
      y: ((e as any).clientY - rect.top) / rect.height,
    };
  };

  const handleCanvasDrop = (e: DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('text/cublocky-ui-palette') as UIControl['type'];
    if (!type) return;
    const pos = getCanvasPct(e);
    let idx = 1;
    while (controls.some(c => c.id === `${type}${idx}`)) idx++;
    const ctrl = defaultProps(type, pos.x, pos.y, idx);
    onChange([...controls, ctrl]);
    setSelectedId(ctrl.id);
  };

  const handleControlMouseDown = (e: MouseEvent, ctrl: UIControl) => {
    e.stopPropagation();
    setSelectedId(ctrl.id);
    const pos = getCanvasPct(e);
    dragState.current = { id: ctrl.id, offsetX: pos.x - ctrl.x, offsetY: pos.y - ctrl.y };
  };

  const handleCanvasMouseMove = (e: MouseEvent) => {
    if (!dragState.current) return;
    const { id, offsetX, offsetY } = dragState.current;
    const pos = getCanvasPct(e);
    const x = Math.max(0, Math.min(1, pos.x - offsetX));
    const y = Math.max(0, Math.min(1, pos.y - offsetY));
    onChange(controls.map(c => (c.id === id ? { ...c, x, y } : c)));
  };

  const handleCanvasMouseUp = () => {
    dragState.current = null;
  };

  const handleCanvasClick = () => {
    setSelectedId(null);
  };

  const renderControl = (ctrl: UIControl) => {
    const isSel = ctrl.id === selectedId;
    const style: React.CSSProperties = {
      position: 'absolute',
      left: `${ctrl.x * 100}%`,
      top: `${ctrl.y * 100}%`,
      width: `${ctrl.width * 100}%`,
      height: `${ctrl.height * 100}%`,
      background: ctrl.backgroundColor,
      border: `${ctrl.strokeWidth}px solid ${ctrl.strokeColor}`,
      borderRadius: `${ctrl.cornerRadius}px`,
      opacity: ctrl.visible ? ctrl.opacity : ctrl.opacity * 0.35,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: ctrl.textColor,
      fontSize: `${ctrl.fontSize}px`,
      cursor: 'move',
      userSelect: 'none',
      outline: isSel ? '2px dashed #00acc1' : 'none',
      boxSizing: 'border-box',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
    };
    return (
      <div
        key={ctrl.id}
        style={style}
        onMouseDown={(e) => handleControlMouseDown(e, ctrl)}
        onClick={(e) => e.stopPropagation()}
      >
        {ctrl.type === 'toggle' && (
          <span style={{ marginRight: 4, fontSize: '0.8em' }}>○</span>
        )}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ctrl.text || (ctrl.type === 'textfield' ? '…' : '')}</span>
      </div>
    );
  };

  return (
    <div className="ui-editor">
      <header className="toolbar ui-toolbar">
        <button onClick={onBack}>{t('app.backToBlocks')}</button>
        <span className="logo">{t('app.uiEditor')}</span>
        <span className="spacer" />
        <span className="ui-hint">{controls.length} {controls.length === 1 ? 'control' : 'controls'}</span>
      </header>
      <div className="ui-body">
        {/* Palette */}
        <div className="ui-palette">
          <div className="ui-palette-header">{t('ui.palette')}</div>
          {PALETTE.map(p => (
            <div
              key={p.type}
              className="ui-palette-item"
              draggable
              onDragStart={(e) => handlePaletteDragStart(e, p.type)}
            >
              <span className="ui-palette-icon">{p.icon}</span>
              <span>{t(p.key)}</span>
            </div>
          ))}
        </div>

        {/* Canvas */}
        <div className="ui-canvas-wrap">
          <div className="ui-canvas-header">{t('ui.canvas')} ({REF_W}×{REF_H} ref)</div>
          <div className="ui-canvas-scroll">
            <div
              ref={canvasRef}
              className="ui-canvas"
              style={{ aspectRatio: `${REF_W} / ${REF_H}` }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleCanvasDrop}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              onClick={handleCanvasClick}
            >
              {controls.length === 0 && (
                <div className="ui-canvas-empty">{t('ui.empty')}</div>
              )}
              {controls.map(renderControl)}
            </div>
          </div>
        </div>

        {/* Properties */}
        <div className="ui-props">
          <div className="ui-props-header">{t('ui.properties')}</div>
          {!selected ? (
            <div className="ui-props-empty">{t('ui.noSelection')}</div>
          ) : (
            <div className="ui-props-body">
              <label className="ui-prop">
                <span>{t('ui.id')}</span>
                <input value={selected.id} onChange={(e) => updateControl(selected.id, { id: e.target.value })} />
              </label>
              <label className="ui-prop">
                <span>{t('ui.text')}</span>
                <input value={selected.text} onChange={(e) => updateControl(selected.id, { text: e.target.value })} />
              </label>
              <div className="ui-prop-row">
                <label className="ui-prop">
                  <span>{t('ui.x')} (px)</span>
                  <input type="number" value={Math.round(selected.x * REF_W)} onChange={(e) => updateControl(selected.id, { x: +e.target.value / REF_W })} />
                </label>
                <label className="ui-prop">
                  <span>{t('ui.y')} (px)</span>
                  <input type="number" value={Math.round(selected.y * REF_H)} onChange={(e) => updateControl(selected.id, { y: +e.target.value / REF_H })} />
                </label>
              </div>
              <div className="ui-prop-row">
                <label className="ui-prop">
                  <span>{t('ui.width')} (px)</span>
                  <input type="number" value={Math.round(selected.width * REF_W)} onChange={(e) => updateControl(selected.id, { width: +e.target.value / REF_W })} />
                </label>
                <label className="ui-prop">
                  <span>{t('ui.height')} (px)</span>
                  <input type="number" value={Math.round(selected.height * REF_H)} onChange={(e) => updateControl(selected.id, { height: +e.target.value / REF_H })} />
                </label>
              </div>
              <label className="ui-prop">
                <span>{t('ui.fontSize')}</span>
                <input type="number" value={selected.fontSize} onChange={(e) => updateControl(selected.id, { fontSize: +e.target.value })} />
              </label>
              <div className="ui-prop-row">
                <label className="ui-prop">
                  <span>{t('ui.textColor')}</span>
                  <input type="color" value={selected.textColor} onChange={(e) => updateControl(selected.id, { textColor: e.target.value })} />
                </label>
                <label className="ui-prop">
                  <span>{t('ui.bgColor')}</span>
                  <input type="color" value={selected.backgroundColor} onChange={(e) => updateControl(selected.id, { backgroundColor: e.target.value })} />
                </label>
              </div>
              <div className="ui-prop-row">
                <label className="ui-prop">
                  <span>{t('ui.strokeColor')}</span>
                  <input type="color" value={selected.strokeColor} onChange={(e) => updateControl(selected.id, { strokeColor: e.target.value })} />
                </label>
                <label className="ui-prop">
                  <span>{t('ui.strokeWidth')}</span>
                  <input type="number" value={selected.strokeWidth} onChange={(e) => updateControl(selected.id, { strokeWidth: +e.target.value })} />
                </label>
              </div>
              <div className="ui-prop-row">
                <label className="ui-prop">
                  <span>{t('ui.cornerRadius')}</span>
                  <input type="number" value={selected.cornerRadius} onChange={(e) => updateControl(selected.id, { cornerRadius: +e.target.value })} />
                </label>
                <label className="ui-prop">
                  <span>{t('ui.opacity')}</span>
                  <input type="number" step="0.1" min="0" max="1" value={selected.opacity} onChange={(e) => updateControl(selected.id, { opacity: +e.target.value })} />
                </label>
              </div>
              <label className="ui-prop ui-prop-check">
                <input type="checkbox" checked={selected.visible} onChange={(e) => updateControl(selected.id, { visible: e.target.checked })} />
                <span>{t('ui.visible')}</span>
              </label>
              <div className="ui-prop-row">
                <span className="ui-align-label">{t('ui.alignH')}</span>
                <button className="ui-align-btn" title={t('ui.alignLeft')} onClick={() => updateControl(selected.id, { x: 0 })}>⇤</button>
                <button className="ui-align-btn" title={t('ui.alignCenterH')} onClick={() => updateControl(selected.id, { x: (1 - selected.width) / 2 })}>⇔</button>
                <button className="ui-align-btn" title={t('ui.alignRight')} onClick={() => updateControl(selected.id, { x: 1 - selected.width })}>⇥</button>
              </div>
              <div className="ui-prop-row">
                <span className="ui-align-label">{t('ui.alignV')}</span>
                <button className="ui-align-btn" title={t('ui.alignTop')} onClick={() => updateControl(selected.id, { y: 0 })}>⇤</button>
                <button className="ui-align-btn" title={t('ui.alignCenterV')} onClick={() => updateControl(selected.id, { y: (1 - selected.height) / 2 })}>⇕</button>
                <button className="ui-align-btn" title={t('ui.alignBottom')} onClick={() => updateControl(selected.id, { y: 1 - selected.height })}>⇥</button>
              </div>
              <div className="ui-prop-actions">
                <button onClick={() => duplicateControl(selected.id)}>{t('ui.duplicate')}</button>
                <button className="danger" onClick={() => deleteControl(selected.id)}>{t('ui.delete')}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
