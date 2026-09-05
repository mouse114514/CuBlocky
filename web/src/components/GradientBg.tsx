import { useRef, useEffect } from 'react';

function hash(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1);
  const d = hash(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm(x: number, y: number, octaves: number): number {
  let v = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < octaves; i++) {
    v += amp * smoothNoise(x * freq, y * freq);
    amp *= 0.5;
    freq *= 2.0;
  }
  return v;
}

export default function GradientBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -9999, y: -9999 });
  const raf = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const SCALE = 3;
    let w = 0, h = 0, cw = 0, ch = 0;
    let bgCanvas: HTMLCanvasElement, bgCtx: CanvasRenderingContext2D;

    const resize = () => {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w;
      canvas.height = h;
      cw = Math.ceil(w / SCALE);
      ch = Math.ceil(h / SCALE);
      bgCanvas = document.createElement('canvas');
      bgCanvas.width = cw;
      bgCanvas.height = ch;
      bgCtx = bgCanvas.getContext('2d')!;
    };
    resize();
    window.addEventListener('resize', resize);

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current.x = e.clientX - rect.left;
      mouse.current.y = e.clientY - rect.top;
    };
    const onLeave = () => { mouse.current.x = -9999; mouse.current.y = -9999; };
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);

    let t = 0;
    const RADIUS = 40;

    const draw = () => {
      t += 0.002;

      // 1. Draw background noise
      const imgData = bgCtx.createImageData(cw, ch);
      const d = imgData.data;
      for (let py = 0; py < ch; py++) {
        for (let px = 0; px < cw; px++) {
          const nx = px * 0.008;
          const ny = py * 0.008;
          const v1 = fbm(nx + t * 0.4, ny + t * 0.3, 3);
          const v2 = fbm(nx * 1.8 - t * 0.2, ny * 1.8 + t * 0.3, 2);
          const v = v1 * 0.7 + v2 * 0.3;
          const c = 215 + v * 30;
          const idx = (py * cw + px) * 4;
          d[idx] = c;
          d[idx + 1] = c;
          d[idx + 2] = c + 3;
          d[idx + 3] = 255;
        }
      }
      bgCtx.putImageData(imgData, 0, 0);

      // 2. Pixel-level displacement based on mouse
      const mx = mouse.current.x;
      const my = mouse.current.y;
      const outData = ctx.createImageData(w, h);
      const out = outData.data;
      const bgData = bgCtx.getImageData(0, 0, cw, ch);
      const bg = bgData.data;

      for (let py = 0; py < ch; py++) {
        for (let px = 0; px < cw; px++) {
          const screenX = px * SCALE;
          const screenY = py * SCALE;
          const dx = screenX - mx;
          const dy = screenY - my;
          const dist = Math.sqrt(dx * dx + dy * dy);

          let srcX = px;
          let srcY = py;

          if (dist < RADIUS && dist > 0) {
            const t0 = dist / RADIUS;
            const strength = (1 - t0 * t0) * (1 - t0 * t0) * 3;
            srcX = px - (dx / dist) * strength;
            srcY = py - (dy / dist) * strength;
          }

          srcX = Math.max(0, Math.min(cw - 1, srcX));
          srcY = Math.max(0, Math.min(ch - 1, srcY));

          const si = (Math.round(srcY) * cw + Math.round(srcX)) * 4;
          const di = (py * cw + px) * 4;
          const r = bg[si];
          const g = bg[si + 1];
          const b = bg[si + 2];

          for (let sy = 0; sy < SCALE; sy++) {
            for (let sx = 0; sx < SCALE; sx++) {
              const fi = ((py * SCALE + sy) * w + (px * SCALE + sx)) * 4;
              out[fi] = r;
              out[fi + 1] = g;
              out[fi + 2] = b;
              out[fi + 3] = 255;
            }
          }
        }
      }

      ctx.putImageData(outData, 0, 0);
      raf.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0 }}
    />
  );
}
