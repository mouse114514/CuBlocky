import { useEffect, useLayoutEffect, useState } from 'react';
import { useI18n } from '../i18n';

interface Step {
  sel: string;
  btn: string;
  desc: string;
}

// Each step spots a real toolbar element (see data-guide= in App.tsx).
const STEPS: Step[] = [
  { sel: '[data-guide="open"]', btn: 'app.open', desc: 'guide.open' },
  { sel: '[data-guide="save"]', btn: 'app.save', desc: 'guide.save' },
  { sel: '[data-guide="saveAs"]', btn: 'app.saveAs', desc: 'guide.saveAs' },
  { sel: '[data-guide="build"]', btn: 'app.build', desc: 'guide.build' },
  { sel: '[data-guide="search"]', btn: 'guide.search', desc: 'guide.searchDesc' },
  { sel: '[data-guide="assets"]', btn: 'asset.manageTitle', desc: 'guide.assets' },
  { sel: '[data-guide="ui"]', btn: 'app.uiEditor', desc: 'guide.ui' },
  { sel: '[data-guide="code"]', btn: 'code.toggle', desc: 'guide.code' },
];

const TIP_W = 300;
const PAD = 6;

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function ToolbarGuide({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const last = STEPS.length - 1;

  const go = (n: number) => (n < 0 || n > last ? onDone() : setStep(n));

  useLayoutEffect(() => {
    const el = document.querySelector(STEPS[step].sel);
    if (!el) {
      setBox(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setBox({
      top: r.top - PAD,
      left: r.left - PAD,
      width: r.width + PAD * 2,
      height: r.height + PAD * 2,
    });
  }, [step]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDone();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') go(step + 1);
      else if (e.key === 'ArrowLeft') go(step - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const cur = STEPS[step];
  const tipLeft = box
    ? Math.max(12, Math.min(box.left + box.width / 2 - TIP_W / 2, window.innerWidth - TIP_W - 12))
    : Math.max(12, (window.innerWidth - TIP_W) / 2);
  const tipTop = box ? box.top + box.height + 12 : 90;

  return (
    <div className="guide-layer">
      <div
        className="guide-spot"
        style={
          box
            ? { top: box.top, left: box.left, width: box.width, height: box.height }
            : { top: -9999, left: -9999, width: 0, height: 0 }
        }
      />
      <div className="guide-tip" style={{ top: tipTop, left: tipLeft, width: TIP_W }}>
        <div className="guide-tip-body" key={step}>
          <div className="guide-tip-head">
            <span className="guide-tip-title">{t(cur.btn)}</span>
            <span className="guide-tip-count">
              {step + 1} / {STEPS.length}
            </span>
          </div>
          <div className="guide-tip-text">{t(cur.desc)}</div>
        </div>
        <div className="guide-tip-foot">
          <span className="guide-dots">
            {STEPS.map((_, i) => (
              <i key={i} className={i === step ? 'on' : ''} />
            ))}
          </span>
          <button className="guide-next" onClick={() => go(step + 1)}>
            {step === last ? t('guide.done') : t('guide.next')}
          </button>
        </div>
      </div>

      <button className="guide-skip" onClick={onDone}>
        {t('guide.skip')}
        <span className="guide-kbd">Esc</span>
      </button>
    </div>
  );
}
