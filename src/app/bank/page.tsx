'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { Button, DemoNote, Field, TopBar, inputCls } from '@/components/ui';
import { PaymentComposer } from '@/components/PaymentComposer';

export default function BankTransferPage() {
  const router = useRouter();
  const { ready } = useStore();
  const [acc, setAcc] = useState('');
  const [confirm, setConfirm] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [name, setName] = useState('');
  const [go, setGo] = useState(false);

  if (!ready) return <div className="h-screen" />;

  const mismatch = confirm.length > 0 && acc !== confirm;
  const ifscOk = /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.toUpperCase());
  const valid = acc.length >= 9 && acc === confirm && ifscOk && name.trim().length >= 3;

  if (go) {
    return (
      <div>
        <TopBar title="Bank transfer" onBack={() => setGo(false)} />
        <PaymentComposer rail="bank" recipient={null} recipientName={name.trim()}
          recipientHandle={`${ifsc.toUpperCase()} · ${acc.slice(-4).padStart(acc.length, 'X')}`}
          subtitle={`${ifsc.toUpperCase()} · account ending ${acc.slice(-4)}`}
          onExit={() => router.push('/')} />
      </div>
    );
  }

  return (
    <div className="animate-fade">
      <TopBar title="Bank transfer" onBack={() => router.push('/')} />
      <div className="space-y-4 px-5 pt-4">
        <Field label="Account number">
          <input value={acc} inputMode="numeric" className={inputCls} placeholder="Enter account number"
            onChange={(e) => setAcc(e.target.value.replace(/\D/g, '').slice(0, 18))} />
        </Field>
        <Field label="Confirm account number"
          hint={mismatch ? 'The two account numbers do not match.' : undefined}>
          <input value={confirm} inputMode="numeric"
            className={`${inputCls} ${mismatch ? 'border-alert' : ''}`} placeholder="Re-enter account number"
            onChange={(e) => setConfirm(e.target.value.replace(/\D/g, '').slice(0, 18))} />
        </Field>
        <Field label="IFSC code" hint={ifsc && !ifscOk ? 'Format looks like HDFC0001234.' : undefined}>
          <input value={ifsc} className={`${inputCls} uppercase ${ifsc && !ifscOk ? 'border-alert' : ''}`}
            placeholder="HDFC0001234" maxLength={11}
            onChange={(e) => setIfsc(e.target.value.toUpperCase().slice(0, 11))} />
        </Field>
        <Field label="Recipient name">
          <input value={name} className={inputCls} placeholder="As on the bank account"
            onChange={(e) => setName(e.target.value.slice(0, 60))} />
        </Field>

        <Button size="lg" className="w-full" disabled={!valid} onClick={() => setGo(true)}>
          Continue
        </Button>
        <DemoNote>
          Bank transfers use the same Guardian checks and the same {'\u20B9'}20,000 per-transaction
          limit as UPI payments. A first-time account has no payment history, so it will usually
          score higher than someone you pay regularly.
        </DemoNote>
      </div>
    </div>
  );
}
