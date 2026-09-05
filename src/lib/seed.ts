import type { GuardianContact, Recipient, Transaction } from './types';

/** All names, numbers and reputation figures below are invented for the demo.
 *  Phone numbers use the 98XXXXXX pattern and do not correspond to real people. */

const iso = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000).toISOString();

export const SEED_RECIPIENTS: Recipient[] = [
  {
    id: 'r_rahul', name: 'Rahul Sharma', phone: '+91 98765 43221', upiId: 'rahul@upi',
    accountAgeDays: 21, successfulTxns: 9, reportCount: 2, trustScore: 28,
    state: 'suspicious', paymentsFromUser: 0, recentSuspiciousActivity: true, avatarTone: 'alert',
  },
  {
    id: 'r_amit', name: 'Amit Kumar', phone: '+91 98765 11002', upiId: 'amitk@upi',
    accountAgeDays: 1180, successfulTxns: 412, reportCount: 0, trustScore: 92,
    state: 'trusted', paymentsFromUser: 26, lastPaidAt: iso(2880), recentSuspiciousActivity: false, avatarTone: 'calm',
  },
  {
    id: 'r_meera', name: 'Meera Nair', phone: '+91 98765 33418', upiId: 'meera.nair@upi',
    accountAgeDays: 890, successfulTxns: 268, reportCount: 0, trustScore: 88,
    state: 'trusted', paymentsFromUser: 14, lastPaidAt: iso(7200), recentSuspiciousActivity: false, avatarTone: 'calm',
  },
  {
    id: 'r_landlord', name: 'S. Venkatesan', phone: '+91 98765 77310', upiId: 'venkatesan.rent@upi',
    accountAgeDays: 1460, successfulTxns: 96, reportCount: 0, trustScore: 95,
    state: 'trusted', paymentsFromUser: 23, lastPaidAt: iso(43200), recentSuspiciousActivity: false, avatarTone: 'calm',
  },
  {
    id: 'r_priya', name: 'Priya Raghavan', phone: '+91 98765 20955', upiId: 'priyar@upi',
    accountAgeDays: 340, successfulTxns: 74, reportCount: 0, trustScore: 71,
    state: 'known', paymentsFromUser: 5, lastPaidAt: iso(10080), recentSuspiciousActivity: false, avatarTone: 'neutral',
  },
  {
    id: 'r_kiran', name: 'Kiran Deshmukh', phone: '+91 98765 60147', upiId: 'kiran.d@upi',
    accountAgeDays: 12, successfulTxns: 3, reportCount: 0, trustScore: 44,
    state: 'new', paymentsFromUser: 0, recentSuspiciousActivity: false, avatarTone: 'watch',
  },
  {
    id: 'r_support', name: 'Quick Refund Services', phone: '+91 98765 90001', upiId: 'refund.help@upi',
    accountAgeDays: 6, successfulTxns: 2, reportCount: 7, trustScore: 9,
    state: 'reported', paymentsFromUser: 0, recentSuspiciousActivity: true, avatarTone: 'alert',
  },
  {
    id: 'r_arjun', name: 'Arjun Pillai', phone: '+91 98765 45612', upiId: 'arjun.p@upi',
    accountAgeDays: 620, successfulTxns: 158, reportCount: 0, trustScore: 84,
    state: 'trusted', paymentsFromUser: 11, lastPaidAt: iso(1440), recentSuspiciousActivity: false, avatarTone: 'calm',
  },
];

export const SEED_GUARDIANS: GuardianContact[] = [
  {
    id: 'g_dad', name: 'Ramesh Sethi', relation: 'Dad', phone: '+91 98765 00011',
    approvesAboveAmount: 5000, approvesHighRisk: true, approvesNewRecipients: false,
    approvesTravelPayments: true, avatarTone: 'brass',
  },
  {
    id: 'g_mom', name: 'Sunita Sethi', relation: 'Mom', phone: '+91 98765 00012',
    approvesHighRisk: false, approvesNewRecipients: true, approvesTravelPayments: false, avatarTone: 'neutral',
  },
  {
    id: 'g_friend', name: 'Nikhil Rao', relation: 'Friend', phone: '+91 98765 00013',
    approvesHighRisk: false, approvesNewRecipients: false, approvesTravelPayments: true, avatarTone: 'neutral',
  },
];

