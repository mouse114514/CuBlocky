import { useRef, useEffect, useState } from 'react';

export default function GradientBg() {
  const [pos, setPos] = useState({ x: -200, y: -200 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
    };
    const onLeave = () => setPos({ x: -200, y: -200 });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);
    return () => {
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
