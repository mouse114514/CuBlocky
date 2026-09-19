import { useState, useRef, useCallback, useEffect, type DragEvent, type MouseEvent } from 'react';
import type { UIControl } from '../types';
import { useI18n } from '../i18n';

const REF_W = 1920;
const REF_H = 1080;
const SNAP_THRESHOLD = 0.008;

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

// Snap positions: screen edges, 1/5, 1/3, 1/2, 2/3, 4/5
const SNAP_POSITIONS = [0, 1 / 5, 1 / 3, 1 / 2, 2 / 3, 4 / 5, 1];

function buildSnapTargets(controls: UIControl[], excludeId: string) {
  const xs: number[] = [...SNAP_POSITIONS];
  const ys: number[] = [...SNAP_POSITIONS];
  for (const c of controls) {
    if (c.id === excludeId) continue;
    xs.push(c.x, c.x + c.width / 2, c.x + c.width);
    ys.push(c.y, c.y + c.height / 2, c.y + c.height);
  }
  return { xs, ys };
}

function snapValue(val: number, targets: number[]): { snapped: number; guide: number | null } {
  let bestDist = SNAP_THRESHOLD;
  let bestGuide: number | null = null;
  for (const t of targets) {
    const d = Math.abs(val - t);
    if (d < bestDist) { bestDist = d; bestGuide = t; }
  }
  return { snapped: bestGuide !== null ? bestGuide : val, guide: bestGuide };
}

type DragMode = { type: 'move'; id: string; offsetX: number; offsetY: number }
  | { type: 'resize'; id: string; corner: 'tl' | 'tr' | 'bl' | 'br'; startCtrl: UIControl; startMouse: { x: number; y: number }; uniform: boolean };

interface Props {
  controls: UIControl[];
  onChange: (controls: UIControl[]) => void;
  onBack: () => void;
}

