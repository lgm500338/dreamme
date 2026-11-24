import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  X,
  Volume2,
  VolumeX,
  Sun,
  Sunset,
  Moon,
  SkipForward,
  ImagePlus,
  Footprints,
} from 'lucide-react';
import { DREAM_PLACES } from '../data/places';
import { tFor } from '../data/i18n';
import {
  AvatarAction,
  AvatarConfig,
  CompanionConfig,
  CustomDream,
  DreamDaySlot,
  FrameMode,
  Language,
  TimeOfDay,
} from '../types/dream';
import { ambientAudio } from '../utils/ambientAudio';
import { AvatarRenderer } from './AvatarRenderer';
import { compressImageFile } from '../utils/storage';
import { DEFAULT_CUSTOM_FLOOR_Y } from './stage/geometry';
import { FrameToggle } from './FrameToggle';

interface DreamDayCinemaProps {
  lang: Language;
  slots: DreamDaySlot[];
  customDreams: CustomDream[];
  avatar: AvatarConfig;
  companion: CompanionConfig;
  onChangeSlots: (next: DreamDaySlot[]) => void;
  /** open the walkable stage for one chapter */
  onEnterSlot: (slot: DreamDaySlot) => void;
  /** landscape (default) or vertical 9:16 shorts framing */
  frameMode?: FrameMode;
  onChangeFrameMode?: (mode: FrameMode) => void;
}

const CALM_ACTIONS: AvatarAction[] = ['stand', 'walk', 'sit', 'wine', 'toast', 'wave', 'greet', 'sign'];

