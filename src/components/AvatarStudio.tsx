import React, { useRef, useState } from 'react';
import { Camera, Upload, RotateCcw, Lock, Check, Sun, Sunset, Moon, ShieldCheck } from 'lucide-react';
import { AVATAR_PROPS } from '../data/places';
import { tFor } from '../data/i18n';
import {
  AvatarConfig,
  CompanionConfig,
  CompanionVisualMode,
  HairStyle,
  Language,
  OutfitStyle,
  SkinTone,
  TimeOfDay,
} from '../types/dream';
import { compressImageFile } from '../utils/storage';
import { AvatarRenderer, SKIN_PALETTE } from './AvatarRenderer';

interface AvatarStudioProps {
  lang: Language;
  avatar: AvatarConfig;
  companion: CompanionConfig;
  goalProgress: number;
  onUpdateAvatar: (next: AvatarConfig) => void;
  onUpdateCompanion: (next: CompanionConfig) => void;
}

const HAIR_COLORS = ['#1E1916', '#3D2B22', '#6B4935', '#9C7A54', '#CBB088', '#5B3A42'];
const HAIR_STYLES: HairStyle[] = ['longWave', 'bob', 'shortNeat', 'updo', 'curly'];
const SKIN_TONES: SkinTone[] = ['fair', 'warm', 'olive', 'tan', 'deep'];
const OUTFITS: OutfitStyle[] = ['resort', 'tailored', 'parisChic', 'evening', 'athleisure'];