const ev = (minutesAgo: number, event: string, actor: any, detail?: string) =>
  ({ at: iso(minutesAgo), event, actor, detail });

export const SEED_TRANSACTIONS: Transaction[] = [
  {
    id: 't_1001', rail: 'upi', recipientId: 'r_amit', recipientName: 'Amit Kumar',
    recipientHandle: 'amitk@upi', amount: 800, note: 'Lunch', createdAt: iso(180),
    status: 'successful',
    risk: { score: 8, level: 'low', factors: [
      { code: 'established', label: 'Established recipient', points: -18, detail: 'You have paid this recipient 26 times before.' }],
      summary: 'This looks like a normal payment for you.', recommendation: 'Go ahead.' },
    audit: [ev(180, 'Payment initiated', 'user'), ev(180, 'Risk score = 8 (low)', 'risk_engine'),
      ev(180, 'Policy decision: allow', 'policy_engine'), ev(179, 'Payment completed', 'adapter')],
  },
  {
    id: 't_1002', rail: 'upi', recipientId: 'r_landlord', recipientName: 'S. Venkatesan',
    recipientHandle: 'venkatesan.rent@upi', amount: 18000, note: 'October rent',
    createdAt: iso(1500), status: 'successful',
    risk: { score: 24, level: 'low', factors: [
      { code: 'amount_extreme', label: 'Much larger than your usual payment', points: 18, detail: 'This is 7.5x your typical payment.' },
      { code: 'near_limit', label: 'Close to your safety limit', points: 8, detail: 'Large transfers are the most common target for payment scams.' },
      { code: 'established', label: 'Established recipient', points: -18, detail: 'You have paid this recipient 23 times before.' },
      { code: 'high_trust', label: 'Strong trust history', points: -12, detail: 'Trust score 95/100 from synthetic reputation data.' },
      { code: 'aged_account', label: 'Long-standing account', points: -6, detail: 'This account has existed for 4+ years.' }],
      summary: 'This looks like a normal payment for you.',
      recommendation: 'Go ahead.' },
    audit: [ev(1500, 'Payment initiated', 'user'), ev(1500, 'Amount deviation flagged (7.5x)', 'risk_engine'),
      ev(1500, 'Trust history applied: -36 points', 'risk_engine'),
      ev(1500, 'Risk score = 24 (low)', 'risk_engine'),
      ev(1500, 'Policy decision: allow', 'policy_engine'), ev(1499, 'Payment completed', 'adapter')],
  },
  {
    id: 't_1003', rail: 'upi', recipientId: 'r_support', recipientName: 'Quick Refund Services',
    recipientHandle: 'refund.help@upi', amount: 12500, note: 'Refund processing fee, urgent',
    createdAt: iso(2600), status: 'blocked',
    risk: { score: 94, level: 'high', factors: [
      { code: 'reported_heavy', label: 'Recipient has multiple reports', points: 30, detail: '7 reports filed against this account in demo data.' },
      { code: 'scam_high', label: 'Message shows manipulation patterns', points: 22, detail: 'Multiple social-engineering indicators detected.' },
      { code: 'new_recipient', label: 'First payment to this recipient', points: 20, detail: 'You have never paid this account before.' },
      { code: 'low_trust', label: 'Weak trust signals', points: 16, detail: 'Trust score 9/100 from synthetic reputation data.' },
      { code: 'young_account', label: 'Recently created account', points: 14, detail: 'This account is 6 days old.' }],
      summary: 'Several warning signs, starting with recipient has multiple reports.',
      recommendation: 'Call the recipient on a number you already have before sending anything.' },
    policy: { decision: 'block', reasons: ['Risk score 94 is above the blocking threshold of 92.'], limitBreached: false },
    audit: [ev(2600, 'Payment initiated', 'user'), ev(2600, 'Recipient identified', 'system', 'Quick Refund Services'),
      ev(2600, 'Scam Shield: 5 indicators', 'ai'), ev(2600, 'Risk score = 94 (high)', 'risk_engine'),
      ev(2600, 'Policy decision: block', 'policy_engine'), ev(2600, 'Payment stopped before authorisation', 'system')],
  },
  {
    id: 't_1004', rail: 'recharge', recipientName: 'Airtel prepaid', recipientHandle: '+91 98765 43210',
    amount: 299, createdAt: iso(4300), status: 'successful',
    audit: [ev(4300, 'Recharge initiated', 'user'), ev(4300, 'Risk score = 4 (low)', 'risk_engine'), ev(4299, 'Recharge completed', 'adapter')],
  },
  {
    id: 't_1005', rail: 'bill', recipientName: 'TNEB electricity', recipientHandle: 'Consumer 4419-2201',
    amount: 1840, createdAt: iso(5800), status: 'successful',
    audit: [ev(5800, 'Bill payment initiated', 'user'), ev(5799, 'Payment completed', 'adapter')],
  },
  {
    id: 't_1006', rail: 'upi', recipientId: 'r_kiran', recipientName: 'Kiran Deshmukh',
    recipientHandle: 'kiran.d@upi', amount: 6500, note: 'Deposit for the flat',
    createdAt: iso(7100), status: 'protected',
    risk: { score: 52, level: 'medium', factors: [
      { code: 'new_recipient', label: 'First payment to this recipient', points: 20, detail: 'You have never paid this account before.' },
      { code: 'young_account', label: 'Recently created account', points: 14, detail: 'This account is 12 days old.' },
      { code: 'amount_high', label: 'Larger than your usual payment', points: 10, detail: 'This is 2.7x your typical payment.' }],
      summary: 'Worth a second look: first payment to this recipient.',
      recommendation: 'Confirm you know who you are paying before you continue.' },
    policy: { decision: 'guardian_required', reasons: ['Payments above ₹5,000 need approval in Balanced mode.'], limitBreached: false },
    guardianId: 'g_dad', guardianOutcome: 'rejected',
    audit: [ev(7100, 'Payment initiated', 'user'), ev(7100, 'Risk score = 52 (medium)', 'risk_engine'),
      ev(7100, 'Guardian approval required', 'policy_engine'), ev(7099, 'Request sent to Dad', 'system'),
      ev(7080, 'Dad rejected the payment', 'guardian', 'Asked to verify the listing first'),
      ev(7080, 'Payment blocked by Guardian', 'system')],
  },
  {
    id: 't_1007', rail: 'upi', recipientId: 'r_meera', recipientName: 'Meera Nair',
    recipientHandle: 'meera.nair@upi', amount: 2400, note: 'Split for the trip',
    createdAt: iso(9000), status: 'successful',
    risk: { score: 12, level: 'low', factors: [
      { code: 'established', label: 'Established recipient', points: -18, detail: 'You have paid this recipient 14 times before.' }],
      summary: 'This looks like a normal payment for you.', recommendation: 'Go ahead.' },
    audit: [ev(9000, 'Payment initiated', 'user'), ev(9000, 'Risk score = 12 (low)', 'risk_engine'), ev(8999, 'Payment completed', 'adapter')],
  },
];

export const SEED_USER = {
  name: 'Himank',
  fullName: 'Himank Sethi',
  upiId: 'himank@guardian',
  phone: '+91 98765 43210',
  balance: 84_320,
  averagePayment: 2400,
};
