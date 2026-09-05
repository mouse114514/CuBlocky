import { useRef, useEffect } from 'react';

interface Blob {
  x: number; y: number;
  vx: number; vy: number;
  r: number;
  color: string;
  phase: number;
}

const PALETTE = [
  [100, 149, 237],
  [147, 112, 219],
  [255, 183, 77],
  [46, 204, 113],
  [231, 76, 60],
  [52, 152, 219],
];

export default function GradientBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -9999, y: -9999 });
  const blobs = useRef<Blob[]>([]);
  const raf = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let w = 0, h = 0;

    const resize = () => {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
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

    if (blobs.current.length === 0) {
      blobs.current = PALETTE.map((c, i) => ({
        x: Math.random() * (w || 800),
        y: Math.random() * (h || 600),
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        r: 160 + Math.random() * 120,
        color: `rgba(${c[0]},${c[1]},${c[2]}`,
        phase: (i / PALETTE.length) * Math.PI * 2,
      }));
    }

    let t = 0;
    const draw = () => {
      t += 0.008;
      ctx.clearRect(0, 0, w, h);

      for (const b of blobs.current) {
        const wanderX = Math.sin(t + b.phase) * 0.4;
        const wanderY = Math.cos(t * 0.7 + b.phase) * 0.3;
        b.vx += wanderX * 0.01;
        b.vy += wanderY * 0.01;

        const dx = mouse.current.x - b.x;
        const dy = mouse.current.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 400 && dist > 1) {
          const force = (400 - dist) / 400 * 0.15;
          b.vx += (dx / dist) * force;
          b.vy += (dy / dist) * force;
        }

        b.vx *= 0.985;
        b.vy *= 0.985;
        b.x += b.vx;
        b.y += b.vy;

        if (b.x < -b.r) b.x = w + b.r;
        if (b.x > w + b.r) b.x = -b.r;
        if (b.y < -b.r) b.y = h + b.r;
        if (b.y > h + b.r) b.y = -b.r;

        const pulse = 1 + Math.sin(t * 1.2 + b.phase) * 0.08;
        const drawR = b.r * pulse;

        const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, drawR);
        grad.addColorStop(0, b.color + ',0.18)');
        grad.addColorStop(0.5, b.color + ',0.08)');
        grad.addColorStop(1, b.color + ',0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, drawR, 0, Math.PI * 2);
        ctx.fill();
      }

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
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'auto', zIndex: 0 }}
    />
  );
}
