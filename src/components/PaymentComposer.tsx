'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, Check, CheckCircle2, ChevronRight, Clock, Delete, Landmark, Loader2, RotateCw, Share2, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useStore } from '@/lib/store';
import { decisionText } from '@/lib/labels';
import { HARD_LIMIT_INR, DEFAULT_LIMIT_INR, GATEWAY_WINDOW_S } from '@/lib/constants';
import { PURPOSES, purposeById } from '@/lib/accounts';
import { inr } from '@/lib/format';
import type { PaymentRail, Recipient, RiskAssessment, PolicyResult, ScamAnalysis, Transaction } from '@/lib/types';
import { Avatar, Button, Card, DemoNote, Field, Sheet, inputCls, STATE_TONE } from './ui';
import { SecondLook } from './SecondLook';
import { SafetyCheck } from './SafetyCheck';

type Step = 'amount' | 'analysing' | 'review' | 'auth' | 'verifying_pin' | 'pin_verified'
  | 'safety_check' | 'guardian_sent' | 'processing' | 'result';

export function PaymentComposer({
  rail, recipient, recipientName, recipientHandle, lockedAmount, subtitle, onExit,
  initialAmount, initialNote,
}: {
  rail: PaymentRail;
  recipient?: Recipient | null;
  recipientName: string;
  recipientHandle: string;
  lockedAmount?: number;
  subtitle?: string;
  initialAmount?: number;
  initialNote?: string;
  onExit: () => void;
}) {
  const store = useStore();
  const router = useRouter();
  const [step, setStep] = useState<Step>('amount');
  const [amountStr, setAmountStr] = useState(
    lockedAmount ? String(lockedAmount) : initialAmount ? String(initialAmount) : '');
  const [note, setNote] = useState(initialNote ?? '');
  const [risk, setRisk] = useState<RiskAssessment | null>(null);
  const [policy, setPolicy] = useState<PolicyResult | null>(null);
  const [scam, setScam] = useState<ScamAnalysis | null>(null);
  const [pin, setPin] = useState('');
  const [purposeId, setPurposeId] = useState('p_none');
  const [purposeOpen, setPurposeOpen] = useState(false);
  const [sourceId, setSourceId] = useState(store.activeAccountId);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [pinError, setPinError] = useState('');
  const [checks, setChecks] = useState(0);
  const [shared, setShared] = useState('');
  const [txnId, setTxnId] = useState('');
  const [result, setResult] = useState<{ ok: boolean; reason?: string; reference?: string; retryable?: boolean } | null>(null);
  const [forceFailure, setForceFailure] = useState(false);
  /** Real UPI collect requests expire. The window opens when the user commits to
   *  an amount and closes 120s later; if it lapses the payment fails the same
   *  way a gateway timeout does, rather than sitting there indefinitely. */
  const [deadline, setDeadline] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(GATEWAY_WINDOW_S);

  const amount = Number(amountStr || 0);
  const source = store.accounts.find((a) => a.id === sourceId) ?? store.accounts[0];
  const insufficient = amount > 0 && !!source && amount > source.balance;
  const effectiveLimit = Math.min(store.userLimit ?? DEFAULT_LIMIT_INR, HARD_LIMIT_INR);
  const overLimit = amount > effectiveLimit;
  const overOwnLimit = amount > effectiveLimit && amount <= HARD_LIMIT_INR;
  const validAmount = amount > 0 && !overLimit;

  const payload = useCallback(() => ({
    amount, note, rail, recipient: recipient ?? null,
    recipientName, recipientHandle,
    userAveragePayment: store.user.averagePayment,
    recentTransactions: store.transactions.slice(0, 30),
    mode: store.mode, travelMode: store.travelMode,
    travelGuardianId: store.travelGuardianId, guardians: store.guardians,
    purposeId, userLimit: store.userLimit,
  }), [amount, note, rail, recipient, recipientName, recipientHandle, store, purposeId]);

  async function analyse() {
    if (!validAmount) return;
    setStep('analysing');
    const res = await fetch('/api/risk/assess', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload()),
    }).then((r) => r.json()).catch(() => null);
    if (!res) { setStep('amount'); return; }
    setRisk(res.risk); setPolicy(res.policy); setScam(res.scam);
    setTxnId(`t_${Date.now()}`);
    setTimeout(() => {
      // The authorisation window opens once the user sees the verdict.
      setDeadline(Date.now() + GATEWAY_WINDOW_S * 1000);
      setRemaining(GATEWAY_WINDOW_S);
      setStep('review');
    }, 550);
  }

  /** Records a stopped payment so it counts toward Money protected. */
  function recordStopped(status: Transaction['status'], extra?: Partial<Transaction>) {
    const now = new Date().toISOString();
    store.addTransaction({
      id: txnId || `t_${Date.now()}`, rail, recipientId: recipient?.id,
      recipientName, recipientHandle, amount, note, createdAt: now,
      status, risk: risk ?? undefined, policy: policy ?? undefined,
      purposeId, sourceAccountId: sourceId,
      audit: [
        { at: now, event: 'Payment initiated', actor: 'user' },
        { at: now, event: 'Recipient identified', actor: 'system', detail: recipientName },
        { at: now, event: `Risk engine executed — score ${risk?.score} (${risk?.level})`, actor: 'risk_engine' },
        { at: now, event: `Policy decision: ${decisionText(policy?.decision)}`, actor: 'policy_engine', detail: policy?.reasons.join(' ') },
      ],
      ...extra,
    });
  }

  function continueFromReview() {
    if (!policy) return;
    if (policy.decision === 'guardian_required') {
      const gid = policy.requiredGuardianId ?? store.guardians[0]?.id;
      recordStopped('pending_guardian');
      store.requestApproval(txnId, gid);
      setStep('guardian_sent');
      return;
    }
    setStep('auth');
  }

  async function execute(approvalToken?: string) {
    setDeadline(null);
    setStep('processing');
    const res = await fetch('/api/payments/execute', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload(), txnId, approvalToken, forceFailure }),
    }).then((r) => r.json()).catch(() => ({ ok: false, reason: 'Network error.', retryable: true }));

    const now = new Date().toISOString();
    if (res.ok) {
      store.addTransaction({
        id: txnId, rail, recipientId: recipient?.id, recipientName, recipientHandle,
        amount, note, createdAt: now, status: 'successful',
        purposeId, sourceAccountId: sourceId,
        risk: res.risk, policy: res.policy, audit: res.audit ?? [],
      });
      if (recipient) {
        store.upsertRecipient({
          ...recipient,
          paymentsFromUser: recipient.paymentsFromUser + 1,
          lastPaidAt: now,
          state: recipient.state === 'new' ? 'known' : recipient.state,
        });
      }
      store.debitAccount(sourceId, amount);
    } else {
      store.addTransaction({
        id: txnId, rail, recipientId: recipient?.id, recipientName, recipientHandle,
        amount, note, createdAt: now, purposeId, sourceAccountId: sourceId,
        status: res.stage === 'gateway' ? 'failed' : 'blocked',
        risk: res.risk, policy: res.policy, failureReason: res.reason, audit: res.audit ?? [],
      });
    }
    setResult(res);
    setStep('result');
  }

  useEffect(() => {
    if (deadline === null) return;
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        clearInterval(id);
        setDeadline(null);
        setExpired();
      }
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline]);

  /** The window lapsed. Treated exactly like a gateway timeout: no money moved,
   *  balance unchanged, and the attempt is recorded so it shows up in history. */
  function setExpired() {
    setPin('');
    setResult({
      ok: false,
      retryable: true,
      reason: 'The payment window closed before this was authorised. No money left your account.',
    });
    const now = new Date().toISOString();
    store.addTransaction({
      id: txnId, rail, recipientId: recipient?.id, recipientName, recipientHandle,
      amount, note, createdAt: now, status: 'failed', purposeId, sourceAccountId: sourceId,
      risk: risk ?? undefined, policy: policy ?? undefined,
      failureReason: 'Payment window expired before authorisation.',
      audit: [{ at: now, event: 'Payment window expired', actor: 'system',
                detail: `No authorisation within ${GATEWAY_WINDOW_S}s` }],
    });
    setStep('result');
  }

  /**
   * Test-mode authorisation. Any four digits pass — the point of this sequence
   * is the visible state machine (verifying, verified, then safety checks), not
   * a credential test. No PIN is stored, hashed or sent anywhere: `pin` lives in
   * component state and is cleared the moment it has been used.
   */
  function verifyPin(entered: string) {
    if (entered.length !== 4) { setPinError('Enter all four digits.'); return; }
    setPinError('');
    setStep('verifying_pin');
    setTimeout(() => {
      setPin('');
      setStep('pin_verified');
      setTimeout(() => { setChecks(0); setStep('safety_check'); }, 900);
    }, 1400);
  }

  // ---------------------------------------------------------------- Amount
  if (step === 'amount') {
    return (
      <div className="px-5 pt-5 animate-rise">
        <div className="flex items-center gap-3">
          <Avatar name={recipientName} tone={recipient?.avatarTone ?? 'neutral'} size={48} />
          <div className="min-w-0">
            <p className="truncate text-[17px] font-extrabold text-ink">{recipientName}</p>
            <p className="truncate text-[13px] text-ink-faint">{subtitle ?? recipientHandle}</p>
          </div>
          {recipient && (
            <span className={`ml-auto shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${STATE_TONE[recipient.state].cls}`}>
              {STATE_TONE[recipient.state].label}
            </span>
          )}
        </div>

        <div className="mt-8 text-center">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-[30px] font-bold text-ink-faint">₹</span>
            <input
              autoFocus inputMode="decimal" value={amountStr} placeholder="0"
              onChange={(e) => setAmountStr(e.target.value.replace(/[^\d.]/g, '').slice(0, 8))}
              readOnly={lockedAmount != null}
              className="tnum w-[64%] bg-transparent text-center text-[46px] font-extrabold text-ink outline-none placeholder:text-ink/20"
              aria-label="Amount in rupees"
            />
          </div>
          {overLimit ? (
            <div className="mx-auto mt-3 max-w-[34ch] rounded-xl bg-alert-wash px-4 py-3">
              <p className="text-[13px] font-extrabold text-alert">Payment limit exceeded</p>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-mute">
                {`Your payment limit is ${inr(effectiveLimit)}. Change it in Profile \u2192 Payment limit.`}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-[12px] text-ink-faint">
              Your limit {inr(effectiveLimit)} per payment · Balance {inr(store.user.balance)}
            </p>
          )}
        </div>

        <div className="mt-6">
          <Field label="Add a message (optional)">
            <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls}
              placeholder="What is this for?" maxLength={200} />
          </Field>
        </div>

        <div className="mt-4">
          <p className="mb-1.5 text-[12px] font-bold uppercase tracking-wide text-ink-faint">
            Purpose <span className="font-semibold normal-case tracking-normal">(optional)</span>
          </p>
          <button onClick={() => setPurposeOpen(true)}
            className="flex w-full items-center justify-between rounded-xl border border-ink/12 bg-paper-card px-4 py-3 text-left">
            <span className={`text-[14px] font-semibold ${purposeId === 'p_none' ? 'text-ink-faint' : 'text-ink'}`}>
              {purposeById(purposeId)?.label}
            </span>
            <ChevronRight size={17} className="text-ink-faint" />
          </button>
          {purposeById(purposeId)?.riskySignal && (
            <p className="mt-2 rounded-xl bg-watch-wash px-3 py-2 text-[12px] leading-relaxed text-ink-mute">
              <span className="font-bold text-watch">Heads up. </span>
              {purposeById(purposeId)?.riskySignal}
            </p>
          )}
        </div>

        <div className="mt-4">
          <p className="mb-1.5 text-[12px] font-bold uppercase tracking-wide text-ink-faint">
            Payment source
          </p>
          <button onClick={() => setSourceOpen(true)}
            className="flex w-full items-center gap-3 rounded-xl border border-ink/12 bg-paper-card px-4 py-3 text-left">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brass-wash">
              <Landmark size={17} className="text-brass" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-bold text-ink">
                {source ? `${source.bank} \u2022\u2022\u2022\u2022 ${source.last4}` : 'Choose an account'}
              </span>
              <span className="tnum block text-[12px] text-ink-faint">
                Available {inr(source?.balance ?? 0)}
              </span>
            </span>
            <ChevronRight size={17} className="text-ink-faint" />
          </button>
          {insufficient && (
            <p className="mt-2 rounded-xl bg-alert-wash px-3 py-2 text-[12px] font-semibold text-alert">
              This account has {inr(source?.balance ?? 0)}. Choose another source or lower the amount.
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[500, 2000, 8000, 18000].map((v) => (
            <button key={v} onClick={() => setAmountStr(String(v))}
              className="rounded-full border border-ink/12 px-3.5 py-2 text-[12px] font-bold text-ink-mute">
              {inr(v)}
            </button>
          ))}
        </div>

        <label className="mt-5 flex items-center gap-2 text-[12px] text-ink-faint">
          <input type="checkbox" checked={forceFailure} onChange={(e) => setForceFailure(e.target.checked)} />
          Simulate a gateway timeout (demo)
        </label>

        <div className="mt-6 space-y-2">
          <Button size="lg" className="w-full" onClick={analyse}
            disabled={!validAmount || insufficient}>
            Check and continue
          </Button>
          <Button variant="ghost" className="w-full" onClick={onExit}>Cancel</Button>
        </div>
        <DemoNote>Prototype — no real money moves. Test authorisation only.</DemoNote>

        <Sheet open={purposeOpen} onClose={() => setPurposeOpen(false)} title="What is this payment for?">
          <ul className="space-y-1.5 pb-2">
            {PURPOSES.map((op) => (
              <li key={op.id}>
                <button
                  onClick={() => { setPurposeId(op.id); setPurposeOpen(false); }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left active:bg-ink/5"
                >
                  <span className="flex-1 text-[14px] font-semibold text-ink">{op.label}</span>
                  {purposeId === op.id && <Check size={17} className="text-calm" />}
                </button>
              </li>
            ))}
          </ul>
          <p className="border-t border-ink/8 pt-3 text-[12px] leading-relaxed text-ink-faint">
            Optional. Some purposes are common scam cover stories, so choosing one honestly
            helps TrustPay judge the payment — it never blocks you on its own.
          </p>
        </Sheet>

        <Sheet open={sourceOpen} onClose={() => setSourceOpen(false)} title="Pay from">
          <ul className="space-y-2 pb-2">
            {store.accounts.map((a) => {
              const short = a.balance < amount && amount > 0;
              return (
                <li key={a.id}>
                  <button
                    onClick={() => { setSourceId(a.id); store.set('activeAccountId', a.id); setSourceOpen(false); }}
                    className="flex w-full items-center gap-3 rounded-xl border border-ink/10 px-3 py-3 text-left active:bg-ink/5"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brass-wash">
                      <Landmark size={18} className="text-brass" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-bold text-ink">
                        {a.bank} &bull;&bull;&bull;&bull; {a.last4}
                      </span>
                      <span className={`tnum block text-[12px] ${short ? 'text-alert font-semibold' : 'text-ink-faint'}`}>
                        Available {inr(a.balance)}{short ? ' \u00b7 not enough' : ''}
                      </span>
                    </span>
                    {sourceId === a.id && <Check size={18} className="text-calm" />}
                  </button>
                </li>
              );
            })}
          </ul>
          <button onClick={() => { setSourceOpen(false); router.push('/balance'); }}
            className="w-full rounded-xl border border-ink/12 py-3 text-[13px] font-bold text-ink">
            Check balance
          </button>
        </Sheet>
      </div>
    );
  }

  // ------------------------------------------------------------- Analysing
  if (step === 'analysing') {
    return (
      <div className="grid min-h-[70vh] place-items-center px-8 text-center">
        <div>
          <div className="relative mx-auto grid h-20 w-20 place-items-center">
            <span className="absolute inset-0 rounded-full bg-brass/15 animate-pulseRing" />
            <ShieldCheck size={30} className="text-brass" />
          </div>
          <p className="mt-5 text-[16px] font-extrabold text-ink">Taking a second look</p>
          <p className="mx-auto mt-1 max-w-[30ch] text-[13px] leading-relaxed text-ink-mute">
            Checking the recipient, your payment history and the message.
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- Review
  if (step === 'review' && risk && policy) {
    return (
      <>
        {deadline !== null && (
          <div className="px-5 pt-3"><Countdown seconds={remaining} /></div>
        )}
      <SecondLook
        risk={risk} scam={scam} policy={policy} amount={amount}
        recipientName={recipientName} recipientHandle={recipientHandle}
        onCancel={() => { recordStopped('blocked'); onExit(); }}
        onVerify={() => setStep('review')}
        onAsk={() => router.push('/guardian/ai')}
        onContinue={continueFromReview}
      />
      </>
    );
  }

  // ------------------------------------------------------------------ Auth
  if (step === 'auth') {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];
    return (
      <div className="px-5 pt-6 animate-rise">
        <div className="rounded-xl bg-brass-wash px-3 py-2 text-center text-[11px] font-bold text-brass">
          Test mode authorisation — this is not a real UPI PIN
        </div>
        <h1 className="mt-6 text-center text-[20px] font-extrabold text-ink">
          Paying {inr(amount)}
        </h1>
        <p className="mt-1 text-center text-[13px] text-ink-mute">to {recipientName}</p>

        <div className="mt-8 flex justify-center gap-3">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`h-3.5 w-3.5 rounded-full ${pin.length > i ? 'bg-ink' : 'bg-ink/15'}`} />
          ))}
        </div>

        <div className="mx-auto mt-8 grid max-w-[300px] grid-cols-3 gap-2">
          {keys.map((k, i) => k === '' ? <span key={i} /> : (
            <button key={i}
              onClick={() => {
                if (k === 'del') return setPin((p) => p.slice(0, -1));
                const next = (pin + k).slice(0, 4);
                setPin(next);
                if (next.length === 4) setTimeout(() => verifyPin(next), 220);
              }}
              className="grid h-14 place-items-center rounded-xl bg-paper-card text-[20px] font-bold text-ink shadow-lift active:bg-ink/5"
            >
              {k === 'del' ? <Delete size={19} /> : k}
            </button>
          ))}
        </div>
        {deadline !== null && (
          <div className="mx-auto mt-5 w-fit"><Countdown seconds={remaining} /></div>
        )}
        {pinError && (
          <p className="mt-4 text-center text-[12px] font-bold text-alert">{pinError}</p>
        )}
        <p className="mt-6 text-center text-[11px] text-ink-faint">
          Any 4 digits work. Nothing is stored or transmitted.
        </p>
        <Button variant="ghost" className="mt-3 w-full" onClick={onExit}>Cancel</Button>
      </div>
    );
  }

  // ------------------------------------------------- Verifying / verified PIN
  if (step === 'verifying_pin' || step === 'pin_verified') {
    const done = step === 'pin_verified';
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-ink/45 px-6">
        <div className="w-full max-w-[330px] overflow-hidden rounded-2xl bg-paper-card shadow-lift animate-rise">
          <div className="bg-ink px-5 py-4 text-center">
            <p className="text-[14px] font-extrabold text-paper">Enter UPI PIN</p>
            <p className="mt-0.5 text-[12px] text-paper/60">To: {recipientName}</p>
            <p className="tnum mt-1 text-[24px] font-extrabold text-paper">{inr(amount)}</p>
          </div>
          <div className="grid place-items-center px-5 py-10">
            {done ? (
              <>
                <span className="grid h-14 w-14 place-items-center rounded-full border-2 border-calm/30 bg-calm-wash">
                  <Check size={26} className="text-calm" strokeWidth={3} />
                </span>
                <p className="mt-4 text-[14px] font-extrabold text-calm">PIN verified</p>
              </>
            ) : (
              <>
                <Loader2 size={40} className="animate-spin text-brass" strokeWidth={2.5} />
                <p className="mt-4 text-[14px] font-bold text-ink">Verifying PIN…</p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------- Safety check
  if (step === 'safety_check') {
    return (
      <SafetyCheck
        amount={amount} recipientName={recipientName} recipientHandle={recipientHandle}
        purposeLabel={purposeId === 'p_none' ? undefined : purposeById(purposeId)?.label}
        riskScore={risk?.score ?? 0} limit={effectiveLimit}
        onDone={() => execute()}
      />
    );
  }

  // -------------------------------------------------------- Guardian sent
  if (step === 'guardian_sent') {
    const g = store.guardians.find((x) => x.id === (policy?.requiredGuardianId ?? store.guardians[0]?.id));
    return (
      <div className="px-5 pt-8 animate-rise">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brass-wash">
          <Clock size={26} className="text-brass" />
        </div>
        <h1 className="mt-5 text-center text-[21px] font-extrabold text-ink">
          Waiting for {g?.relation ?? 'your Guardian'}
        </h1>
        <p className="mx-auto mt-2 max-w-[32ch] text-center text-[14px] leading-relaxed text-ink-mute">
          {g?.name} can see the amount, who you are paying and why Guardian stopped to ask. The
          payment will not go out until they decide.
        </p>
        <Card className="mt-6 p-4">
          <p className="text-[13px] text-ink-mute">
            <span className="font-bold text-ink">{store.user.name}</span> wants to send{' '}
            <span className="tnum font-bold text-ink">{inr(amount)}</span> to{' '}
            <span className="font-bold text-ink">{recipientName}</span>.
          </p>
          <p className="mt-2 text-[12px] text-ink-faint">Risk {risk?.score}/100 · {policy?.reasons[0]}</p>
        </Card>
        <div className="mt-6 space-y-2">
          <Button size="lg" className="w-full" onClick={() => {
            store.set('viewAs', 'guardian');
            store.set('activeGuardianId', g?.id ?? 'g_dad');
            router.push('/guardian/approvals');
          }}>
            Switch to {g?.relation ?? 'Guardian'}&apos;s view
          </Button>
          <Button variant="ghost" className="w-full" onClick={onExit}>Back to home</Button>
        </div>
        <DemoNote>
          One device is used for both roles so the approval can be demonstrated end to end.
          In production the request would arrive on your Guardian&apos;s own phone.
        </DemoNote>
      </div>
    );
  }

  // ------------------------------------------------------------ Processing
  if (step === 'processing') {
    return (
      <div className="grid min-h-[70vh] place-items-center">
        <div className="text-center">
          <Loader2 size={30} className="mx-auto animate-spin text-ink-mute" />
          <p className="mt-4 text-[15px] font-bold text-ink">Sending {inr(amount)}</p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- Result
  /**
   * Shares the receipt as text. Uses the Web Share sheet where the browser has
   * it (Android Chrome, iOS Safari) so the user can send it to WhatsApp or save
   * a screenshot from there, and falls back to the clipboard on desktop.
   * Deliberately excludes the UPI handle in full and never includes a PIN,
   * account number or balance — a shared receipt tends to end up in group chats.
   */
  async function shareReceipt() {
    const text = [
      `TrustPay receipt`,
      `${inr(amount)} paid to ${recipientName}`,
      result?.reference ? `Reference: ${result.reference}` : '',
      `Date: ${new Date().toLocaleString('en-IN')}`,
      purposeId !== 'p_none' ? `Purpose: ${purposeById(purposeId)?.label}` : '',
      ``,
      `Checked by Guardian before it was sent.`,
    ].filter(Boolean).join('\n');

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: 'TrustPay receipt', text });
        setShared('Shared');
      } else {
        await navigator.clipboard.writeText(text);
        setShared('Copied to clipboard');
      }
    } catch {
      setShared('Sharing unavailable');
    }
    setTimeout(() => setShared(''), 2400);
  }

  const ok = result?.ok;
  const limit = (result as any)?.limitBreached;
  return (
    <div className="px-5 pt-10 animate-rise">
      <div className={`mx-auto grid h-20 w-20 place-items-center rounded-full ${ok ? 'bg-calm-wash' : limit ? 'bg-alert-wash' : 'bg-watch-wash'}`}>
        {ok ? <CheckCircle2 size={34} className="text-calm" />
          : limit ? <Ban size={32} className="text-alert" />
            : <TriangleAlert size={32} className="text-watch" />}
      </div>
      <h1 className="mt-5 text-center text-[24px] font-extrabold text-ink">
        {ok ? `${inr(amount)} sent` : limit ? 'Payment limit exceeded' : "Payment couldn't be completed"}
      </h1>
      <p className="mx-auto mt-2 max-w-[34ch] text-center text-[14px] leading-relaxed text-ink-mute">
        {ok ? `to ${recipientName} · ${recipientHandle}` : result?.reason}
      </p>
      {!ok && (
        <p className="mt-3 text-center text-[13px] font-bold text-calm">
          No money was charged. Your balance is unchanged.
        </p>
      )}
      {ok && result?.reference && (
        <p className="mt-3 text-center text-[12px] text-ink-faint">Reference {result.reference}</p>
      )}

      <div className="mt-8 space-y-2">
        {!ok && result?.retryable && (
          <Button size="lg" className="w-full" onClick={() => {
            setForceFailure(false);
            setDeadline(Date.now() + GATEWAY_WINDOW_S * 1000);
            setRemaining(GATEWAY_WINDOW_S);
            execute();
          }}>
            <RotateCw size={16} /> Try again
          </Button>
        )}
        {ok && (
          <Button variant="outline" size="lg" className="w-full" onClick={shareReceipt}>
            <Share2 size={16} /> {shared || 'Share receipt'}
          </Button>
        )}
        <Button variant={ok ? 'primary' : 'outline'} size="lg" className="w-full"
          onClick={() => router.push(`/activity/${txnId}`)}>
          View details
        </Button>
        <Button variant="ghost" className="w-full" onClick={onExit}>Done</Button>
      </div>
    </div>
  );
}

/** Live countdown for the authorisation window. Turns amber under 30s so the
 *  urgency is visible without a modal interrupting the risk review. */
function Countdown({ seconds }: { seconds: number }) {
  const m = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, '0');
  const low = seconds <= 30;
  return (
    <div className={`flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold ${
      low ? 'bg-watch-wash text-watch' : 'bg-ink/6 text-ink-mute'}`}>
      <Clock size={13} />
      <span className="tnum">{m}:{ss}</span>
      <span className="font-semibold">left to authorise</span>
    </div>
  );
}
