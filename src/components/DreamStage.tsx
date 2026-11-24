import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Sun,
  Sunset,
  Moon,
  Volume2,
  VolumeX,
  Users,
  User,
  Camera,
  Download,
  Hand,
  Armchair,
  Wine,
  PenTool,
  Footprints,
  Sparkles,
  Heart,
  Check,
  PartyPopper,
} from 'lucide-react';
import { AVATAR_PROPS } from '../data/places';
import { tFor } from '../data/i18n';
import {
  AvatarAction,
  AvatarConfig,
  CompanionConfig,
  DreamPlace,
  ExperienceMode,
  Language,
  PropId,
  SavedSnapshot,
  StageGeometry,
  TimeOfDay,
  TogetherPeer,
} from '../types/dream';
import { ambientAudio } from '../utils/ambientAudio';
import { AvatarRenderer } from './AvatarRenderer';
import { SceneLights } from './stage/SceneLights';
import { Joystick } from './stage/Joystick';
import {
  P,
  StageSize,
  coverFraction,
  customGeometry,
  imgToStage,
  isWalkable,
  nearestWalkable,
  personHeight,
  randomWalkable,
  stageToImg,
  stepWithCollision,
} from './stage/geometry';

/** Character art: feet sit at 177/188 of the SVG box; standing figure is ~164 units tall. */
const AVATAR_BASE = 120;
const FEET_RATIO = 177 / 188;
const FIGURE_PX_PER_SIZE = (164 / 188) * 1.56;
/** walking speed in "person heights per second" */
const WALK_SIDE = 0.95;
const WALK_DEPTH = 0.42;

interface DreamStageProps {
  lang: Language;
  place: DreamPlace;
  customTitle?: string;
  customImage?: string | null;
  initialMode: ExperienceMode;
  initialTime?: TimeOfDay;
  initialAction?: AvatarAction;
  initialAffirmation?: string;
  avatar: AvatarConfig;
  companion: CompanionConfig;
  goalProgress: number;
  virtualNeighborsDefault: boolean;
  onExit: () => void;
  onRecordVisit: (place: DreamPlace) => void;
  onSaveSnapshot: (snap: SavedSnapshot) => void;
  onUpdateAvatarProp: (prop: PropId) => void;
  onToggleCompanion: (enabled: boolean) => void;
}

/** A character that this device moves around (me, my companion, virtual neighbours). */
interface Mover {
  x: number; // image fraction
  y: number;
  facing: 'left' | 'right';
  moving: boolean;
  target: P | null;
  onArrive?: () => void;
  stuck: number;
  idle: AvatarAction; // what they do when standing still
  greeting?: string;
  nextThink: number; // virtual neighbours: time of next decision (ms)
}

const VIRTUAL_NEIGHBORS: Array<Omit<TogetherPeer, 'roomId' | 'x' | 'y' | 'facing' | 'action'> & { idle: AvatarAction }> = [
  { clientId: 'vn-1', name: '지우', outfit: 'parisChic', hairStyle: 'bob', hairColor: '#2B211D', skinTone: 'warm', prop: 'coffee', isVirtual: true, idle: 'stand' },
  { clientId: 'vn-2', name: '민서', outfit: 'resort', hairStyle: 'longWave', hairColor: '#4A3428', skinTone: 'fair', prop: 'none', isVirtual: true, idle: 'stand' },
  { clientId: 'vn-3', name: 'Alex', outfit: 'tailored', hairStyle: 'shortNeat', hairColor: '#1E1A18', skinTone: 'olive', prop: 'wine', isVirtual: true, idle: 'wine' },
];

const mkMover = (p: P, idle: AvatarAction = 'stand'): Mover => ({
  x: p.x,
  y: p.y,
  facing: 'right',
  moving: false,
  target: null,
  stuck: 0,
  idle,
  nextThink: 0,
});

