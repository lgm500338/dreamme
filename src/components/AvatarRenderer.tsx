import React, { memo, useId } from 'react';
import {
  AvatarAction,
  CompanionVisualMode,
  HairStyle,
  OutfitStyle,
  PropId,
  SkinTone,
  TimeOfDay,
} from '../types/dream';

export const SKIN_PALETTE: Record<SkinTone, { base: string; shade: string; blush: string }> = {
  fair: { base: '#FBE5D8', shade: '#E8C5B2', blush: '#F3B4A8' },
  warm: { base: '#F2CFAF', shade: '#DAB08C', blush: '#E59F8E' },
  olive: { base: '#DFB68E', shade: '#C4976D', blush: '#D48C79' },
  tan: { base: '#C69065', shade: '#A8744B', blush: '#BA755C' },
  deep: { base: '#8B5A3C', shade: '#6E432A', blush: '#9C5B49' },
};

const OUTFIT_PALETTE: Record<OutfitStyle, { top: string; bottom: string; shoes: string }> = {
  resort: { top: '#F4EEE3', bottom: '#D7C7B2', shoes: '#8F6F52' },
  tailored: { top: '#1F2937', bottom: '#18202C', shoes: '#0F131A' },
  parisChic: { top: '#C7A984', bottom: '#2B2B30', shoes: '#3E2B22' },
  evening: { top: '#5B3B6E', bottom: '#3A2547', shoes: '#16111A' },
  athleisure: { top: '#4A7D6F', bottom: '#2E3A3B', shoes: '#F1F2EE' },
};

const HAIR_BACK: Partial<Record<HairStyle, string>> = {
  longWave: 'M35 42 C32 66 30 88 37 102 C44 96 76 96 83 102 C90 88 88 66 85 42 C83 22 72 13 60 13 C48 13 37 22 35 42 Z',
  bob: 'M36 41 C34 56 34 69 40 76 L80 76 C86 69 86 56 84 41 C82 22 72 14 60 14 C48 14 38 22 36 41 Z',
  shortNeat: 'M37 42 C36 24 46 14 60 14 C74 14 84 24 83 42 C82 48 80 51 78 51 L42 51 C40 51 38 48 37 42 Z',
};

const HAIR_FRONT: Record<HairStyle, string> = {
  longWave: 'M38 38 C39 20 49 14 60 14 C71 14 81 20 82 38 C76 28 69 25 60 25 C50 25 43 29 38 38 Z',
  bob: 'M38 36 C39 20 49 14 60 14 C71 14 81 20 82 36 C74 30 66 28 60 28 C53 28 45 30 38 36 Z',
  shortNeat: 'M38 35 C39 19 49 14 60 14 C71 14 81 19 82 35 C76 26 67 24 58 24 C50 24 43 27 38 35 Z',
  updo: 'M39 34 C41 20 50 15 60 15 C70 15 79 20 81 34 C74 26 67 23 60 23 C53 23 46 26 39 34 Z',
  curly: 'M38 36 C41 22 50 16 60 16 C70 16 79 22 82 36 C76 29 70 27 65 29 C60 25 54 27 49 29 C44 28 40 31 38 36 Z',
};

const TORSO = 'M39 81 C39 74 47 71 60 71 C73 71 81 74 81 81 L77 129 C77 132 73 134 60 134 C47 134 43 132 43 129 Z';

// ---- skeleton (viewBox units). Hip centre is the root joint.
const HIP: [number, number] = [60, 128];
const THIGH = 22;
const SHIN = 21;
const UPPER_ARM = 20;
const FOREARM = 18;
const LEG_W = 10.5;
const ARM_W = 9;
const SHOULDER_L: [number, number] = [41 - HIP[0], 82 - HIP[1]];
const SHOULDER_R: [number, number] = [79 - HIP[0], 82 - HIP[1]];
const NECK: [number, number] = [0, 72 - HIP[1]];

/** a limb bone drawn from the joint (0,0) straight down to (0,len), round both ends */
const bone = (len: number, w: number) => ({ x: -w / 2, y: -w / 2, width: w, height: len + w, rx: w / 2 });

export type SkeletonPose = 'idle' | 'walk' | 'sit' | 'drink' | 'toast' | 'wave' | 'greet' | 'sign';

export const poseForAction = (action: AvatarAction): SkeletonPose => {
  switch (action) {
    case 'walk':
      return 'walk';
    case 'sit':
      return 'sit';
    case 'wine':
      return 'drink';
    case 'toast':
      return 'toast';
    case 'wave':
      return 'wave';
    case 'greet':
      return 'greet';
    case 'sign':
      return 'sign';
    default:
      return 'idle';
  }
};

