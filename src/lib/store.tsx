'use client';
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import type {
  ApprovalRequest, FraudReport, GuardianContact, RecoveryCase, Recipient, Transaction, AuditEvent,
  BankAccount, AppNotification,
} from './types';
import { SEED_ACCOUNTS } from './accounts';
import type { Complaint } from './fraud-case';
import { SEED_REMINDERS, type Reminder, type PendingPayment } from './reminders';
import { DEFAULT_LIMIT_INR } from './constants';
import { SEED_GUARDIANS, SEED_RECIPIENTS, SEED_TRANSACTIONS, SEED_USER } from './seed';
import type { ProtectionMode } from './constants';
import { assessRecovery, simulateRecoveryOutcome } from './recovery';

const KEY = 'trustpay.state.v1';

const inrPlain = (n: number) => `\u20b9${n.toLocaleString('en-IN')}`;

interface State {
  user: typeof SEED_USER;
  recipients: Recipient[];
  guardians: GuardianContact[];
  transactions: Transaction[];
  approvals: ApprovalRequest[];
  reports: FraudReport[];
  recoveries: RecoveryCase[];
  mode: ProtectionMode;
  travelMode: boolean;
  travelGuardianId?: string;
  viewAs: 'user' | 'guardian';
  activeGuardianId: string;
  accounts: BankAccount[];
  activeAccountId: string;
  readNotificationIds: string[];
  userLimit: number;
  complaints: Complaint[];
  reminders: Reminder[];
  pendingPayment: PendingPayment | null;
}

const initial: State = {
  user: SEED_USER,
  recipients: SEED_RECIPIENTS,
  guardians: SEED_GUARDIANS,
  transactions: SEED_TRANSACTIONS,
  approvals: [],
  reports: [],
  recoveries: [],
  mode: 'balanced',
  travelMode: false,
  viewAs: 'user',
  activeGuardianId: 'g_dad',
  accounts: SEED_ACCOUNTS,
  activeAccountId: 'a_hdfc',
  readNotificationIds: [],
  userLimit: DEFAULT_LIMIT_INR,
  complaints: [],
  reminders: SEED_REMINDERS,
  pendingPayment: null,
};

