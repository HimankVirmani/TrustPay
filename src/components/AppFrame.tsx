'use client';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Home, Send, ReceiptText, ShieldCheck, User, Plane, Download, X, ClipboardCheck, Sparkles } from 'lucide-react';
import { useStore } from '@/lib/store';

const TABS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/pay', label: 'Pay', icon: Send },
  { href: '/activity', label: 'Activity', icon: ReceiptText },
  { href: '/guardian', label: 'Guardian', icon: ShieldCheck },
  { href: '/profile', label: 'Profile', icon: User },
];

/**
 * A Guardian's tabs. Approvals replace Pay as the primary action, and Profile
 * is dropped: those are the payer's settings, and a Guardian has no business
 * changing their limit or their Circle.
 */
const GUARDIAN_TABS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/guardian/approvals', label: 'Approvals', icon: ClipboardCheck },
  { href: '/activity', label: 'Activity', icon: ReceiptText },
  { href: '/guardian/ai', label: 'TrustBot', icon: Sparkles },
];

export function AppFrame({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const wide = path?.startsWith('/dashboard');

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // In development the service worker is actively harmful: Next.js serves
    // unhashed chunk URLs like /_next/static/chunks/app/page.js, so a
    // cache-first worker keeps handing back the JavaScript from the first run
    // and edits to the source never appear. Register only in production, and
    // tear down any worker a previous dev session left behind.
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations()
        .then((rs) => rs.forEach((r) => r.unregister()))
        .catch(() => { });
      if (typeof caches !== 'undefined') {
        caches.keys().then((ks) => ks.forEach((k) => caches.delete(k))).catch(() => { });
      }
      return;
    }

    navigator.serviceWorker.register('/sw.js').catch(() => { });
  }, []);

  if (wide) return <div className="min-h-screen bg-paper">{children}</div>;

  return (
    <div className="min-h-screen bg-ink flex justify-center">
      <div className="relative w-full max-w-[430px] bg-paper min-h-screen flex flex-col">
        <TravelBanner />
        <GuardianModeBanner />
        <main className="flex-1 pb-[116px]">{children}</main>
        <InstallPrompt />
        <BottomNav />
      </div>
    </div>
  );
}

function BottomNav() {
  const path = usePathname();
  const { viewAs } = useStore();
  const guardianView = viewAs === 'guardian';
  const tabs = guardianView ? GUARDIAN_TABS : TABS;
  return (
    <nav className="fixed bottom-0 z-40 w-full max-w-[430px] border-t border-ink/8 bg-paper-card/95 backdrop-blur safe-bottom">
      <ul className={guardianView ? 'grid grid-cols-4' : 'grid grid-cols-5'}>
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? path === '/' : path?.startsWith(href);
          return (
            <li key={href}>
              <Link href={href}
                className={clsx('flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold',
                  active ? 'text-ink' : 'text-ink-faint')}>
                <span className="relative">
                  <Icon size={21} strokeWidth={active ? 2.4 : 1.8} />
                  {active && <span className="absolute -bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-brass" />}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function TravelBanner() {
  const { travelMode, travelGuardianId, guardians, viewAs, set, ready } = useStore();
  const router = useRouter();
  // While viewing as a Guardian the dark role banner already says who you are;
  // stacking a second banner on top just eats the screen.
  if (!ready || !travelMode || viewAs === 'guardian') return null;
  const g = guardians.find((x) => x.id === travelGuardianId);
  return (
    <div className="safe-top flex items-center justify-between gap-2 bg-brass px-4 py-2 text-[12px] font-bold text-white">
      <span className="min-w-0 truncate">
        <Plane size={13} className="mr-1.5 inline -translate-y-px" />
        Travel Protection on{g ? ` — ${g.relation} is watching` : ''}
      </span>
      {g && (
        <button
          className="shrink-0 rounded-full bg-white/20 px-3 py-1"
          onClick={() => {
            set('viewAs', 'guardian');
            set('activeGuardianId', g.id);
            router.push('/');
          }}
        >
          Switch to {g.relation}
        </button>
      )}
    </div>
  );
}

function GuardianModeBanner() {
  const { viewAs, guardians, activeGuardianId, set, ready } = useStore();
  const router = useRouter();
  if (!ready || viewAs !== 'guardian') return null;
  const g = guardians.find((x) => x.id === activeGuardianId);
  return (
    <div className="safe-top flex items-center justify-between bg-ink px-4 py-2 text-[12px] font-bold text-paper">
      <span className="min-w-0 truncate">
        Viewing as {g?.relation ?? 'Guardian'} — {g?.name}
      </span>
      <button
        className="shrink-0 rounded-full bg-paper/15 px-3 py-1"
        onClick={() => { set('viewAs', 'user'); router.push('/'); }}
      >
        Back to my view
      </button>
    </div>
  );
}

/** The install banner appears on the home screen and nowhere else. Anywhere
 *  deeper the user is mid-task — paying, or reading why a payment was scored —
 *  and a floating bar both interrupts them and covers the text they are
 *  reading. An install prompt is never worth that. */
const INSTALL_PROMPT_PATHS = ['/'];

function InstallPrompt() {
  const pathname = usePathname();
  const [deferred, setDeferred] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const [manual, setManual] = useState(false);
  const canPrompt = INSTALL_PROMPT_PATHS.includes(pathname);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone;
    if (standalone || sessionStorage.getItem('trustpay.install.dismissed')) return;
    const handler = (e: Event) => { e.preventDefault(); setDeferred(e); setVisible(true); };
    window.addEventListener('beforeinstallprompt', handler);
    // iOS Safari never fires the event; offer instructions instead.
    const t = setTimeout(() => setVisible(true), 2500);
    return () => { window.removeEventListener('beforeinstallprompt', handler); clearTimeout(t); };
  }, []);

  const dismiss = () => { sessionStorage.setItem('trustpay.install.dismissed', '1'); setVisible(false); };

  if (!visible || !canPrompt) return null;

  return (
    <div className="fixed bottom-[92px] z-40 w-full max-w-[430px] px-4 animate-rise">
      <div className="flex items-center gap-3 rounded-2xl bg-ink px-4 py-3 shadow-lift">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brass/20 text-brass-lite">
          <Download size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-paper">Install TrustPay</p>
          <p className="truncate text-[11px] text-paper/60">
            {manual ? 'Share → Add to Home Screen' : 'Keep it on your home screen'}
          </p>
        </div>
        <button
          onClick={async () => {
            if (deferred) { deferred.prompt(); await deferred.userChoice; dismiss(); }
            else setManual(true);
          }}
          className="rounded-full bg-brass px-4 py-2 text-[12px] font-bold text-white"
        >
          {manual ? 'Got it' : 'Install'}
        </button>
        <button onClick={dismiss} aria-label="Dismiss" className="text-paper/50"><X size={16} /></button>
      </div>
    </div>
  );
}
