import React, { useRef, useState } from 'react';

interface JoystickProps {
  /** x: -1 (left) … 1 (right), y: -1 (forward / away) … 1 (back / towards you) */
  onChange: (v: { x: number; y: number }) => void;
  labels: { forward: string; back: string; left: string; right: string };
  size?: number;
}

/** Game-style on-screen joystick with four direction labels. Touch, mouse and pen. */
export const Joystick: React.FC<JoystickProps> = ({ onChange, labels, size = 112 }) => {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const activeId = useRef<number | null>(null);
  const R = size / 2 - 18;

  const update = (clientX: number, clientY: number) => {
    const el = baseRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let dx = clientX - (r.left + r.width / 2);
    let dy = clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > R) {
      dx = (dx / len) * R;
      dy = (dy / len) * R;
    }
    setKnob({ x: dx, y: dy });
    onChange({ x: dx / R, y: dy / R });
  };

  const end = () => {
    activeId.current = null;
    setKnob({ x: 0, y: 0 });
    onChange({ x: 0, y: 0 });
  };

  const dir = Math.hypot(knob.x, knob.y) < R * 0.3 ? null : Math.abs(knob.x) > Math.abs(knob.y) ? (knob.x > 0 ? 'r' : 'l') : knob.y > 0 ? 'b' : 'f';
  const tag = (d: 'f' | 'b' | 'l' | 'r', text: string, arrow: string, cls: string) => (
    <span
      className={`absolute flex items-center gap-0.5 text-[10px] font-semibold leading-none whitespace-nowrap transition-colors ${cls} ${
        dir === d ? 'text-[#F2D9AA]' : 'text-white/80'
      }`}
    >
      {d === 'r' ? (
        <>
          {text}
          <span className="text-[11px]">{arrow}</span>
        </>
      ) : (
        <>
          <span className="text-[11px]">{arrow}</span>
          {d === 'l' ? text : null}
        </>
      )}
      {d === 'f' || d === 'b' ? <span>{text}</span> : null}
    </span>
  );

  return (
    <div
      ref={baseRef}
      role="application"
      aria-label="joystick"
      className="relative rounded-full touch-none select-none"
      style={{
        width: size,
        height: size,
        background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.12) 70%)',
        border: '1.5px solid rgba(255,255,255,0.35)',
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        activeId.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (activeId.current === e.pointerId) update(e.clientX, e.clientY);
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={() => activeId.current !== null && end()}
    >
      {tag('f', labels.forward, '▲', 'left-1/2 -translate-x-1/2 top-1.5 flex-col')}
      {tag('b', labels.back, '▼', 'left-1/2 -translate-x-1/2 bottom-1.5 flex-col-reverse')}
      {tag('l', labels.left, '◀', 'left-1.5 top-1/2 -translate-y-1/2 flex-col')}
      {tag('r', labels.right, '▶', 'right-1.5 top-1/2 -translate-y-1/2 flex-col-reverse')}
      <div
        className="absolute left-1/2 top-1/2 rounded-full pointer-events-none"
        style={{
          width: 34,
          height: 34,
          marginLeft: -17,
          marginTop: -17,
          transform: `translate3d(${knob.x}px, ${knob.y}px, 0)`,
          background: 'radial-gradient(circle at 35% 30%, #FFF8EA, #C5A46D)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
          transition: activeId.current === null ? 'transform 150ms ease-out' : 'none',
        }}
      />
    </div>
  );
};