interface Ctx extends State {
  ready: boolean;
  set: <K extends keyof State>(k: K, v: State[K]) => void;
  findRecipient: (q: string) => Recipient | null;
  upsertRecipient: (r: Recipient) => void;
  addTransaction: (t: Transaction) => void;
  updateTransaction: (id: string, patch: Partial<Transaction>, audit?: AuditEvent) => void;
  requestApproval: (txnId: string, guardianId: string) => string;
  decideApproval: (id: string, outcome: 'approved' | 'rejected', reason?: string) => void;
  fileReport: (r: FraudReport) => void;
  openRecovery: (txnId: string, reportId: string) => RecoveryCase | null;
  advanceRecovery: (caseId: string) => void;
  withdrawRecovery: (caseId: string) => void;
  moneyProtected: () => { total: number; items: Transaction[] };
  moneyRecovered: () => number;
  debitAccount: (accountId: string, amount: number) => void;
  creditAccount: (accountId: string | undefined, amount: number) => void;
  addComplaint: (c: Complaint) => void;
  refund: (txn: Transaction, reason: string) => void;
  updateComplaint: (id: string, patch: Partial<Complaint>) => void;
  notifications: () => AppNotification[];
  unreadCount: () => number;
  markNotificationsRead: () => void;
  reset: () => void;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState({ ...initial, ...JSON.parse(raw) });
    } catch { /* fall back to seed */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { } }
  }, [state, ready]);

  const set = useCallback(<K extends keyof State>(k: K, v: State[K]) =>
    setState((s) => ({ ...s, [k]: v })), []);

  const findRecipient = useCallback((q: string): Recipient | null => {
    const clean = q.trim().toLowerCase();
    if (!clean) return null;
    const digits = clean.replace(/\D/g, '');
    return state.recipients.find((r) =>
      r.upiId.toLowerCase() === clean ||
      r.upiId.toLowerCase().startsWith(clean) ||
      (digits.length >= 6 && r.phone.replace(/\D/g, '').endsWith(digits.slice(-8))) ||
      r.name.toLowerCase().includes(clean)) ?? null;
  }, [state.recipients]);

  const upsertRecipient = useCallback((r: Recipient) => setState((s) => ({
    ...s,
    recipients: s.recipients.some((x) => x.id === r.id)
      ? s.recipients.map((x) => (x.id === r.id ? r : x))
      : [...s.recipients, r],
  })), []);

  const addTransaction = useCallback((t: Transaction) =>
    setState((s) => ({ ...s, transactions: [t, ...s.transactions] })), []);

  const updateTransaction = useCallback((id: string, patch: Partial<Transaction>, audit?: AuditEvent) =>
    setState((s) => ({
      ...s,
      transactions: s.transactions.map((t) => t.id === id
        ? { ...t, ...patch, audit: audit ? [...t.audit, audit] : t.audit }
        : t),
    })), []);

  const requestApproval = useCallback((txnId: string, guardianId: string) => {
    const id = `ap_${Date.now()}`;
    setState((s) => ({
      ...s,
      approvals: [{ id, transactionId: txnId, guardianId, requestedAt: new Date().toISOString(), status: 'pending' }, ...s.approvals],
      transactions: s.transactions.map((t) => t.id === txnId
        ? { ...t, status: 'pending_guardian', guardianId, guardianOutcome: 'pending',
            audit: [...t.audit, { at: new Date().toISOString(), event: `Approval requested from ${s.guardians.find(g => g.id === guardianId)?.relation ?? 'Guardian'}`, actor: 'system' }] }
        : t),
    }));
    return id;
  }, []);

  const decideApproval = useCallback((id: string, outcome: 'approved' | 'rejected', reason?: string) =>
    setState((s) => {
      const ap = s.approvals.find((a) => a.id === id);
      if (!ap) return s;
      const g = s.guardians.find((x) => x.id === ap.guardianId);
      const now = new Date().toISOString();
      return {
        ...s,
        approvals: s.approvals.map((a) => a.id === id
          ? { ...a, status: outcome, decidedAt: now } : a),
        transactions: s.transactions.map((t) => t.id === ap.transactionId
          ? {
            ...t,
            guardianOutcome: outcome,
            status: outcome === 'rejected' ? 'blocked' : t.status,
            audit: [...t.audit,
              { at: now, event: `${g?.relation ?? 'Guardian'} ${outcome} the payment`, actor: 'guardian', detail: reason },
              ...(outcome === 'rejected'
                ? [{ at: now, event: 'Payment blocked by Guardian', actor: 'system' as const }]
                : [{ at: now, event: 'Guardian approval received', actor: 'system' as const }]),
            ],
          } : t),
      };
    }), []);

  const fileReport = useCallback((r: FraudReport) => setState((s) => ({
    ...s,
    reports: [r, ...s.reports],
    transactions: s.transactions.map((t) => t.id === r.transactionId
      ? { ...t, fraudReportId: r.id, status: 'flagged',
          audit: [...t.audit, { at: r.createdAt, event: 'Fraud report submitted', actor: 'user', detail: r.category }] }
      : t),
    recipients: s.recipients.map((rec) => {
      const txn = s.transactions.find((t) => t.id === r.transactionId);
      return txn && rec.id === txn.recipientId
        ? { ...rec, reportCount: rec.reportCount + 1, trustScore: Math.max(0, rec.trustScore - 25), state: 'reported' as const, recentSuspiciousActivity: true }
        : rec;
    }),
  })), []);

  const openRecovery = useCallback((txnId: string, reportId: string) => {
    let created: RecoveryCase | null = null;
    setState((s) => {
      const txn = s.transactions.find((t) => t.id === txnId);
      const report = s.reports.find((r) => r.id === reportId);
      if (!txn || !report) return s;
      const rec = s.recipients.find((r) => r.id === txn.recipientId);
      const { eligibility, checks } = assessRecovery(txn, report, rec?.reportCount ?? 0);
      const now = new Date().toISOString();
      created = {
        id: `rc_${Date.now()}`, transactionId: txnId, reportId, amount: txn.amount,
        eligibility, eligibilityReasons: checks, status: 'assessing', attempts: 0, recoveredAmount: 0,
        timeline: [
          { at: now, event: 'Recovery case opened', actor: 'system' },
          { at: now, event: `Eligibility assessed: ${eligibility}`, actor: 'policy_engine' },
        ],
      };
      return {
        ...s,
        recoveries: [created!, ...s.recoveries],
        transactions: s.transactions.map((t) => t.id === txnId
          ? { ...t, recoveryCaseId: created!.id, status: 'recovery',
              audit: [...t.audit, { at: now, event: 'Recovery case opened', actor: 'system', detail: `Eligibility: ${eligibility}` }] }
          : t),
      };
    });
    return created;
  }, []);

  const advanceRecovery = useCallback((caseId: string) => setState((s) => {
    const c = s.recoveries.find((x) => x.id === caseId);
    if (!c || c.status === 'recovered' || c.status === 'withdrawn') return s;
    if (c.attempts >= 2) return s; // stopping rule
    const now = new Date().toISOString();
    const outcome = c.attempts === 0
      ? simulateRecoveryOutcome(c.id, c.eligibility)
      : 'manual_review';
    const recovered = outcome === 'recovered';
    const updated: RecoveryCase = {
      ...c,
      attempts: c.attempts + 1,
      status: recovered ? 'recovered' : 'manual_review',
      recoveredAmount: recovered ? c.amount : 0,
      timeline: [...c.timeline,
        { at: now, event: 'Recovery request sent to simulated dispute network', actor: 'system' },
        { at: now, event: recovered
            ? `${c.amount} recovered in simulation`
            : 'Automatic recovery unavailable — case escalated for manual review',
          actor: 'adapter' }],
    };
    return {
      ...s,
      recoveries: s.recoveries.map((x) => (x.id === caseId ? updated : x)),
      user: recovered ? { ...s.user, balance: s.user.balance + c.amount } : s.user,
    };
  }), []);

  const withdrawRecovery = useCallback((caseId: string) => setState((s) => ({
    ...s,
    recoveries: s.recoveries.map((c) => c.id === caseId
      ? { ...c, status: 'withdrawn', timeline: [...c.timeline, { at: new Date().toISOString(), event: 'Request withdrawn by user', actor: 'user' }] }
      : c),
  })), []);

  /** Money protected = value of payments Guardian actually stopped before they
   *  completed. Flagged-but-completed payments do NOT count. */
  const moneyProtected = useCallback(() => {
    const items = state.transactions.filter(
      (t) => t.status === 'blocked' || (t.status === 'protected' && t.guardianOutcome === 'rejected'));
    return { total: items.reduce((s, t) => s + t.amount, 0), items };
  }, [state.transactions]);

  const moneyRecovered = useCallback(
    () => state.recoveries.reduce((s, c) => s + c.recoveredAmount, 0), [state.recoveries]);

  /** Debits the chosen funding source and keeps the headline balance in sync. */
  const debitAccount = useCallback((accountId: string, amount: number) => {
    setState((st) => ({
      ...st,
      accounts: st.accounts.map((a) =>
        a.id === accountId ? { ...a, balance: Math.max(0, a.balance - amount) } : a),
      user: { ...st.user, balance: Math.max(0, st.user.balance - amount) },
    }));
  }, []);

  /** Notifications are derived from real state rather than stored separately, so
   *  the list can never drift out of sync with what actually happened. */
  /** Returns funds to the account they came from (or the default account). */
  const creditAccount = useCallback((accountId: string | undefined, amount: number) => {
    setState((st) => {
      const target = st.accounts.find((a) => a.id === accountId) ?? st.accounts[0];
      return {
        ...st,
        accounts: st.accounts.map((a) =>
          a.id === target?.id ? { ...a, balance: a.balance + amount } : a),
        user: { ...st.user, balance: st.user.balance + amount },
      };
    });
  }, []);

  /**
   * Returns a disputed payment. Creates a separate credit entry rather than
   * editing the original, so the history keeps an honest record: the money went
   * out, and later it came back. Silently reversing the original row would hide
   * that the fraud ever happened.
   */
  const refund = useCallback((txn: Transaction, reason: string) => {
    const now = new Date().toISOString();
    setState((st) => {
      const target = st.accounts.find((a) => a.id === txn.sourceAccountId) ?? st.accounts[0];
      const credit: Transaction = {
        id: `t_ref_${Date.now()}`,
        rail: txn.rail,
        recipientId: txn.recipientId,
        recipientName: `Refund from ${txn.recipientName}`,
        recipientHandle: txn.recipientHandle,
        amount: txn.amount,
        direction: 'credit',
        note: reason,
        createdAt: now,
        status: 'refunded',
        sourceAccountId: target?.id,
        audit: [
          { at: now, event: 'Fraud reported', actor: 'user' },
          { at: now, event: 'Lien marked on beneficiary account', actor: 'system' },
          { at: now, event: 'Funds returned to source account', actor: 'system',
            detail: `\u20b9${txn.amount.toLocaleString('en-IN')}` },
        ],
      };
      return {
        ...st,
        transactions: [credit, ...st.transactions],
        accounts: st.accounts.map((a) =>
          a.id === target?.id ? { ...a, balance: a.balance + txn.amount } : a),
        user: { ...st.user, balance: st.user.balance + txn.amount },
      };
    });
  }, []);

  const addComplaint = useCallback((c: Complaint) => {
    setState((st) => ({ ...st, complaints: [c, ...st.complaints] }));
  }, []);

  const updateComplaint = useCallback((id: string, patch: Partial<Complaint>) => {
    setState((st) => ({
      ...st,
      complaints: st.complaints.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }, []);

  const notifications = useCallback((): AppNotification[] => {
    const out: AppNotification[] = [];
    for (const a of state.approvals.filter((x) => x.status === 'pending')) {
      const t = state.transactions.find((x) => x.id === a.transactionId);
      const g = state.guardians.find((x) => x.id === a.guardianId);
      out.push({
        id: `n_appr_${a.id}`, kind: 'approval', at: a.requestedAt,
        title: `Waiting on ${g?.relation ?? 'your Guardian'}`,
        body: `${inrPlain(t?.amount ?? 0)} to ${t?.recipientName ?? 'a recipient'} needs approval.`,
        href: '/guardian/approvals',
      });
    }
    for (const t of state.transactions.filter((x) => x.status === 'blocked').slice(0, 6)) {
      out.push({
        id: `n_blk_${t.id}`, kind: 'blocked', at: t.createdAt,
        title: 'Payment stopped',
        body: `${inrPlain(t.amount)} to ${t.recipientName} was stopped before it left your account.`,
        href: `/activity/${t.id}`,
      });
    }
    for (const t of state.transactions.filter((x) => x.status === 'refunded').slice(0, 6)) {
      out.push({
        id: `n_ref_${t.id}`, kind: 'protected', at: t.createdAt,
        title: `${inrPlain(t.amount)} returned to your account`,
        body: `Your fraud report was upheld. ${t.recipientHandle} has been flagged.`,
        href: `/activity/${t.id}`,
      });
    }
    for (const c of state.recoveries) {
      out.push({
        id: `n_rec_${c.id}`, kind: 'recovery',
        at: c.timeline[0]?.at ?? new Date().toISOString(),
        title: `Recovery ${c.status.replace('_', ' ')}`,
        body: `Case ${c.id} for ${inrPlain(c.amount)}.`,
        href: `/guardian/case/${c.id}`,
      });
    }
    return out.sort((a, b) => (a.at < b.at ? 1 : -1))
      .map((n) => ({ ...n, read: state.readNotificationIds.includes(n.id) }));
  }, [state.approvals, state.transactions, state.recoveries, state.guardians, state.readNotificationIds]);

  const unreadCount = useCallback(
    () => notifications().filter((n) => !n.read).length, [notifications]);

  const markNotificationsRead = useCallback(() => {
    setState((st) => ({ ...st, readNotificationIds: [] }));
    setTimeout(() => setState((st) => ({
      ...st,
      readNotificationIds: Array.from(new Set([
        ...st.readNotificationIds,
        ...st.approvals.filter((x) => x.status === 'pending').map((a) => `n_appr_${a.id}`),
        ...st.transactions.filter((t) => t.status === 'blocked').map((t) => `n_blk_${t.id}`),
        ...st.recoveries.map((c) => `n_rec_${c.id}`),
      ])),
    })), 0);
  }, []);

  const reset = useCallback(() => { localStorage.removeItem(KEY); setState(initial); }, []);

  const value = useMemo<Ctx>(() => ({
    ...state, ready, set, findRecipient, upsertRecipient, addTransaction, updateTransaction,
    requestApproval, decideApproval, fileReport, openRecovery, advanceRecovery, withdrawRecovery,
    moneyProtected, moneyRecovered, debitAccount, creditAccount, addComplaint, refund,
    updateComplaint, notifications, unreadCount, markNotificationsRead, reset,
  }), [state, ready, set, findRecipient, upsertRecipient, addTransaction, updateTransaction,
    requestApproval, decideApproval, fileReport, openRecovery, advanceRecovery, withdrawRecovery,
    moneyProtected, moneyRecovered, debitAccount, creditAccount, addComplaint, refund,
    updateComplaint, notifications, unreadCount, markNotificationsRead, reset]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error('useStore must be used inside StoreProvider');
  return c;
}
