'use client';
import { useEffect, useState } from 'react';
import type { RiskLevel } from '@/lib/types';
import { RISK_TONE } from './ui';

/** The one deliberately bold moment in the product. The score counts up and the
 *  arc draws, because the point of Second Look is that the app *paused to think*. */
export function RiskDial({ score, level, size = 168 }: { score: number; level: RiskLevel; size?: number }) {
  const [shown, setShown] = useState(0);
  const tone = RISK_TONE[level];

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setShown(score); return; }
    let raf = 0; const start = performance.now(); const dur = 900;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(score * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const r = size / 2 - 12;
  const circ = 2 * Math.PI * r;
  const sweep = 0.75; // three-quarter dial
  const dash = circ * sweep * (shown / 100);

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-[135deg]" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#12212F" strokeOpacity={0.08}
          strokeWidth={10} strokeLinecap="round" strokeDasharray={`${circ * sweep} ${circ}`} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone.hex}
          strokeWidth={10} strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`tnum text-[44px] font-extrabold leading-none ${tone.text}`}>{shown}</span>
        <span className="mt-1 text-[11px] font-bold tracking-wide text-ink-faint">out of 100</span>
        <span className={`mt-2 rounded-full px-3 py-1 text-[12px] font-bold ${tone.bg} ${tone.text}`}>
          {tone.label}
        </span>
      </div>
    </div>
  );
}
