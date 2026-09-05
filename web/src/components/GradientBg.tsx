import { useRef, useEffect, useState } from 'react';

export default function GradientBg() {
  const [pos, setPos] = useState({ x: -200, y: -200 });
  const raf = useRef(0);
  const target = useRef({ x: -200, y: -200 });
  const current = useRef({ x: -200, y: -200 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;
    };
    const onLeave = () => {
      target.current.x = -200;
      target.current.y = -200;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);

    const animate = () => {
      current.current.x += (target.current.x - current.current.x) * 0.08;
      current.current.y += (target.current.y - current.current.y) * 0.08;
      setPos({ x: current.current.x, y: current.current.y });
      raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <>
      <div className="wp-bg-gradient" />
      <div
        className="wp-bg-cursor"
        style={{
          transform: `translate(${pos.x - 80}px, ${pos.y - 80}px)`,
        }}
      />
    </>
  );
}
