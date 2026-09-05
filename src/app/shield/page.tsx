'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { analyseMessage, highlightSegments } from '@/lib/scam-shield';
import { Button, Card, DemoNote, TopBar, inputCls } from '@/components/ui';
import type { ScamAnalysis } from '@/lib/types';

const SAMPLES = [
  "URGENT! Send ₹20,000 immediately. Don't tell anyone. I will explain later.",
  'Your KYC has expired and your account will be blocked today. Share the OTP to reactivate.',
  'Hey, can you send 500 for the cab? Will settle tonight.',
];

export default function ShieldPage() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [result, setResult] = useState<ScamAnalysis | null>(null);

  function check(t: string) {
    setText(t);
    setResult(analyseMessage(t));
  }

  const tone = !result ? '' : result.score >= 60 ? 'text-alert' : result.score >= 30 ? 'text-watch' : 'text-calm';
  const segs = result ? highlightSegments(text, result.flaggedTerms) : [];

  return (
    <div className="animate-fade">
      <TopBar title="Scam Shield" onBack={() => router.back()} />

      <div className="px-5 pt-2">
        <p className="text-[14px] leading-relaxed text-ink-mute">
          Paste a message that is asking you for money. Guardian will tell you which pressure
          tactics it contains — it will not tell you the message is safe to act on.
        </p>

        <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 1200))} rows={5}
          placeholder="Paste the message here" aria-label="Message to check"
          className={`${inputCls} mt-4 h-auto resize-none py-3 leading-relaxed`} />

        <div className="mt-3 flex flex-wrap gap-2">
          {SAMPLES.map((s, i) => (
            <button key={i} onClick={() => check(s)}
              className="rounded-full border border-ink/12 px-3 py-1.5 text-[12px] font-semibold text-ink-mute">
              Example {i + 1}
            </button>
          ))}
        </div>

        <Button size="lg" className="mt-4 w-full" disabled={!text.trim()} onClick={() => check(text)}>
          Check this message
        </Button>

        {result && (
          <div className="mt-5 animate-rise">
            <Card className="p-5">
              <div className="flex items-center gap-2">
                <ShieldAlert size={17} className={tone} />
                <h2 className="text-[15px] font-extrabold text-ink">Result</h2>
                <span className={`tnum ml-auto text-[22px] font-extrabold ${tone}`}>{result.score}/100</span>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-mute">{result.verdict}</p>

              <ul className="mt-4 space-y-2">
                {result.signals.map((s) => (
                  <li key={s.category} className="flex items-center justify-between rounded-xl bg-paper-sink px-3.5 py-2.5">
                    <span className="text-[13px] font-semibold text-ink">{s.label}</span>
                    <span className={`text-[12px] font-extrabold ${
                      s.level === 'high' ? 'text-alert' : s.level === 'medium' ? 'text-watch' : 'text-ink-faint'}`}>
                      {s.level === 'none' ? 'Not found' : s.level.toUpperCase()}
                    </span>
                  </li>
                ))}
              </ul>

              {result.flaggedTerms.length > 0 && (
                <>
                  <h3 className="mt-5 text-[13px] font-extrabold text-ink-mute">What stood out</h3>
                  <p className="mt-2 rounded-xl bg-paper-sink px-3.5 py-3 text-[13px] leading-relaxed text-ink-mute">
                    {segs.map((s, i) => s.flagged
                      ? <mark key={i} className="rounded bg-alert-wash px-1 font-bold text-alert">{s.text}</mark>
                      : <span key={i}>{s.text}</span>)}
                  </p>
                </>
              )}

              {result.score >= 30 && (
                <div className="mt-4 rounded-xl bg-alert-wash p-3.5">
                  <p className="text-[13px] font-extrabold text-alert">Before you pay anything</p>
                  <ul className="mt-1.5 space-y-1 text-[12px] leading-relaxed text-ink">
                    <li>• Call the person on a number you already have, not one in this message.</li>
                    <li>• Nobody legitimate needs your OTP, UPI PIN or password. Ever.</li>
                    <li>• Ask a Guardian to look at it before you send.</li>
                  </ul>
                </div>
              )}
            </Card>
            <DemoNote>
              Scam Shield reads only what you paste. A low score is not a guarantee that a request
              is genuine — it means these particular patterns were not present.
            </DemoNote>
          </div>
        )}
      </div>
      <div className="h-8" />
    </div>
  );
}
