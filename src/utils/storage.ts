import { DEFAULT_GOALS } from '../data/places';
import { DreamMeStore } from '../types/dream';

const STORAGE_KEY = 'dreamme_store_v1';

export function getTodayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getInitialStore(): DreamMeStore {
  return {
    language: 'ko',
    avatar: {
      name: '나의 미래',
      facePhoto: null,
      faceZoom: 1.12,
      faceOffsetX: 0,
      faceOffsetY: 0,
      faceWarmth: 0,
      hairStyle: 'longWave',
      hairColor: '#241D1A',
      skinTone: 'warm',
      outfit: 'resort',
      equippedProp: 'wine',
    },
    companion: {
      enabled: false,
      name: '소중한 사람',
      relation: 'partner',
      visualMode: 'illustrated',
      facePhoto: null,
      faceZoom: 1.1,
      faceOffsetX: 0,
      faceOffsetY: 0,
      hairStyle: 'shortNeat',
      hairColor: '#26201D',
      skinTone: 'warm',
      outfit: 'tailored',
    },
    customDreams: [],
    // Strictly EMPTY by default — user composes their own Dream Day with zero forced presets
    dreamDaySlots: [],
    goals: DEFAULT_GOALS,
    stamps: [],
    snapshots: [],
    streakDays: 1,
    lastActiveDate: getTodayKey(),
    virtualNeighborsDefault: true,
  };
}

export function loadStore(): DreamMeStore {
  const fallback = getInitialStore();
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<DreamMeStore>;

    // Compute streak continuity
    const today = getTodayKey();
    let streakDays = parsed.streakDays ?? 1;
    const lastDate = parsed.lastActiveDate ?? today;
    if (lastDate !== today) {
      const prev = new Date(lastDate);
      const curr = new Date(today);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        streakDays += 1;
      } else if (diffDays > 1) {
        streakDays = 1;
      }
    }

    return {
      ...fallback,
      ...parsed,
      avatar: { ...fallback.avatar, ...(parsed.avatar ?? {}) },
      companion: { ...fallback.companion, ...(parsed.companion ?? {}) },
      customDreams: Array.isArray(parsed.customDreams) ? parsed.customDreams : [],
      dreamDaySlots: Array.isArray(parsed.dreamDaySlots) ? parsed.dreamDaySlots : [],
      goals: Array.isArray(parsed.goals) && parsed.goals.length > 0 ? parsed.goals : DEFAULT_GOALS,
      stamps: Array.isArray(parsed.stamps) ? parsed.stamps : [],
      snapshots: Array.isArray(parsed.snapshots) ? parsed.snapshots : [],
      streakDays,
      lastActiveDate: today,
    };
  } catch {
    return fallback;
  }
}

export function saveStore(store: DreamMeStore): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // If localStorage is near quota due to many snapshots, trim oldest snapshots and retry
    try {
      const trimmed: DreamMeStore = {
        ...store,
        snapshots: store.snapshots.slice(0, 8),
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // Ignore quota failure safely
    }
  }
}

/**
 * Downscales a user photo locally via Canvas so face/background uploads stay crisp and lightweight
 * without ever leaving the device.
 */
export function compressImageFile(file: File, maxDim = 480, quality = 0.84): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function calculateOverallGoalProgress(goals: DreamMeStore['goals']): number {
  if (goals.length === 0) return 0;
  const totalRatio = goals.reduce((acc, g) => {
    const ratio = g.target > 0 ? Math.min(1, Math.max(0, g.current / g.target)) : 0;
    return acc + ratio;
  }, 0);
  return Math.round((totalRatio / goals.length) * 100);
}