export const AvatarStudio: React.FC<AvatarStudioProps> = ({
  lang,
  avatar,
  companion,
  goalProgress,
  onUpdateAvatar,
  onUpdateCompanion,
}) => {
  const t = tFor(lang);
  const [studioTab, setStudioTab] = useState<'mine' | 'companion'>('mine');
  const [previewLighting, setPreviewLighting] = useState<TimeOfDay>('day');
  const [previewMode, setPreviewMode] = useState<'face' | 'full'>('face');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch {
      setCameraError(
        lang === 'ko'
          ? '카메라 권한이 허용되지 않았거나 기기에서 카메라를 열 수 없습니다. 대신 [사진 불러오기]를 이용해 주세요.'
          : 'Camera permission is unavailable. Please use Upload Photo instead.'
      );
    }
  };

  const captureFromCamera = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const size = Math.min(video.videoWidth || 480, video.videoHeight || 480);
    const sx = ((video.videoWidth || size) - size) / 2;
    const sy = ((video.videoHeight || size) - size) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Mirror front camera for natural selfie feel
      ctx.translate(400, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, sx, sy, size, size, 0, 0, 400, 400);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
      if (studioTab === 'mine') {
        onUpdateAvatar({ ...avatar, facePhoto: dataUrl });
      } else {
        onUpdateCompanion({ ...companion, visualMode: 'photo', facePhoto: dataUrl });
      }
    }
    stopCamera();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 440, 0.86);
      if (studioTab === 'mine') {
        onUpdateAvatar({ ...avatar, facePhoto: compressed });
      } else {
        onUpdateCompanion({ ...companion, visualMode: 'photo', facePhoto: compressed });
      }
    } catch {
      // ignore invalid file
    } finally {
      e.target.value = '';
    }
  };

  const previewBgStyle: Record<TimeOfDay, string> = {
    day: 'from-[#E9EFF5] via-[#F4F1EA] to-[#E6DFD2]',
    sunset: 'from-[#E0A97B] via-[#C6866C] to-[#5D4C60]',
    night: 'from-[#182235] via-[#222D42] to-[#131826]',
  };

  const tuningActive = Boolean(
    studioTab === 'mine' ? avatar.facePhoto : companion.visualMode === 'photo' && companion.facePhoto,
  );
  const faceOnly = tuningActive && previewMode === 'face';

  const faceTuningBlock = (
              <div className="w-full rounded-xl bg-white/90 border border-black/8 px-3.5 py-3 space-y-2 text-left">
                <div className="text-xs font-semibold text-[#14171F]">{t.avatar.faceTuning}</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <label className="block space-y-0.5">
                    <div className="flex justify-between text-xs text-[#5A6170]">
                      <span>{t.avatar.zoom}</span>
                      <span className="tabular-nums">
                        {Math.round((studioTab === 'mine' ? avatar.faceZoom : companion.faceZoom) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.85}
                      max={1.65}
                      step={0.02}
                      value={studioTab === 'mine' ? avatar.faceZoom : companion.faceZoom}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (studioTab === 'mine') onUpdateAvatar({ ...avatar, faceZoom: v });
                        else onUpdateCompanion({ ...companion, faceZoom: v });
                      }}
                      className="w-full accent-[#14171F]"
                    />
                  </label>

                  <label className="block space-y-0.5">
                    <div className="flex justify-between text-xs text-[#5A6170]">
                      <span>{t.avatar.posX}</span>
                      <span className="tabular-nums">
                        {studioTab === 'mine' ? avatar.faceOffsetX : companion.faceOffsetX}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-24}
                      max={24}
                      step={1}
                      value={studioTab === 'mine' ? avatar.faceOffsetX : companion.faceOffsetX}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (studioTab === 'mine') onUpdateAvatar({ ...avatar, faceOffsetX: v });
                        else onUpdateCompanion({ ...companion, faceOffsetX: v });
                      }}
                      className="w-full accent-[#14171F]"
                    />
                  </label>

                  <label className="block space-y-0.5">
                    <div className="flex justify-between text-xs text-[#5A6170]">
                      <span>{t.avatar.posY}</span>
                      <span className="tabular-nums">
                        {studioTab === 'mine' ? avatar.faceOffsetY : companion.faceOffsetY}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-24}
                      max={24}
                      step={1}
                      value={studioTab === 'mine' ? avatar.faceOffsetY : companion.faceOffsetY}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (studioTab === 'mine') onUpdateAvatar({ ...avatar, faceOffsetY: v });
                        else onUpdateCompanion({ ...companion, faceOffsetY: v });
                      }}
                      className="w-full accent-[#14171F]"
                    />
                  </label>

                  {studioTab === 'mine' && (
                    <label className="block space-y-0.5">
                      <div className="flex justify-between text-xs text-[#5A6170]">
                        <span>{t.avatar.warmth}</span>
                        <span className="tabular-nums">{avatar.faceWarmth}</span>
                      </div>
                      <input
                        type="range"
                        min={-15}
                        max={20}
                        step={1}
                        value={avatar.faceWarmth}
                        onChange={(e) => onUpdateAvatar({ ...avatar, faceWarmth: Number(e.target.value) })}
                        className="w-full accent-[#14171F]"
                      />
                    </label>
                  )}
                </div>
              </div>
  );

  const decorBlock = (
              <div className="w-full rounded-xl bg-white/90 border border-black/8 px-3.5 py-3 space-y-2.5 text-left">
              {/* Hair Color & Skin Tone */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-xs font-medium text-[#5A6170]">{t.avatar.hairColor}</span>
                  <div className="flex items-center gap-1.5 flex-nowrap">
                    {HAIR_COLORS.map((hex) => {
                      const active = (studioTab === 'mine' ? avatar.hairColor : companion.hairColor) === hex;
                      return (
                        <button
                          key={hex}
                          type="button"
                          aria-label={hex}
                          onClick={() => {
                            if (studioTab === 'mine') onUpdateAvatar({ ...avatar, hairColor: hex });
                            else onUpdateCompanion({ ...companion, hairColor: hex });
                          }}
                          className={`w-7 h-7 rounded-full shrink-0 border-2 flex items-center justify-center transition-transform ${
                            active ? 'border-[#14171F] scale-110' : 'border-black/10'
                          }`}
                          style={{ backgroundColor: hex }}
                        >
                          {active && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-xs font-medium text-[#5A6170]">{t.avatar.skinTone}</span>
                  <div className="flex items-center gap-1.5 flex-nowrap">
                    {SKIN_TONES.map((st) => {
                      const active = (studioTab === 'mine' ? avatar.skinTone : companion.skinTone) === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          aria-label={st}
                          onClick={() => {
                            if (studioTab === 'mine') onUpdateAvatar({ ...avatar, skinTone: st });
                            else onUpdateCompanion({ ...companion, skinTone: st });
                          }}
                          className={`w-7 h-7 rounded-full shrink-0 border-2 flex items-center justify-center transition-transform ${
                            active ? 'border-[#14171F] scale-110' : 'border-black/10'
                          }`}
                          style={{ backgroundColor: SKIN_PALETTE[st].base }}
                        >
                          {active && <Check className="w-3.5 h-3.5 text-[#14171F]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Outfit Style */}
              <div className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-xs font-medium text-[#5A6170]">{t.avatar.outfit}</span>
                <div className="flex gap-1.5 overflow-x-auto min-w-0 pb-0.5">
                  {OUTFITS.map((of) => {
                    const active = (studioTab === 'mine' ? avatar.outfit : companion.outfit) === of;
                    return (
                      <button
                        key={of}
                        type="button"
                        onClick={() => {
                          if (studioTab === 'mine') onUpdateAvatar({ ...avatar, outfit: of });
                          else onUpdateCompanion({ ...companion, outfit: of });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors min-h-[36px] whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-[#14171F] text-white border-[#14171F]'
                            : 'bg-white text-[#5A6170] border-black/10 hover:text-[#14171F]'
                        }`}
                      >
                        {t.outfits[of]}
                      </button>
                    );
                  })}
                </div>
              </div>
              </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-10 space-y-3 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 sm:gap-3 sm:border-b border-black/8 sm:pb-6">
        <div className="space-y-1.5">
          <h1 className="text-xl sm:text-4xl font-semibold text-[#14171F] tracking-tight text-balance">
            {t.avatar.title}
          </h1>
        </div>

        {/* Studio Switcher */}
        <div className="inline-flex items-center p-1 rounded-xl bg-black/5 self-start md:self-auto">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              setStudioTab('mine');
            }}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap min-h-[36px] sm:min-h-[40px] ${
              studioTab === 'mine' ? 'bg-white text-[#14171F] shadow-sm' : 'text-[#5A6170] hover:text-[#14171F]'
            }`}
          >
            {t.avatar.tabMine}
          </button>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              setStudioTab('companion');
            }}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap min-h-[36px] sm:min-h-[40px] ${
              studioTab === 'companion' ? 'bg-white text-[#14171F] shadow-sm' : 'text-[#5A6170] hover:text-[#14171F]'
            }`}
          >
            {t.avatar.tabCompanion}
          </button>
        </div>
      </div>

      {/* Main 2-Column Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Live Preview Stage */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20">
          <div
            className={`relative rounded-2xl overflow-hidden bg-gradient-to-b ${previewBgStyle[previewLighting]} border border-black/8 ${faceOnly ? 'p-3.5 sm:p-5 gap-3' : 'p-6 min-h-[370px]'} flex flex-col items-center justify-between transition-colors duration-500`}
          >
            <div
              className={
                faceOnly
                  ? 'w-full grid grid-cols-[130px_1fr] gap-x-3 gap-y-2 items-center'
                  : 'w-full flex-1 flex flex-col items-center justify-between gap-3'
              }
            >
            {/* Lighting Preview Switcher */}
            <div
              className={
                faceOnly
                  ? 'col-start-2 row-start-1 self-end flex justify-end'
                  : 'w-full flex items-center justify-between'
              }
            >
              <span
                className={`text-xs font-medium ${faceOnly ? 'hidden' : ''} ${
                  previewLighting === 'night' ? 'text-white/80' : 'text-[#14171F]/70'
                }`}
              >
                {t.avatar.previewLighting}
              </span>
              <div className="flex items-center gap-1 p-1 rounded-lg bg-black/10 backdrop-blur-sm">
                {(
                  [
                    { id: 'day', icon: Sun, label: t.stage.timeDay },
                    { id: 'sunset', icon: Sunset, label: t.stage.timeSunset },
                    { id: 'night', icon: Moon, label: t.stage.timeNight },
                  ] as const
                ).map((item) => {
                  const Icon = item.icon;
                  const active = previewLighting === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPreviewLighting(item.id)}
                      className={`flex items-center gap-1 ${faceOnly ? 'px-2' : 'px-2.5'} py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                        active ? 'bg-white text-[#14171F] shadow-sm' : 'text-white/85 hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Avatar(s) */}
            {faceOnly ? (
              <div className="col-start-1 row-start-1 row-span-2 relative overflow-hidden rounded-xl" style={{ width: 130, height: 124 }}>
                {/* only the head: crop viewBox x 24..96, y 6..75 of a 216px avatar */}
                <div className="absolute" style={{ left: -43.2, top: -10.8 }}>
                  {studioTab === 'mine' ? (
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
                      timeOfDay={previewLighting}
                      visualMode="photo"
                      showLabel={false}
                      size={216}
                    />
                  ) : (
                    <AvatarRenderer
                      name={companion.name}
                      facePhoto={companion.facePhoto}
                      faceZoom={companion.faceZoom}
                      faceOffsetX={companion.faceOffsetX}
                      faceOffsetY={companion.faceOffsetY}
                      hairStyle={companion.hairStyle}
                      hairColor={companion.hairColor}
                      skinTone={companion.skinTone}
                      outfit={companion.outfit}
                      action="stand"
                      timeOfDay={previewLighting}
                      visualMode="photo"
                      showLabel={false}
                      size={216}
                    />
                  )}
                </div>
              </div>
            ) : (
            <div className="flex items-end justify-center gap-4 py-4">
              {studioTab === 'mine' ? (
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
                  prop={avatar.equippedProp}
                  timeOfDay={previewLighting}
                  visualMode={avatar.facePhoto ? 'photo' : 'illustrated'}
                  size={172}
                />
              ) : (
                <>
                  <div className="opacity-70 scale-90">
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
                      prop={avatar.equippedProp}
                      timeOfDay={previewLighting}
                      visualMode={avatar.facePhoto ? 'photo' : 'illustrated'}
                      size={128}
                    />
                  </div>
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
                    action="stand"
                    timeOfDay={previewLighting}
                    visualMode={companion.visualMode}
                    size={162}
                  />
                </>
              )}
            </div>
            )}

            {/* Face-only / full-body toggle + fine tuning right under the face */}
            {tuningActive && (
              <div
                className={`flex items-center gap-1 p-1 rounded-lg bg-black/10 ${
                  faceOnly ? 'col-start-2 row-start-2 self-start justify-self-end' : ''
                }`}
              >
                {(
                  [
                    { id: 'face', label: lang === 'ko' ? '얼굴만' : 'Face' },
                    { id: 'full', label: lang === 'ko' ? '전신 보기' : 'Full body' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPreviewMode(m.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                      previewMode === m.id
                        ? 'bg-white text-[#14171F] shadow-sm'
                        : previewLighting === 'night'
                          ? 'text-white/85'
                          : 'text-[#14171F]/70'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}
            </div>
            {tuningActive && faceTuningBlock}
            {decorBlock}

            {/* Photo Actions */}
            {(studioTab === 'mine' || companion.visualMode === 'photo') && (
              <div className="w-full flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={startCamera}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#14171F] text-white text-xs font-medium hover:bg-[#272D3B] transition-colors min-h-[42px] whitespace-nowrap"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{t.avatar.cameraBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white text-[#14171F] border border-black/12 text-xs font-medium hover:bg-black/5 transition-colors min-h-[42px] whitespace-nowrap"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{t.avatar.uploadBtn}</span>
                </button>
                {(studioTab === 'mine' ? avatar.facePhoto : companion.facePhoto) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (studioTab === 'mine') {
                        onUpdateAvatar({ ...avatar, facePhoto: null });
                      } else {
                        onUpdateCompanion({ ...companion, facePhoto: null, visualMode: 'illustrated' });
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/80 text-[#5A6170] text-xs font-medium hover:text-[#14171F] transition-colors min-h-[42px] whitespace-nowrap"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t.avatar.clearPhoto}</span>
                  </button>
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* Live Camera Capture Panel */}
          {cameraOpen && (
            <div className="rounded-2xl bg-white border border-black/10 p-4 space-y-3">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-square max-h-[260px] mx-auto">
                <video ref={videoRef} playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                {/* Soft Oval Alignment Guide */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-40 h-52 rounded-[50%] border-2 border-dashed border-white/80" />
                </div>
              </div>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={captureFromCamera}
                  className="px-5 py-2.5 rounded-lg bg-[#14171F] text-white text-xs font-medium min-h-[42px]"
                >
                  {t.avatar.captureBtn}
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-4 py-2.5 rounded-lg bg-black/5 text-[#14171F] text-xs font-medium min-h-[42px]"
                >
                  {t.avatar.cancelCamera}
                </button>
              </div>
            </div>
          )}

          {cameraError && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              {cameraError}
            </p>
          )}
        </div>

        {/* Right: Configuration Controls */}
        <div className="lg:col-span-7 space-y-6">
          {studioTab === 'companion' && (
            <div className="bg-white rounded-2xl border border-black/8 p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-[#14171F]">{t.avatar.companionEnable}</h2>
                  <p className="text-xs text-[#5A6170] mt-0.5 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#8A6D3B] shrink-0" />
                    <span>{t.avatar.companionPrivacy}</span>
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={companion.enabled}
                  onClick={() => onUpdateCompanion({ ...companion, enabled: !companion.enabled })}
                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
                    companion.enabled ? 'bg-[#14171F]' : 'bg-black/15'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                      companion.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Companion Visual Style Selector */}
              <div className="space-y-2.5">
                <label className="text-xs font-medium text-[#5A6170]">{t.avatar.companionStyleTitle}</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {(
                    [
                      { id: 'illustrated', title: t.avatar.styleIllustrated, desc: t.avatar.styleIllustratedDesc },
                      { id: 'silhouette', title: t.avatar.styleSilhouette, desc: t.avatar.styleSilhouetteDesc },
                      { id: 'photo', title: t.avatar.stylePhoto, desc: t.avatar.stylePhotoDesc },
                    ] as { id: CompanionVisualMode; title: string; desc: string }[]
                  ).map((opt) => {
                    const active = companion.visualMode === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onUpdateCompanion({ ...companion, visualMode: opt.id })}
                        className={`text-left p-3.5 rounded-xl border transition-colors ${
                          active
                            ? 'border-[#14171F] bg-[#14171F]/[0.03]'
                            : 'border-black/8 hover:border-black/20 bg-white'
                        }`}
                      >
                        <div className="text-xs font-semibold text-[#14171F]">{opt.title}</div>
                        <div className="text-[11px] text-[#5A6170] mt-1 leading-snug">{opt.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Relationship */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-[#5A6170]">{t.avatar.relationLabel}</label>
                <div className="flex flex-wrap gap-2">
                  {(['partner', 'family', 'friend'] as const).map((rel) => (
                    <button
                      key={rel}
                      type="button"
                      onClick={() => onUpdateCompanion({ ...companion, relation: rel })}
                      className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors min-h-[40px] whitespace-nowrap ${
                        companion.relation === rel
                          ? 'bg-[#14171F] text-white border-[#14171F]'
                          : 'bg-white text-[#5A6170] border-black/10 hover:text-[#14171F]'
                      }`}
                    >
                      {t.avatar.relations[rel]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Identity & Face Alignment */}
          <div className="bg-white rounded-2xl border border-black/8 p-5 sm:p-6 space-y-5">
            {/* Hair style (colors, skin and outfit live under the face preview) */}
            <div className="space-y-5">
              {/* Hair Style */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-[#5A6170]">{t.avatar.hairStyle}</span>
                <div className="flex flex-wrap gap-2">
                  {HAIR_STYLES.map((hs) => {
                    const active = (studioTab === 'mine' ? avatar.hairStyle : companion.hairStyle) === hs;
                    return (
                      <button
                        key={hs}
                        type="button"
                        onClick={() => {
                          if (studioTab === 'mine') onUpdateAvatar({ ...avatar, hairStyle: hs });
                          else onUpdateCompanion({ ...companion, hairStyle: hs });
                        }}
                        className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors min-h-[40px] whitespace-nowrap ${
                          active
                            ? 'bg-[#14171F] text-white border-[#14171F]'
                            : 'bg-white text-[#5A6170] border-black/10 hover:text-[#14171F]'
                        }`}
                      >
                        {t.hairStyles[hs]}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

          {/* Goal-Unlocked Props (My Avatar Only) */}
          {studioTab === 'mine' && (
            <div className="bg-white rounded-2xl border border-black/8 p-5 sm:p-6 space-y-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-[#14171F]">{t.avatar.propsTitle}</h2>
                  <p className="text-xs text-[#5A6170] mt-0.5">{t.avatar.propsSubtitle}</p>
                </div>
                <span className="text-sm font-semibold text-[#8A6D3B] tabular-nums whitespace-nowrap">
                  {goalProgress}%
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {AVATAR_PROPS.map((p) => {
                  const unlocked = goalProgress >= p.unlockProgress;
                  const equipped = avatar.equippedProp === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={!unlocked}
                      onClick={() => onUpdateAvatar({ ...avatar, equippedProp: p.id })}
                      className={`p-3 rounded-xl border text-left transition-colors min-h-[68px] flex flex-col justify-between ${
                        equipped
                          ? 'border-[#14171F] bg-[#14171F] text-white'
                          : unlocked
                          ? 'border-black/10 bg-white hover:border-black/30 text-[#14171F]'
                          : 'border-black/6 bg-[#F8F7F4] text-[#9CA3AF] cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-medium leading-tight">{p.name[lang]}</span>
                        {!unlocked && <Lock className="w-3.5 h-3.5 shrink-0" />}
                      </div>
                      <span
                        className={`text-[11px] tabular-nums ${
                          equipped ? 'text-white/75' : unlocked ? 'text-[#8A6D3B]' : 'text-[#9CA3AF]'
                        }`}
                      >
                        {p.unlockHint[lang]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
