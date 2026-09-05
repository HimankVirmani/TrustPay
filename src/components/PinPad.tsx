'use client';
import { useState } from 'react';
import { Delete, Fingerprint, X } from 'lucide-react';

/**
 * A four-digit entry pad. Demo only: any four digits pass, and the value is
 * never stored, hashed or sent anywhere — it lives in component state and is
 * cleared the moment it has been used. A production build would hand off to the
 * device keystore or a biometric prompt so the credential never reaches app code.
 */
export function PinPad({
  title,
  subtitle,
  brand = false,
  onSuccess,
  onCancel,
}: {
  title: string;
  subtitle?: string;
  brand?: boolean;
  onSuccess: () => void;
  onCancel?: () => void;
}) {
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);

  function push(k: string) {
    if (busy) return;
    if (k === 'del') { setPin((p) => p.slice(0, -1)); return; }
    const next = (pin + k).slice(0, 4);
    setPin(next);
    if (next.length === 4) {
      setBusy(true);
      setTimeout(() => { setPin(''); setBusy(false); onSuccess(); }, 340);
    }
  }

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'bio', '0', 'del'];

  return (
    <div className="safe-top flex min-h-[100dvh] flex-col bg-ink px-6 pb-8 pt-6">
      {onCancel && (
        <button onClick={onCancel} aria-label="Cancel"
          className="grid h-10 w-10 place-items-center rounded-full bg-paper/10 text-paper">
          <X size={18} />
        </button>
      )}

      <div className="flex flex-1 flex-col items-center justify-center">
        {brand && (
          <div className="mb-9 flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/mark.svg" alt="" width={34} height={34} />
            <span className="text-[20px] font-extrabold tracking-tight text-paper">
              Trust<span className="text-brass-lite">Pay</span>
            </span>
          </div>
        )}

        <h1 className="text-[19px] font-extrabold text-paper">{title}</h1>
        {subtitle && (
          <p className="mt-2 max-w-[28ch] text-center text-[13px] leading-relaxed text-paper/45">
            {subtitle}
          </p>
        )}

        <div className="mt-8 flex gap-4">
          {[0, 1, 2, 3].map((i) => (
            <span key={i}
              className={`h-3 w-3 rounded-full transition-all duration-150 ${
                pin.length > i
                  ? 'scale-110 bg-brass'
                  : 'bg-paper/15 ring-1 ring-inset ring-paper/20'}`} />
          ))}
        </div>

        <div className="mt-10 grid w-full max-w-[276px] grid-cols-3 gap-x-5 gap-y-4">
          {keys.map((k) => k === 'bio' ? (
            <button key={k} aria-label="Biometric unlock (not available in demo)"
              className="grid h-[62px] place-items-center rounded-full text-paper/25">
              <Fingerprint size={23} />
            </button>
          ) : (
            <button key={k} onClick={() => push(k)} disabled={busy}
              aria-label={k === 'del' ? 'Delete' : k}
              className={`grid h-[62px] place-items-center rounded-full text-[24px] font-semibold
                          text-paper transition-transform active:scale-95 disabled:opacity-50 ${
                k === 'del' ? '' : 'bg-paper/[0.09] active:bg-paper/20'}`}>
              {k === 'del' ? <Delete size={22} className="text-paper/60" /> : k}
            </button>
          ))}
        </div>
      </div>

      <p className="mx-auto max-w-[34ch] text-center text-[11px] leading-relaxed text-paper/30">
        Demo build — any four digits work. No PIN is stored, hashed or transmitted.
      </p>
    </div>
  );
}
