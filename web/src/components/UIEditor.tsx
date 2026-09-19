import { useState, useRef, useCallback, type DragEvent, type MouseEvent } from 'react';
import type { UIControl } from '../types';
import { useI18n } from '../i18n';

const CANVAS_W = 960;
const CANVAS_H = 540;

const PALETTE: { type: UIControl['type']; icon: string; key: string }[] = [
  { type: 'button', icon: '▣', key: 'ui.button' },
  { type: 'textfield', icon: '▭', key: 'ui.textfield' },
  { type: 'toggle', icon: '◐', key: 'ui.toggle' },
];

function defaultProps(type: UIControl['type'], x: number, y: number, idx: number): UIControl {
  const base = {
    id: `${type}${idx}`,
    x: Math.max(0, Math.round(x) - 50),
    y: Math.max(0, Math.round(y) - 15),
    fontSize: 14,
    textColor: '#FFFFFF',
    backgroundColor: '#2a2a3e',
    strokeColor: '#555577',
    strokeWidth: 1,
    cornerRadius: 4,
    opacity: 1,
    visible: true,
  };
  if (type === 'button') return { ...base, type, width: 120, height: 32, text: `Button${idx}` };
  if (type === 'textfield') return { ...base, type, width: 160, height: 26, text: '' };
  return { ...base, type, width: 140, height: 26, text: `Toggle${idx}` };
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
    const copy: UIControl = { ...orig, id: newId, x: orig.x + 20, y: orig.y + 20 };
    onChange([...controls, copy]);
    setSelectedId(newId);
  }, [controls, onChange]);

  const handlePaletteDragStart = (e: DragEvent, type: UIControl['type']) => {
    e.dataTransfer.setData('text/cublocky-ui-palette', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const getCanvasPos = (e: DragEvent | MouseEvent): { x: number; y: number } => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    return {
      x: ((e as any).clientX - rect.left) * scaleX,
      y: ((e as any).clientY - rect.top) * scaleY,
    };
  };

  const handleCanvasDrop = (e: DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('text/cublocky-ui-palette') as UIControl['type'];
    if (!type) return;
    const pos = getCanvasPos(e);
    let idx = 1;
    while (controls.some(c => c.id === `${type}${idx}`)) idx++;
    const ctrl = defaultProps(type, pos.x, pos.y, idx);
    onChange([...controls, ctrl]);
    setSelectedId(ctrl.id);
  };

  const handleControlMouseDown = (e: MouseEvent, ctrl: UIControl) => {
    e.stopPropagation();
    setSelectedId(ctrl.id);
    const pos = getCanvasPos(e);
    dragState.current = { id: ctrl.id, offsetX: pos.x - ctrl.x, offsetY: pos.y - ctrl.y };
  };

  const handleCanvasMouseMove = (e: MouseEvent) => {
    if (!dragState.current) return;
    const { id, offsetX, offsetY } = dragState.current;
    const pos = getCanvasPos(e);
    const x = Math.max(0, Math.min(CANVAS_W - 10, Math.round(pos.x - offsetX)));
    const y = Math.max(0, Math.min(CANVAS_H - 10, Math.round(pos.y - offsetY)));
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
      left: `${(ctrl.x / CANVAS_W) * 100}%`,
      top: `${(ctrl.y / CANVAS_H) * 100}%`,
      width: `${(ctrl.width / CANVAS_W) * 100}%`,
      height: `${(ctrl.height / CANVAS_H) * 100}%`,
      background: ctrl.backgroundColor,
      border: `${ctrl.strokeWidth}px solid ${ctrl.strokeColor}`,
      borderRadius: `${ctrl.cornerRadius}px`,
      opacity: ctrl.visible ? ctrl.opacity : ctrl.opacity * 0.35,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: ctrl.textColor,
      fontSize: `${(ctrl.fontSize / CANVAS_W) * 100}cqw`,
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
          <div className="ui-canvas-header">{t('ui.canvas')} ({CANVAS_W}×{CANVAS_H})</div>
          <div className="ui-canvas-scroll">
            <div
              ref={canvasRef}
              className="ui-canvas"
              style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
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
                  <span>{t('ui.x')}</span>
                  <input type="number" value={selected.x} onChange={(e) => updateControl(selected.id, { x: +e.target.value })} />
                </label>
                <label className="ui-prop">
                  <span>{t('ui.y')}</span>
                  <input type="number" value={selected.y} onChange={(e) => updateControl(selected.id, { y: +e.target.value })} />
                </label>
              </div>
              <div className="ui-prop-row">
                <label className="ui-prop">
                  <span>{t('ui.width')}</span>
                  <input type="number" value={selected.width} onChange={(e) => updateControl(selected.id, { width: +e.target.value })} />
                </label>
                <label className="ui-prop">
                  <span>{t('ui.height')}</span>
                  <input type="number" value={selected.height} onChange={(e) => updateControl(selected.id, { height: +e.target.value })} />
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
