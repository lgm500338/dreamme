export type Language = 'ko' | 'en' | 'es';

export type TimeOfDay = 'day' | 'sunset' | 'night';

export type ExperienceMode = 'solo' | 'together';

export type AvatarAction = 'stand' | 'walk' | 'sit' | 'wine' | 'toast' | 'wave' | 'greet' | 'sign';

export type OutfitStyle = 'resort' | 'tailored' | 'parisChic' | 'evening' | 'athleisure';

export type HairStyle = 'bob' | 'longWave' | 'shortNeat' | 'updo' | 'curly';

export type SkinTone = 'fair' | 'warm' | 'olive' | 'tan' | 'deep';

export type PropId =
  | 'none'
  | 'coffee'
  | 'wine'
  | 'sunglasses'
  | 'champagne'
  | 'shoppingBag'
  | 'bestsellerBook'
  | 'goldKey';

export type CompanionVisualMode = 'illustrated' | 'silhouette' | 'photo';

export type DreamCategoryId =
  | 'travel'
  | 'love'
  | 'style'
  | 'home'
  | 'career'
  | 'wealth'
  | 'health'
  | 'growth';

export type SoundTheme = 'ocean' | 'cafe' | 'park' | 'home';

export type MainTab =
  | 'places'
  | 'dreamLife'
  | 'together'
  | 'avatar'
  | 'board'
  | 'goals';

export interface AvatarConfig {
  name: string;
  facePhoto: string | null; // Base64 Data URL stored ONLY locally
  faceZoom: number; // 0.85 ~ 1.6
  faceOffsetX: number; // -25 ~ 25
  faceOffsetY: number; // -25 ~ 25
  faceWarmth: number; // -15 ~ 15
  hairStyle: HairStyle;
  hairColor: string;
  skinTone: SkinTone;
  outfit: OutfitStyle;
  equippedProp: PropId;
}

export interface CompanionConfig {
  enabled: boolean;
  name: string;
  relation: 'partner' | 'family' | 'friend';
  visualMode: CompanionVisualMode;
  facePhoto: string | null; // Strictly Solo Mode local only, NEVER transmitted
  faceZoom: number;
  faceOffsetX: number;
  faceOffsetY: number;
  hairStyle: HairStyle;
  hairColor: string;
  skinTone: SkinTone;
  outfit: OutfitStyle;
}

export interface DreamPlace {
  id: string;
  category: DreamCategoryId;
  name: { ko: string; en: string; es: string };
  location: { ko: string; en: string; es: string };
  description: { ko: string; en: string; es: string };
  image: string;
  soundTheme: SoundTheme;
  recommendedMode: ExperienceMode;
  defaultAction: AvatarAction;
  walkBounds: { minY: number; maxY: number };
  seatSpot: { x: number; y: number };
  companionSpot: { x: number; y: number };
  searchAliases: string[];
  stampCode: string;
  isCustom?: boolean;
  /**
   * Optional hand-tuned scene geometry (image-space fractions 0..1).
   * When present, characters are kept on the walkable deck/floor, seats line up
   * with the furniture painted in the backdrop, and scene lights are drawn at night.
   */
  stage: StageGeometry;
}

export type ImgPt = [number, number];

/** Hand-tuned scene geometry, all in backdrop-image fractions (0..1). */
export interface StageGeometry {
  /** width / height of the backdrop image */
  imageAspect: number;
  /** eye-level horizon (image y) — people shrink towards it */
  horizonY: number;
  /** person height = heightK × (feetY − horizonY), as a fraction of image height */
  heightK: number;
  /** walkable floor: one or more polygons */
  floor: ImgPt[][];
  /** furniture / railings you cannot walk through */
  obstacles?: ImgPt[][];
  /** where you appear */
  spawn: { x: number; y: number };
  seat: { x: number; y: number };
  companionSeat: { x: number; y: number };
  /** id of an extra light layer drawn for sunset / night */
  lights?: 'superyacht';
  /** runtime only: visible x-range of the image on this screen */
  view?: { x0: number; x1: number };
}

export interface CustomDream {
  id: string;
  title: string;
  affirmation: string;
  category: DreamCategoryId;
  matchedPlaceId: string;
  customImage?: string | null; // Optional local uploaded photo
  preferredTime: TimeOfDay;
  preferredAction: AvatarAction;
  createdAt: string;
}

export interface DreamDaySlot {
  id: string;
  label: string; // e.g. "아침", "오후", "저녁" or custom user label
  placeId: string;
  customImage?: string | null;
  customTitle?: string;
  /** uploaded photo only: image y (0..1) where the walkable floor starts */
  customFloorY?: number;
  /** people size in this scene, set by pinching (1 = normal) */
  peopleScale?: number;
  timeOfDay: TimeOfDay;
  action: AvatarAction;
  affirmation: string;
  durationSec: number;
}

export interface GoalItem {
  id: string;
  title: string;
  category: DreamCategoryId;
  current: number;
  target: number;
  unit: string;
  step: number;
  linkedPlaceId: string;
  lastCheckedDate: string | null;
}

export interface PassportStamp {
  placeId: string;
  placeNameKo: string;
  placeNameEn: string;
  stampCode: string;
  firstVisitedAt: string;
  visitCount: number;
}

export interface SavedSnapshot {
  id: string;
  placeId: string;
  placeTitle: string;
  affirmation: string;
  timeOfDay: TimeOfDay;
  imageDataUrl: string;
  createdAt: string;
  /** 'portrait' = 9:16 shorts card */
  frame?: FrameMode;
}

export interface TogetherPeer {
  clientId: string;
  roomId: string;
  name: string;
  x: number;
  y: number;
  facing: 'left' | 'right';
  action: AvatarAction;
  outfit: OutfitStyle;
  hairStyle: HairStyle;
  hairColor: string;
  skinTone: SkinTone;
  prop: PropId;
  greetingText?: string;
  greetingAt?: number;
  isVirtual?: boolean;
}

export interface PropDefinition {
  id: PropId;
  name: { ko: string; en: string; es: string };
  unlockProgress: number; // 0 = default unlocked, 1..100 = goal completion %
  unlockHint: { ko: string; en: string; es: string };
}

export interface DreamMeStore {
  language: Language;
  avatar: AvatarConfig;
  companion: CompanionConfig;
  customDreams: CustomDream[];
  dreamDaySlots: DreamDaySlot[];
  goals: GoalItem[];
  stamps: PassportStamp[];
  snapshots: SavedSnapshot[];
  streakDays: number;
  lastActiveDate: string | null;
  virtualNeighborsDefault: boolean;
  /** screen shape for every scene: landscape (default) or 9:16 shorts */
  frameMode?: FrameMode;
}

export type FrameMode = 'landscape' | 'portrait';
