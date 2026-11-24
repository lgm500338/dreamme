import React from 'react';
import { FrameMode, Language } from '../types/dream';

/** Two-way switch: 가로 (landscape, default) ↔ 세로 9:16 (TikTok / Shorts). */
export const FrameToggle: React.FC<{
  lang: Language;
  value: FrameMode;
  onChange: (mode: FrameMode) => void;
  tone?: 'light' | 'dark';
  compact?: boolean;
}> = ({ lang, value, onChange, tone = 'light', compact = false }) => {
  const dark = tone === 'dark';
  const opts: Array<{ id: FrameMode; label: string; short: string; box: string }> = [
    { id: 'landscape', label: lang === 'ko' ? '가로' : 'Wide', short: lang === 'ko' ? '가로' : 'Wide', box: 'w-[14px] h-[9px]' },
    { id: 'portrait', label: lang === 'ko' ? '세로 9:16' : 'Vertical 9:16', short: lang === 'ko' ? '세로' : '9:16', box: 'w-[9px] h-[14px]' },
  ];
  return (
    <div
      role="radiogroup"
      aria-label={lang === 'ko' ? '화면 비율' : 'Screen shape'}
      className={`inline-flex items-center p-1 rounded-lg shrink-0 ${dark ? 'bg-white/8' : 'bg-black/[0.05] border border-black/8'}`}
    >
      {opts.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={(e) => {
              e.stopPropagation();
              onChange(o.id);
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              active
                ? dark
                  ? 'bg-white text-[#14171F]'
                  : 'bg-[#14171F] text-white'
                : dark
                ? 'text-white/75 hover:text-white'
                : 'text-[#5A6170] hover:text-[#14171F]'
            }`}
          >
            <span aria-hidden="true" className={`inline-block rounded-[2px] border-[1.5px] border-current ${o.box}`} />
            <span>{compact ? o.short : o.label}</span>
          </button>
        );
      })}
    </div>
  );
};
