'use client';
import React from 'react';
import clsx from 'clsx';
import type { RiskLevel, RecipientState } from '@/lib/types';
import { initials } from '@/lib/format';
import { ArrowLeft } from 'lucide-react';

export const RISK_TONE: Record<RiskLevel, { text: string; bg: string; ring: string; hex: string; label: string }> = {
  low: { text: 'text-calm', bg: 'bg-calm-wash', ring: 'ring-calm/25', hex: '#17795C', label: 'Low risk' },
  medium: { text: 'text-watch', bg: 'bg-watch-wash', ring: 'ring-watch/25', hex: '#D2830E', label: 'Medium risk' },
  high: { text: 'text-alert', bg: 'bg-alert-wash', ring: 'ring-alert/25', hex: '#B23A2F', label: 'High risk' },
};

export const STATE_TONE: Record<RecipientState, { label: string; cls: string }> = {
  trusted: { label: 'Trusted', cls: 'bg-calm-wash text-calm' },
  known: { label: 'Known', cls: 'bg-ink/5 text-ink-mute' },
  new: { label: 'New', cls: 'bg-watch-wash text-watch' },
  suspicious: { label: 'Suspicious', cls: 'bg-watch-wash text-watch' },
  reported: { label: 'Reported', cls: 'bg-alert-wash text-alert' },
};

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={clsx('rounded-xl2 bg-paper-card shadow-lift', className)}>
      {children}
    </div>
  );
}

export function Button({
  variant = 'primary', size = 'md', className, ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'outline' | 'danger' | 'calm'; size?: 'md' | 'sm' | 'lg';
}) {
  return (
    <button
      {...rest}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
        size === 'lg' && 'h-14 px-6 text-[15px]',
        size === 'md' && 'h-12 px-5 text-[14px]',
        size === 'sm' && 'h-9 px-4 text-[13px]',
        variant === 'primary' && 'bg-ink text-paper hover:bg-ink-soft',
        variant === 'calm' && 'bg-calm text-white hover:bg-calm/90',
        variant === 'danger' && 'bg-alert text-white hover:bg-alert/90',
        variant === 'outline' && 'border border-ink/15 text-ink hover:bg-ink/5',
        variant === 'ghost' && 'text-ink-mute hover:bg-ink/5',
        className,
      )}
    />
  );
}

export function Avatar({ name, tone = 'neutral', size = 44 }: { name: string; tone?: string; size?: number }) {
  const map: Record<string, string> = {
    calm: 'bg-calm-wash text-calm', watch: 'bg-watch-wash text-watch',
    alert: 'bg-alert-wash text-alert', brass: 'bg-brass-wash text-brass',
    neutral: 'bg-ink/6 text-ink-mute',
  };
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.34 }}
      className={clsx('shrink-0 rounded-full grid place-items-center font-bold', map[tone] ?? map.neutral)}
    >
      {initials(name)}
    </div>
  );
}

export function Pill({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold', className)}>
      {children}
    </span>
  );
}

export function Sheet({ open, onClose, children, title }: {
  open: boolean; onClose: () => void; children: React.ReactNode; title?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-ink/45 animate-fade" />
      <div className="relative w-full max-w-[430px] max-h-[88vh] overflow-y-auto no-scrollbar rounded-t-[28px] bg-paper shadow-sheet animate-sheetUp safe-bottom">
        <div className="sticky top-0 bg-paper/95 backdrop-blur px-5 pt-3 pb-2">
          <div className="mx-auto h-1 w-10 rounded-full bg-ink/15" />
          {title && <h2 className="mt-3 text-[17px] font-extrabold text-ink">{title}</h2>}
        </div>
        {/* Extra bottom padding so the last option or button clears the fixed
            bottom navigation, which previously covered them. */}
        <div className="px-5 pb-[104px]">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[13px] font-semibold text-ink-mute">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1.5 text-[12px] text-ink-faint">{hint}</p>}
    </label>
  );
}

export const inputCls =
  'w-full h-12 rounded-xl bg-paper-card border border-ink/12 px-4 text-[15px] text-ink placeholder:text-ink-faint outline-none focus:border-brass';

export function Empty({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl2 border border-dashed border-ink/15 px-5 py-8 text-center">
      <p className="text-[15px] font-bold text-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-[36ch] text-[13px] leading-relaxed text-ink-mute">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function DemoNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">{children}</p>
  );
}

export function TopBar({ title, onBack, right }: { title: string; onBack: () => void; right?: React.ReactNode }) {
  return (
    <div className="safe-top sticky top-0 z-30 flex items-center gap-3 bg-paper/95 px-4 py-3 backdrop-blur">
      <button onClick={onBack} aria-label="Back"
        className="grid h-9 w-9 place-items-center rounded-full hover:bg-ink/5">
        <ArrowLeft size={19} className="text-ink" />
      </button>
      <h1 className="min-w-0 flex-1 truncate text-[16px] font-extrabold text-ink">{title}</h1>
      {right}
    </div>
  );
}
