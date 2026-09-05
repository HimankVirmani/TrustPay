'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { Avatar, Empty, RISK_TONE } from '@/components/ui';
import { dayOf, inr, timeOf, signedAmount } from '@/lib/format';
import type { TxnStatus } from '@/lib/types';
import { STATUS_LABEL } from '@/lib/labels';

const FILTERS: { key: string; label: string; match: (s: TxnStatus) => boolean }[] = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'successful', label: 'Successful', match: (s) => s === 'successful' },
  { key: 'protected', label: 'Protected', match: (s) => s === 'protected' || s === 'pending_guardian' },
  { key: 'flagged', label: 'Flagged', match: (s) => s === 'flagged' },
  { key: 'blocked', label: 'Blocked', match: (s) => s === 'blocked' },
  { key: 'recovery', label: 'Recovery', match: (s) => s === 'recovery' },
  { key: 'failed', label: 'Failed', match: (s) => s === 'failed' },
];

export default function ActivityPage() {
  const { transactions, ready } = useStore();
  const [f, setF] = useState('all');
  const filter = FILTERS.find((x) => x.key === f)!;
  const list = transactions.filter((t) => filter.match(t.status));

  if (!ready) return <div className="h-screen" />;

  return (
    <div className="animate-fade">
      <header className="safe-top px-5 pt-5">
        <h1 className="text-[24px] font-extrabold text-ink">Activity</h1>
        <p className="mt-1 text-[13px] text-ink-mute">
          {transactions.length} payments · every one checked before it went out
        </p>
      </header>

      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto px-5 pb-1">
        {FILTERS.map((x) => (
          <button key={x.key} onClick={() => setF(x.key)}
            className={`shrink-0 rounded-full px-3.5 py-2 text-[12px] font-bold ${f === x.key ? 'bg-ink text-paper' : 'border border-ink/12 text-ink-mute'}`}>
            {x.label}
          </button>
        ))}
      </div>

      <div className="mt-4 px-5">
        {list.length === 0 ? (
          <Empty title="Nothing here yet"
            body={`No ${filter.label.toLowerCase()} payments. Make a payment from the Pay tab and it will appear here with its full audit trail.`} />
        ) : (
          <ul className="space-y-2">
            {list.map((t) => {
              const tone = t.risk ? RISK_TONE[t.risk.level] : null;
              const stopped = ['blocked', 'pending_guardian', 'protected'].includes(t.status);
              return (
                <li key={t.id}>
                  <Link href={`/activity/${t.id}`}
                    className="flex items-center gap-3 rounded-xl2 bg-paper-card p-3.5 shadow-lift">
                    <Avatar name={t.recipientName} tone={stopped ? 'alert' : t.status === 'failed' ? 'watch' : 'neutral'} size={42} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-bold text-ink">{t.recipientName}</p>
                      <p className="truncate text-[12px] text-ink-faint">
                        {STATUS_LABEL[t.status]} · {dayOf(t.createdAt)} {timeOf(t.createdAt)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`tnum text-[14px] font-extrabold ${stopped ? 'text-ink-faint line-through'
                        : t.direction === 'credit' ? 'text-calm' : 'text-ink'}`}>
                        {signedAmount(t)}
                      </p>
                      {tone && (
                        <p className={`tnum text-[11px] font-bold ${tone.text}`}>Risk {t.risk!.score}</p>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
