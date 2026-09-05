'use client';
import { useEffect, useState } from 'react';
import { PinPad } from './PinPad';

const UNLOCKED_KEY = 'trustpay.unlocked';

/** Gates the whole app on open. Unlocks per browser session so a demo is not
 *  re-gated on every navigation. */
export function AppLock({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = useState<boolean | null>(null);

  useEffect(() => {
    let unlocked = false;
    try { unlocked = sessionStorage.getItem(UNLOCKED_KEY) === '1'; } catch { /* private mode */ }
    setLocked(!unlocked);
  }, []);

  // Render nothing until we know, so the app never flashes before the lock.
  if (locked === null) return <div className="min-h-[100dvh] bg-ink" />;
  if (!locked) return <>{children}</>;

  return (
    <PinPad
      brand
      title="Enter your app PIN"
      subtitle="TrustPay locks itself every time it opens, so a stolen phone is not a stolen wallet."
      onSuccess={() => {
        try { sessionStorage.setItem(UNLOCKED_KEY, '1'); } catch { /* ignore */ }
        setLocked(false);
      }}
    />
  );
}
