import React, { useState } from 'react';
import {
  Download,
  Trash2,
  Stamp,
  Flame,
  CheckCircle2,
  Plus,
  Play,
  Lock,
  Unlock,
} from 'lucide-react';
import { AVATAR_PROPS, DREAM_PLACES } from '../data/places';
import { tFor } from '../data/i18n';
import {
  DreamPlace,
  GoalItem,
  Language,
  PassportStamp,
  SavedSnapshot,
} from '../types/dream';
import { getTodayKey } from '../utils/storage';

interface DreamBoardViewProps {
  lang: Language;
  snapshots: SavedSnapshot[];
  stamps: PassportStamp[];
  streakDays: number;
  onDeleteSnapshot: (id: string) => void;
  onOpenPlace: (place: DreamPlace) => void;
}

export const DreamBoardView: React.FC<DreamBoardViewProps> = ({
  lang,
  snapshots,
  stamps,
  streakDays,
  onDeleteSnapshot,
  onOpenPlace,
}) => {
  const t = tFor(lang);
  const [subTab, setSubTab] = useState<'passport' | 'snapshots'>('passport');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
      {/* Header + Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-black/8 pb-6">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-[#6B7280]">Dream Board & Passport</p>
          <h1 className="text-3xl sm:text-4xl font-semibold text-[#14171F] tracking-tight">
            {t.board.title}
          </h1>
          <p className="text-sm text-[#5A6170] max-w-2xl">{t.board.subtitle}</p>
        </div>

        {/* Clean Tabular Summary Metrics (Zero Pills) */}
        <div className="flex items-center gap-6 shrink-0">
          <div>
            <div className="text-xs text-[#6B7280] flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-[#8A6D3B]" />
              <span>{t.board.streakLabel}</span>
            </div>
            <div className="text-2xl font-semibold text-[#14171F] tabular-nums">
              {streakDays}
              <span className="text-sm font-normal text-[#5A6170] ml-1">{t.board.daysUnit}</span>
            </div>
          </div>
          <div className="h-9 w-px bg-black/10" />
          <div>
            <div className="text-xs text-[#6B7280] flex items-center gap-1">
              <Stamp className="w-3.5 h-3.5 text-[#8A6D3B]" />
              <span>{t.board.totalStamps}</span>
            </div>
            <div className="text-2xl font-semibold text-[#14171F] tabular-nums">
              {stamps.length}
              <span className="text-sm font-normal text-[#5A6170] ml-1">
                / {DREAM_PLACES.length} {t.board.placesUnit}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-tab Switcher */}
      <div className="inline-flex items-center p-1 rounded-xl bg-black/5">
        <button
          type="button"
          onClick={() => setSubTab('passport')}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors min-h-[40px] whitespace-nowrap ${
            subTab === 'passport' ? 'bg-white text-[#14171F] shadow-sm' : 'text-[#5A6170]'
          }`}
        >
          {t.board.tabPassport} ({stamps.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('snapshots')}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors min-h-[40px] whitespace-nowrap ${
            subTab === 'snapshots' ? 'bg-white text-[#14171F] shadow-sm' : 'text-[#5A6170]'
          }`}
        >
          {t.board.tabSnapshots} ({snapshots.length})
        </button>
      </div>

      {subTab === 'passport' ? (
        <div className="bg-white rounded-2xl border border-black/8 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-black/8">
            <div>
              <h2 className="text-2xl font-semibold text-[#14171F]">DREAMME PASSPORT</h2>
              <p className="text-xs text-[#6B7280] mt-0.5">
                {lang === 'ko'
                  ? '꿈의 공간에 방문할 때마다 입국 스탬프가 기록됩니다.'
                  : 'Every dream space visited leaves a dated stamp in your personal passport.'}
              </p>
            </div>
            <span className="text-xs font-medium text-[#8A6D3B] tabular-nums">
              {stamps.length} / {DREAM_PLACES.length} COLLECTED
            </span>
          </div>

          {stamps.length === 0 ? (
            <div className="py-10 text-center text-sm text-[#5A6170]">{t.board.emptyPassport}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stamps.map((st, idx) => {
                const place = DREAM_PLACES.find((p) => p.id === st.placeId);
                const rotation = idx % 2 === 0 ? '-rotate-1' : 'rotate-1';
                return (
                  <button
                    key={st.placeId}
                    type="button"
                    onClick={() => place && onOpenPlace(place)}
                    className={`text-left p-5 rounded-xl border border-dashed border-[#8A6D3B]/45 bg-[#FAF8F3] hover:bg-[#F4EFE4] transition-all ${rotation}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[11px] font-mono tracking-wider text-[#8A6D3B] font-semibold">
                        {st.stampCode}
                      </span>
                      <span className="text-[11px] text-[#5A6170] tabular-nums">
                        {st.visitCount}
                        {t.board.visits}
                      </span>
                    </div>
                    <div className="text-base font-semibold text-[#14171F] mt-2">
                      {lang === 'ko' ? st.placeNameKo : st.placeNameEn}
                    </div>
                    <div className="text-[11px] text-[#6B7280] mt-3 tabular-nums">
                      {new Date(st.firstVisitedAt).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US')}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : snapshots.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 bg-white/70 p-10 text-center text-sm text-[#5A6170]">
          {t.board.emptySnapshots}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {snapshots.map((snap) => (
            <article
              key={snap.id}
              className="bg-white rounded-2xl border border-black/8 overflow-hidden flex flex-col"
            >
              <img
                src={snap.imageDataUrl}
                alt={snap.placeTitle}
                className="w-full aspect-[10/7] object-cover"
              />
              <div className="p-4 flex items-center justify-between gap-3 border-t border-black/6">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#14171F] truncate">{snap.placeTitle}</div>
                  <div className="text-xs text-[#6B7280] truncate">{snap.affirmation}</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={snap.imageDataUrl}
                    download={`DreamMe_${snap.placeId}.jpg`}
                    className="p-2.5 rounded-lg border border-black/12 text-[#14171F] hover:bg-black/5 min-h-[40px] min-w-[40px] flex items-center justify-center"
                    title={t.stage.downloadPng}
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => onDeleteSnapshot(snap.id)}
                    className="p-2.5 rounded-lg border border-black/10 text-[#6B7280] hover:text-red-600 min-h-[40px] min-w-[40px] flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

interface MyGoalsViewProps {
  lang: Language;
  goals: GoalItem[];
  overallProgress: number;
  onCheckInGoal: (goalId: string) => void;
  onAddGoal: (goal: GoalItem) => void;
  onDeleteGoal: (goalId: string) => void;
  onVisitLinkedPlace: (place: DreamPlace) => void;
}

export const MyGoalsView: React.FC<MyGoalsViewProps> = ({
  lang,
  goals,
  overallProgress,
  onCheckInGoal,
  onAddGoal,
  onDeleteGoal,
  onVisitLinkedPlace,
}) => {
  const t = tFor(lang);
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('10');
  const [unit, setUnit] = useState(lang === 'ko' ? '회' : 'times');
  const [step, setStep] = useState('1');
  const [linkedPlaceId, setLinkedPlaceId] = useState(DREAM_PLACES[0].id);

  const nextLockedProp = AVATAR_PROPS.find((p) => p.unlockProgress > overallProgress);

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    const numTarget = Math.max(1, Number(target) || 10);
    const numStep = Math.max(0.1, Number(step) || 1);
    if (!trimmed) return;

    const place = DREAM_PLACES.find((p) => p.id === linkedPlaceId) ?? DREAM_PLACES[0];
    onAddGoal({
      id: `goal_${Date.now()}`,
      title: trimmed,
      category: place.category,
      current: 0,
      target: numTarget,
      unit: unit.trim() || (lang === 'ko' ? '회' : 'x'),
      step: numStep,
      linkedPlaceId: place.id,
      lastCheckedDate: null,
    });
    setTitle('');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
      {/* Header */}
      <div className="border-b border-black/8 pb-6 space-y-1.5">
        <p className="text-xs font-medium text-[#6B7280]">Make It Real · My Goals</p>
        <h1 className="text-3xl sm:text-4xl font-semibold text-[#14171F] tracking-tight text-balance">
          {t.goals.title}
        </h1>
        <p className="text-sm text-[#5A6170] max-w-2xl leading-relaxed">{t.goals.subtitle}</p>
      </div>

      {/* Overall Progress & Prop Unlock Track */}
      <div className="bg-white rounded-2xl border border-black/8 p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-[#6B7280]">{t.goals.overallProgress}</div>
            <div className="text-3xl font-semibold text-[#14171F] tabular-nums mt-0.5">
              {overallProgress}%
            </div>
          </div>
          <div className="text-xs text-[#8A6D3B] font-medium">
            {nextLockedProp
              ? `${t.goals.nextUnlock} ${nextLockedProp.unlockProgress}% · ${nextLockedProp.name[lang]}`
              : t.goals.allUnlocked}
          </div>
        </div>

        {/* Clean Progress Bar */}
        <div className="h-2.5 w-full rounded-full bg-black/6 overflow-hidden">
          <div
            className="h-full rounded-full bg-[#14171F] transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          />
        </div>

        {/* Prop Unlock Milestones */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
          {AVATAR_PROPS.filter((p) => p.unlockProgress > 0).map((p) => {
            const unlocked = overallProgress >= p.unlockProgress;
            return (
              <div
                key={p.id}
                className={`p-3 rounded-xl border text-xs flex flex-col justify-between gap-1 ${
                  unlocked
                    ? 'border-[#8A6D3B]/40 bg-[#FAF7F0] text-[#14171F]'
                    : 'border-black/8 bg-[#F8F7F4] text-[#9CA3AF]'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-medium truncate">{p.name[lang]}</span>
                  {unlocked ? (
                    <Unlock className="w-3.5 h-3.5 text-[#8A6D3B] shrink-0" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                  )}
                </div>
                <span className="text-[11px] tabular-nums">{p.unlockProgress}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Goal Cards + Add Goal Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Goal Cards */}
        <div className="lg:col-span-7 space-y-4">
          {goals.map((goal) => {
            const pct = Math.min(100, Math.round((goal.current / Math.max(1, goal.target)) * 100));
            const done = pct >= 100;
            const linkedPlace = DREAM_PLACES.find((p) => p.id === goal.linkedPlaceId) ?? DREAM_PLACES[0];
            const checkedToday = goal.lastCheckedDate === getTodayKey();

            return (
              <div
                key={goal.id}
                className="bg-white rounded-2xl border border-black/8 p-5 space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-[#6B7280]">
                      {t.categories[goal.category]} · {linkedPlace.name[lang]}
                    </div>
                    <h3 className="text-base font-semibold text-[#14171F] mt-1">{goal.title}</h3>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-semibold text-[#14171F] tabular-nums">{pct}%</div>
                    <div className="text-xs text-[#5A6170] tabular-nums">
                      {goal.current} / {goal.target} {goal.unit}
                    </div>
                  </div>
                </div>

                <div className="h-2 w-full rounded-full bg-black/6 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      done ? 'bg-[#8A6D3B]' : 'bg-[#14171F]'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={done}
                      onClick={() => onCheckInGoal(goal.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#14171F] text-white text-xs font-medium hover:bg-[#272D3B] disabled:opacity-45 transition-colors min-h-[40px] whitespace-nowrap"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {done
                          ? t.goals.completed
                          : `${t.goals.checkInBtn}${goal.step} ${goal.unit}`}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onVisitLinkedPlace(linkedPlace)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-black/12 text-xs font-medium text-[#14171F] hover:bg-black/5 transition-colors min-h-[40px] whitespace-nowrap"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{t.goals.visitDreamBtn}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {checkedToday && (
                      <span className="text-[11px] text-[#8A6D3B] font-medium">
                        {lang === 'ko' ? '오늘 기록됨' : 'Logged today'}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onDeleteGoal(goal.id)}
                      className="p-2 rounded-lg text-[#6B7280] hover:text-red-600 min-h-[38px] min-w-[38px] flex items-center justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add New Goal Form */}
        <form
          onSubmit={handleCreateGoal}
          className="lg:col-span-5 bg-white rounded-2xl border border-black/8 p-5 sm:p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold text-[#14171F]">{t.goals.addGoalTitle}</h2>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#5A6170]">{t.goals.goalTitlePlaceholder.slice(0, 12)}</label>
            <input
              type="text"
              required
              maxLength={60}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.goals.goalTitlePlaceholder}
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/12 text-sm text-[#14171F] focus:outline-none focus:border-[#14171F]"
            />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#5A6170]">{t.goals.targetLabel}</label>
              <input
                type="number"
                min={1}
                step="any"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-black/12 text-sm tabular-nums"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#5A6170]">{t.goals.stepLabel}</label>
              <input
                type="number"
                min={0.1}
                step="any"
                value={step}
                onChange={(e) => setStep(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-black/12 text-sm tabular-nums"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#5A6170]">{t.goals.unitLabel}</label>
              <input
                type="text"
                maxLength={10}
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-black/12 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#5A6170]">{t.goals.linkedPlace}</label>
            <select
              value={linkedPlaceId}
              onChange={(e) => setLinkedPlaceId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/12 text-sm bg-white"
            >
              {DREAM_PLACES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name[lang]}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-[#14171F] text-white text-sm font-medium hover:bg-[#272D3B] min-h-[46px]"
          >
            <Plus className="w-4 h-4" />
            <span>{t.goals.addGoalBtn}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