export function UIEditor({ controls, onChange, onBack }: Props) {
  const { t } = useI18n();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [snapGuides, setSnapGuides] = useState<{ vertical: number[]; horizontal: number[] }>({ vertical: [], horizontal: [] });
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragMode | null>(null);

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

  const handlePaletteMouseDown = (e: MouseEvent, type: UIControl['type']) => {
    e.preventDefault();
    let idx = 1;
    while (controls.some(c => c.id === `${type}${idx}`)) idx++;
    const defaults = defaultProps(type, 0, 0, idx);
    const pos = getCanvasPct(e);
    const x = Math.max(0, Math.min(1 - defaults.width, pos.x - defaults.width / 2));
    const y = Math.max(0, Math.min(1 - defaults.height, pos.y - defaults.height / 2));
    const ctrl = { ...defaults, x, y };
    onChange([...controls, ctrl]);
    setSelectedId(ctrl.id);
    const offset = { x: defaults.width / 2, y: defaults.height / 2 };
    dragRef.current = { type: 'move', id: ctrl.id, offsetX: offset.x, offsetY: offset.y };
  };

  const getCanvasPct = (e: DragEvent | MouseEvent): { x: number; y: number } => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
  };

  const handleControlMouseDown = (e: MouseEvent, ctrl: UIControl) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedId(ctrl.id);
    const pos = getCanvasPct(e);
    dragRef.current = { type: 'move', id: ctrl.id, offsetX: pos.x - ctrl.x, offsetY: pos.y - ctrl.y };
  };

  const handleResizeMouseDown = (e: MouseEvent, ctrl: UIControl, corner: 'tl' | 'tr' | 'bl' | 'br') => {
    e.stopPropagation();
    e.preventDefault();
    const pos = getCanvasPct(e);
    dragRef.current = {
      type: 'resize', id: ctrl.id, corner,
      startCtrl: { ...ctrl },
      startMouse: pos,
      uniform: e.ctrlKey || e.metaKey,
    };
  };

  const handleCanvasMouseMove = (e: MouseEvent) => {
    if (!dragRef.current) return;
    const pos = getCanvasPct(e);
    const mode = dragRef.current;

    if (mode.type === 'move') {
      const targets = buildSnapTargets(controls, mode.id);
      const rawX = pos.x - mode.offsetX;
      const rawY = pos.y - mode.offsetY;
      const ctrl = controls.find(c => c.id === mode.id);
      const cw = ctrl?.width ?? 0;
      const ch = ctrl?.height ?? 0;
      const centerX = Math.max(0, Math.min(1, rawX)) + cw / 2;
      const centerY = Math.max(0, Math.min(1, rawY)) + ch / 2;

      const snapCX = snapValue(centerX, targets.xs);
      const snapCY = snapValue(centerY, targets.ys);
      const finalX = Math.max(0, Math.min(1 - cw, (snapCX.snapped - cw / 2)));
      const finalY = Math.max(0, Math.min(1 - ch, (snapCY.snapped - ch / 2)));

      const guidesV: number[] = [];
      const guidesH: number[] = [];
      if (snapCX.guide !== null) guidesV.push(snapCX.guide);
      if (snapCY.guide !== null) guidesH.push(snapCY.guide);
      setSnapGuides({ vertical: guidesV, horizontal: guidesH });

      onChange(controls.map(c => (c.id === mode.id ? { ...c, x: finalX, y: finalY } : c)));
    } else if (mode.type === 'resize') {
      const sc = mode.startCtrl;
      const dx = pos.x - mode.startMouse.x;
      const dy = pos.y - mode.startMouse.y;
      let newX = sc.x, newY = sc.y, newW = sc.width, newH = sc.height;

      if (mode.corner === 'br') {
        newW = Math.max(0.01, sc.width + dx);
        newH = Math.max(0.01, sc.height + dy);
      } else if (mode.corner === 'bl') {
        newX = sc.x + dx;
        newW = Math.max(0.01, sc.width - dx);
        newH = Math.max(0.01, sc.height + dy);
      } else if (mode.corner === 'tr') {
        newY = sc.y + dy;
        newW = Math.max(0.01, sc.width + dx);
        newH = Math.max(0.01, sc.height - dy);
      } else if (mode.corner === 'tl') {
        newX = sc.x + dx;
        newY = sc.y + dy;
        newW = Math.max(0.01, sc.width - dx);
        newH = Math.max(0.01, sc.height - dy);
      }

      if (mode.uniform) {
        const avgD = (dx + dy) / 2;
        newW = Math.max(0.01, sc.width + avgD);
        newH = newW * (sc.height / sc.width);
        if (mode.corner === 'bl' || mode.corner === 'tl') {
          newX = sc.x + sc.width - newW;
        }
        if (mode.corner === 'tl' || mode.corner === 'tr') {
          newY = sc.y + sc.height - newH;
        }
      }

      newX = Math.max(0, newX);
      newY = Math.max(0, newY);
      newW = Math.min(1 - newX, newW);
      newH = Math.min(1 - newY, newH);

      onChange(controls.map(c => (c.id === mode.id ? { ...c, x: newX, y: newY, width: newW, height: newH } : c)));
    }
  };

  const handleCanvasMouseUp = () => {
    dragRef.current = null;
    setSnapGuides({ vertical: [], horizontal: [] });
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

    const handleStyle = (corner: 'tl' | 'tr' | 'bl' | 'br'): React.CSSProperties => {
      const cursors = { tl: 'nwse-resize', tr: 'nesw-resize', bl: 'nesw-resize', br: 'nwse-resize' };
      const pos: React.CSSProperties = {};
      if (corner.includes('t')) pos.top = -4; else pos.bottom = -4;
      if (corner.includes('l')) pos.left = -4; else pos.right = -4;
      return {
        position: 'absolute', width: 8, height: 8, background: '#00acc1',
        border: '1px solid #fff', borderRadius: 2, cursor: cursors[corner], zIndex: 10,
        ...pos,
      };
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
        {isSel && (['tl', 'tr', 'bl', 'br'] as const).map(corner => (
          <div
            key={corner}
            style={handleStyle(corner)}
            onMouseDown={(e) => handleResizeMouseDown(e, ctrl, corner)}
            onClick={(e) => e.stopPropagation()}
          />
        ))}
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
              onMouseDown={(e) => handlePaletteMouseDown(e, p.type)}
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
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              onClick={handleCanvasClick}
            >
              {controls.length === 0 && (
                <div className="ui-canvas-empty">{t('ui.empty')}</div>
              )}
              {controls.map(renderControl)}
              {/* Snap guide lines */}
              {snapGuides.vertical.map((gx, i) => (
                <div key={`sv${i}`} style={{
                  position: 'absolute', left: `${gx * 100}%`, top: 0, bottom: 0,
                  width: 1, background: '#ff4081', zIndex: 100, pointerEvents: 'none',
                }} />
              ))}
              {snapGuides.horizontal.map((gy, i) => (
                <div key={`sh${i}`} style={{
                  position: 'absolute', top: `${gy * 100}%`, left: 0, right: 0,
                  height: 1, background: '#ff4081', zIndex: 100, pointerEvents: 'none',
                }} />
              ))}
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