export const DreamStage: React.FC<DreamStageProps> = ({
  lang,
  place,
  customTitle,
  customImage,
  initialMode,
  initialTime = 'day',
  initialAction,
  initialAffirmation = '',
  avatar,
  companion,
  goalProgress,
  virtualNeighborsDefault,
  onExit,
  onRecordVisit,
  onSaveSnapshot,
  onUpdateAvatarProp,
  onToggleCompanion,
}) => {
  const t = tFor(lang);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const clientIdRef = useRef<string>(`dm_${Math.random().toString(36).slice(2, 10)}`);

  const [mode, setMode] = useState<ExperienceMode>(initialMode);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(initialTime);
  const [chosenAction, setChosenAction] = useState<AvatarAction>(
    initialAction && initialAction !== 'walk' ? initialAction : place.defaultAction === 'walk' ? 'stand' : place.defaultAction
  );
  const [affirmation, setAffirmation] = useState<string>(initialAffirmation);
  const [soundOn, setSoundOn] = useState(false);
  const [showVirtualNeighbors, setShowVirtualNeighbors] = useState(virtualNeighborsDefault);
  const [stampToast, setStampToast] = useState(true);
  const [snapshotBanner, setSnapshotBanner] = useState<string | null>(null);
  const [latestSnapshotUrl, setLatestSnapshotUrl] = useState<string | null>(null);
  const [customAspect, setCustomAspect] = useState(16 / 9);
  const [stageSize, setStageSize] = useState<StageSize>({ w: 0, h: 0 });
  const [, setFrame] = useState(0);

  const stageImage = customImage || place.image;
  const stageTitle = customTitle || place.name[lang];
  // Only the part of the picture you can actually see on this screen is walkable
  const viewX0 = useMemo(() => {
    if (!stageSize.w) return 0;
    const aspect = customImage ? customAspect : place.stage.imageAspect;
    const { fx } = coverFraction(stageSize, aspect);
    return Math.round((0.5 - fx / 2 + 0.065 * fx) * 1000) / 1000;
  }, [stageSize, customImage, customAspect, place.stage.imageAspect]);
  const geo: StageGeometry = useMemo(() => {
    const base = customImage ? customGeometry(customAspect) : place.stage;
    return { ...base, view: { x0: viewX0, x1: 1 - viewX0 } };
  }, [customImage, customAspect, place.stage, viewX0]);
  const geoRef = useRef(geo);
  geoRef.current = geo;

  // ---------- the little world this device simulates ----------
  const meRef = useRef<Mover>(mkMover(nearestWalkable(geo, geo.spawn), chosenAction === 'sit' ? 'stand' : chosenAction));
  const companionRef = useRef<Mover>(mkMover(nearestWalkable(geo, { x: geo.spawn.x + 0.08, y: geo.spawn.y - 0.02 })));
  const neighborsRef = useRef<Mover[]>([]);
  const joyRef = useRef({ x: 0, y: 0 });
  const keysRef = useRef<Set<string>>(new Set());
  const lastSyncRef = useRef(0);
  const greetTimerRef = useRef<number | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const parallaxFrameRef = useRef<number | null>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const companionOnRef = useRef(companion.enabled);
  companionOnRef.current = companion.enabled;
  const neighborsOnRef = useRef(showVirtualNeighbors);
  neighborsOnRef.current = showVirtualNeighbors;

  // Real-time Together SSE state
  const [livePeers, setLivePeers] = useState<Record<string, TogetherPeer>>({});
  const [sseConnected, setSseConnected] = useState(false);

  // When the backdrop (geometry) changes, put everybody back on its floor
  useEffect(() => {
    const me = meRef.current;
    const start = nearestWalkable(geo, isWalkable(geo, me) ? me : geo.spawn);
    if (me.idle !== 'sit') Object.assign(me, { x: start.x, y: start.y, target: null, moving: false });
    const comp = companionRef.current;
    const c = comp.idle === 'sit' ? comp : nearestWalkable(geo, isWalkable(geo, comp) ? comp : { x: start.x + 0.08, y: start.y - 0.02 });
    Object.assign(comp, { x: c.x, y: c.y, target: null, moving: false });
    const firstTime = neighborsRef.current.length === 0;
    neighborsRef.current = firstTime
      ? VIRTUAL_NEIGHBORS.map((n) => {
          const p = randomWalkable(geo);
          return { ...mkMover(p, n.idle), facing: Math.random() > 0.5 ? 'left' : 'right', nextThink: performance.now() + 800 + Math.random() * 2500 } as Mover;
        })
      : neighborsRef.current.map((n) => ({ ...n, ...nearestWalkable(geo, n), target: null }));
    if (me.idle === 'sit') {
      Object.assign(me, { x: geo.seat.x, y: geo.seat.y });
    } else if (firstTime && chosenAction === 'sit') goSit();
    setFrame((f) => f + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo]);

  // Track stage pixel size
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setStageSize((prev) => (Math.abs(prev.w - r.width) < 1 && Math.abs(prev.h - r.height) < 1 ? prev : { w: r.width, h: r.height }));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Record Dream Passport visit once on mount
  useEffect(() => {
    onRecordVisit(place);
    const hideTimer = window.setTimeout(() => setStampToast(false), 3600);
    return () => {
      window.clearTimeout(hideTimer);
      ambientAudio.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place.id]);

  // ---------- server sync (Together) ----------
  const myDisplayAction = (): AvatarAction => (meRef.current.moving ? 'walk' : meRef.current.idle);

  const syncMoveToServer = useCallback(
    (force = false, propOverride?: PropId) => {
      if (modeRef.current !== 'together') return;
      const now = Date.now();
      if (!force && now - lastSyncRef.current < 160) return;
      lastSyncRef.current = now;
      const me = meRef.current;
      fetch('/api/together/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: place.id,
          clientId: clientIdRef.current,
          x: me.x * 100,
          y: me.y * 100,
          facing: me.facing,
          action: me.moving ? 'walk' : me.idle,
          prop: propOverride ?? avatar.equippedProp,
        }),
      }).catch(() => {});
    },
    [place.id, avatar.equippedProp]
  );

  useEffect(() => {
    if (mode !== 'together') {
      setLivePeers({});
      setSseConnected(false);
      return;
    }

    const clientId = clientIdRef.current;
    const roomId = place.id;
    let active = true;

    const es = new EventSource(
      `/api/together/stream?roomId=${encodeURIComponent(roomId)}&clientId=${encodeURIComponent(clientId)}`
    );
    es.onopen = () => active && setSseConnected(true);
    es.onerror = () => active && setSseConnected(false);

    const upsert = (peer: TogetherPeer) => {
      if (peer.clientId !== clientId) setLivePeers((prev) => ({ ...prev, [peer.clientId]: peer }));
    };
    es.addEventListener('room:init', (evt) => {
      if (!active) return;
      try {
        const data = JSON.parse((evt as MessageEvent).data) as { peers: TogetherPeer[] };
        const map: Record<string, TogetherPeer> = {};
        for (const peer of data.peers) if (peer.clientId !== clientId) map[peer.clientId] = peer;
        setLivePeers(map);
      } catch {
        // ignore parse error
      }
    });
    es.addEventListener('avatar:joined', (evt) => {
      if (!active) return;
      try {
        upsert((JSON.parse((evt as MessageEvent).data) as { peer: TogetherPeer }).peer);
      } catch {
        // ignore
      }
    });
    es.addEventListener('avatar:updated', (evt) => {
      if (!active) return;
      try {
        upsert((JSON.parse((evt as MessageEvent).data) as { peer: TogetherPeer }).peer);
      } catch {
        // ignore
      }
    });
    es.addEventListener('avatar:greet', (evt) => {
      if (!active) return;
      try {
        const data = JSON.parse((evt as MessageEvent).data) as {
          clientId: string;
          action: AvatarAction;
          greetingText: string;
          greetingAt: number;
        };
        if (data.clientId !== clientId) {
          setLivePeers((prev) => {
            const existing = prev[data.clientId];
            if (!existing) return prev;
            return {
              ...prev,
              [data.clientId]: { ...existing, action: data.action, greetingText: data.greetingText, greetingAt: data.greetingAt },
            };
          });
        }
      } catch {
        // ignore
      }
    });
    es.addEventListener('avatar:left', (evt) => {
      if (!active) return;
      try {
        const { clientId: leftId } = JSON.parse((evt as MessageEvent).data) as { clientId: string };
        setLivePeers((prev) => {
          const next = { ...prev };
          delete next[leftId];
          return next;
        });
      } catch {
        // ignore
      }
    });

    // Join room (never sending personal face photo or companion photo!)
    const me = meRef.current;
    fetch('/api/together/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        clientId,
        name: avatar.name,
        x: me.x * 100,
        y: me.y * 100,
        facing: me.facing,
        action: myDisplayAction(),
        outfit: avatar.outfit,
        hairStyle: avatar.hairStyle,
        hairColor: avatar.hairColor,
        skinTone: avatar.skinTone,
        prop: avatar.equippedProp,
      }),
    }).catch(() => {});

    return () => {
      active = false;
      es.close();
      fetch('/api/together/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, clientId }),
        keepalive: true,
      }).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, place.id]);

  // ---------- movement loop (one rAF for everyone; only re-renders when something moved) ----------
  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const speedVec = (g: StageGeometry, m: Mover, jx: number, jy: number) => {
      const h = personHeight(g, m.y);
      return { vx: (jx * h * WALK_SIDE) / g.imageAspect, vy: jy * h * WALK_DEPTH };
    };

    /** advance one mover; returns true if it changed */
    const advance = (g: StageGeometry, m: Mover, dt: number, joy?: { x: number; y: number }, speedMul = 1) => {
      let jx = 0;
      let jy = 0;
      const usingJoy = joy && Math.hypot(joy.x, joy.y) > 0.18;
      if (usingJoy && joy) {
        m.target = null;
        m.onArrive = undefined;
        jx = joy.x;
        jy = joy.y;
      } else if (m.target) {
        const h = personHeight(g, m.y);
        const dxs = ((m.target.x - m.x) * g.imageAspect) / (h * WALK_SIDE);
        const dys = (m.target.y - m.y) / (h * WALK_DEPTH);
        const d = Math.hypot(dxs, dys);
        if (d < 0.06) {
          m.x = m.target.x;
          m.y = m.target.y;
          m.target = null;
          const cb = m.onArrive;
          m.onArrive = undefined;
          const wasMoving = m.moving;
          m.moving = false;
          cb?.();
          return wasMoving || Boolean(cb);
        }
        const k = Math.min(1, d / 0.35); // ease in on arrival
        jx = (dxs / d) * Math.max(0.35, k);
        jy = (dys / d) * Math.max(0.35, k);
      }
      if (jx === 0 && jy === 0) {
        if (m.moving) {
          m.moving = false;
          return true;
        }
        return false;
      }
      const { vx, vy } = speedVec(g, m, jx * speedMul, jy * speedMul);
      const next = stepWithCollision(g, m, vx * dt, vy * dt);
      if (Math.abs(jx) > 0.12) m.facing = jx < 0 ? 'left' : 'right';
      if (!next) {
        // blocked by a railing / sofa / edge of the floor
        if (m.target) {
          m.stuck += dt;
          if (m.stuck > 0.45) {
            const cb = m.onArrive;
            m.target = null;
            m.onArrive = undefined;
            m.stuck = 0;
            m.moving = false;
            cb?.();
            return true;
          }
        }
        const was = m.moving;
        m.moving = false;
        return was;
      }
      m.stuck = 0;
      m.x = next.x;
      m.y = next.y;
      if (m.idle === 'sit') m.idle = 'stand';
      m.moving = true;
      return true;
    };

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const g = geoRef.current;
      let changed = false;

      // keyboard joins the joystick
      const keys = keysRef.current;
      const kx = (keys.has('ArrowRight') || keys.has('d') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('a') ? 1 : 0);
      const ky = (keys.has('ArrowDown') || keys.has('s') ? 1 : 0) - (keys.has('ArrowUp') || keys.has('w') ? 1 : 0);
      const joy = kx || ky ? { x: kx / Math.hypot(kx, ky), y: ky / Math.hypot(kx, ky) } : joyRef.current;

      const me = meRef.current;
      const before = { x: me.x, y: me.y, moving: me.moving };
      if (advance(g, me, dt, joy)) changed = true;
      if (changed && (me.moving || before.moving)) syncMoveToServer(!me.moving);

      // companion strolls after you (solo mode)
      if (modeRef.current === 'solo' && companionOnRef.current) {
        const c = companionRef.current;
        if (me.idle !== 'sit' && c.idle === 'sit' && me.moving) c.idle = 'stand';
        if (me.moving || (!c.target && c.idle !== 'sit')) {
          const side = me.facing === 'right' ? -1 : 1;
          const h = personHeight(g, me.y);
          const want = { x: me.x + (side * h * 0.55) / g.imageAspect, y: me.y - 0.012 };
          const dist = Math.hypot((want.x - c.x) * g.imageAspect, want.y - c.y);
          if (dist > h * 0.35 && isWalkable(g, want)) {
            c.target = want;
          } else if (dist > h * 0.35) {
            c.target = nearestWalkable(g, want);
          }
        }
        if (advance(g, c, dt, undefined, 1.15)) changed = true;
        if (!c.moving && !c.target && c.idle !== 'sit') {
          const nf: 'left' | 'right' = me.x > c.x ? 'right' : 'left';
          if (nf !== c.facing) {
            c.facing = nf;
            changed = true;
          }
        }
      }

      // virtual neighbours: wander politely, sometimes wave or raise a glass
      if (modeRef.current === 'together' && neighborsOnRef.current) {
        const ns = neighborsRef.current;
        ns.forEach((n, i) => {
          if (now > n.nextThink && !n.target) {
            n.nextThink = now + 2500 + Math.random() * 4000;
            const roll = Math.random();
            if (roll < 0.55) {
              const others = [me, ...ns.filter((o) => o !== n)];
              for (let a = 0; a < 6; a++) {
                const cand = randomWalkable(g, n, 0.22);
                const h = personHeight(g, cand.y);
                const crowded = others.some((o) => Math.abs((o.x - cand.x) * g.imageAspect) < h * 0.5 && Math.abs(o.y - cand.y) < 0.05);
                if (!crowded) {
                  n.target = cand;
                  break;
                }
              }
              n.greeting = undefined;
              n.idle = VIRTUAL_NEIGHBORS[i].idle;
            } else if (roll < 0.75) {
              n.idle = 'wave';
              n.greeting = t.stage.greetPresets[i % t.stage.greetPresets.length];
            } else if (roll < 0.88) {
              n.idle = 'toast';
              n.greeting = undefined;
            } else {
              n.idle = VIRTUAL_NEIGHBORS[i].idle;
              n.greeting = undefined;
            }
            changed = true;
          }
          if (advance(g, n, dt, undefined, 0.8)) changed = true;
        });
      }

      if (changed) setFrame((f) => (f + 1) % 1_000_000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [syncMoveToServer, t.stage.greetPresets]);

  // Keyboard: arrows / WASD walk
  useEffect(() => {
    const map: Record<string, string> = { ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown', ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight', w: 'w', a: 'a', s: 's', d: 'd', W: 'w', A: 'a', S: 's', D: 'd' };
    const down = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const k = map[e.key];
      if (!k) return;
      e.preventDefault();
      keysRef.current.add(k);
    };
    const up = (e: KeyboardEvent) => {
      const k = map[e.key];
      if (k) keysRef.current.delete(k);
    };
    const blur = () => keysRef.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  // ---------- actions ----------
  const goSit = () => {
    const g = geoRef.current;
    const me = meRef.current;
    const seatFacing: 'left' | 'right' = g.seat.x > 0.5 ? 'left' : 'right';
    me.target = nearestWalkable(g, g.seat);
    me.onArrive = () => {
      me.x = g.seat.x;
      me.y = g.seat.y;
      me.facing = seatFacing;
      me.idle = 'sit';
      syncMoveToServer(true);
      if (modeRef.current === 'solo' && companionOnRef.current) {
        const c = companionRef.current;
        c.target = nearestWalkable(g, g.companionSeat);
        c.onArrive = () => {
          c.x = g.companionSeat.x;
          c.y = g.companionSeat.y;
          c.facing = g.companionSeat.x > 0.5 ? 'left' : 'right';
          c.idle = 'sit';
        };
      }
    };
  };

  const triggerGreeting = (greetAction: 'wave' | 'greet', message: string) => {
    const me = meRef.current;
    me.idle = greetAction;
    me.greeting = message;
    setFrame((f) => f + 1);
    if (greetTimerRef.current) window.clearTimeout(greetTimerRef.current);
    greetTimerRef.current = window.setTimeout(() => {
      me.greeting = undefined;
      if (me.idle === greetAction) me.idle = 'stand';
      setChosenAction('stand');
      setFrame((f) => f + 1);
    }, 3400);

    if (mode === 'together') {
      fetch('/api/together/greet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: place.id, clientId: clientIdRef.current, action: greetAction, message }),
      }).catch(() => {});
    }
  };

  const handleActionSelect = (nextAction: AvatarAction) => {
    setChosenAction(nextAction);
    const me = meRef.current;
    if (nextAction === 'sit') {
      goSit();
      return;
    }
    me.target = null;
    me.onArrive = undefined;
    // leaving the seat: step back onto the floor
    if (me.idle === 'sit' && !isWalkable(geo, me)) {
      const p = nearestWalkable(geo, me);
      me.x = p.x;
      me.y = p.y;
    }
    me.idle = nextAction;
    const c = companionRef.current;
    if (c.idle === 'sit') {
      const p = nearestWalkable(geo, c);
      Object.assign(c, { x: p.x, y: p.y, idle: 'stand' });
    }
    if (nextAction === 'wave' || nextAction === 'greet') {
      triggerGreeting(nextAction, nextAction === 'wave' ? t.stage.greetPresets[0] : t.stage.greetPresets[1]);
    } else {
      syncMoveToServer(true);
    }
    setFrame((f) => f + 1);
  };

  const handleStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const sp = { x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 };
    const ip = stageToImg(sp, { w: rect.width, h: rect.height }, geo.imageAspect);
    if (ip.y < geo.horizonY) return; // tapped the sky / wall
    const me = meRef.current;
    if (me.idle === 'sit' && !isWalkable(geo, me)) {
      const p = nearestWalkable(geo, me);
      me.x = p.x;
      me.y = p.y;
    }
    me.target = nearestWalkable(geo, ip);
    me.onArrive = undefined;
    if (chosenAction === 'sit') setChosenAction('stand');
  };

  const onJoystick = useCallback((v: { x: number; y: number }) => {
    joyRef.current = v;
    const me = meRef.current;
    if (Math.hypot(v.x, v.y) > 0.18 && me.idle === 'sit' && !isWalkable(geoRef.current, me)) {
      const p = nearestWalkable(geoRef.current, me);
      me.x = p.x;
      me.y = p.y;
      me.idle = 'stand';
      setChosenAction('stand');
    }
  }, []);

  // Parallax: move the backdrop directly (no React re-render per mouse move)
  const applyParallax = (x: number, y: number) => {
    if (parallaxFrameRef.current) cancelAnimationFrame(parallaxFrameRef.current);
    parallaxFrameRef.current = requestAnimationFrame(() => {
      if (backdropRef.current) backdropRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.04)`;
    });
  };

  const toggleSound = () => {
    if (soundOn) {
      ambientAudio.stop();
      setSoundOn(false);
    } else {
      ambientAudio.start(place.soundTheme);
      setSoundOn(true);
    }
  };

  // ---------- postcard (100% on-device canvas) ----------
  const capturePostcard = async () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 840;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#FAF8F4';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.crossOrigin = 'anonymous';
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('Image load error'));
        el.src = stageImage;
      });

      const pad = 44;
      const photoW = canvas.width - pad * 2;
      const photoH = 620;
      const imgRatio = img.width / img.height;
      const boxRatio = photoW / photoH;
      let sx = 0;
      let sy = 0;
      let sw = img.width;
      let sh = img.height;
      if (imgRatio > boxRatio) {
        sw = img.height * boxRatio;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / boxRatio;
        sy = (img.height - sh) / 2;
      }

      ctx.save();
      ctx.beginPath();
      ctx.rect(pad, pad, photoW, photoH);
      ctx.clip();
      ctx.drawImage(img, sx, sy, sw, sh, pad, pad, photoW, photoH);

      if (timeOfDay === 'sunset') {
        const grad = ctx.createLinearGradient(0, pad, 0, pad + photoH);
        grad.addColorStop(0, 'rgba(217, 119, 6, 0.32)');
        grad.addColorStop(0.55, 'rgba(190, 92, 72, 0.22)');
        grad.addColorStop(1, 'rgba(38, 28, 52, 0.35)');
        ctx.fillStyle = grad;
        ctx.fillRect(pad, pad, photoW, photoH);
      } else if (timeOfDay === 'night') {
        const grad = ctx.createLinearGradient(0, pad, 0, pad + photoH);
        grad.addColorStop(0, 'rgba(11, 18, 38, 0.62)');
        grad.addColorStop(1, 'rgba(17, 24, 39, 0.48)');
        ctx.fillStyle = grad;
        ctx.fillRect(pad, pad, photoW, photoH);
      }

      // Characters exactly where they stand (CSS skeleton pose baked into the SVG)
      const stageEl = stageRef.current;
      if (stageEl) {
        const sRect = stageEl.getBoundingClientRect();
        const stage = { w: sRect.width, h: sRect.height };
        const aspect = img.width / img.height;
        const sf = coverFraction(stage, aspect);
        const pf = coverFraction({ w: photoW, h: photoH }, aspect);
        const toPhoto = (px: number, py: number) => {
          const ip = stageToImg({ x: (px / stage.w) * 100, y: (py / stage.h) * 100 }, stage, aspect);
          return { x: pad + ((ip.x - 0.5) / pf.fx + 0.5) * photoW, y: pad + ((ip.y - 0.5) / pf.fy + 0.5) * photoH };
        };
        const pxScale = photoH / pf.fy / (stage.h / sf.fy);
        const charEls = Array.from(stageEl.querySelectorAll<HTMLElement>('[data-char]')).sort(
          (a, b) => a.getBoundingClientRect().bottom - b.getBoundingClientRect().bottom
        );
        for (const el of charEls) {
          const svgEl = el.querySelector('svg');
          if (!svgEl) continue;
          const r = svgEl.getBoundingClientRect();
          const flipped = (svgEl.parentElement?.style.transform ?? '').includes('scaleX(-1)');
          const clone = svgEl.cloneNode(true) as SVGSVGElement;
          // bake the current joint angles (they live in CSS animations)
          const srcJoints = svgEl.querySelectorAll<SVGGraphicsElement>('[class*="j-"]');
          const dstJoints = clone.querySelectorAll<SVGGraphicsElement>('[class*="j-"]');
          srcJoints.forEach((src, i) => {
            const cs = getComputedStyle(src);
            const dst = dstJoints[i];
            if (!dst) return;
            if (cs.transform && cs.transform !== 'none') dst.setAttribute('transform', cs.transform);
            if (cs.opacity && cs.opacity !== '1') dst.setAttribute('opacity', cs.opacity);
            dst.removeAttribute('class');
          });
          clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          clone.setAttribute('width', String(Math.round(r.width * 2)));
          clone.setAttribute('height', String(Math.round(r.height * 2)));
          clone.removeAttribute('class');
          const xml = new XMLSerializer().serializeToString(clone);
          try {
            const charImg = await new Promise<HTMLImageElement>((resolve, reject) => {
              const ci = new Image();
              ci.onload = () => resolve(ci);
              ci.onerror = () => reject(new Error('char render error'));
              ci.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
            });
            const tl = toPhoto(r.left - sRect.left, r.top - sRect.top);
            const dw = r.width * pxScale;
            const dh = r.height * pxScale;
            ctx.save();
            if (flipped) {
              ctx.translate(tl.x + dw, tl.y);
              ctx.scale(-1, 1);
              ctx.drawImage(charImg, 0, 0, dw, dh);
            } else {
              ctx.drawImage(charImg, tl.x, tl.y, dw, dh);
            }
            ctx.restore();
          } catch {
            // skip a character that fails to rasterise
          }
        }
      }

      if (affirmation.trim()) {
        const scrim = ctx.createLinearGradient(0, pad + photoH - 130, 0, pad + photoH);
        scrim.addColorStop(0, 'rgba(0,0,0,0)');
        scrim.addColorStop(1, 'rgba(10,14,22,0.72)');
        ctx.fillStyle = scrim;
        ctx.fillRect(pad, pad + photoH - 130, photoW, 130);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '500 26px "Plus Jakarta Sans", "Noto Sans KR", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`“${affirmation.trim()}”`, canvas.width / 2, pad + photoH - 42);
      }
      ctx.restore();

      ctx.fillStyle = '#14171F';
      ctx.font = '600 32px Georgia, serif';
      ctx.textAlign = 'left';
      ctx.fillText(stageTitle, pad, pad + photoH + 62);
      ctx.fillStyle = '#5A6170';
      ctx.font = '400 18px "Plus Jakarta Sans", "Noto Sans KR", sans-serif';
      const dateStr = new Date().toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      ctx.fillText(`${avatar.name} · ${place.location[lang]} · ${dateStr}`, pad, pad + photoH + 98);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#8A6D3B';
      ctx.font = '600 20px Georgia, serif';
      ctx.fillText('DreamMe', canvas.width - pad, pad + photoH + 92);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.84);
      onSaveSnapshot({
        id: `snap_${Date.now()}`,
        placeId: place.id,
        placeTitle: stageTitle,
        affirmation: affirmation.trim() || stageTitle,
        timeOfDay,
        imageDataUrl: dataUrl,
        createdAt: new Date().toISOString(),
      });
      setLatestSnapshotUrl(dataUrl);
      setSnapshotBanner(t.stage.snapshotSaved);
      window.setTimeout(() => setSnapshotBanner(null), 5000);
    } catch {
      // ignore
    }
  };

  const downloadLatestSnapshot = () => {
    if (!latestSnapshotUrl) return;
    const link = document.createElement('a');
    link.href = latestSnapshotUrl;
    link.download = `DreamMe_${place.id}_${Date.now()}.jpg`;
    link.click();
  };

  // ---------- what to draw this frame ----------
  const me = meRef.current;
  const items: Array<{
    key: string;
    x: number; // image fraction
    y: number;
    name: string;
    isMe?: boolean;
    greeting?: string;
    smooth?: boolean;
    node: React.ReactNode;
  }> = [];

  items.push({
    key: 'me',
    x: me.x,
    y: me.y,
    name: avatar.name,
    isMe: true,
    greeting: me.greeting,
    node: (
      <AvatarRenderer
        name={avatar.name}
        facePhoto={avatar.facePhoto}
        faceZoom={avatar.faceZoom}
        faceOffsetX={avatar.faceOffsetX}
        faceOffsetY={avatar.faceOffsetY}
        faceWarmth={avatar.faceWarmth}
        hairStyle={avatar.hairStyle}
        hairColor={avatar.hairColor}
        skinTone={avatar.skinTone}
        outfit={avatar.outfit}
        action={myDisplayAction()}
        prop={avatar.equippedProp}
        timeOfDay={timeOfDay}
        facing={me.facing}
        visualMode={avatar.facePhoto ? 'photo' : 'illustrated'}
        showLabel={false}
        size={AVATAR_BASE}
      />
    ),
  });

  if (mode === 'solo' && companion.enabled) {
    const c = companionRef.current;
    items.push({
      key: 'companion',
      x: c.x,
      y: c.y,
      name: companion.name,
      node: (
        <AvatarRenderer
          name={companion.name}
          facePhoto={companion.visualMode === 'photo' ? companion.facePhoto : null}
          faceZoom={companion.faceZoom}
          faceOffsetX={companion.faceOffsetX}
          faceOffsetY={companion.faceOffsetY}
          hairStyle={companion.hairStyle}
          hairColor={companion.hairColor}
          skinTone={companion.skinTone}
          outfit={companion.outfit}
          action={c.moving ? 'walk' : c.idle === 'sit' ? 'sit' : me.idle === 'toast' || me.idle === 'wine' ? me.idle : 'stand'}
          prop={me.idle === 'toast' || me.idle === 'wine' ? 'champagne' : 'none'}
          timeOfDay={timeOfDay}
          facing={c.facing}
          visualMode={companion.visualMode}
          showLabel={false}
          size={AVATAR_BASE}
        />
      ),
    });
  }

  if (mode === 'together') {
    Object.values(livePeers).forEach((p) => {
      // other devices send image-space percent
      const ip = nearestWalkable(geo, { x: p.x / 100, y: p.y / 100 });
      items.push({
        key: p.clientId,
        x: p.action === 'sit' ? p.x / 100 : ip.x,
        y: p.action === 'sit' ? p.y / 100 : ip.y,
        name: p.name,
        greeting: p.greetingText,
        smooth: true,
        node: (
          <AvatarRenderer
            name={p.name}
            hairStyle={p.hairStyle}
            hairColor={p.hairColor}
            skinTone={p.skinTone}
            outfit={p.outfit}
            action={p.action}
            prop={p.prop}
            timeOfDay={timeOfDay}
            facing={p.facing}
            visualMode="illustrated"
            showLabel={false}
            size={AVATAR_BASE}
          />
        ),
      });
    });
    if (showVirtualNeighbors) {
      neighborsRef.current.forEach((n, i) => {
        const tpl = VIRTUAL_NEIGHBORS[i];
        items.push({
          key: tpl.clientId,
          x: n.x,
          y: n.y,
          name: tpl.name,
          greeting: n.greeting,
          node: (
            <AvatarRenderer
              name={tpl.name}
              hairStyle={tpl.hairStyle}
              hairColor={tpl.hairColor}
              skinTone={tpl.skinTone}
              outfit={tpl.outfit}
              action={n.moving ? 'walk' : n.idle}
              prop={tpl.prop}
              timeOfDay={timeOfDay}
              facing={n.facing}
              visualMode="illustrated"
              showLabel={false}
              size={AVATAR_BASE}
            />
          ),
        });
      });
    }
  }
  items.sort((a, b) => a.y - b.y);

  const { fy } = coverFraction(stageSize.w ? stageSize : { w: 4, h: 3 }, geo.imageAspect);
  const figurePx = (y: number) => (personHeight(geo, y) / fy) * stageSize.h;

  // Name tags float above heads and nudge apart so they never pile up
  const nameTags = (() => {
    if (stageSize.w === 0) return [];
    const placed: Array<{ key: string; cx: number; top: number; w: number; name: string; isMe?: boolean; greeting?: string; smooth?: boolean }> = [];
    const byFront = [...items].sort((a, b) => b.y - a.y);
    for (const it of byFront) {
      const sp = imgToStage(it, stageSize, geo.imageAspect);
      const cx = (sp.x / 100) * stageSize.w;
      let top = (sp.y / 100) * stageSize.h - figurePx(it.y) - 6;
      const w = Math.min(130, 18 + [...it.name].reduce((acc, ch) => acc + (ch.charCodeAt(0) > 0x2e80 ? 11 : 6.5), 0));
      const h = 20;
      for (let guard = 0; guard < 8; guard++) {
        const hit = placed.find((o) => Math.abs(o.cx - cx) < (o.w + w) / 2 + 4 && Math.abs(o.top - top) < h);
        if (!hit) break;
        top = hit.top - h - 2;
      }
      placed.push({ key: it.key, cx, top: Math.max(h + 2, top), w, name: it.name, isMe: it.isMe, greeting: it.greeting, smooth: it.smooth });
    }
    return placed;
  })();

  const unlockedProps = AVATAR_PROPS.filter((p) => goalProgress >= p.unlockProgress);
  const peopleCount = Object.keys(livePeers).length + 1 + (showVirtualNeighbors ? VIRTUAL_NEIGHBORS.length : 0);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#0E1117] text-white flex flex-col">
      {/* Top Stage Header Bar */}
      <div className="px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#121620]">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/8 hover:bg-white/15 text-xs font-medium transition-colors min-h-[40px] whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.stage.back}</span>
          </button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold text-white truncate">{stageTitle}</h1>
            <div className="flex items-center gap-2 text-xs text-white/60">
              <span>{place.location[lang]}</span>
              <span aria-hidden="true">·</span>
              <span>
                {mode === 'together'
                  ? sseConnected
                    ? `${t.stage.liveConnected} (${peopleCount})`
                    : t.stage.liveConnecting
                  : t.stage.offlineMode}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center p-1 rounded-lg bg-white/8">
            <button
              type="button"
              onClick={() => setMode('solo')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                mode === 'solo' ? 'bg-white text-[#14171F]' : 'text-white/75 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>{t.stage.soloBadge}</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('together')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                mode === 'together' ? 'bg-white text-[#14171F]' : 'text-white/75 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{t.stage.togetherBadge}</span>
            </button>
          </div>

          <div className="inline-flex items-center p-1 rounded-lg bg-white/8">
            {(
              [
                { id: 'day', icon: Sun, label: t.stage.timeDay },
                { id: 'sunset', icon: Sunset, label: t.stage.timeSunset },
                { id: 'night', icon: Moon, label: t.stage.timeNight },
              ] as const
            ).map((opt) => {
              const Icon = opt.icon;
              const active = timeOfDay === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTimeOfDay(opt.id)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    active ? 'bg-[#C5A46D] text-[#14171F]' : 'text-white/75 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={toggleSound}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors min-h-[38px] whitespace-nowrap ${
              soundOn ? 'bg-[#C5A46D]/25 text-[#F2D9AA] border border-[#C5A46D]/40' : 'bg-white/8 text-white/80 hover:bg-white/15'
            }`}
          >
            {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{soundOn ? t.stage.soundOn : t.stage.soundOff}</span>
          </button>
        </div>
      </div>

      {/* Main 2.5D Interactive Viewport */}
      <div className="flex-1 flex flex-col items-center justify-center px-3 sm:px-6 py-4">
        <div
          ref={stageRef}
          onClick={handleStageClick}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            applyParallax(((e.clientX - rect.left) / rect.width - 0.5) * -16, ((e.clientY - rect.top) / rect.height - 0.5) * -8);
          }}
          onMouseLeave={() => applyParallax(0, 0)}
          className="relative w-full max-w-6xl aspect-[4/3] sm:aspect-[16/9] max-h-[68vh] rounded-2xl overflow-hidden cursor-pointer border border-white/12 shadow-2xl select-none bg-[#161B26]"
        >
          <div
            ref={backdropRef}
            className="absolute -inset-4 transition-transform duration-300 ease-out will-change-transform"
            style={{ transform: 'translate3d(0px, 0px, 0) scale(1.04)' }}
          >
            <img
              src={stageImage}
              alt={stageTitle}
              referrerPolicy="no-referrer"
              decoding="async"
              onLoad={(e) => {
                const im = e.currentTarget;
                if (customImage && im.naturalWidth && im.naturalHeight) setCustomAspect(im.naturalWidth / im.naturalHeight);
              }}
              className="w-full h-full object-cover transition-[filter] duration-700"
              style={{
                filter:
                  timeOfDay === 'sunset'
                    ? 'sepia(0.28) saturate(1.32) brightness(0.88) contrast(1.06)'
                    : timeOfDay === 'night'
                    ? 'brightness(0.45) contrast(1.18) saturate(0.82) hue-rotate(-14deg)'
                    : 'brightness(1.02) contrast(1.02)',
              }}
            />
            {geo.lights && <SceneLights variant={geo.lights} timeOfDay={timeOfDay} />}
          </div>

          {timeOfDay === 'sunset' && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(180deg, rgba(234, 138, 60, 0.34) 0%, rgba(196, 94, 78, 0.22) 48%, rgba(30, 22, 46, 0.38) 100%)',
              }}
            />
          )}

          {timeOfDay === 'night' && (
            <div className="absolute inset-0 pointer-events-none">
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(10, 17, 40, 0.56) 0%, rgba(18, 28, 52, 0.32) 55%, rgba(12, 16, 26, 0.45) 100%)',
                }}
              />
              {[
                { top: '9%', left: '14%', delay: '0s' },
                { top: '15%', left: '29%', delay: '0.8s' },
                { top: '8%', left: '48%', delay: '1.5s' },
                { top: '18%', left: '66%', delay: '0.4s' },
                { top: '11%', left: '82%', delay: '1.1s' },
                { top: '22%', left: '91%', delay: '2.0s' },
              ].map((s, i) => (
                <span
                  key={i}
                  className="absolute w-1 h-1 rounded-full bg-amber-100 animate-star-twinkle"
                  style={{ top: s.top, left: s.left, animationDelay: s.delay }}
                />
              ))}
            </div>
          )}

          {place.soundTheme === 'ocean' && (
            <div
              className="absolute inset-x-0 top-[42%] h-[18%] pointer-events-none animate-ocean-shimmer"
              style={{
                background:
                  timeOfDay === 'sunset'
                    ? 'radial-gradient(ellipse at 50% 50%, rgba(255, 205, 130, 0.35), transparent 68%)'
                    : 'radial-gradient(ellipse at 50% 50%, rgba(255, 255, 255, 0.24), transparent 68%)',
              }}
            />
          )}

          {stampToast && (
            <div className="absolute top-4 left-4 z-[130] px-3.5 py-2 rounded-xl bg-black/70 border border-white/15 text-xs text-white flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-[#DFC390]" />
              <span>
                {t.stage.stampEarned} · {place.stampCode}
              </span>
            </div>
          )}

          {snapshotBanner && (
            <div className="absolute top-4 right-4 z-[130] px-3.5 py-2 rounded-xl bg-white text-[#14171F] shadow-lg text-xs font-medium flex items-center gap-2.5">
              <span>{snapshotBanner}</span>
              {latestSnapshotUrl && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadLatestSnapshot();
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#14171F] text-white text-[11px]"
                >
                  <Download className="w-3 h-3" />
                  <span>{t.stage.downloadPng}</span>
                </button>
              )}
            </div>
          )}

          {/* Depth-sorted characters — GPU transforms only */}
          {stageSize.w > 0 &&
            items.map((item) => {
              const sp = imgToStage(item, stageSize, geo.imageAspect);
              const scale = figurePx(item.y) / (AVATAR_BASE * FIGURE_PX_PER_SIZE);
              return (
                <div
                  key={item.key}
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    transform: `translate3d(${sp.x}%, ${sp.y}%, 0)`,
                    transition: item.smooth ? 'transform 300ms linear' : undefined,
                    zIndex: 10 + Math.round(item.y * 100),
                  }}
                >
                  <div
                    data-char={item.key}
                    className="absolute left-0 top-0"
                    style={{
                      width: AVATAR_BASE,
                      transform: `translate(-50%, ${-FEET_RATIO * 100}%) scale(${scale.toFixed(3)})`,
                      transformOrigin: `50% ${FEET_RATIO * 100}%`,
                    }}
                  >
                    {item.node}
                  </div>
                </div>
              );
            })}

          {/* Name tags + greeting bubbles */}
          <div className="absolute inset-0 pointer-events-none z-[120]">
            {nameTags.map((tag) => (
              <div
                key={tag.key}
                className="absolute left-0 top-0 flex flex-col items-center"
                style={{
                  transform: `translate3d(${tag.cx}px, ${tag.top}px, 0) translate(-50%, -100%)`,
                  transition: tag.smooth ? 'transform 300ms linear' : undefined,
                }}
              >
                {tag.greeting && (
                  <div className="mb-1 px-2.5 py-0.5 rounded-full bg-white text-[#14171F] text-[11px] font-medium shadow border border-black/10 whitespace-nowrap max-w-[170px] truncate">
                    {tag.greeting}
                  </div>
                )}
                <div
                  className={`px-2 py-[1px] rounded-full text-[10.5px] font-semibold tracking-tight whitespace-nowrap max-w-[130px] truncate shadow-sm ${
                    tag.isMe ? 'bg-[#C5A46D] text-[#14171F]' : 'bg-[#14171F]/70 text-white'
                  }`}
                >
                  {tag.name}
                </div>
              </div>
            ))}
          </div>

          {affirmation.trim() && (
            <div className="absolute inset-x-0 bottom-0 pt-10 pb-4 px-6 bg-gradient-to-t from-black/75 via-black/35 to-transparent pointer-events-none text-center z-[125]">
              <p className="text-sm sm:text-base font-medium text-white/95 tracking-wide drop-shadow">“{affirmation.trim()}”</p>
            </div>
          )}

        </div>

        {/* Game joystick, right under the scene so it never hides anything */}
        <div className="w-full max-w-6xl mt-3 flex items-center gap-4">
          <Joystick
            onChange={onJoystick}
            size={112}
            labels={
              lang === 'ko'
                ? { forward: '앞', back: '뒤', left: '왼쪽', right: '오른쪽' }
                : { forward: 'Fwd', back: 'Back', left: 'Left', right: 'Right' }
            }
          />
          <p className="text-[12px] leading-relaxed text-white/60">{t.stage.tapFloorHint}</p>
        </div>

        {/* Bottom Control Dock */}
        <div className="w-full max-w-6xl mt-3 space-y-3">
          <div className="bg-[#161B26] border border-white/10 rounded-2xl p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'stand', icon: Footprints, label: t.stage.actions.stand },
                  { id: 'sit', icon: Armchair, label: t.stage.actions.sit },
                  { id: 'wine', icon: Wine, label: t.stage.actions.wine },
                  { id: 'toast', icon: PartyPopper, label: t.stage.actions.toast },
                  { id: 'wave', icon: Hand, label: t.stage.actions.wave },
                  { id: 'greet', icon: Sparkles, label: t.stage.actions.greet },
                  { id: 'sign', icon: PenTool, label: t.stage.actions.sign },
                ] as const
              ).map((act) => {
                const Icon = act.icon;
                const active = chosenAction === act.id;
                return (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => handleActionSelect(act.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors min-h-[40px] whitespace-nowrap ${
                      active ? 'bg-white text-[#14171F]' : 'bg-white/6 text-white/85 hover:bg-white/14'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{act.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {mode === 'solo' ? (
                <button
                  type="button"
                  onClick={() => onToggleCompanion(!companion.enabled)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors min-h-[40px] whitespace-nowrap ${
                    companion.enabled ? 'bg-[#C5A46D] text-[#14171F]' : 'bg-white/8 text-white/80 hover:bg-white/15'
                  }`}
                >
                  <Heart className="w-3.5 h-3.5" />
                  <span>{companion.enabled ? t.stage.companionOn : t.stage.companionOff}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowVirtualNeighbors((v) => !v)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors min-h-[40px] whitespace-nowrap ${
                    showVirtualNeighbors ? 'bg-[#C5A46D] text-[#14171F]' : 'bg-white/8 text-white/80 hover:bg-white/15'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{showVirtualNeighbors ? t.stage.virtualNeighborsOn : t.stage.virtualNeighborsOff}</span>
                </button>
              )}

              <select
                aria-label={t.stage.propSelect}
                value={avatar.equippedProp}
                onChange={(e) => {
                  const nextProp = e.target.value as PropId;
                  onUpdateAvatarProp(nextProp);
                  syncMoveToServer(true, nextProp);
                }}
                className="px-3 py-2 rounded-xl bg-white/8 border border-white/12 text-xs text-white min-h-[40px] focus:outline-none"
              >
                {unlockedProps.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#161B26] text-white">
                    {t.stage.propSelect}: {p.name[lang]}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={capturePostcard}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-[#14171F] hover:bg-white/90 text-xs font-semibold transition-colors min-h-[40px] whitespace-nowrap"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{t.stage.snapshot}</span>
              </button>
            </div>
          </div>

          <div className="bg-[#161B26] border border-white/10 rounded-2xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <input
              type="text"
              value={affirmation}
              onChange={(e) => setAffirmation(e.target.value)}
              placeholder={t.stage.affirmationPlaceholder}
              maxLength={80}
              className="flex-1 px-3.5 py-2 rounded-xl bg-white/6 border border-white/10 text-xs sm:text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/30"
            />
            {mode === 'together' && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0">
                {t.stage.greetPresets.map((msg) => (
                  <button
                    key={msg}
                    type="button"
                    onClick={() => triggerGreeting('wave', msg)}
                    className="px-3 py-2 rounded-lg bg-white/8 hover:bg-white/16 text-xs text-white/90 whitespace-nowrap transition-colors min-h-[36px]"
                  >
                    {msg}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
