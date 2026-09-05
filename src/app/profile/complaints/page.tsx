'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Copy, FileText } from 'lucide-react';
import { useStore } from '@/lib/store';
import { inr, dayOf } from '@/lib/format';
import { Card, DemoNote, Empty, TopBar } from '@/components/ui';
import { STATUS_COPY } from '@/lib/fraud-case';

export default function ComplaintsPage() {
  const { complaints, transactions, ready } = useStore();
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [copied, setCopied] = useState('');

  if (!ready) return <div className="h-screen" />;

  return (
    <div className="animate-rise">
      <TopBar title="Fraud complaints" onBack={() => router.back()} />

      <div className="px-5">
        {complaints.length === 0 ? (
          <Empty
            title="No complaints filed"
            body="If a payment turns out to be fraud, open it from your transaction history and choose Report fraud. TrustPay will draft the complaint for you."
          />
        ) : (
          <ul className="space-y-3">
            {complaints.map((c) => {
              const t = transactions.find((x) => x.id === c.transactionId);
              const st = STATUS_COPY[c.status];
              const expanded = open === c.id;
              return (
                <li key={c.id}>
                  <Card className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-extrabold text-ink">
                          {t?.recipientName ?? 'Payment'}
                        </p>
                        <p className="tnum text-[12px] text-ink-faint">
                          {inr(c.reversal?.amount ?? t?.amount ?? 0)} · {dayOf(c.createdAt)}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${st.tone}`}>
                        {st.label}
                      </span>
                    </div>

                    <p className="mt-2 text-[12px] text-ink-mute">
                      {c.answers.category} · filed with {c.bank}
                    </p>

                    <ol className="mt-3 space-y-1.5 border-l border-ink/10 pl-3">
                      {c.timeline.map((e, i) => (
                        <li key={i} className="text-[12px]">
                          <span className="font-bold text-ink">{e.event}</span>
                          {e.detail && <span className="text-ink-faint"> · {e.detail}</span>}
                        </li>
                      ))}
                    </ol>

                    <button
                      onClick={() => setOpen(expanded ? null : c.id)}
                      className="mt-3 flex items-center gap-1.5 text-[12px] font-bold text-brass"
                    >
                      <FileText size={14} />
                      {expanded ? 'Hide complaint letter' : 'View complaint letter'}
                      {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>

                    {expanded && (
                      <>
                        <div className="mt-2 max-h-[300px] overflow-y-auto rounded-xl bg-paper-sink p-3">
                          <pre className="whitespace-pre-wrap break-words font-mono text-[10.5px] leading-[1.55] text-ink-mute">
                            {c.letter}
                          </pre>
                        </div>
                        <button
                          onClick={async () => {
                            try { await navigator.clipboard.writeText(c.letter); setCopied(c.id); }
                            catch { /* clipboard unavailable */ }
                            setTimeout(() => setCopied(''), 2000);
                          }}
                          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl
                                     border border-ink/12 py-2.5 text-[12px] font-bold text-ink"
                        >
                          <Copy size={14} /> {copied === c.id ? 'Copied' : 'Copy letter'}
                        </button>
                      </>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}

        <DemoNote>
          Complaint statuses are simulated for this prototype. For real fraud, contact your
          bank immediately and file at cybercrime.gov.in or call 1930.
        </DemoNote>
      </div>
    </div>
  );
}