interface AvatarRendererProps {
  name: string;
  facePhoto?: string | null;
  faceZoom?: number;
  faceOffsetX?: number;
  faceOffsetY?: number;
  faceWarmth?: number;
  hairStyle: HairStyle;
  hairColor: string;
  skinTone: SkinTone;
  outfit: OutfitStyle;
  action: AvatarAction;
  prop?: PropId;
  timeOfDay?: TimeOfDay;
  facing?: 'left' | 'right';
  visualMode?: CompanionVisualMode;
  greetingText?: string;
  showLabel?: boolean;
  size?: number;
}

/**
 * Jointed 2D skeleton character (hips → thighs → shins, torso → shoulders → elbows, neck → head),
 * animated with CSS keyframes per joint (see index.css "skeleton" section).
 * Look: bold pen outlines with see-through fills — the figure is drawn twice, once as an
 * opacity mask (ink = solid, clothes = translucent) and once in colour.
 */
const AvatarRendererInner: React.FC<AvatarRendererProps> = ({
  name,
  facePhoto = null,
  faceZoom = 1.12,
  faceOffsetX = 0,
  faceOffsetY = 0,
  faceWarmth = 0,
  hairStyle,
  hairColor,
  skinTone,
  outfit,
  action,
  prop = 'none',
  timeOfDay = 'day',
  facing = 'right',
  visualMode = 'illustrated',
  greetingText,
  showLabel = true,
  size = 148,
}) => {
  const uid = useId().replace(/:/g, '');
  const clipId = `face-clip-${uid}`;
  const maskId = `see-through-${uid}`;
  const skin = SKIN_PALETTE[skinTone] ?? SKIN_PALETTE.warm;
  const clothes = OUTFIT_PALETTE[outfit] ?? OUTFIT_PALETTE.resort;
  const isSilhouette = visualMode === 'silhouette';
  const useFacePhoto = !isSilhouette && Boolean(facePhoto);

  const ink = timeOfDay === 'night' ? '#FFF3DF' : timeOfDay === 'sunset' ? '#2B1810' : '#1C1A1F';
  const faceInk = '#1C1A1F';
  const SW = 2.7;
  const clothOpacity = isSilhouette ? 0.12 : timeOfDay === 'night' ? 0.5 : 0.4;
  const dash = isSilhouette ? '5 4' : undefined;

  const pose = poseForAction(action);
  const drink: 'wine' | 'champagne' | 'coffee' | null =
    prop === 'champagne' ? 'champagne' : prop === 'coffee' ? 'coffee' : prop === 'wine' ? 'wine' : null;
  // toast / drink poses always show a glass; otherwise carry the equipped drink
  const handDrink = pose === 'toast' || pose === 'drink' ? drink ?? 'wine' : pose === 'wave' || pose === 'sign' ? null : drink;
  const holdsDrink = Boolean(handDrink) && pose !== 'toast';
  const hasBook = !isSilhouette && (prop === 'bestsellerBook' || pose === 'sign') && !handDrink;
  const hasSunglasses = !isSilhouette && prop === 'sunglasses';
  const hasShoppingBag = !isSilhouette && prop === 'shoppingBag';
  const hasGoldKey = !isSilhouette && prop === 'goldKey';

  const photoWarmthFilter =
    faceWarmth > 0
      ? `sepia(${(faceWarmth / 100).toFixed(2)}) saturate(${(1 + faceWarmth / 60).toFixed(2)})`
      : faceWarmth < 0
      ? `hue-rotate(${faceWarmth}deg) saturate(${(1 + faceWarmth / 80).toFixed(2)})`
      : '';

  const faceRadiusX = 21;
  const faceRadiusY = 25;
  const faceCenterX = 60;
  const faceCenterY = 44;
  const imgW = faceRadiusX * 2.25 * faceZoom;
  const imgH = faceRadiusY * 2.25 * faceZoom;
  const imgX = faceCenterX - imgW / 2 + faceOffsetX * 0.45;
  const imgY = faceCenterY - imgH / 2 + faceOffsetY * 0.45;

  const grey = (a: number) => {
    const v = Math.round(a * 255).toString(16).padStart(2, '0');
    return `#${v}${v}${v}`;
  };

  const renderFigure = (m: boolean) => {
    const pen = {
      stroke: m ? '#FFFFFF' : ink,
      strokeWidth: SW,
      strokeLinejoin: 'round' as const,
      strokeLinecap: 'round' as const,
      strokeDasharray: dash,
    };
    const solid = (c: string) => (m ? '#FFFFFF' : c);
    const cloth = (color: string, a = clothOpacity) => ({ fill: m ? grey(a) : isSilhouette ? '#FFFFFF' : color, ...pen });
    const skinP = { fill: m ? grey(isSilhouette ? 0.12 : 0.96) : isSilhouette ? '#FFFFFF' : skin.base, ...pen };
    const hairP = { fill: m ? grey(0.92) : hairColor, ...pen };
    const propInk = m ? '#FFFFFF' : ink;

    const glass = (kind: 'wine' | 'champagne' | 'coffee') =>
      kind === 'wine' ? (
        <g transform="translate(-6, -14)" strokeLinecap="round">
          <path d="M2 2 L10 2 L9 10 C8.5 13 3.5 13 3 10 Z" fill={solid('#FFFFFF')} fillOpacity={m ? 1 : 0.45} stroke={propInk} strokeWidth="1.4" />
          <path d="M3.2 7 L8.8 7 L8.5 10 C8.1 12 3.9 12 3.5 10 Z" fill={solid('#9F1239')} />
          <line x1="6" y1="13" x2="6" y2="20" stroke={propInk} strokeWidth="1.4" />
          <line x1="3" y1="20" x2="9" y2="20" stroke={propInk} strokeWidth="1.4" />
        </g>
      ) : kind === 'champagne' ? (
        <g transform="translate(-5.5, -16)" strokeLinecap="round">
          <path d="M3 1 L8 1 L7.4 13 C7 15 4 15 3.6 13 Z" fill={solid('#FDE68A')} fillOpacity={m ? 1 : 0.85} stroke={propInk} strokeWidth="1.3" />
          <line x1="5.5" y1="14.5" x2="5.5" y2="22" stroke={propInk} strokeWidth="1.3" />
          <line x1="3" y1="22" x2="8" y2="22" stroke={propInk} strokeWidth="1.4" />
        </g>
      ) : (
        <g transform="translate(-6, -8)" stroke={propInk} strokeWidth="1.4" strokeLinecap="round">
          <rect x="1" y="2" width="11" height="10" rx="2" fill={solid('#FFFFFF')} fillOpacity={m ? 1 : 0.85} />
          <path d="M12 4 C15 4 15 9 12 9" fill="none" />
        </g>
      );

    return (
      <g className="j-root">
        <g transform={`translate(${HIP[0]} ${HIP[1]})`}>
          {/* legs (behind torso) */}
          {([-8, 8] as const).map((hx, i) => {
            const side = i === 0 ? 'L' : 'R';
            return (
              <g key={side} transform={`translate(${hx} 0)`}>
                <g className={`j-thigh${side}`}>
                  <rect {...bone(THIGH, LEG_W)} {...cloth(clothes.bottom)} />
                  <g transform={`translate(0 ${THIGH})`}>
                    <g className={`j-knee${side}`}>
                      <rect {...bone(SHIN, LEG_W - 0.5)} {...cloth(clothes.bottom)} />
                      <ellipse cx="2.5" cy={SHIN + 3} rx="8" ry="3.8" {...cloth(clothes.shoes, 0.85)} />
                    </g>
                  </g>
                </g>
              </g>
            );
          })}

          <g className="j-torso">
            {/* back hair follows the head but sits behind the body */}
            {!isSilhouette && (
              <g transform={`translate(${NECK[0]} ${NECK[1]})`}>
                <g className="j-head">
                  <g transform="translate(-60 -72)">
                    {HAIR_BACK[hairStyle] && <path d={HAIR_BACK[hairStyle]} {...hairP} />}
                    {hairStyle === 'curly' && (
                      <g {...hairP}>
                        <circle cx="38" cy="48" r="12" />
                        <circle cx="82" cy="48" r="12" />
                        <circle cx="37" cy="64" r="10" />
                        <circle cx="83" cy="64" r="10" />
                        <circle cx="46" cy="24" r="12" />
                        <circle cx="74" cy="24" r="12" />
                        <circle cx="60" cy="20" r="13" />
                      </g>
                    )}
                    {hairStyle === 'updo' && (
                      <g {...hairP}>
                        <circle cx="60" cy="14" r="11" />
                        <ellipse cx="60" cy="34" rx="23" ry="18" />
                      </g>
                    )}
                  </g>
                </g>
              </g>
            )}

            {/* neck + torso */}
            <g transform="translate(-60 -128)">
              <rect x="54" y="62" width="12" height="14" rx="5" {...skinP} />
              <path d={TORSO} {...cloth(clothes.top)} />
              {!isSilhouette && (
                <g stroke={m ? '#FFFFFF' : ink} strokeWidth={SW * 0.6} strokeLinecap="round" strokeLinejoin="round" fill="none">
                  <path d="M50 73 L60 90 L70 73" />
                  <path d="M60 90 L60 128" strokeOpacity={0.55} />
                  <path d="M45 114 Q60 119 75 114" strokeOpacity={0.6} />
                </g>
              )}
            </g>

            {/* left arm */}
            <g transform={`translate(${SHOULDER_L[0]} ${SHOULDER_L[1]})`}>
              <g className="j-shL">
                <rect {...bone(UPPER_ARM, ARM_W)} {...cloth(clothes.top)} />
                <g transform={`translate(0 ${UPPER_ARM})`}>
                  <g className="j-elL">
                    <rect {...bone(FOREARM, ARM_W - 0.5)} {...cloth(clothes.top)} />
                    <circle cx="0" cy={FOREARM + 1.5} r="4.8" {...skinP} />
                    {hasShoppingBag && (
                      <g transform={`translate(-11 ${FOREARM + 2})`} stroke={propInk} strokeWidth="1.5">
                        <path d="M6 5 C6 -2 16 -2 16 5" fill="none" />
                        <rect x="1" y="5" width="20" height="23" rx="2.5" fill={solid('#1E293B')} fillOpacity={m ? 1 : 0.8} />
                      </g>
                    )}
                    {hasGoldKey && !hasShoppingBag && (
                      <g transform={`translate(-4 ${FOREARM + 2})`} stroke={solid('#D4AF37')} strokeWidth="2" fill="none">
                        <circle cx="4" cy="4" r="3.6" />
                        <line x1="4" y1="7.6" x2="4" y2="17" />
                        <line x1="4" y1="13" x2="7.5" y2="13" />
                      </g>
                    )}
                  </g>
                </g>
              </g>
            </g>

            {/* right arm (drink / wave / toast / sign) */}
            <g transform={`translate(${SHOULDER_R[0]} ${SHOULDER_R[1]})`}>
              <g className={`j-shR${holdsDrink ? ' hold' : ''}`}>
                <rect {...bone(UPPER_ARM, ARM_W)} {...cloth(clothes.top)} />
                <g transform={`translate(0 ${UPPER_ARM})`}>
                  <g className={`j-elR${holdsDrink ? ' hold' : ''}`}>
                    <rect {...bone(FOREARM, ARM_W - 0.5)} {...cloth(clothes.top)} />
                    <g transform={`translate(0 ${FOREARM + 1.5})`}>
                      {/* keep the glass upright whatever the arm does */}
                      {handDrink && !isSilhouette && <g className="j-glass">{glass(handDrink)}</g>}
                      {hasBook && (
                        <g className="j-glass" transform="translate(-4 -12)" stroke={propInk} strokeWidth="1.4">
                          <rect x="0" y="0" width="19" height="25" rx="2" fill={solid('#1E293B')} fillOpacity={m ? 1 : 0.85} />
                          {!m && (
                            <>
                              <text x="10.5" y="11" textAnchor="middle" fill="#F3E5C8" stroke="none" fontSize="4.4" fontFamily="serif">
                                BEST
                              </text>
                              <text x="10.5" y="18" textAnchor="middle" fill="#FFFFFF" stroke="none" fontSize="4">
                                {name.slice(0, 4)}
                              </text>
                            </>
                          )}
                        </g>
                      )}
                      <circle cx="0" cy="0" r="5" {...skinP} />
                      {pose === 'toast' && !m && (
                        <g className="j-sparkle" stroke="#F5C451" strokeWidth="1.6" strokeLinecap="round">
                          <line x1="6" y1="-22" x2="9" y2="-27" />
                          <line x1="-2" y1="-24" x2="-2" y2="-30" />
                          <line x1="-9" y1="-21" x2="-12" y2="-26" />
                        </g>
                      )}
                    </g>
                  </g>
                </g>
              </g>
            </g>

            {/* head */}
            <g transform={`translate(${NECK[0]} ${NECK[1]})`}>
              <g className="j-head">
                <g transform="translate(-60 -72)">
                  <ellipse cx="39" cy="45" rx="3.4" ry="5.5" {...skinP} strokeWidth={SW * 0.7} />
                  <ellipse cx="81" cy="45" rx="3.4" ry="5.5" {...skinP} strokeWidth={SW * 0.7} />
                  <ellipse cx={faceCenterX} cy={faceCenterY} rx={faceRadiusX} ry={faceRadiusY} {...skinP} />
                  {!isSilhouette &&
                    (m ? (
                      <ellipse cx={faceCenterX} cy={faceCenterY} rx={faceRadiusX} ry={faceRadiusY} fill="#FFFFFF" />
                    ) : useFacePhoto && facePhoto ? (
                      <g clipPath={`url(#${clipId})`}>
                        <image
                          href={facePhoto}
                          x={imgX}
                          y={imgY}
                          width={imgW}
                          height={imgH}
                          preserveAspectRatio="xMidYMid slice"
                          style={{ filter: photoWarmthFilter || undefined }}
                        />
                      </g>
                    ) : (
                      <g stroke={faceInk} strokeLinecap="round" fill="none">
                        <ellipse cx="48" cy="49" rx="4.2" ry="2.2" fill={skin.blush} fillOpacity="0.5" stroke="none" />
                        <ellipse cx="72" cy="49" rx="4.2" ry="2.2" fill={skin.blush} fillOpacity="0.5" stroke="none" />
                        <g className="j-blink">
                          <path d="M47 42 Q50 39.5 53 42" strokeWidth="2" />
                          <path d="M67 42 Q70 39.5 73 42" strokeWidth="2" />
                          <circle cx="50" cy="42.4" r="1.5" fill={faceInk} stroke="none" />
                          <circle cx="70" cy="42.4" r="1.5" fill={faceInk} stroke="none" />
                        </g>
                        <path d="M46 36.6 Q50 35 54 36.4" stroke={hairColor} strokeWidth="1.6" />
                        <path d="M66 36.4 Q70 35 74 36.6" stroke={hairColor} strokeWidth="1.6" />
                        <path d="M60 44 L59 49 L61 49.6" strokeWidth="1.2" strokeOpacity="0.6" strokeLinejoin="round" />
                        <path
                          d={pose === 'toast' || pose === 'wave' ? 'M54 53.5 Q60 60 66 53.5' : 'M54.5 54 Q60 58.5 65.5 54'}
                          stroke="#8C4A42"
                          strokeWidth="1.8"
                        />
                      </g>
                    ))}
                  <ellipse cx={faceCenterX} cy={faceCenterY} rx={faceRadiusX} ry={faceRadiusY} fill="none" {...pen} />
                  {hasSunglasses && (
                    <g stroke={m ? '#FFFFFF' : faceInk} strokeWidth="1.3">
                      <rect x="44" y="38" width="13.5" height="8" rx="3.5" fill={solid('#111827')} />
                      <rect x="62.5" y="38" width="13.5" height="8" rx="3.5" fill={solid('#111827')} />
                      <line x1="57.5" y1="41" x2="62.5" y2="41" />
                    </g>
                  )}
                  {!isSilhouette && <path d={HAIR_FRONT[hairStyle]} {...hairP} fill={m ? '#FFFFFF' : hairColor} />}
                  {isSilhouette && <path d="M39 36 C40 20 50 14 60 14 C70 14 80 20 81 36" fill="none" {...pen} />}
                </g>
              </g>
            </g>
          </g>
        </g>
      </g>
    );
  };

  return (
    <div className="relative flex flex-col items-center select-none pointer-events-none" style={{ width: size }}>
      {greetingText && (
        <div className="mb-1.5 px-3 py-1 rounded-full bg-white/95 text-[#14171F] text-[11px] font-medium shadow-md border border-black/10 whitespace-nowrap max-w-[170px] truncate">
          {greetingText}
        </div>
      )}

      <div className="relative" style={{ transform: facing === 'left' ? 'scaleX(-1)' : undefined }}>
        <svg
          className={`av-skel pose-${pose}`}
          width={size}
          height={Math.round(size * 1.56)}
          viewBox="0 0 120 188"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label={name}
          style={{ overflow: 'visible' }}
        >
          <defs>
            <clipPath id={clipId}>
              <ellipse cx={faceCenterX} cy={faceCenterY} rx={faceRadiusX} ry={faceRadiusY} />
            </clipPath>
            <mask id={maskId} maskUnits="userSpaceOnUse" x="-40" y="-40" width="200" height="270" style={{ colorInterpolation: 'sRGB' }}>
              {renderFigure(true)}
            </mask>
          </defs>

          {/* soft ground shadow */}
          <ellipse className="j-shadow" cx="60" cy="176" rx="24" ry="5" fill="#0C1018" fillOpacity="0.28" />

          <g mask={`url(#${maskId})`}>{renderFigure(false)}</g>
        </svg>
      </div>

      {showLabel && (
        <div className="mt-0.5 px-2.5 py-0.5 rounded-md bg-black/55 text-white text-[11px] font-medium tracking-tight max-w-[130px] truncate">
          {name}
        </div>
      )}
    </div>
  );
};

export const AvatarRenderer = memo(AvatarRendererInner);
