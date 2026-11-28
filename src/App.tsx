import React, { useEffect, useMemo, useState } from 'react';
import {
  Compass,
  Heart,
  Users,
  User,
  BookOpen,
  Target,
  Film,
  Search,
  ArrowRight,
  Globe,
  X,
} from 'lucide-react';
import { DREAM_CATEGORIES, DREAM_PLACES, matchDreamSentenceToPlace } from './data/places';
import { tFor, pick, LANGUAGE_OPTIONS } from './data/i18n';
import {
  AvatarAction,
  CustomDream,
  DreamCategoryId,
  DreamDaySlot,
  DreamMeStore,
  DreamPlace,
  ExperienceMode,
  GoalItem,
  MainTab,
  PropId,
  SavedSnapshot,
  TimeOfDay,
  FrameMode,
  Language,
} from './types/dream';
import {
  calculateOverallGoalProgress,
  getTodayKey,
  loadStore,
  saveStore,
} from './utils/storage';
import { loadReferencedImages, resolveImageRefs } from './utils/imageStore';
import { AvatarRenderer } from './components/AvatarRenderer';
import { AvatarStudio } from './components/AvatarStudio';
import { DreamStage } from './components/DreamStage';
import { FrameToggle } from './components/FrameToggle';
import { DreamLifeBuilder } from './components/DreamLifeBuilder';
import { DreamDayCinema } from './components/DreamDayCinema';
import { DreamBoardView, MyGoalsView } from './components/DreamBoardAndGoals';

interface ActiveStageSession {
  place: DreamPlace;
  mode: ExperienceMode;
  customTitle?: string;
  customImage?: string | null;
  customFloorY?: number;
  slotId?: string;
  peopleScale?: number;
  timeOfDay?: TimeOfDay;
  action?: AvatarAction;
  affirmation?: string;
}

