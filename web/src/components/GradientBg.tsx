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

const PALETTE: [number, number, number][] = [
  [100, 149, 237],
  [147, 112, 219],
  [255, 183, 77],
  [46, 204, 113],
  [52, 152, 219],
  [231, 76, 60],
];

function colorMap(t: number): [number, number, number] {
  const n = PALETTE.length;
  const scaled = ((t % 1) + 1) % 1 * n;
  const i = Math.floor(scaled);
  const f = scaled - i;
  const c0 = PALETTE[i % n];
  const c1 = PALETTE[(i + 1) % n];
  return [
    c0[0] + (c1[0] - c0[0]) * f,
    c0[1] + (c1[1] - c0[1]) * f,
    c0[2] + (c1[2] - c0[2]) * f,
  ];
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
    const RADIUS = 80;
    const STRENGTH = 2.5;

    const draw = () => {
      t += 0.003;
      const imgData = offCtx.createImageData(cw, ch);
      const d = imgData.data;
      const mx = mouse.current.x;
      const my = mouse.current.y;

      for (let py = 0; py < ch; py++) {
        for (let px = 0; px < cw; px++) {
          let nx = px * 0.008;
          let ny = py * 0.008;

          const dx = mx - px;
          const dy = my - py;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < RADIUS && dist > 0.1) {
            const influence = (1 - dist / RADIUS);
            const warp = influence * influence * STRENGTH;
            nx += (dx / dist) * warp;
            ny += (dy / dist) * warp;
          }

          const v1 = fbm(nx + t * 0.5, ny + t * 0.3, 4);
          const v2 = fbm(nx * 1.5 - t * 0.2, ny * 1.5 + t * 0.4, 3);
          const v3 = fbm(nx * 0.7 + t * 0.15, ny * 0.7 - t * 0.1, 3);

          const c = colorMap(v1 * 0.5 + v2 * 0.3 + v3 * 0.2 + t * 0.1);
          const idx = (py * cw + px) * 4;
          d[idx] = c[0];
          d[idx + 1] = c[1];
          d[idx + 2] = c[2];
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
