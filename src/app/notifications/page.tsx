'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Ban, ChevronRight, Clock, LifeBuoy, ShieldCheck } from 'lucide-react';
import { useStore } from '@/lib/store';
import { dayOf } from '@/lib/format';
import { Card, DemoNote, Empty, TopBar } from '@/components/ui';

const ICON = {
  approval: { icon: Clock, cls: 'bg-brass-wash text-brass' },
  blocked: { icon: Ban, cls: 'bg-alert-wash text-alert' },
  recovery: { icon: LifeBuoy, cls: 'bg-watch-wash text-watch' },
  protected: { icon: ShieldCheck, cls: 'bg-calm-wash text-calm' },
  info: { icon: ShieldCheck, cls: 'bg-ink/8 text-ink-mute' },
} as const;

export default function NotificationsPage() {
  const { notifications, markNotificationsRead, ready } = useStore();
  const router = useRouter();
  const items = notifications();

  // Opening the screen is what marks them read.
  useEffect(() => { if (ready) markNotificationsRead(); }, [ready, markNotificationsRead]);

  if (!ready) return <div className="h-screen" />;

  return (
    <div className="animate-rise">
      <TopBar title="Notifications" onBack={() => router.back()} />

      <div className="px-5">
        {items.length === 0 ? (
          <Empty
            title="Nothing needs you right now"
            body="Guardian will tell you here when a payment is stopped, a Guardian is waiting, or a recovery case moves."
          />
        ) : (
          <ul className="space-y-2">
            {items.map((n) => {
              const { icon: Icon, cls } = ICON[n.kind] ?? ICON.info;
              const body = (
                <Card className={`flex items-center gap-3 p-4 ${n.read ? '' : 'ring-1 ring-brass/25'}`}>
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${cls}`}>
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[14px] font-extrabold text-ink">{n.title}</span>
                      {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brass" />}
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-mute">{n.body}</span>
                    <span className="mt-1 block text-[11px] text-ink-faint">{dayOf(n.at)}</span>
                  </span>
                  {n.href && <ChevronRight size={17} className="shrink-0 text-ink-faint" />}
                </Card>
              );
              return (
                <li key={n.id}>
                  {n.href ? <Link href={n.href}>{body}</Link> : body}
                </li>
              );
            })}
          </ul>
        )}

        <DemoNote>
          Alerts are derived from your actual activity, so this list can never disagree with what
          happened. In production, Guardian requests would also push to your Guardian&apos;s own phone.
        </DemoNote>
      </div>
    </div>
  );
}
