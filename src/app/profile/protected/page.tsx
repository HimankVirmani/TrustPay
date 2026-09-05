'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { Avatar, Card, DemoNote, Empty, TopBar } from '@/components/ui';
import { dayOf, inr } from '@/lib/format';

export default function ProtectedPage() {
  const store = useStore();
  const router = useRouter();
  if (!store.ready) return <div className="h-screen" />;

  const { total, items } = store.moneyProtected();
  const recovered = store.moneyRecovered();

  return (
    <div className="animate-fade">
      <TopBar title="Money protected" onBack={() => router.push('/profile')} />
      <div className="px-5 pt-2">
        <Card className="p-5 text-center">
          <p className="tnum text-[38px] font-extrabold leading-none text-calm">{inr(total)}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-mute">
            stopped before it left your account, across {items.length} payment{items.length === 1 ? '' : 's'}
          </p>
        </Card>

        <Card className="mt-3 p-4">
          <p className="text-[13px] leading-relaxed text-ink-mute">
            <span className="font-bold text-ink">How this is counted.</span> Only payments Guardian
            actually stopped — blocked by policy, or rejected by a Guardian — before they completed.
            Payments that were flagged and then went through are not counted, because nothing was saved.
          </p>
        </Card>

        {recovered > 0 && (
          <Card className="mt-3 flex items-center justify-between p-4">
            <span className="text-[13px] font-bold text-ink">Money recovered</span>
            <span className="tnum text-[17px] font-extrabold text-calm">{inr(recovered)}</span>
          </Card>
        )}

        <h2 className="mt-6 text-[15px] font-extrabold text-ink">What made up this total</h2>
        <div className="mt-3">
          {items.length === 0 ? (
            <Empty title="Nothing stopped yet"
              body="When Guardian blocks a payment, or one of your Guardians rejects one, it will be listed here." />
          ) : (
            <ul className="space-y-2">
              {items.map((t) => (
                <li key={t.id}>
                  <Link href={`/activity/${t.id}`}
                    className="flex items-center gap-3 rounded-xl2 bg-paper-card p-3.5 shadow-lift">
                    <Avatar name={t.recipientName} tone="alert" size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-bold text-ink">{t.recipientName}</p>
                      <p className="truncate text-[12px] text-ink-faint">
                        {t.guardianOutcome === 'rejected' ? 'Rejected by Guardian' : 'Blocked by policy'} · {dayOf(t.createdAt)}
                      </p>
                    </div>
                    <p className="tnum shrink-0 text-[14px] font-extrabold text-ink">{inr(t.amount)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <DemoNote>Prototype figures based on test transactions.</DemoNote>
      </div>
      <div className="h-8" />
    </div>
  );
}
