'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Ban, Check, FileWarning, ShieldCheck, Paperclip, Sparkles, TriangleAlert } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Avatar, Button, Card, DemoNote, Empty, Field, RISK_TONE, Sheet, TopBar, inputCls } from '@/components/ui';
import { inr, stamp, dayOf } from '@/lib/format';
import { STATUS_LABEL } from '@/lib/labels';
import type { FraudReport } from '@/lib/types';
import { purposeById } from '@/lib/accounts';
import { FraudReportFlow } from '@/components/FraudReportFlow';

const CATEGORIES = ['Fraudulent recipient', 'Social engineering', 'Unauthorised payment',
  'Wrong recipient', 'Suspicious request', 'Other'];

export default function TransactionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const store = useStore();
  const [reporting, setReporting] = useState(false);
  const [showScoring, setShowScoring] = useState(false);
  const [cat, setCat] = useState(CATEGORIES[0]);
  const [desc, setDesc] = useState('');
  const [evidence, setEvidence] = useState<string | null>(null);

  const t = store.transactions.find((x) => x.id === id);
  if (!store.ready) return <div className="h-screen" />;
  if (!t) return (
    <div>
      <TopBar title="Payment" onBack={() => router.push('/activity')} />
      <div className="px-5 pt-4">
        <Empty title="Payment not found" body="This payment is no longer in your activity." />
      </div>
    </div>
  );

  const tone = t.risk ? RISK_TONE[t.risk.level] : null;
  const sourceAccount = store.accounts.find((a) => a.id === t.sourceAccountId);
  /** Internal ids look like t_1788562019248; show something a person could read
   *  out over the phone to support instead. */
  const paymentRef = `TP-${(t.id.replace(/\D/g, '') || Date.now().toString()).slice(-10)}`;
  /** Biggest movers first, positives before credits, capped at three. */
  const topFactors = [...(t.risk?.factors ?? [])]
    .sort((a, b) => Math.abs(b.points) - Math.abs(a.points))
    .sort((a, b) => (b.points > 0 ? 1 : 0) - (a.points > 0 ? 1 : 0))
    .slice(0, 3);
  const report = store.reports.find((r) => r.id === t.fraudReportId);
  const recovery = store.recoveries.find((c) => c.id === t.recoveryCaseId);
  const canReport = t.status === 'successful' && !t.fraudReportId;

  function submitReport() {
    const recipient = store.recipients.find((r) => r.id === t!.recipientId);
    // Investigation confidence is derived from observable signals, not invented.
    const signals: { ok: boolean; text: string; weight: number }[] = [
      { ok: (recipient?.reportCount ?? 0) > 0, weight: 26, text: `Recipient carries ${recipient?.reportCount ?? 0} prior report(s) in demo data` },
      { ok: (t!.risk?.score ?? 0) >= 50, weight: 22, text: `Payment scored ${t!.risk?.score ?? 0}/100 at the time it was sent` },
      { ok: (recipient?.accountAgeDays ?? 999) < 60, weight: 18, text: 'Recipient account is recently created' },
      { ok: (recipient?.trustScore ?? 100) < 45, weight: 16, text: 'Recipient trust score is low' },
      { ok: /urgent|immediately|secret|otp|pin|don't tell/i.test(t!.note ?? ''), weight: 12, text: 'Social-engineering language found in the payment message' },
      { ok: !!recipient?.recentSuspiciousActivity, weight: 14, text: 'Recipient shows an unusual pattern of incoming payments' },
    ];
    const confidence = Math.min(97, Math.max(12,
      signals.filter((s) => s.ok).reduce((a, s) => a + s.weight, 0)));

    const r: FraudReport = {
      id: `fr_${Date.now()}`, transactionId: t!.id, category: cat, description: desc,
      evidenceName: evidence ?? undefined, createdAt: new Date().toISOString(),
      confidence, findings: signals.filter((s) => s.ok).map((s) => s.text),
      status: 'complete',
    };
    store.fileReport(r);
    setReporting(false);
    setTimeout(() => router.push(`/guardian/case/${r.id}`), 400);
  }

  return (
    <div className="animate-fade">
      <TopBar title="Payment details" onBack={() => router.push('/activity')} />

      <div className="px-5 pt-2">
        <div className="grid place-items-center pb-1">
          <span className={`grid h-16 w-16 place-items-center rounded-full ${
            t.status === 'successful' ? 'bg-calm'
              : t.status === 'failed' ? 'bg-watch' : 'bg-alert'}`}>
            {t.status === 'successful'
              ? <Check size={30} className="text-white" strokeWidth={3} />
              : t.status === 'failed'
                ? <TriangleAlert size={26} className="text-white" />
                : <Ban size={26} className="text-white" />}
          </span>
          <h2 className="mt-3 text-[19px] font-extrabold text-ink">
            {t.status === 'successful' ? 'Payment successful' : STATUS_LABEL[t.status]}
          </h2>
        </div>

        <Card className="p-5">
          <p className="tnum text-center text-[30px] font-extrabold text-ink">{inr(t.amount)}</p>

          <div className="mt-4 flex flex-col items-center">
            <Avatar name={t.recipientName} tone={t.status === 'blocked' ? 'alert' : 'neutral'} size={46} />
            <p className="mt-2 text-[15px] font-bold text-ink">{t.recipientName}</p>
            <p className="text-[12px] text-ink-faint">{t.recipientHandle}</p>
            <span className={`mt-3 inline-block rounded-full px-3 py-1 text-[12px] font-bold ${
              t.status === 'successful' ? 'bg-calm-wash text-calm'
                : t.status === 'failed' ? 'bg-watch-wash text-watch' : 'bg-alert-wash text-alert'}`}>
              {STATUS_LABEL[t.status]}
            </span>
          </div>

          <dl className="mt-5 space-y-2.5 border-t border-ink/8 pt-4 text-[13px]">
            <Row label="Date & time" value={`${dayOf(t.createdAt)}, ${stamp(t.createdAt)}`} />
            <Row label="Payment ID" value={paymentRef} mono />
            <Row label="Method" value={t.rail.toUpperCase()} />
            {purposeById(t.purposeId)?.label && t.purposeId !== 'p_none' && (
              <Row label="Purpose" value={purposeById(t.purposeId)!.label} />
            )}
            {sourceAccount && (
              <Row label="Paid from" value={`${sourceAccount.bank} \u2022\u2022\u2022\u2022 ${sourceAccount.last4}`} />
            )}
          </dl>

          {t.note && <p className="mt-4 rounded-xl bg-paper-sink px-3 py-2 text-[13px] text-ink-mute">&ldquo;{t.note}&rdquo;</p>}
          {t.failureReason && <p className="mt-3 text-[13px] text-watch">{t.failureReason}</p>}
        </Card>
      </div>

      {t.risk && tone && (
        <section className="mt-5 px-5">
          <h2 className="text-[15px] font-extrabold text-ink">Why Guardian scored this</h2>
          <Card className="mt-3 p-4">
            <div className="flex items-center justify-between">
              <span className={`rounded-full px-3 py-1 text-[12px] font-bold ${tone.bg} ${tone.text}`}>{tone.label}</span>
              <span className={`tnum text-[22px] font-extrabold ${tone.text}`}>{t.risk.score}/100</span>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-mute">{t.risk.summary}</p>

            {/* The three signals that moved the score most, in plain words. The
                point arithmetic is still available, just not shouted at someone
                who only wants to know why they were interrupted. */}
            <ul className="mt-3 space-y-2">
              {topFactors.map((f) => (
                <li key={f.code} className="flex gap-2.5">
                  <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                    f.points > 0 ? 'bg-current' : 'bg-calm'} ${f.points > 0 ? tone.text : ''}`} />
                  <span className="text-[13px] leading-relaxed text-ink-mute">
                    <span className="font-bold text-ink">{f.label}.</span> {f.detail}
                  </span>
                </li>
              ))}
            </ul>

            {t.risk.factors.length > 0 && (
              <>
                <button
                  onClick={() => setShowScoring((v) => !v)}
                  className="mt-3 text-[12px] font-bold text-brass"
                >
                  {showScoring ? 'Hide scoring detail' : 'Show scoring detail'}
                </button>
                {showScoring && (
                  <ul className="mt-2 space-y-1.5 border-t border-ink/8 pt-3">
                    {t.risk.factors.map((f) => (
                      <li key={f.code} className="flex gap-2.5 text-[12px]">
                        <span className={`tnum shrink-0 font-extrabold ${f.points > 0 ? tone.text : 'text-calm'}`}>
                          {f.points > 0 ? `+${f.points}` : f.points}
                        </span>
                        <span className="text-ink-mute">
                          <span className="font-bold text-ink">{f.label}.</span> {f.detail}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </Card>
        </section>
      )}

      <section className="mt-5 px-5">
        <h2 className="text-[15px] font-extrabold text-ink">Audit trail</h2>
        <p className="mt-1 text-[12px] text-ink-faint">Every decision, in order, with a timestamp.</p>
        <ol className="mt-3 space-y-0">
          {t.audit.map((e, i) => (
            <li key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${actorTone(e.actor)}`} />
                {i < t.audit.length - 1 && <span className="w-px flex-1 bg-ink/10" />}
              </div>
              <div className="pb-4">
                <p className="tnum text-[11px] font-bold text-ink-faint">{stamp(e.at)}</p>
                <p className="text-[13px] font-semibold text-ink">{e.event}</p>
                {e.detail && <p className="mt-0.5 text-[12px] leading-relaxed text-ink-mute">{e.detail}</p>}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {report && (
        <section className="mt-1 px-5">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <FileWarning size={16} className="text-alert" />
              <h2 className="text-[14px] font-extrabold text-ink">Investigation</h2>
              <span className="tnum ml-auto text-[15px] font-extrabold text-alert">{report.confidence}%</span>
            </div>
            <p className="mt-1 text-[12px] text-ink-faint">Fraud confidence · {report.category}</p>
            <ul className="mt-3 space-y-1.5">
              {report.findings.map((f, i) => (
                <li key={i} className="text-[12px] leading-relaxed text-ink-mute">• {f}</li>
              ))}
            </ul>
            <Button variant="outline" className="mt-4 w-full"
              onClick={() => router.push(`/guardian/case/${report.id}`)}>
              {recovery ? 'View recovery case' : 'Open recovery'}
            </Button>
          </Card>
        </section>
      )}

      <div className="mt-6 space-y-2 px-5 pb-8">
        {canReport && (
          <Button variant="danger" size="lg" className="w-full" onClick={() => setReporting(true)}>
            <FileWarning size={17} /> Report fraud
          </Button>
        )}
        <Button variant="outline" size="lg" className="w-full" onClick={() => router.push('/guardian/ai')}>
          <Sparkles size={16} /> Ask TrustBot about this
        </Button>
        <div className="flex items-start gap-2 pt-2">
          <ShieldCheck size={15} className="mt-0.5 shrink-0 text-calm" />
          <DemoNote>
            Prototype record. No real money moved and no real recipient exists.
          </DemoNote>
        </div>
      </div>

      <Sheet open={reporting} onClose={() => setReporting(false)} title="">
        <FraudReportFlow txn={t} onClose={() => setReporting(false)} />
      </Sheet>
    </div>
  );
}

function actorTone(a: string) {
  return ({
    user: 'bg-ink', system: 'bg-ink-faint', risk_engine: 'bg-watch',
    policy_engine: 'bg-brass', guardian: 'bg-alert', adapter: 'bg-calm', ai: 'bg-brass',
  } as Record<string, string>)[a] ?? 'bg-ink-faint';
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-[12px] text-ink-faint">{label}</dt>
      <dd className={`min-w-0 truncate text-right text-[13px] font-semibold text-ink ${mono ? 'tnum' : ''}`}>
        {value}
      </dd>
    </div>
  );
}
