'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Copy, FileText, Paperclip, ShieldCheck, TriangleAlert, X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { inr } from '@/lib/format';
import { Button, Card, DemoNote, Field, inputCls } from './ui';
import {
  CONTACT_CHANNELS, FRAUD_CATEGORIES, draftComplaint, evaluateReversal,
  type Complaint, type ComplaintAnswers, type ReversalResult,
} from '@/lib/fraud-case';
import type { Transaction, TxnStatus } from '@/lib/types';

const MIN_DESC = 25;

type Stage = 'q1' | 'q2' | 'q3' | 'q4' | 'working' | 'outcome';

export function FraudReportFlow({ txn, onClose }: { txn: Transaction; onClose: () => void }) {
  const store = useStore();
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('q1');
  const [copied, setCopied] = useState(false);
  const [evidence, setEvidence] = useState<string | null>(null);
  const [evidenceName, setEvidenceName] = useState('');

  const [category, setCategory] = useState('');
  const [howContacted, setHowContacted] = useState('');
  const [whatHappened, setWhatHappened] = useState('');
  const [recipientBlockedMe, setRecipientBlockedMe] = useState<boolean | null>(null);
  const [sharedCredentials, setSharedCredentials] = useState<boolean | null>(null);

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [reversal, setReversal] = useState<ReversalResult | null>(null);

  const recipient = store.recipients.find((r) => r.id === txn.recipientId);
  const account = store.accounts.find((a) => a.id === txn.sourceAccountId) ?? store.accounts[0];

  function submit() {
    const answers: ComplaintAnswers = {
      category, howContacted, whatHappened,
      recipientBlockedMe: !!recipientBlockedMe,
      sharedCredentials: !!sharedCredentials,
      noticedAt: new Date().toLocaleDateString('en-IN',
        { day: '2-digit', month: 'short', year: 'numeric' }),
    };
    setStage('working');

    setTimeout(() => {
      const ref = `TP-${(txn.id.replace(/\D/g, '') || Date.now().toString()).slice(-10)}`;
      const rev = evaluateReversal(txn, recipient, answers);
      const letter = draftComplaint(txn, answers, {
        customerName: store.user.fullName,
        bank: account?.bank ?? 'My Bank',
        accountLast4: account?.last4,
        reference: ref,
      });
      const now = new Date().toISOString();
      const c: Complaint = {
        id: `c_${Date.now()}`,
        transactionId: txn.id,
        createdAt: now,
        answers, letter,
        bank: account?.bank ?? 'My Bank',
        status: rev.outcome === 'reversed' ? 'funds_recovered' : 'under_review',
        reversal: rev,
        timeline: [
          { at: now, event: 'Complaint drafted', detail: `Reference ${ref}` },
          { at: now, event: 'Submitted to bank', detail: account?.bank ?? 'My Bank' },
          ...(rev.outcome === 'reversed'
            ? [{ at: now, event: 'Lien marked on beneficiary account' },
               { at: now, event: 'Funds returned', detail: inr(txn.amount) }]
            : rev.outcome === 'lien_marked'
              ? [{ at: now, event: 'Lien marked on beneficiary account' },
                 { at: now, event: 'Escalated for manual review' }]
              : [{ at: now, event: 'Escalated for manual review' }]),
        ],
      };

      store.addComplaint(c);
      store.set('transactions', store.transactions.map((t) =>
        t.id === txn.id
          ? { ...t, status: (rev.outcome === 'reversed' ? 'recovery' : 'flagged') as TxnStatus }
          : t));

      // A successful reversal creates a visible credit entry in the history
      // rather than editing the original payment, so the record stays honest.
      if (rev.outcome === 'reversed') {
        store.refund(txn, `Fraud reported — ${answers.category}`);
      }

      setComplaint(c);
      setReversal(rev);
      setStage('outcome');
    }, 2200);
  }

  const Header = ({ step, title }: { step: string; title: string }) => (
    <div className="mb-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">{step}</span>
        <button onClick={onClose} aria-label="Close"
          className="grid h-8 w-8 place-items-center rounded-full bg-ink/6">
          <X size={15} className="text-ink-mute" />
        </button>
      </div>
      <h2 className="mt-2 text-[19px] font-extrabold leading-tight text-ink">{title}</h2>
    </div>
  );

  const Choice = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <button onClick={onClick}
      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-[14px] font-semibold transition-colors ${
        active ? 'border-ink bg-ink text-paper' : 'border-ink/12 text-ink'}`}>
      {label}
      {active && <Check size={16} />}
    </button>
  );

  // ------------------------------------------------------------- Questions
  if (stage === 'q1') {
    return (
      <div>
        <Header step="Step 1 of 4" title="What kind of fraud was this?" />
        <ul className="space-y-2">
          {FRAUD_CATEGORIES.map((c) => (
            <li key={c}><Choice label={c} active={category === c} onClick={() => setCategory(c)} /></li>
          ))}
        </ul>
        <Button size="lg" className="mt-5 w-full" disabled={!category} onClick={() => setStage('q2')}>
          Continue <ArrowRight size={16} />
        </Button>
      </div>
    );
  }

  if (stage === 'q2') {
    return (
      <div>
        <Header step="Step 2 of 4" title="How did they first reach you?" />
        <ul className="grid grid-cols-2 gap-2">
          {CONTACT_CHANNELS.map((c) => (
            <li key={c}><Choice label={c} active={howContacted === c} onClick={() => setHowContacted(c)} /></li>
          ))}
        </ul>
        <div className="mt-5 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setStage('q1')}>Back</Button>
          <Button className="flex-1" disabled={!howContacted} onClick={() => setStage('q3')}>Continue</Button>
        </div>
      </div>
    );
  }

  if (stage === 'q3') {
    return (
      <div>
        <Header step="Step 3 of 4" title="What happened, in your own words?" />
        <Field label="Describe the incident">
          <textarea
            value={whatHappened}
            onChange={(e) => setWhatHappened(e.target.value)}
            rows={6}
            maxLength={900}
            placeholder="What were you told, what did you send, and what happened afterwards?"
            className={`${inputCls} resize-none leading-relaxed`}
          />
        </Field>
        <p className="mt-2 text-[12px] text-ink-faint">
          {whatHappened.trim().length < MIN_DESC
            ? `${MIN_DESC - whatHappened.trim().length} more characters. A little detail makes the complaint far harder to dismiss.`
            : 'Good. This goes into the complaint word for word.'}
        </p>
        <div className="mt-4">
          <p className="mb-1.5 text-[12px] font-bold uppercase tracking-wide text-ink-faint">
            Screenshot <span className="font-semibold normal-case tracking-normal">(optional)</span>
          </p>
          {evidence ? (
            <div className="flex items-center gap-3 rounded-xl border border-ink/12 bg-paper-card p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={evidence} alt="Attached evidence"
                className="h-14 w-14 shrink-0 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-ink">{evidenceName}</p>
                <p className="text-[12px] text-ink-faint">Attached to your complaint</p>
              </div>
              <button onClick={() => { setEvidence(null); setEvidenceName(''); }}
                aria-label="Remove screenshot"
                className="grid h-8 w-8 place-items-center rounded-full bg-ink/6">
                <X size={14} className="text-ink-mute" />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed
                              border-ink/20 px-4 py-4 active:bg-ink/5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brass-wash">
                <Paperclip size={17} className="text-brass" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-bold text-ink">Add a screenshot</span>
                <span className="block text-[12px] text-ink-faint">
                  Chat, payment request or profile of the person
                </span>
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setEvidenceName(f.name);
                const reader = new FileReader();
                reader.onload = () => setEvidence(String(reader.result));
                reader.readAsDataURL(f);
              }} />
            </label>
          )}
          <p className="mt-2 text-[12px] leading-relaxed text-ink-faint">
            Stays on your device for this demo. It is listed as an enclosure on the complaint.
          </p>
        </div>

        <div className="mt-5 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setStage('q2')}>Back</Button>
          <Button className="flex-1" disabled={whatHappened.trim().length < MIN_DESC}
            onClick={() => setStage('q4')}>Continue</Button>
        </div>
      </div>
    );
  }

  if (stage === 'q4') {
    return (
      <div>
        <Header step="Step 4 of 4" title="Two last things" />

        <p className="mb-2 text-[13px] font-bold text-ink">
          Did the recipient block you after receiving the money?
        </p>
        <div className="flex gap-2">
          <Choice label="Yes, they blocked me" active={recipientBlockedMe === true}
            onClick={() => setRecipientBlockedMe(true)} />
          <Choice label="No" active={recipientBlockedMe === false}
            onClick={() => setRecipientBlockedMe(false)} />
        </div>

        <p className="mb-2 mt-5 text-[13px] font-bold text-ink">
          Did you share your PIN, OTP or card details?
        </p>
        <div className="flex gap-2">
          <Choice label="Yes" active={sharedCredentials === true}
            onClick={() => setSharedCredentials(true)} />
          <Choice label="No" active={sharedCredentials === false}
            onClick={() => setSharedCredentials(false)} />
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-ink-faint">
          Answer honestly. It changes what your bank can do, and hiding it tends to
          delay a claim rather than help it.
        </p>

        <div className="mt-5 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setStage('q3')}>Back</Button>
          <Button className="flex-1"
            disabled={recipientBlockedMe === null || sharedCredentials === null}
            onClick={submit}>
            <FileText size={16} /> Draft complaint
          </Button>
        </div>
      </div>
    );
  }

  if (stage === 'working') {
    return (
      <div className="py-10 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-[3px] border-ink/12 border-t-brass" />
        <p className="mt-5 text-[15px] font-extrabold text-ink">Preparing your complaint</p>
        <p className="mt-1 text-[13px] text-ink-mute">
          Checking whether the funds can still be held.
        </p>
      </div>
    );
  }

  // --------------------------------------------------------------- Outcome
  const recovered = reversal?.outcome === 'reversed';

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Outcome</span>
        <button onClick={onClose} aria-label="Close"
          className="grid h-8 w-8 place-items-center rounded-full bg-ink/6">
          <X size={15} className="text-ink-mute" />
        </button>
      </div>

      <div className="grid place-items-center pb-2">
        <span className={`grid h-14 w-14 place-items-center rounded-full ${recovered ? 'bg-calm' : 'bg-watch'}`}>
          {recovered ? <ShieldCheck size={26} className="text-white" />
            : <TriangleAlert size={24} className="text-white" />}
        </span>
        <h2 className="mt-3 text-center text-[19px] font-extrabold text-ink">
          {recovered ? `${inr(txn.amount)} returned to your account` : 'Complaint submitted'}
        </h2>
      </div>

      <ul className="mt-4 space-y-1.5">
        {reversal?.checks.map((c) => (
          <li key={c.text} className="flex items-start gap-2.5 text-[13px]">
            <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full ${
              c.ok ? 'bg-calm-wash text-calm' : 'bg-alert-wash text-alert'}`}>
              {c.ok ? <Check size={11} strokeWidth={3} /> : <X size={11} strokeWidth={3} />}
            </span>
            <span className="text-ink-mute">{c.text}</span>
          </li>
        ))}
      </ul>

      <p className="mt-4 rounded-xl bg-paper-sink px-3.5 py-3 text-[12px] leading-relaxed text-ink-mute">
        {reversal?.explanation}
      </p>

      <h3 className="mt-5 text-[13px] font-bold text-ink">Complaint to {complaint?.bank}</h3>
      <Card className="mt-2 max-h-[240px] overflow-y-auto p-3">
        <pre className="whitespace-pre-wrap break-words font-mono text-[10.5px] leading-[1.55] text-ink-mute">
          {complaint?.letter}
        </pre>
      </Card>

      <div className="mt-3 space-y-2">
        <Button variant="outline" className="w-full" onClick={async () => {
          try { await navigator.clipboard.writeText(complaint?.letter ?? ''); setCopied(true); }
          catch { setCopied(false); }
          setTimeout(() => setCopied(false), 2000);
        }}>
          <Copy size={15} /> {copied ? 'Copied' : 'Copy complaint'}
        </Button>
        <Button size="lg" className="w-full" onClick={() => { onClose(); router.push('/profile/complaints'); }}>
          Track this complaint
        </Button>
      </div>

      <DemoNote>
        Simulated dispute outcome. A settled UPI transfer cannot be reversed by the payer —
        in reality the beneficiary bank must mark a lien and a human dispute process follows
        over days. Report real fraud to your bank and on cybercrime.gov.in or 1930.
      </DemoNote>
    </div>
  );
}
