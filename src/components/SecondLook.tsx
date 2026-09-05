'use client';
import { ChevronRight, ShieldAlert, Sparkles } from 'lucide-react';
import type { RiskAssessment, ScamAnalysis, PolicyResult } from '@/lib/types';
import { RiskDial } from './RiskDial';
import { Button, Card, RISK_TONE, DemoNote } from './ui';
import { inr } from '@/lib/format';

export function SecondLook({
  risk, scam, policy, amount, recipientName, recipientHandle,
  onCancel, onAsk, onVerify, onContinue, busy,
}: {
  risk: RiskAssessment; scam: ScamAnalysis | null; policy: PolicyResult;
  amount: number; recipientName: string; recipientHandle: string;
  onCancel: () => void; onAsk: () => void; onVerify: () => void; onContinue: () => void; busy?: boolean;
}) {
  const tone = RISK_TONE[risk.level];
  const blocked = policy.decision === 'block';
  const needsGuardian = policy.decision === 'guardian_required';
  const positives = risk.factors.filter((f) => f.points > 0);
  const credits = risk.factors.filter((f) => f.points < 0);

  return (
    <div className="relative animate-rise">
      <header className="px-5 pt-5">
        <h1 className="text-[26px] font-extrabold leading-tight text-ink">Second look</h1>
        <p className="mt-1 text-[14px] leading-relaxed text-ink-mute">
          We checked a few things before you pay.
        </p>
      </header>

      <div className="mt-5 flex flex-col items-center px-5">
        <RiskDial score={risk.score} level={risk.level} />
        <p className="mt-3 max-w-[32ch] text-center text-[14px] font-semibold text-ink">{risk.summary}</p>
      </div>

      <Card className="mx-5 mt-5 p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold text-ink">{recipientName}</p>
            <p className="truncate text-[12px] text-ink-faint">{recipientHandle}</p>
          </div>
          <p className="tnum shrink-0 text-[20px] font-extrabold text-ink">{inr(amount)}</p>
        </div>
      </Card>

      <section className="mt-5 px-5">
        <h2 className="text-[13px] font-bold text-ink-mute">What raised the score</h2>
        <ul className="mt-2 space-y-2">
          {positives.map((f) => (
            <li key={f.code} className="flex gap-3 rounded-xl bg-paper-card p-3 shadow-lift">
              <span className={`tnum shrink-0 text-[13px] font-extrabold ${tone.text}`}>+{f.points}</span>
              <span className="min-w-0">
                <span className="block text-[13px] font-bold text-ink">{f.label}</span>
                <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-mute">{f.detail}</span>
              </span>
            </li>
          ))}
          {positives.length === 0 && (
            <li className="rounded-xl bg-calm-wash p-3 text-[13px] font-semibold text-calm">
              Nothing unusual came up.
            </li>
          )}
        </ul>

        {credits.length > 0 && (
          <>
            <h2 className="mt-5 text-[13px] font-bold text-ink-mute">What lowered it</h2>
            <ul className="mt-2 space-y-2">
              {credits.map((f) => (
                <li key={f.code} className="flex gap-3 rounded-xl bg-calm-wash p-3">
                  <span className="tnum shrink-0 text-[13px] font-extrabold text-calm">{f.points}</span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-bold text-ink">{f.label}</span>
                    <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-mute">{f.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {scam && scam.score >= 30 && (
        <section className="mt-5 px-5">
          <Card className="border border-alert/20 p-4">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="text-alert" />
              <h2 className="text-[14px] font-extrabold text-ink">Scam Shield</h2>
              <span className="tnum ml-auto text-[13px] font-extrabold text-alert">{scam.score}/100</span>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-mute">{scam.verdict}</p>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {scam.signals.filter((s) => s.level !== 'none').map((s) => (
                <li key={s.category} className="rounded-full bg-alert-wash px-2.5 py-1 text-[11px] font-bold text-alert">
                  {s.label}
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      <section className="mt-5 px-5">
        <div className={`rounded-xl2 p-4 ${tone.bg}`}>
          <p className={`text-[13px] font-extrabold ${tone.text}`}>What we suggest</p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink">{risk.recommendation}</p>
          {policy.reasons.length > 0 && (
            <ul className="mt-2 space-y-1">
              {policy.reasons.map((r, i) => (
                <li key={i} className="text-[12px] leading-relaxed text-ink-mute">{r}</li>
              ))}
            </ul>
          )}
        </div>
        <DemoNote>
          Recipient reputation figures are synthetic demo data generated for this prototype.
        </DemoNote>
        <div aria-hidden className="h-2" />
      </section>

      {/* Solid, not a gradient: an earlier version used a gradient with no opaque
          stop, so risk factors showed through the gaps between these buttons. */}
      <div className="sticky bottom-[86px] mt-6 space-y-2 bg-paper px-5 pb-5 pt-4
                      before:pointer-events-none before:absolute before:inset-x-0
                      before:-top-6 before:h-6 before:bg-gradient-to-t before:from-paper before:to-transparent">
        {blocked ? (
          <Button variant="outline" className="w-full" size="lg" onClick={onCancel}>
            Back to safety
          </Button>
        ) : (
          <>
            <Button
              variant={risk.level === 'high' ? 'danger' : risk.level === 'medium' ? 'primary' : 'calm'}
              size="lg" className="w-full" onClick={onContinue} disabled={busy}
            >
              {busy ? 'Working…' : needsGuardian ? 'Ask my Guardian' : `Pay ${inr(amount)}`}
              {!busy && <ChevronRight size={17} />}
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={onVerify}>Verify recipient</Button>
              <Button variant="outline" onClick={onAsk}>
                <Sparkles size={15} /> TrustBot
              </Button>
            </div>
            <Button variant="ghost" className="w-full" onClick={onCancel}>Cancel this payment</Button>
          </>
        )}
      </div>
    </div>
  );
}
