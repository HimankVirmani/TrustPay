'use client';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, CircleDashed, FileSearch, TriangleAlert } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Button, Card, DemoNote, Empty, TopBar } from '@/components/ui';
import { inr, stamp } from '@/lib/format';
import { RECOVERY_STOP_RULES } from '@/lib/recovery';

export default function RecoveryCasePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const store = useStore();

  if (!store.ready) return <div className="h-screen" />;

  const report = store.reports.find((r) => r.id === id);
  if (!report) return (
    <div>
      <TopBar title="Case" onBack={() => router.push('/activity')} />
      <div className="px-5 pt-4"><Empty title="Case not found" body="This investigation is no longer available." /></div>
    </div>
  );

  const txn = store.transactions.find((t) => t.id === report.transactionId)!;
  const rc = store.recoveries.find((c) => c.transactionId === report.transactionId);

  return (
    <div className="animate-fade">
      <TopBar title="Investigation" onBack={() => router.push(`/activity/${txn.id}`)} />

      <div className="px-5 pt-2">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <FileSearch size={17} className="text-alert" />
            <h2 className="text-[15px] font-extrabold text-ink">AI investigation</h2>
          </div>
          <p className="mt-3 text-[13px] text-ink-mute">
            {inr(txn.amount)} to <span className="font-bold text-ink">{txn.recipientName}</span>
          </p>
          <div className="mt-4 flex items-end gap-2">
            <span className="tnum text-[40px] font-extrabold leading-none text-alert">{report.confidence}%</span>
            <span className="pb-1 text-[13px] font-semibold text-ink-mute">fraud confidence</span>
          </div>
          <h3 className="mt-5 text-[13px] font-extrabold text-ink-mute">What the investigation found</h3>
          <ul className="mt-2 space-y-1.5">
            {report.findings.map((f, i) => (
              <li key={i} className="text-[12px] leading-relaxed text-ink-mute">• {f}</li>
            ))}
          </ul>
          <DemoNote>
            Confidence is computed from the signals listed above, on synthetic data. It is not a
            legal or bank determination of fraud.
          </DemoNote>
        </Card>

        {!rc ? (
          <div className="mt-4">
            <Button size="lg" className="w-full"
              onClick={() => store.openRecovery(txn.id, report.id)}>
              Check recovery eligibility
            </Button>
            <DemoNote>
              UPI transfers are not generally reversible once settled. This models the dispute
              process a payment provider would run, with a simulated outcome.
            </DemoNote>
          </div>
        ) : (
          <>
            <Card className="mt-4 p-5">
              <h2 className="text-[15px] font-extrabold text-ink">Recovery eligibility</h2>
              <p className={`mt-2 inline-block rounded-full px-3 py-1 text-[13px] font-extrabold ${
                rc.eligibility === 'high' ? 'bg-calm-wash text-calm'
                  : rc.eligibility === 'medium' ? 'bg-watch-wash text-watch' : 'bg-alert-wash text-alert'}`}>
                {rc.eligibility.toUpperCase()}
              </p>
              <ul className="mt-4 space-y-2">
                {rc.eligibilityReasons.map((r, i) => (
                  <li key={i} className="flex gap-2 text-[12px] leading-relaxed">
                    <span className={r.ok ? 'text-calm' : 'text-ink-faint'}>{r.ok ? '✓' : '✕'}</span>
                    <span className={r.ok ? 'text-ink-mute' : 'text-ink-faint line-through'}>{r.text}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="mt-3 p-5">
              <h2 className="text-[15px] font-extrabold text-ink">Case progress</h2>
              <ol className="mt-3 space-y-0">
                {rc.timeline.map((e, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brass" />
                      {i < rc.timeline.length - 1 && <span className="w-px flex-1 bg-ink/10" />}
                    </div>
                    <div className="pb-4">
                      <p className="tnum text-[11px] font-bold text-ink-faint">{stamp(e.at)}</p>
                      <p className="text-[13px] font-semibold text-ink">{e.event}</p>
                    </div>
                  </li>
                ))}
              </ol>

              {rc.status === 'recovered' && (
                <div className="flex items-start gap-2 rounded-xl bg-calm-wash p-3.5">
                  <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-calm" />
                  <p className="text-[13px] leading-relaxed text-ink">
                    <span className="font-extrabold">{inr(rc.recoveredAmount)} recovered in simulation.</span>{' '}
                    The amount has been credited back to your test balance.
                  </p>
                </div>
              )}
              {rc.status === 'manual_review' && (
                <div className="flex items-start gap-2 rounded-xl bg-watch-wash p-3.5">
                  <TriangleAlert size={17} className="mt-0.5 shrink-0 text-watch" />
                  <p className="text-[13px] leading-relaxed text-ink">
                    <span className="font-extrabold">Automatic recovery unavailable.</span> The case
                    has been escalated for manual review and your evidence is preserved.
                  </p>
                </div>
              )}
              {rc.status === 'assessing' && (
                <div className="flex items-start gap-2 rounded-xl bg-paper-sink p-3.5">
                  <CircleDashed size={17} className="mt-0.5 shrink-0 text-ink-mute" />
                  <p className="text-[13px] leading-relaxed text-ink-mute">
                    Eligibility assessed. Send the request when you are ready.
                  </p>
                </div>
              )}

              <div className="mt-4 space-y-2">
                {rc.status === 'assessing' && rc.eligibility !== 'ineligible' && (
                  <Button size="lg" className="w-full" onClick={() => store.advanceRecovery(rc.id)}>
                    Request recovery
                  </Button>
                )}
                {rc.status === 'manual_review' && rc.attempts < 2 && (
                  <Button variant="outline" size="lg" className="w-full"
                    onClick={() => store.advanceRecovery(rc.id)}>
                    Try automatic recovery again ({2 - rc.attempts} left)
                  </Button>
                )}
                {['assessing', 'manual_review'].includes(rc.status) && (
                  <Button variant="ghost" className="w-full" onClick={() => store.withdrawRecovery(rc.id)}>
                    Withdraw this request
                  </Button>
                )}
              </div>
            </Card>

            <Card className="mt-3 p-5">
              <h3 className="text-[13px] font-extrabold text-ink">When the workflow stops</h3>
              <ul className="mt-2 space-y-1">
                {RECOVERY_STOP_RULES.map((r) => (
                  <li key={r} className="text-[12px] text-ink-mute">• {r}</li>
                ))}
              </ul>
              <DemoNote>
                Nothing here reverses a real transfer. Recovery outcomes are simulated and
                deterministic so a demo replays the same way each time.
              </DemoNote>
            </Card>
          </>
        )}
      </div>
      <div className="h-8" />
    </div>
  );
}