export default function App() {
  const [store, setStore] = useState<DreamMeStore>(() => loadStore());
  const [activeTab, setActiveTab] = useState<MainTab | 'dreamDay'>('places');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DreamCategoryId | 'all'>('all');
  const [modePickerPlace, setModePickerPlace] = useState<DreamPlace | null>(null);
  const [activeStage, setActiveStage] = useState<ActiveStageSession | null>(null);
  const [roomCounts, setRoomCounts] = useState<Record<string, number>>({});
  const [dreamLifeSeedQuery, setDreamLifeSeedQuery] = useState('');

  const lang = store.language;
  const t = tFor(lang);
  const goalProgress = useMemo(() => calculateOverallGoalProgress(store.goals), [store.goals]);

  // Pictures are kept in IndexedDB; swap their references for the real images once loaded
  useEffect(() => {
    let alive = true;
    loadReferencedImages(store).then((images) => {
      if (alive) setStore((prev) => resolveImageRefs(prev, images));
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist locally on every change (100% offline-capable)
  // (debounced: the store holds photos & postcards, so stringifying it on every tap caused jank)
  const latestStoreRef = React.useRef(store);
  latestStoreRef.current = store;
  useEffect(() => {
    const id = window.setTimeout(() => saveStore(store), 600);
    return () => window.clearTimeout(id);
  }, [store]);
  useEffect(() => {
    const flush = () => saveStore(latestStoreRef.current);
    const onVis = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  // Fetch live Together room occupancy counts periodically
  useEffect(() => {
    let active = true;
    const fetchCounts = () => {
      fetch('/api/together/rooms')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (active && data?.counts) setRoomCounts(data.counts);
        })
        .catch(() => {});
    };
    fetchCounts();
    const id = window.setInterval(fetchCounts, 12_000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, []);

  const filteredPlaces = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return DREAM_PLACES.filter((place) => {
      const catOk = selectedCategory === 'all' || place.category === selectedCategory;
      if (!catOk) return false;
      if (!q) return true;
      return (
        place.name.ko.toLowerCase().includes(q) ||
        place.name.en.toLowerCase().includes(q) ||
        place.location.ko.toLowerCase().includes(q) ||
        place.location.en.toLowerCase().includes(q) ||
        place.name.es.toLowerCase().includes(q) ||
        place.location.es.toLowerCase().includes(q) ||
        place.description.ko.toLowerCase().includes(q) ||
        place.searchAliases.some((a) => a.toLowerCase().includes(q) || q.includes(a.toLowerCase()))
      );
    });
  }, [searchQuery, selectedCategory]);

  const closestSuggestion = useMemo(() => {
    if (!searchQuery.trim() || filteredPlaces.length > 0) return null;
    return matchDreamSentenceToPlace(searchQuery);
  }, [searchQuery, filteredPlaces.length]);

  const recordPassportVisit = (place: DreamPlace) => {
    setStore((prev) => {
      const existing = prev.stamps.find((s) => s.placeId === place.id);
      const nextStamps = existing
        ? prev.stamps.map((s) =>
            s.placeId === place.id ? { ...s, visitCount: s.visitCount + 1 } : s
          )
        : [
            {
              placeId: place.id,
              placeNameKo: place.name.ko,
              placeNameEn: place.name.en,
              stampCode: place.stampCode,
              firstVisitedAt: new Date().toISOString(),
              visitCount: 1,
            },
            ...prev.stamps,
          ];
      return { ...prev, stamps: nextStamps, lastActiveDate: getTodayKey() };
    });
  };

  const handleSaveSnapshot = (snap: SavedSnapshot) => {
    setStore((prev) => ({
      ...prev,
      snapshots: [snap, ...prev.snapshots].slice(0, 18),
    }));
  };

  const handleEnterPlace = (place: DreamPlace, mode: ExperienceMode) => {
    setModePickerPlace(null);
    setActiveStage({ place, mode });
  };

  const handleExperienceCustomDream = (dream: CustomDream) => {
    const place = DREAM_PLACES.find((p) => p.id === dream.matchedPlaceId) ?? DREAM_PLACES[0];
    setActiveStage({
      place,
      mode: 'solo',
      customTitle: dream.title,
      customImage: dream.customImage,
      timeOfDay: dream.preferredTime,
      action: dream.preferredAction,
      affirmation: dream.affirmation,
    });
  };

  const handleAddDreamToDay = (dream: CustomDream) => {
    const newSlot: DreamDaySlot = {
      id: `slot_${Date.now()}`,
      label: pick(lang, `장면 ${store.dreamDaySlots.length + 1}`, `Chapter ${store.dreamDaySlots.length + 1}`, `Capítulo ${store.dreamDaySlots.length + 1}`),
      placeId: dream.matchedPlaceId,
      customImage: dream.customImage,
      customTitle: dream.title,
      timeOfDay: dream.preferredTime,
      action: dream.preferredAction,
      affirmation: dream.affirmation,
      durationSec: 7,
    };
    setStore((prev) => ({ ...prev, dreamDaySlots: [...prev.dreamDaySlots, newSlot] }));
  };

  const handleCheckInGoal = (goalId: string) => {
    const today = getTodayKey();
    setStore((prev) => ({
      ...prev,
      goals: prev.goals.map((g) => {
        if (g.id !== goalId) return g;
        const nextVal = Math.min(g.target, Math.round((g.current + g.step) * 100) / 100);
        return { ...g, current: nextVal, lastCheckedDate: today };
      }),
    }));
  };

  const handleAddGoal = (goal: GoalItem) => {
    setStore((prev) => ({ ...prev, goals: [goal, ...prev.goals] }));
  };

  const handleDeleteGoal = (goalId: string) => {
    setStore((prev) => ({ ...prev, goals: prev.goals.filter((g) => g.id !== goalId) }));
  };

  const frameMode: FrameMode = store.frameMode ?? 'landscape';
  const setFrameMode = (mode: FrameMode) => setStore((prev) => ({ ...prev, frameMode: mode }));

  const setLanguage = (language: Language) => {
    setStore((prev) => ({ ...prev, language }));
  };

  // Fullscreen 2.5D Interactive Stage View
  if (activeStage) {
    return (
      <DreamStage
        lang={lang}
        place={activeStage.place}
        customTitle={activeStage.customTitle}
        customImage={activeStage.customImage}
        customFloorY={activeStage.customFloorY}
        initialPeopleScale={activeStage.peopleScale}
        onPeopleScaleChange={(peopleScale) => {
          const slotId = activeStage.slotId;
          if (!slotId) return;
          setStore((prev) => ({
            ...prev,
            dreamDaySlots: prev.dreamDaySlots.map((s) => (s.id === slotId ? { ...s, peopleScale } : s)),
          }));
        }}
        initialMode={activeStage.mode}
        initialTime={activeStage.timeOfDay}
        initialAction={activeStage.action}
        initialAffirmation={activeStage.affirmation}
        avatar={store.avatar}
        companion={store.companion}
        goalProgress={goalProgress}
        virtualNeighborsDefault={store.virtualNeighborsDefault}
        onExit={() => setActiveStage(null)}
        onRecordVisit={recordPassportVisit}
        onSaveSnapshot={handleSaveSnapshot}
        onUpdateAvatarProp={(prop: PropId) =>
          setStore((prev) => ({ ...prev, avatar: { ...prev.avatar, equippedProp: prop } }))
        }
        onToggleCompanion={(enabled: boolean) =>
          setStore((prev) => ({ ...prev, companion: { ...prev.companion, enabled } }))
        }
        frameMode={frameMode}
        onChangeFrameMode={setFrameMode}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F7F4] text-[#14171F] pb-20 md:pb-0">
      {/* Clean 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 h-14 sm:h-16 bg-[#F8F7F4]/92 backdrop-blur-md border-b border-black/8">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 sm:gap-8">
          {/* Zone 1: Single-line Editorial Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('places')}
            className="font-editorial text-2xl sm:text-[26px] font-semibold tracking-tight text-[#14171F] whitespace-nowrap shrink-0"
          >
            DreamMe
          </button>

          {/* Zone 2: Clean Single-Line Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#5A6170]">
            {(
              [
                { id: 'places', label: t.nav.places },
                { id: 'dreamLife', label: t.nav.dreamLife },
                { id: 'together', label: t.nav.together },
                { id: 'avatar', label: t.nav.avatar },
                { id: 'board', label: t.nav.board },
                { id: 'goals', label: t.nav.goals },
              ] as const
            ).map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                    active
                      ? 'text-[#14171F] border-[#14171F]'
                      : 'border-transparent hover:text-[#14171F]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: screen shape + primary action */}
          <div className="flex items-center gap-2 shrink-0">
            <FrameToggle lang={lang} value={frameMode} onChange={setFrameMode} compact />
            <button
              type="button"
              onClick={() => setActiveTab('dreamDay')}
              className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 min-h-[40px] ${
                activeTab === 'dreamDay'
                  ? 'bg-[#8A6D3B] text-white'
                  : 'bg-[#14171F] text-white hover:bg-[#272D3B]'
              }`}
            >
              <Film className="w-3.5 h-3.5 max-[400px]:hidden" />
              <span>{t.nav.dreamDay}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {activeTab === 'places' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-10">
            {/* Editorial Hero Section */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              <div className="lg:col-span-6 flex flex-col justify-between gap-6 py-2">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium text-[#8A6D3B] tracking-wide">
                      {t.hero.eyebrow}
                    </p>
                    <div
                      role="radiogroup"
                      aria-label="Language"
                      className="inline-flex items-center gap-0.5 shrink-0 text-xs font-medium text-[#5A6170]"
                    >
                      <Globe className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                      {LANGUAGE_OPTIONS.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          role="radio"
                          aria-checked={lang === o.id}
                          aria-label={o.full}
                          onClick={() => setLanguage(o.id)}
                          className={`min-w-[32px] py-1 px-1.5 rounded-md transition-colors whitespace-nowrap ${
                            lang === o.id ? 'bg-[#14171F] text-white' : 'hover:bg-black/5 hover:text-[#14171F]'
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <h1 className="text-4xl sm:text-5xl font-semibold text-[#14171F] leading-[1.12] tracking-tight text-balance">
                    {t.hero.title}
                  </h1>
                  <p className="text-sm sm:text-base text-[#5A6170] leading-relaxed max-w-xl">
                    {t.hero.subtitle}
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setModePickerPlace(DREAM_PLACES[0])}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#14171F] text-white text-sm font-medium hover:bg-[#272D3B] transition-colors min-h-[46px] whitespace-nowrap"
                    >
                      <span>{t.hero.ctaPrimary}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('avatar')}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-black/12 text-[#14171F] text-sm font-medium hover:bg-black/5 transition-colors min-h-[46px] whitespace-nowrap"
                    >
                      <span>{t.hero.ctaSecondary}</span>
                    </button>
                  </div>

                  {/* Subtle Unboxed Progress Metadata Line */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6B7280] pt-2 border-t border-black/8 tabular-nums">
                    <span>
                      {t.board.streakLabel} {store.streakDays}
                      {t.board.daysUnit}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {t.board.totalStamps} {store.stamps.length}/{DREAM_PLACES.length}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {t.goals.overallProgress} {goalProgress}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Hero Visual Anchor: Live Preview of User's Avatar Inside Jeju Yacht */}
              <div
                onClick={() => setModePickerPlace(DREAM_PLACES[0])}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setModePickerPlace(DREAM_PLACES[0])}
                className="lg:col-span-6 relative rounded-2xl overflow-hidden border border-black/10 min-h-[290px] sm:min-h-[360px] cursor-pointer group bg-[#161B26]"
              >
                <img
                  src={DREAM_PLACES[0].image}
                  alt={DREAM_PLACES[0].name[lang]}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                {/* Live Avatar Standing Inside Hero Preview */}
                <div className="absolute bottom-14 left-1/2 -translate-x-1/2 scale-90 sm:scale-100 transition-transform duration-500 group-hover:-translate-y-1">
                  <AvatarRenderer
                    name={store.avatar.name}
                    facePhoto={store.avatar.facePhoto}
                    faceZoom={store.avatar.faceZoom}
                    faceOffsetX={store.avatar.faceOffsetX}
                    faceOffsetY={store.avatar.faceOffsetY}
                    faceWarmth={store.avatar.faceWarmth}
                    hairStyle={store.avatar.hairStyle}
                    hairColor={store.avatar.hairColor}
                    skinTone={store.avatar.skinTone}
                    outfit={store.avatar.outfit}
                    action="wine"
                    prop={store.avatar.equippedProp}
                    visualMode={store.avatar.facePhoto ? 'photo' : 'illustrated'}
                    size={128}
                  />
                </div>

                <div className="absolute inset-x-0 bottom-0 p-5 flex items-end justify-between gap-4 text-white">
                  <div>
                    <div className="text-xs text-white/75">{DREAM_PLACES[0].location[lang]}</div>
                    <div className="text-lg sm:text-xl font-semibold">{DREAM_PLACES[0].name[lang]}</div>
                  </div>
                  <span className="text-xs font-medium text-[#F2D9AA] whitespace-nowrap">
                    {t.search.enterSolo} / {t.search.enterTogether} →
                  </span>
                </div>
              </div>
            </section>

            {/* Where is your dream? Search + 8 Dream Categories */}
            <section className="space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-xl">
                  <Search className="w-4 h-4 text-[#6B7280] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.search.placeholder}
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-black/12 text-sm text-[#14171F] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#14171F]"
                  />
                </div>
              </div>

              {/* 8 Dream Category Filter Bar (Interactive Buttons) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 min-h-[38px] ${
                    selectedCategory === 'all'
                      ? 'bg-[#14171F] text-white'
                      : 'bg-white border border-black/8 text-[#5A6170] hover:text-[#14171F]'
                  }`}
                >
                  {t.search.allCategories}
                </button>
                {DREAM_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 min-h-[38px] ${
                      selectedCategory === cat
                        ? 'bg-[#14171F] text-white'
                        : 'bg-white border border-black/8 text-[#5A6170] hover:text-[#14171F]'
                    }`}
                  >
                    {t.categories[cat]}
                  </button>
                ))}
              </div>

              {/* Fallback when user searches a custom place not directly listed */}
              {closestSuggestion && (
                <div className="bg-white rounded-2xl border border-black/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-[#14171F]">{t.search.noDirectMatch}</p>
                    <p className="text-xs text-[#5A6170]">
                      {pick(
                        lang,
                        `가장 어울리는 테마 공간: ${closestSuggestion.place.name.ko}`,
                        `Closest theme match: ${closestSuggestion.place.name.en}`,
                        `Tema más parecido: ${closestSuggestion.place.name.es}`
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setModePickerPlace(closestSuggestion.place)}
                      className="px-4 py-2.5 rounded-xl bg-[#14171F] text-white text-xs font-medium min-h-[42px] whitespace-nowrap"
                    >
                      {closestSuggestion.place.name[lang]} →
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDreamLifeSeedQuery(searchQuery);
                        setActiveTab('dreamLife');
                      }}
                      className="px-4 py-2.5 rounded-xl border border-black/14 text-xs font-medium text-[#14171F] hover:bg-black/5 min-h-[42px] whitespace-nowrap"
                    >
                      {t.search.createCustomWithPhoto}
                    </button>
                  </div>
                </div>
              )}

              {/* Dream Places Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPlaces.map((place) => {
                  const liveCount = roomCounts[place.id] ?? 0;
                  return (
                    <article
                      key={place.id}
                      onClick={() => setModePickerPlace(place)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && setModePickerPlace(place)}
                      className="group bg-white rounded-2xl border border-black/8 overflow-hidden flex flex-col cursor-pointer hover:border-black/22 transition-colors"
                    >
                      <div className="relative aspect-[16/10] overflow-hidden bg-[#161B26]">
                        <img
                          src={place.image}
                          alt={place.name[lang]}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      </div>
                      <div className="p-5 flex-1 flex flex-col justify-between gap-3">
                        <div className="space-y-1.5">
                          <div className="text-xs text-[#6B7280] flex items-center gap-1.5 flex-wrap">
                            <span>{t.categories[place.category]}</span>
                            <span aria-hidden="true">·</span>
                            <span>
                              {place.recommendedMode === 'solo'
                                ? t.search.recommendedSolo
                                : t.search.recommendedTogether}
                            </span>
                            {liveCount > 0 && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-[#8A6D3B] tabular-nums">
                                  {liveCount}
                                  {t.search.liveNow}
                                </span>
                              </>
                            )}
                          </div>
                          <h3 className="text-lg font-semibold text-[#14171F] leading-snug">
                            {place.name[lang]}
                          </h3>
                          <p className="text-xs text-[#5A6170] leading-relaxed line-clamp-2">
                            {place.description[lang]}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-black/6 flex items-center justify-between text-xs font-medium text-[#14171F]">
                          <span className="text-[#6B7280]">{place.location[lang]}</span>
                          <span className="group-hover:translate-x-0.5 transition-transform">
                            {pick(lang, '입장하기 →', 'Enter →', 'Entrar →')}
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'dreamLife' && (
          <DreamLifeBuilder
            lang={lang}
            customDreams={store.customDreams}
            initialQuery={dreamLifeSeedQuery}
            onAddDream={(dream) =>
              setStore((prev) => ({ ...prev, customDreams: [dream, ...prev.customDreams] }))
            }
            onDeleteDream={(id) =>
              setStore((prev) => ({
                ...prev,
                customDreams: prev.customDreams.filter((d) => d.id !== id),
              }))
            }
            onExperienceDream={handleExperienceCustomDream}
            onAddDreamToDay={handleAddDreamToDay}
          />
        )}

        {activeTab === 'together' && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
            <div className="border-b border-black/8 pb-6 space-y-1.5">
              <p className="text-xs font-medium text-[#6B7280]">
                {pick(lang, '실시간 공동 공간 · 손 흔들기 & 응원 인사', 'Real-Time Shared Spaces · Calm Waves & Greetings', 'Espacios compartidos en directo · Saludos y ánimos')}
              </p>
              <h1 className="text-3xl sm:text-4xl font-semibold text-[#14171F] tracking-tight">
                {t.togetherPage.title}
              </h1>
              <p className="text-sm text-[#5A6170] max-w-2xl leading-relaxed">
                {t.togetherPage.subtitle}
              </p>
            </div>

            {/* Virtual Neighbors Default Toggle */}
            <div className="bg-white rounded-2xl border border-black/8 p-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-[#14171F]">
                  {t.togetherPage.virtualToggleTitle}
                </h2>
                <p className="text-xs text-[#5A6170] mt-0.5">{t.togetherPage.virtualToggleDesc}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={store.virtualNeighborsDefault}
                onClick={() =>
                  setStore((prev) => ({
                    ...prev,
                    virtualNeighborsDefault: !prev.virtualNeighborsDefault,
                  }))
                }
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
                  store.virtualNeighborsDefault ? 'bg-[#14171F]' : 'bg-black/15'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    store.virtualNeighborsDefault ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Shared Rooms Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {DREAM_PLACES.map((place) => {
                const liveCount = roomCounts[place.id] ?? 0;
                return (
                  <div
                    key={place.id}
                    className="bg-white rounded-2xl border border-black/8 overflow-hidden flex flex-col"
                  >
                    <div className="aspect-[16/10] overflow-hidden bg-[#161B26]">
                      <img
                        src={place.image}
                        alt={place.name[lang]}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                      <div>
                        <div className="text-xs text-[#6B7280] tabular-nums">
                          {place.location[lang]} ·{' '}
                          {liveCount > 0
                            ? `${liveCount}${t.search.liveNow}`
                            : store.virtualNeighborsDefault
                            ? pick(lang, '가상 이웃 3명 산책 중', '3 virtual neighbors strolling', '3 vecinos virtuales paseando')
                            : pick(lang, '조용한 공간', 'Quiet room', 'Sala tranquila')}
                        </div>
                        <h3 className="text-lg font-semibold text-[#14171F] mt-1">
                          {place.name[lang]}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleEnterPlace(place, 'together')}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#14171F] text-white text-xs font-medium hover:bg-[#272D3B] min-h-[42px]"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>{t.togetherPage.enterRoom}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'avatar' && (
          <AvatarStudio
            lang={lang}
            avatar={store.avatar}
            companion={store.companion}
            goalProgress={goalProgress}
            onUpdateAvatar={(avatar) => setStore((prev) => ({ ...prev, avatar }))}
            onUpdateCompanion={(companion) => setStore((prev) => ({ ...prev, companion }))}
          />
        )}

        {activeTab === 'board' && (
          <DreamBoardView
            lang={lang}
            snapshots={store.snapshots}
            stamps={store.stamps}
            streakDays={store.streakDays}
            onDeleteSnapshot={(id) =>
              setStore((prev) => ({
                ...prev,
                snapshots: prev.snapshots.filter((s) => s.id !== id),
              }))
            }
            onOpenPlace={(place) => setModePickerPlace(place)}
          />
        )}

        {activeTab === 'goals' && (
          <MyGoalsView
            lang={lang}
            goals={store.goals}
            overallProgress={goalProgress}
            onCheckInGoal={handleCheckInGoal}
            onAddGoal={handleAddGoal}
            onDeleteGoal={handleDeleteGoal}
            onVisitLinkedPlace={(place) => handleEnterPlace(place, 'solo')}
          />
        )}

        {activeTab === 'dreamDay' && (
          <DreamDayCinema
            lang={lang}
            slots={store.dreamDaySlots}
            customDreams={store.customDreams}
            avatar={store.avatar}
            companion={store.companion}
            onChangeSlots={(dreamDaySlots) => setStore((prev) => ({ ...prev, dreamDaySlots }))}
            frameMode={frameMode}
            onChangeFrameMode={setFrameMode}
            onEnterSlot={(slot) => {
              const place = DREAM_PLACES.find((p) => p.id === slot.placeId) ?? DREAM_PLACES[0];
              setActiveStage({
                place,
                mode: 'solo',
                customTitle: slot.customTitle,
                customImage: slot.customImage,
                customFloorY: slot.customFloorY,
                slotId: slot.id,
                peopleScale: slot.peopleScale,
                timeOfDay: slot.timeOfDay,
                action: slot.action,
                affirmation: slot.affirmation,
              });
            }}
          />
        )}
      </main>

      {/* Subtle Quiet Footer (Desktop) */}
      <footer className="hidden md:block border-t border-black/8 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between text-xs text-[#6B7280]">
          <span>DreamMe · {t.brandSubtitle}</span>
          <div className="flex items-center gap-3">
            {LANGUAGE_OPTIONS.filter((o) => o.id !== lang).map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setLanguage(o.id)}
                className="hover:text-[#14171F] transition-colors"
              >
                {o.full}
              </button>
            ))}
          </div>
        </div>
      </footer>

      {/* Mobile Fixed Bottom Navigation Bar (Ergonomic Thumb Zone, Compact) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[#F8F7F4]/95 backdrop-blur-md border-t border-black/10">
        <div className="grid grid-cols-6 h-16 items-center">
          {(
            [
              { id: 'places', icon: Compass, label: t.nav.places },
              { id: 'dreamLife', icon: Heart, label: t.nav.dreamLife },
              { id: 'together', icon: Users, label: t.nav.together },
              { id: 'avatar', icon: User, label: t.nav.avatar },
              { id: 'board', icon: BookOpen, label: t.nav.board },
              { id: 'goals', icon: Target, label: t.nav.goals },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center h-full gap-1 transition-colors ${
                  active ? 'text-[#14171F] font-semibold' : 'text-[#6B7280]'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] leading-none truncate max-w-[54px]">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mode Selection Modal (Solo vs Together upon picking a Dream Place) */}
      {modePickerPlace && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setModePickerPlace(null)}
        >
          <div
            className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[16/9] bg-[#161B26]">
              <img
                src={modePickerPlace.image}
                alt={modePickerPlace.name[lang]}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setModePickerPlace(null)}
                aria-label="Close"
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/55 text-white flex items-center justify-center hover:bg-black/75"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/80 via-black/35 to-transparent text-white">
                <div className="text-xs text-white/75">{modePickerPlace.location[lang]}</div>
                <h2 className="text-2xl font-semibold">{modePickerPlace.name[lang]}</h2>
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <p className="text-xs text-[#5A6170] leading-relaxed">
                {modePickerPlace.description[lang]}
              </p>

              <div className="text-xs font-semibold text-[#14171F]">{t.search.chooseModeTitle}</div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleEnterPlace(modePickerPlace, 'solo')}
                  className="text-left p-4 rounded-xl border border-black/14 hover:border-[#14171F] hover:bg-[#FAF8F4] transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#14171F]">
                      <User className="w-4 h-4" />
                      <span>{t.search.enterSolo}</span>
                    </span>
                    {modePickerPlace.recommendedMode === 'solo' && (
                      <span className="text-[11px] font-medium text-[#8A6D3B]">
                        {t.search.recommendedSolo}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#5A6170] leading-snug">{t.search.soloDesc}</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleEnterPlace(modePickerPlace, 'together')}
                  className="text-left p-4 rounded-xl border border-black/14 hover:border-[#14171F] hover:bg-[#FAF8F4] transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#14171F]">
                      <Users className="w-4 h-4" />
                      <span>{t.search.enterTogether}</span>
                    </span>
                    {modePickerPlace.recommendedMode === 'together' && (
                      <span className="text-[11px] font-medium text-[#8A6D3B]">
                        {t.search.recommendedTogether}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#5A6170] leading-snug">{t.search.togetherDesc}</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
