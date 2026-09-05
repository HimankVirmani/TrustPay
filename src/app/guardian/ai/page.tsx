'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Sparkles } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Button, DemoNote, TopBar, inputCls } from '@/components/ui';

const SUGGESTIONS = [
  '🔍 Is this payment safe?',
  '🛡️ Show my risky recipients',
  '💰 How much has Guardian protected?',
  '📋 Explain my latest payment',
  '🚨 What happened to my fraud report?',
];

export default function GuardianAIPage() {
  const store = useStore();
  const router = useRouter();
  const [msgs, setMsgs] = useState<{ role: 'user' | 'ai'; text: string }[]>([{
    role: 'ai',
    text: "I'm TrustBot. I can explain your payments, risk scores and Guardian approvals using your account data. I can't move money or approve anything — that's the policy engine's job, not mine.",
  }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, busy]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setMsgs((m) => [...m, { role: 'user', text }]);
    setInput(''); setBusy(true);
    const snapshot = {
      user: { name: store.user.name, balance: store.user.balance, averagePayment: store.user.averagePayment },
      transactions: store.transactions.slice(0, 20),
      recipients: store.recipients,
      guardians: store.guardians.map((g) => ({ relation: g.relation, name: g.name })),
      reports: store.reports, recoveries: store.recoveries,
      mode: store.mode, travelMode: store.travelMode, userLimit: store.userLimit,
    };
    const res = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, snapshot }),
    }).then((r) => r.json()).catch(() => null);
    setMsgs((m) => [...m, { role: 'ai', text: res?.reply ?? "I couldn't reach my reasoning service. Try again in a moment." }]);
    setBusy(false);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar title="TrustBot" onBack={() => router.back()} />

      <div className="flex-1 space-y-3 px-5 pb-4 pt-2">
        {msgs.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex gap-2'}>
            {m.role === 'ai' && (
              <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brass-wash">
                <Sparkles size={13} className="text-brass" />
              </span>
            )}
            <p className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
              m.role === 'user' ? 'bg-ink text-paper' : 'bg-paper-card text-ink shadow-lift'}`}>
              {m.text}
            </p>
          </div>
        ))}
        {busy && (
          <div className="flex gap-2">
            <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brass-wash">
              <Sparkles size={13} className="text-brass" />
            </span>
            <p className="rounded-2xl bg-paper-card px-3.5 py-2.5 text-[13px] text-ink-faint shadow-lift">
              Checking your account…
            </p>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-[86px] bg-paper px-5 pb-3 pt-2">
        <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => send(s.replace(/^\S+\s/, ''))}
              className="shrink-0 rounded-full border border-ink/12 px-3 py-1.5 text-[12px] font-semibold text-ink-mute">
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send(input)}
            placeholder="Ask about a payment" className={inputCls} aria-label="Message TrustBot" />
          <Button onClick={() => send(input)} disabled={!input.trim() || busy}
            className="shrink-0 px-4" aria-label="Send">
            <Send size={16} />
          </Button>
        </div>
        <DemoNote>
          TrustBot can only read your test data and reply with text. It has no ability to send,
          approve or cancel a payment, or to change the {'\u20B9'}20,000 limit.
        </DemoNote>
      </div>
    </div>
  );
}
