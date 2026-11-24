import React, { memo } from 'react';
import { TimeOfDay } from '../../types/dream';

/**
 * Warm deck lighting for the superyacht backdrop (LED strips under the glass railing,
 * recessed deck lights, sofa under-glow). Drawn in the backdrop's own pixel space
 * (1376×768) with `slice` so it lines up with the object-cover image exactly.
 * Uses layered strokes/gradients instead of blur filters to stay cheap on phones.
 */
const W = 1376;
const HZ = 336;
const TIP = { x: 688, y: 394 };

const quad = (c: { x: number; y: number }, p1: { x: number; y: number }, t: number) => ({
  x: (1 - t) ** 2 * TIP.x + 2 * (1 - t) * t * c.x + t * t * p1.x,
  y: (1 - t) ** 2 * TIP.y + 2 * (1 - t) * t * c.y + t * t * p1.y,
});

const edge = (side: 1 | -1, inset: number) => {
  const c = side === 1 ? { x: 250, y: 500 } : { x: W - 250, y: 500 };
  const p1 = side === 1 ? { x: -260, y: 800 } : { x: W + 260, y: 800 };
  const pts: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const p = quad(c, p1, i / 40);
    pts.push(`${(p.x + side * (p.y - HZ) * inset).toFixed(1)},${p.y.toFixed(1)}`);
  }
  return pts.join(' ');
};

const LEFT_STRIP = edge(1, 0.09);
const RIGHT_STRIP = edge(-1, 0.09);
const DECK_LIGHTS: Array<[number, number, number]> = [
  [642.5, 500, 4.3],
  [733.5, 500, 4.3],
  [616.8, 560, 5.1],
  [759.2, 560, 5.1],
  [582.5, 640, 6.3],
  [793.5, 640, 6.3],
  [543.9, 730, 7.5],
  [832.1, 730, 7.5],
];

const SceneLightsInner: React.FC<{ variant: 'superyacht'; timeOfDay: TimeOfDay }> = ({ timeOfDay }) => {
  if (timeOfDay === 'day') return null;
  const strength = timeOfDay === 'night' ? 1 : 0.55;
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 1376 768"
      preserveAspectRatio="xMidYMid slice"
      style={{ opacity: strength, mixBlendMode: 'screen' }}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="yl-pool">
          <stop offset="0" stopColor="#FFD9A0" stopOpacity="0.85" />
          <stop offset="0.35" stopColor="#FFB86B" stopOpacity="0.28" />
          <stop offset="1" stopColor="#FFB86B" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="yl-sofa">
          <stop offset="0" stopColor="#FFCF8A" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FFCF8A" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* LED strip glow along both deck edges */}
      {[LEFT_STRIP, RIGHT_STRIP].map((pts, i) => (
        <g key={i} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <polyline points={pts} stroke="#FFB463" strokeOpacity="0.2" strokeWidth="30" />
          <polyline points={pts} stroke="#FFC47F" strokeOpacity="0.45" strokeWidth="12" />
          <polyline points={pts} stroke="#FFF1D6" strokeOpacity="1" strokeWidth="3.4" />
        </g>
      ))}
      {/* recessed deck lights */}
      {DECK_LIGHTS.map(([x, y, r], i) => (
        <g key={i}>
          <ellipse cx={x} cy={y} rx={r * 9} ry={r * 3.2} fill="url(#yl-pool)" />
          <ellipse cx={x} cy={y} rx={r * 0.9} ry={r * 0.45} fill="#FFF4DC" />
        </g>
      ))}
      {/* sofa + sun-pad under-glow */}
      <ellipse cx="1080" cy="585" rx="230" ry="34" fill="url(#yl-sofa)" />
      <ellipse cx="688" cy="486" rx="170" ry="16" fill="url(#yl-sofa)" />
      {/* champagne table candle */}
      <ellipse cx="870" cy="598" rx="70" ry="16" fill="url(#yl-pool)" />
      {/* bow navigation light */}
      <circle cx="688" cy="369" r="9" fill="url(#yl-pool)" />
      <circle cx="688" cy="369" r="2.2" fill="#FFFFFF" />
    </svg>
  );
};

export const SceneLights = memo(SceneLightsInner);