export const DreamDayCinema: React.FC<DreamDayCinemaProps> = ({
  lang,
  slots,
  customDreams,
  avatar,
  companion,
  onChangeSlots,
  onEnterSlot,
  frameMode = 'landscape',
  onChangeFrameMode,
}) => {
  const t = tFor(lang);
  const portrait = frameMode === 'portrait';

  // Form state for user to compose their own Dream Day (ZERO forced preset!)
  const [slotLabel, setSlotLabel] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>(DREAM_PLACES[0].id);
  const [selectedTime, setSelectedTime] = useState<TimeOfDay>('day');
  const [selectedAction, setSelectedAction] = useState<AvatarAction>('stand');
  const [affirmation, setAffirmation] = useState('');

  // "내 사진으로 장면 만들기": photo stays on this device (downscaled, stored locally)
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState('');
  const [floorY, setFloorY] = useState(DEFAULT_CUSTOM_FLOOR_Y);
  const [photoError, setPhotoError] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setPhoto(await compressImageFile(file, 1280, 0.8));
      setFloorY(DEFAULT_CUSTOM_FLOOR_Y);
      setPhotoError(false);
    } catch {
      setPhotoError(true);
    }
  };

  const setFloorFromPointer = (clientY: number) => {
    const box = previewRef.current?.getBoundingClientRect();
    if (!box) return;
    const y = (clientY - box.top) / box.height;
    setFloorY(Math.round(Math.min(0.86, Math.max(0.3, y)) * 100) / 100);
  };

  // Cinema playback state
  const [playing, setPlaying] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [cinemaSound, setCinemaSound] = useState(true);

  const activeSlot = slots[currentIdx];
  const activePlace = activeSlot
    ? DREAM_PLACES.find((p) => p.id === activeSlot.placeId) ?? DREAM_PLACES[0]
    : null;

  useEffect(() => {
    if (!playing || slots.length === 0) {
      ambientAudio.stop();
      return;
    }

    const slot = slots[currentIdx];
    const place = DREAM_PLACES.find((p) => p.id === slot?.placeId) ?? DREAM_PLACES[0];
    if (cinemaSound) {
      ambientAudio.start(place.soundTheme);
    } else {
      ambientAudio.stop();
    }

    const timer = window.setTimeout(() => {
      setCurrentIdx((prev) => (prev + 1) % slots.length);
    }, (slot?.durationSec ?? 7) * 1000);

    return () => window.clearTimeout(timer);
  }, [playing, currentIdx, slots, cinemaSound]);

  useEffect(() => {
    return () => ambientAudio.stop();
  }, []);

  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    const isCustom = selectedSource.startsWith('custom:');
    let placeId = selectedSource;
    let customImage: string | null = null;
    let customTitle: string | undefined = undefined;

    if (photo) {
      customImage = photo;
      customTitle = photoName.trim() || (lang === 'ko' ? '내 사진 속 꿈의 장소' : 'My Photo Place');
      placeId = DREAM_PLACES[0].id;
    } else if (isCustom) {
      const cid = selectedSource.replace('custom:', '');
      const found = customDreams.find((d) => d.id === cid);
      if (found) {
        placeId = found.matchedPlaceId;
        customImage = found.customImage ?? null;
        customTitle = found.title;
      }
    }

    const place = DREAM_PLACES.find((p) => p.id === placeId) ?? DREAM_PLACES[0];
    const nextSlot: DreamDaySlot = {
      id: `slot_${Date.now()}`,
      label:
        slotLabel.trim() ||
        (lang === 'ko' ? `장면 ${slots.length + 1}` : `Chapter ${slots.length + 1}`),
      placeId: place.id,
      customImage,
      customTitle,
      customFloorY: photo ? floorY : undefined,
      timeOfDay: selectedTime,
      action: selectedAction,
      affirmation:
        affirmation.trim() || customTitle || place.description[lang],
      durationSec: 7,
    };

    onChangeSlots([...slots, nextSlot]);
    setSlotLabel('');
    setAffirmation('');
    setPhoto(null);
    setPhotoName('');
  };

  const moveSlot = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= slots.length) return;
    const copy = [...slots];
    const [removed] = copy.splice(index, 1);
    copy.splice(target, 0, removed);
    onChangeSlots(copy);
  };

  const removeSlot = (id: string) => {
    onChangeSlots(slots.filter((s) => s.id !== id));
  };

  // Fullscreen Dream Day Cinema Theater
  if (playing && activeSlot && activePlace) {
    const sceneImg = activeSlot.customImage || activePlace.image;
    const title = activeSlot.customTitle || activePlace.name[lang];

    return (
      <div className="fixed inset-0 z-50 bg-[#0A0D12] text-white flex flex-col">
        {/* Top Cinema Bar */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-5 py-4 bg-gradient-to-b from-black/80 to-transparent relative z-20">
          <div className="min-w-[55%] flex-1">
            <div className="text-xs text-[#DFC390] font-medium">
              {activeSlot.label} · {currentIdx + 1} / {slots.length}
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold text-white">{title}</h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onChangeFrameMode && <FrameToggle lang={lang} value={frameMode} onChange={onChangeFrameMode} tone="dark" compact />}
            <button
              type="button"
              onClick={() => setCinemaSound((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium min-h-[40px]"
            >
              {cinemaSound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline">{cinemaSound ? t.stage.soundOn : t.stage.soundOff}</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentIdx((prev) => (prev + 1) % slots.length)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium min-h-[40px]"
            >
              <SkipForward className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                ambientAudio.stop();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white text-[#14171F] text-xs font-semibold min-h-[40px]"
            >
              <X className="w-4 h-4" />
              <span>{t.dreamDay.stopCinema}</span>
            </button>
          </div>
        </div>

        {/* Fullscreen Visual Canvas */}
        <div className="flex-1 relative overflow-hidden">
          {portrait && (
            // soft blurred copy of the scene fills the space beside the 9:16 frame
            <img
              src={sceneImg}
              alt=""
              aria-hidden="true"
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-35 scale-110"
            />
          )}
          <div
            className={
              portrait
                ? 'absolute inset-y-0 left-1/2 -translate-x-1/2 aspect-[9/16] max-w-full overflow-hidden flex items-center justify-center sm:rounded-2xl'
                : 'absolute inset-0 overflow-hidden flex items-center justify-center'
            }
          >
          <img
            key={activeSlot.id}
            src={sceneImg}
            alt={title}
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover transition-all duration-1000 scale-105"
            style={{
              filter:
                activeSlot.timeOfDay === 'sunset'
                  ? 'sepia(0.28) saturate(1.3) brightness(0.86)'
                  : activeSlot.timeOfDay === 'night'
                  ? 'brightness(0.45) contrast(1.16) saturate(0.85)'
                  : 'brightness(1.0)',
            }}
          />

          {/* Time-of-Day Cinema Tint */}
          {activeSlot.timeOfDay === 'sunset' && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(180deg, rgba(234, 138, 60, 0.32) 0%, rgba(196, 94, 78, 0.2) 55%, rgba(20, 16, 36, 0.45) 100%)',
              }}
            />
          )}
          {activeSlot.timeOfDay === 'night' && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(180deg, rgba(8, 14, 34, 0.56) 0%, rgba(12, 16, 26, 0.52) 100%)',
              }}
            />
          )}

          {/* Avatar + Companion inside the Cinema Scene */}
          <div className={`relative z-10 flex items-end justify-center ${portrait ? 'gap-2 translate-y-6' : 'gap-6 translate-y-16 sm:translate-y-24'}`}>
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
              action={activeSlot.action}
              prop={avatar.equippedProp}
              timeOfDay={activeSlot.timeOfDay}
              visualMode={avatar.facePhoto ? 'photo' : 'illustrated'}
              showLabel={false}
              size={portrait ? 138 : 165}
            />
            {companion.enabled && (
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
                action={activeSlot.action === 'sit' ? 'sit' : 'stand'}
                timeOfDay={activeSlot.timeOfDay}
                visualMode={companion.visualMode}
                facing="left"
                showLabel={false}
                size={portrait ? 130 : 156}
              />
            )}
          </div>

          {/* Cinematic Affirmation Subtitle */}
          <div className="absolute inset-x-0 bottom-0 pt-24 pb-10 px-6 bg-gradient-to-t from-black/85 via-black/45 to-transparent text-center z-20">
            <p className={`font-editorial font-medium ${portrait ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-4xl'} text-white max-w-3xl mx-auto leading-snug text-balance`}>
              “{activeSlot.affirmation}”
            </p>
            {/* Chapter Progress Indicator */}
            <div className="mt-6 flex items-center justify-center gap-2">
              {slots.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setCurrentIdx(idx)}
                  aria-label={s.label}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentIdx ? 'w-10 bg-[#DFC390]' : 'w-3 bg-white/30 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
          </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-black/8 pb-6">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-[#6B7280]">
            {lang === 'ko'
              ? 'Dream Day Cinema · 100% 내가 직접 구성하는 하루'
              : 'Dream Day Cinema · 100% User-Composed Routine'}
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold text-[#14171F] tracking-tight text-balance">
            {t.dreamDay.title}
          </h1>
          <p className="text-sm text-[#5A6170] max-w-2xl leading-relaxed">{t.dreamDay.subtitle}</p>
        </div>

        <button
          type="button"
          disabled={slots.length === 0}
          onClick={() => {
            setCurrentIdx(0);
            setPlaying(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#14171F] text-white text-sm font-medium hover:bg-[#272D3B] disabled:opacity-35 transition-colors min-h-[46px] whitespace-nowrap shrink-0 self-start md:self-auto"
        >
          <Play className="w-4 h-4" />
          <span>{t.dreamDay.playCinema}</span>
        </button>
      </div>

      {/* 2-Column Builder + User's Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Add Chapter Form */}
        <form
          onSubmit={handleAddSlot}
          className="lg:col-span-5 bg-white rounded-2xl border border-black/8 p-5 sm:p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold text-[#14171F]">{t.dreamDay.addSlotTitle}</h2>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#5A6170]">{t.dreamDay.slotTimeLabel}</label>
            <input
              type="text"
              maxLength={28}
              value={slotLabel}
              onChange={(e) => setSlotLabel(e.target.value)}
              placeholder={t.dreamDay.slotTimePlaceholder}
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/12 text-sm text-[#14171F] focus:outline-none focus:border-[#14171F]"
            />
          </div>

          {/* My own photo → walkable scene */}
          <div className="space-y-2 rounded-xl border border-[#DFC390]/70 bg-[#FBF7EE] p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#14171F]">
                {lang === 'ko' ? '내 사진으로 장면 만들기' : 'Make a scene from my photo'}
              </span>
              {photo && (
                <button
                  type="button"
                  onClick={() => setPhoto(null)}
                  className="inline-flex items-center gap-1 text-xs text-[#5A6170] hover:text-[#14171F] min-h-[32px] px-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>{lang === 'ko' ? '사진 빼기' : 'Remove'}</span>
                </button>
              )}
            </div>

            {!photo ? (
              <>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-[#8A6D3B]/50 bg-white text-sm font-medium text-[#14171F] hover:bg-black/[0.03] min-h-[48px]"
                >
                  <ImagePlus className="w-4 h-4" />
                  <span>{lang === 'ko' ? '가고 싶은 곳 사진 올리기' : 'Upload a photo of your dream place'}</span>
                </button>
                <p className="text-[11px] leading-relaxed text-[#6B7280]">
                  {lang === 'ko'
                    ? '사진 아래쪽이 바닥이 되어 내 아바타가 그 안을 걸어다녀요. 사진은 이 기기에만 저장돼요.'
                    : 'The bottom of the photo becomes the floor your avatar walks on. The photo stays on this device.'}
                </p>
                {photoError && (
                  <p className="text-[11px] text-red-600">
                    {lang === 'ko' ? '이 사진은 열 수 없어요. 다른 사진을 골라주세요.' : 'Could not open that photo.'}
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="flex justify-center">
                <div
                  ref={previewRef}
                  className="relative rounded-lg overflow-hidden bg-[#14171F] touch-none select-none cursor-ns-resize"
                  onPointerDown={(e) => {
                    draggingRef.current = true;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setFloorFromPointer(e.clientY);
                  }}
                  onPointerMove={(e) => draggingRef.current && setFloorFromPointer(e.clientY)}
                  onPointerUp={() => (draggingRef.current = false)}
                  onPointerCancel={() => (draggingRef.current = false)}
                >
                  <img src={photo} alt="" draggable={false} className="block max-w-full max-h-[52vh] pointer-events-none" />
                  <div
                    className="absolute inset-x-0 bottom-0 pointer-events-none"
                    style={{
                      top: `${floorY * 100}%`,
                      background: 'linear-gradient(180deg, rgba(223,195,144,0.45), rgba(223,195,144,0.18))',
                    }}
                  />
                  <div
                    className="absolute inset-x-0 pointer-events-none border-t-2 border-dashed border-white"
                    style={{ top: `${floorY * 100}%` }}
                  >
                    <span className="absolute left-2 top-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      {lang === 'ko' ? '여기부터 바닥 · 끌어서 맞추기' : 'Floor starts here · drag'}
                    </span>
                  </div>
                  <div
                    className="absolute pointer-events-none"
                    style={{ left: '50%', bottom: `${(1 - (floorY + (0.97 - floorY) * 0.6)) * 100}%`, transform: 'translateX(-50%)' }}
                  >
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
                      action="stand"
                      timeOfDay="day"
                      visualMode={avatar.facePhoto ? 'photo' : 'illustrated'}
                      showLabel={false}
                      size={Math.round(56 + (0.97 - floorY) * 90)}
                    />
                  </div>
                </div>
                </div>
                <input
                  type="range"
                  min={30}
                  max={86}
                  value={Math.round(floorY * 100)}
                  onChange={(e) => setFloorY(Number(e.target.value) / 100)}
                  aria-label={lang === 'ko' ? '바닥 높이' : 'Floor height'}
                  className="w-full accent-[#8A6D3B]"
                />
                <input
                  type="text"
                  maxLength={30}
                  value={photoName}
                  onChange={(e) => setPhotoName(e.target.value)}
                  placeholder={lang === 'ko' ? '이 장소 이름 (예: 산토리니 노을 테라스)' : 'Name this place'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-black/12 text-sm text-[#14171F] bg-white focus:outline-none focus:border-[#14171F]"
                />
              </>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
          </div>

          {!photo && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#5A6170]">{t.dreamDay.selectPlace}</label>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/12 text-sm text-[#14171F] bg-white focus:outline-none focus:border-[#14171F]"
            >
              <optgroup label={lang === 'ko' ? '기본 꿈의 장소' : 'Signature Dream Places'}>
                {DREAM_PLACES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name[lang]}
                  </option>
                ))}
              </optgroup>
              {customDreams.length > 0 && (
                <optgroup label={lang === 'ko' ? '내가 직접 만든 꿈' : 'My Custom Dreams'}>
                  {customDreams.map((d) => (
                    <option key={d.id} value={`custom:${d.id}`}>
                      {d.title}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-[#5A6170]">{t.dreamDay.selectMood}</span>
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-black/5">
                {(
                  [
                    { id: 'day', icon: Sun },
                    { id: 'sunset', icon: Sunset },
                    { id: 'night', icon: Moon },
                  ] as const
                ).map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedTime(item.id)}
                      className={`py-2 rounded-lg flex items-center justify-center transition-colors ${
                        selectedTime === item.id ? 'bg-white text-[#14171F] shadow-sm' : 'text-[#5A6170]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#5A6170]">{t.dreamDay.selectAction}</label>
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value as AvatarAction)}
                className="w-full px-3 py-2.5 rounded-xl border border-black/12 text-xs text-[#14171F] bg-white min-h-[42px]"
              >
                {CALM_ACTIONS.map((act) => (
                  <option key={act} value={act}>
                    {t.stage.actions[act]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#5A6170]">{t.dreamDay.affirmationLabel}</label>
            <textarea
              rows={2}
              maxLength={100}
              value={affirmation}
              onChange={(e) => setAffirmation(e.target.value)}
              placeholder={t.dreamDay.affirmationPlaceholder}
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/12 text-sm text-[#14171F] focus:outline-none focus:border-[#14171F] resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-[#14171F] text-white text-sm font-medium hover:bg-[#272D3B] transition-colors min-h-[46px]"
          >
            <Plus className="w-4 h-4" />
            <span>{t.dreamDay.addBtn}</span>
          </button>
        </form>

        {/* Right: User's Custom Composed Sequence */}
        <div className="lg:col-span-7 space-y-4">
          {slots.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/15 bg-white/70 p-10 text-center space-y-2">
              <h3 className="text-lg font-semibold text-[#14171F]">{t.dreamDay.emptyTitle}</h3>
              <p className="text-sm text-[#5A6170] max-w-md mx-auto leading-relaxed">
                {t.dreamDay.emptyDesc}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {slots.map((slot, index) => {
                const place = DREAM_PLACES.find((p) => p.id === slot.placeId) ?? DREAM_PLACES[0];
                return (
                  <div
                    key={slot.id}
                    className="bg-white rounded-2xl border border-black/8 p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-4"
                  >
                    <div
                      className={`rounded-xl overflow-hidden shrink-0 bg-[#14171F] ${
                        portrait ? 'w-28 self-center sm:w-20 aspect-[9/16]' : 'w-full sm:w-36 aspect-[16/10]'
                      }`}
                    >
                      <img
                        src={slot.customImage || place.image}
                        alt={slot.customTitle || place.name[lang]}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="text-xs text-[#8A6D3B] font-medium">
                        {String(index + 1).padStart(2, '0')}. {slot.label} ·{' '}
                        {slot.timeOfDay === 'day'
                          ? t.stage.timeDay
                          : slot.timeOfDay === 'sunset'
                          ? t.stage.timeSunset
                          : t.stage.timeNight}{' '}
                        · {t.stage.actions[slot.action]}
                      </div>
                      <h3 className="text-base font-semibold text-[#14171F] truncate">
                        {slot.customTitle || place.name[lang]}
                      </h3>
                      <p className="text-xs text-[#5A6170] line-clamp-2">“{slot.affirmation}”</p>
                    </div>
                    <div className="flex sm:flex-col items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onEnterSlot(slot)}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#14171F] text-white text-xs font-medium hover:bg-[#272D3B] min-h-[38px] whitespace-nowrap"
                        title={lang === 'ko' ? '들어가서 걷기' : 'Walk in it'}
                      >
                        <Footprints className="w-3.5 h-3.5" />
                        <span>{lang === 'ko' ? '들어가기' : 'Enter'}</span>
                      </button>
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveSlot(index, -1)}
                        className="p-2 rounded-lg border border-black/10 text-[#5A6170] hover:text-[#14171F] disabled:opacity-30 min-h-[38px] min-w-[38px] flex items-center justify-center"
                        title={t.dreamDay.moveUp}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === slots.length - 1}
                        onClick={() => moveSlot(index, 1)}
                        className="p-2 rounded-lg border border-black/10 text-[#5A6170] hover:text-[#14171F] disabled:opacity-30 min-h-[38px] min-w-[38px] flex items-center justify-center"
                        title={t.dreamDay.moveDown}
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSlot(slot.id)}
                        className="p-2 rounded-lg border border-black/10 text-[#5A6170] hover:text-red-600 min-h-[38px] min-w-[38px] flex items-center justify-center"
                        title={t.dreamDay.remove}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
