import React, { useMemo, useRef, useState } from 'react';
import { Upload, X, Play, CalendarPlus, Trash2, Sparkles, Sun, Sunset, Moon } from 'lucide-react';
import { DREAM_PLACES, matchDreamSentenceToPlace } from '../data/places';
import { tFor } from '../data/i18n';
import {
  AvatarAction,
  CustomDream,
  DreamPlace,
  Language,
  TimeOfDay,
} from '../types/dream';
import { compressImageFile } from '../utils/storage';

interface DreamLifeBuilderProps {
  lang: Language;
  customDreams: CustomDream[];
  initialQuery?: string;
  onAddDream: (dream: CustomDream) => void;
  onDeleteDream: (id: string) => void;
  onExperienceDream: (dream: CustomDream) => void;
  onAddDreamToDay: (dream: CustomDream) => void;
}

export const DreamLifeBuilder: React.FC<DreamLifeBuilderProps> = ({
  lang,
  customDreams,
  initialQuery = '',
  onAddDream,
  onDeleteDream,
  onExperienceDream,
  onAddDreamToDay,
}) => {
  const t = tFor(lang);
  const [sentence, setSentence] = useState(initialQuery);
  const [affirmation, setAffirmation] = useState('');
  const [preferredTime, setPreferredTime] = useState<TimeOfDay>('day');
  const [customPhoto, setCustomPhoto] = useState<string | null>(null);
  const [addedToast, setAddedToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const matched = useMemo(() => matchDreamSentenceToPlace(sentence), [sentence]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 1200, 0.84);
      setCustomPhoto(compressed);
    } catch {
      // ignore invalid file
    } finally {
      e.target.value = '';
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = sentence.trim();
    if (!trimmed) return;

    const newDream: CustomDream = {
      id: `dream_${Date.now()}`,
      title: trimmed,
      affirmation: affirmation.trim() || trimmed,
      category: matched.category,
      matchedPlaceId: matched.place.id,
      customImage: customPhoto,
      preferredTime,
      preferredAction: matched.action as AvatarAction,
      createdAt: new Date().toISOString(),
    };

    onAddDream(newDream);
    setSentence('');
    setAffirmation('');
    setCustomPhoto(null);
    onExperienceDream(newDream);
  };

  const getPlaceById = (id: string): DreamPlace =>
    DREAM_PLACES.find((p) => p.id === id) ?? DREAM_PLACES[0];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-10">
      {/* Header */}
      <div className="border-b border-black/8 pb-6 space-y-1.5">
        <p className="text-xs font-medium text-[#6B7280]">
          {lang === 'ko' ? 'Dream Life · 나만의 미래 직접 만들기' : 'Dream Life · Design Any Future Moment'}
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold text-[#14171F] tracking-tight text-balance">
          {t.dreamLife.title}
        </h1>
        <p className="text-sm text-[#5A6170] max-w-2xl leading-relaxed">{t.dreamLife.subtitle}</p>
      </div>

      {/* Builder Form + Live Matched Preview */}
      <form
        onSubmit={handleCreate}
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white rounded-2xl border border-black/8 p-5 sm:p-7 items-stretch"
      >
        <div className="lg:col-span-7 space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#14171F]">
              {t.dreamLife.inputLabel}
            </label>
            <input
              type="text"
              required
              maxLength={80}
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
              placeholder={t.dreamLife.inputPlaceholder}
              className="w-full px-4 py-3 rounded-xl border border-black/14 text-sm text-[#14171F] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#14171F]"
            />
            {/* Quick Inspiration Prompts */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1 text-xs text-[#5A6170]">
              {(lang === 'ko'
                ? [
                    '좋아하는 사람과 분위기 좋은 레스토랑에서 저녁 먹기',
                    '10kg 감량하고 명품 옷 쇼핑하기',
                    '내 이름으로 책 출간하고 작가 사인회 하기',
                    '60평 한강뷰 아파트에서 여유로운 주말 보내기',
                  ]
                : [
                    'Candlelit dinner with someone special',
                    'Lose 10kg and shop at a luxury flagship boutique',
                    'Publish my book and host an author signing',
                    'Peaceful morning in my 60-pyeong river view apartment',
                  ]
              ).map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setSentence(example)}
                  className="underline decoration-black/20 underline-offset-4 hover:text-[#14171F] hover:decoration-[#14171F] transition-colors text-left"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#14171F]">
              {t.dreamLife.affirmationLabel}
            </label>
            <input
              type="text"
              maxLength={90}
              value={affirmation}
              onChange={(e) => setAffirmation(e.target.value)}
              placeholder={t.dreamLife.affirmationPlaceholder}
              className="w-full px-4 py-2.5 rounded-xl border border-black/12 text-sm text-[#14171F] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#14171F]"
            />
          </div>

          {/* Lighting & Optional Custom Photo Upload */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="block text-xs font-semibold text-[#14171F]">
                {t.dreamDay.selectMood}
              </span>
              <div className="inline-flex items-center p-1 rounded-xl bg-black/5 w-full">
                {(
                  [
                    { id: 'day', icon: Sun, label: t.stage.timeDay },
                    { id: 'sunset', icon: Sunset, label: t.stage.timeSunset },
                    { id: 'night', icon: Moon, label: t.stage.timeNight },
                  ] as const
                ).map((item) => {
                  const Icon = item.icon;
                  const active = preferredTime === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPreferredTime(item.id)}
                      className={`flex-1 inline-flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                        active ? 'bg-white text-[#14171F] shadow-sm' : 'text-[#5A6170]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <span className="block text-xs font-semibold text-[#14171F]">
                {t.dreamLife.uploadPhotoLabel}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-black/14 text-xs font-medium text-[#14171F] hover:bg-black/5 transition-colors min-h-[42px]"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{t.dreamLife.uploadPhotoBtn}</span>
                </button>
                {customPhoto && (
                  <button
                    type="button"
                    onClick={() => setCustomPhoto(null)}
                    className="p-2.5 rounded-xl border border-black/12 text-[#5A6170] hover:text-[#14171F] min-h-[42px]"
                    title={t.dreamLife.removePhotoBtn}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!sentence.trim()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#14171F] text-white text-sm font-medium hover:bg-[#272D3B] disabled:opacity-45 transition-colors min-h-[46px]"
          >
            <Sparkles className="w-4 h-4" />
            <span>{t.dreamLife.createBtn}</span>
          </button>
        </div>

        {/* Right: Auto-Matched Stage Preview */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-xl overflow-hidden border border-black/8 bg-[#F8F7F4]">
          <div className="relative aspect-[16/10] lg:flex-1 overflow-hidden">
            <img
              src={customPhoto || matched.place.image}
              alt={matched.place.name[lang]}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
              style={{
                filter:
                  preferredTime === 'sunset'
                    ? 'sepia(0.28) saturate(1.25) brightness(0.9)'
                    : preferredTime === 'night'
                    ? 'brightness(0.55) contrast(1.15)'
                    : 'none',
              }}
            />
            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/35 to-transparent text-white">
              <div className="text-[11px] text-white/75">{t.dreamLife.matchedSceneLabel}</div>
              <div className="text-base font-semibold mt-0.5">
                {customPhoto
                  ? lang === 'ko'
                    ? '내가 업로드한 전용 배경'
                    : 'My Uploaded Scene'
                  : matched.place.name[lang]}
              </div>
              <div className="text-xs text-white/75 mt-0.5">
                {t.categories[matched.category]} · {t.stage.actions[matched.action]}
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Saved Custom Dreams List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-[#14171F]">{t.dreamLife.myDreamsTitle}</h2>
          {addedToast && <span className="text-xs font-medium text-[#8A6D3B]">{addedToast}</span>}
        </div>

        {customDreams.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/15 bg-white/60 p-8 text-center text-sm text-[#5A6170]">
            {t.dreamLife.emptyDreams}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {customDreams.map((dream) => {
              const place = getPlaceById(dream.matchedPlaceId);
              return (
                <article
                  key={dream.id}
                  className="bg-white rounded-2xl border border-black/8 overflow-hidden flex flex-col"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-[#14171F]">
                    <img
                      src={dream.customImage || place.image}
                      alt={dream.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                    <div>
                      <div className="text-xs text-[#6B7280]">
                        {t.categories[dream.category]} · {t.stage.actions[dream.preferredAction]}
                      </div>
                      <h3 className="text-base font-semibold text-[#14171F] mt-1 leading-snug">
                        {dream.title}
                      </h3>
                      {dream.affirmation !== dream.title && (
                        <p className="text-xs text-[#5A6170] mt-1.5 line-clamp-2">
                          “{dream.affirmation}”
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-black/6">
                      <button
                        type="button"
                        onClick={() => onExperienceDream(dream)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#14171F] text-white text-xs font-medium hover:bg-[#272D3B] min-h-[40px] whitespace-nowrap"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>{t.dreamLife.experienceNow}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onAddDreamToDay(dream);
                          setAddedToast(
                            lang === 'ko'
                              ? '나의 꿈의 하루에 추가되었습니다.'
                              : 'Added to your Dream Day.'
                          );
                          window.setTimeout(() => setAddedToast(null), 3000);
                        }}
                        className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-black/12 text-xs font-medium text-[#14171F] hover:bg-black/5 min-h-[40px] whitespace-nowrap"
                        title={t.dreamLife.addToDay}
                      >
                        <CalendarPlus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteDream(dream.id)}
                        className="inline-flex items-center justify-center p-2 rounded-lg border border-black/10 text-[#6B7280] hover:text-red-600 min-h-[40px] min-w-[40px]"
                        title={t.dreamLife.delete}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
