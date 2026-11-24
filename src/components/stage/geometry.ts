import { ImgPt, StageGeometry } from '../../types/dream';

export interface StageSize {
  w: number;
  h: number;
}

export interface P {
  x: number;
  y: number;
}

/** Visible fraction of an object-cover image inside the stage box. */
export const coverFraction = (stage: StageSize, imageAspect: number) => {
  const rc = stage.w / Math.max(1, stage.h);
  return rc < imageAspect ? { fx: rc / imageAspect, fy: 1 } : { fx: 1, fy: imageAspect / rc };
};

/**
 * image fraction (0..1) → stage percent (0..100).
 * `camX` is the image x at the centre of the screen (0.5 = centred crop; the 9:16 view pans).
 */
export const imgToStage = (p: P, stage: StageSize, aspect: number, camX = 0.5): P => {
  const { fx, fy } = coverFraction(stage, aspect);
  return { x: ((p.x - camX) / fx + 0.5) * 100, y: ((p.y - 0.5) / fy + 0.5) * 100 };
};

/** stage percent (0..100) → image fraction (0..1) */
export const stageToImg = (p: P, stage: StageSize, aspect: number, camX = 0.5): P => {
  const { fx, fy } = coverFraction(stage, aspect);
  return { x: camX + (p.x / 100 - 0.5) * fx, y: 0.5 + (p.y / 100 - 0.5) * fy };
};

/** keep the camera inside the picture */
export const clampCam = (camX: number, fx: number) => (fx >= 1 ? 0.5 : Math.min(1 - fx / 2, Math.max(fx / 2, camX)));

/** CSS object-position x (%) that shows the picture centred on camX */
export const camToObjectPosition = (camX: number, fx: number) => (fx >= 1 ? 50 : ((camX - fx / 2) / (1 - fx)) * 100);

const inPoly = (poly: ImgPt[], x: number, y: number) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi) inside = !inside;
  }
  return inside;
};

const pointOk = (geo: StageGeometry, x: number, y: number) =>
  (!geo.view || (x >= geo.view.x0 && x <= geo.view.x1)) &&
  geo.floor.some((poly) => inPoly(poly, x, y)) && !(geo.obstacles ?? []).some((poly) => inPoly(poly, x, y));

/** Person height (fraction of image height) when standing with feet at image y. */
export const personHeight = (geo: StageGeometry, y: number) =>
  Math.max(0.1, Math.min(0.5, geo.heightK * (y - geo.horizonY)));

/** Feet are a little ellipse, not a point: check centre + both sides. */
export const isWalkable = (geo: StageGeometry, p: P) => {
  const r = Math.max(0.006, personHeight(geo, p.y) * 0.055) / geo.imageAspect;
  return pointOk(geo, p.x, p.y) && pointOk(geo, p.x - r, p.y) && pointOk(geo, p.x + r, p.y);
};

/** Closest walkable point (coarse search, only used on taps / spawns). */
export const nearestWalkable = (geo: StageGeometry, p: P): P => {
  if (isWalkable(geo, p)) return p;
  let best = geo.spawn;
  let bestD = Infinity;
  for (let gy = 0; gy <= 60; gy++) {
    for (let gx = 0; gx <= 80; gx++) {
      const q = { x: gx / 80, y: 0.4 + (gy / 60) * 0.6 };
      const d = ((q.x - p.x) * geo.imageAspect) ** 2 + (q.y - p.y) ** 2;
      if (d < bestD && isWalkable(geo, q)) {
        bestD = d;
        best = q;
      }
    }
  }
  return best;
};

export const randomWalkable = (geo: StageGeometry, near?: P, radius = 0.18): P => {
  for (let i = 0; i < 40; i++) {
    const q = near
      ? { x: near.x + (Math.random() - 0.5) * radius * 2, y: near.y + (Math.random() - 0.5) * radius }
      : { x: Math.random(), y: 0.45 + Math.random() * 0.52 };
    if (isWalkable(geo, q)) return q;
  }
  return near ?? geo.spawn;
};

/**
 * One movement step with sliding: if the straight step is blocked, try moving
 * only sideways or only forward/back so you glide along railings and sofas.
 */
export const stepWithCollision = (geo: StageGeometry, from: P, dx: number, dy: number): P | null => {
  const cands = [
    { x: from.x + dx, y: from.y + dy },
    { x: from.x + dx, y: from.y },
    { x: from.x, y: from.y + dy },
  ];
  for (const c of cands) {
    if ((c.x !== from.x || c.y !== from.y) && isWalkable(geo, c)) return c;
  }
  return null;
};

export const DEFAULT_CUSTOM_FLOOR_Y = 0.62;

/**
 * Geometry for a user-uploaded photo: everything below `floorY` is floor.
 * People are ~20% of the picture tall at the floor line and grow towards the bottom edge.
 */
export const customGeometry = (
  aspect: number,
  floorY = DEFAULT_CUSTOM_FLOOR_Y,
  /** lowest image y still visible on this screen (tall photos get cropped) */
  visibleBottom = 1
): StageGeometry => {
  const bottom = Math.min(0.97, visibleBottom - 0.03);
  const top = Math.min(bottom - 0.1, Math.max(0.3, floorY));
  const midY = top + (bottom - top) * 0.6;
  return {
    imageAspect: aspect,
    horizonY: top - 0.17,
    heightK: 1.2,
    floor: [[[0.03, top], [0.97, top], [0.99, bottom], [0.01, bottom]]],
    spawn: { x: 0.5, y: midY },
    seat: { x: 0.62, y: midY },
    companionSeat: { x: 0.72, y: midY - 0.02 },
  };
};
