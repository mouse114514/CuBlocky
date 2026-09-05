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
    const SCALE = 4;
    let w = 0, h = 0, cw = 0, ch = 0;
    let offCanvas: HTMLCanvasElement, offCtx: CanvasRenderingContext2D;

    const resize = () => {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w;
      canvas.height = h;
      cw = Math.ceil(w / SCALE);
      ch = Math.ceil(h / SCALE);
      offCanvas = document.createElement('canvas');
      offCanvas.width = cw;
      offCanvas.height = ch;
      offCtx = offCanvas.getContext('2d')!;
    };
    resize();
    window.addEventListener('resize', resize);

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current.x = (e.clientX - rect.left) / SCALE;
      mouse.current.y = (e.clientY - rect.top) / SCALE;
    };
    const onLeave = () => { mouse.current.x = -9999; mouse.current.y = -9999; };
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);

    let t = 0;
    const RADIUS = 50;
    const STRENGTH = 0.8;

    const draw = () => {
      t += 0.002;
      const imgData = offCtx.createImageData(cw, ch);
      const d = imgData.data;
      const mx = mouse.current.x;
      const my = mouse.current.y;

      for (let py = 0; py < ch; py++) {
        for (let px = 0; px < cw; px++) {
          let nx = px * 0.006;
          let ny = py * 0.006;

          const dx = px - mx;
          const dy = py - my;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < RADIUS) {
            const t0 = dist / RADIUS;
            const influence = (1 - t0 * t0) * (1 - t0 * t0);
            nx += dx * influence * STRENGTH;
            ny += dy * influence * STRENGTH;
          }

          const v = fbm(nx + t * 0.4, ny + t * 0.3, 3);

          const c = v * 18 + 230;
          const idx = (py * cw + px) * 4;
          d[idx] = c;
          d[idx + 1] = c;
          d[idx + 2] = c + (1 - v) * 4;
          d[idx + 3] = 255;
        }
      }

      offCtx.putImageData(imgData, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(offCanvas, 0, 0, w, h);

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
