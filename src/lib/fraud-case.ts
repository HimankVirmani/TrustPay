import type { Transaction, Recipient } from './types';

export type ComplaintAnswers = {
  category: string;
  howContacted: string;
  whatHappened: string;
  recipientBlockedMe: boolean;
  sharedCredentials: boolean;
  noticedAt: string;
};

export type ComplaintStatus =
  | 'submitted'
  | 'acknowledged'
  | 'under_review'
  | 'funds_recovered'
  | 'closed_no_recovery';

export type Complaint = {
  id: string;
  transactionId: string;
  createdAt: string;
  answers: ComplaintAnswers;
  letter: string;
  bank: string;
  status: ComplaintStatus;
  reversal?: ReversalResult;
  timeline: { at: string; event: string; detail?: string }[];
};

export const FRAUD_CATEGORIES = [
  'Fake job or registration fee',
  'Fake refund or cashback',
  'Impersonation (bank, police, delivery)',
  'Fake seller or non-delivery of goods',
  'Investment or trading scheme',
  'Loan or advance-fee fraud',
  'Someone I know was impersonated',
  'Other',
];

export const CONTACT_CHANNELS = [
  'WhatsApp', 'Phone call', 'SMS', 'Instagram or Facebook',
  'Telegram', 'A website or ad', 'In person', 'Other',
];

const inr = (n: number) => `Rs. ${n.toLocaleString('en-IN')}`;

/* -------------------------------------------------------------------------
 * Simulated auto-reversal
 * ---------------------------------------------------------------------- */

export type ReversalResult = {
  eligible: boolean;
  outcome: 'reversed' | 'lien_marked' | 'not_eligible';
  amount: number;
  checks: { ok: boolean; text: string }[];
  explanation: string;
};

/** Funds are only recoverable while they are still sitting in the beneficiary
 *  account. Past this the money has almost always been moved on through a mule
 *  chain, which is exactly why reporting speed matters so much. */
export const HOLD_WINDOW_HOURS = 24;

/**
 * Decides whether a reported payment qualifies for the simulated instant
 * reversal.
 *
 * IMPORTANT — this is a simulation of a *bank-side* dispute outcome, not a
 * real UPI feature. A settled UPI transfer is not reversible on the payer's
 * say-so; what actually happens is that the beneficiary bank marks a lien if
 * the funds are still present, and a human dispute process follows over days.
 *
 * The preconditions below exist because "file a report, get your money back"
 * with no conditions is trivially abusable: anyone could pay for goods,
 * report fraud, and keep both. Reversal therefore requires corroboration that
 * does not come from the reporter alone — independent reports against the
 * recipient, or the recipient cutting off contact — plus funds still on hold.
 */
export function evaluateReversal(
  txn: Transaction,
  recipient: Recipient | undefined,
  answers: ComplaintAnswers,
  now = new Date(),
): ReversalResult {
  const hoursSince = (now.getTime() - new Date(txn.createdAt).getTime()) / 36e5;
  const independentReports = recipient?.reportCount ?? 0;

  const checks = [
    {
      ok: hoursSince <= HOLD_WINDOW_HOURS,
      text: hoursSince <= HOLD_WINDOW_HOURS
        ? `Reported within ${HOLD_WINDOW_HOURS} hours — funds still on hold`
        : `Reported after ${HOLD_WINDOW_HOURS} hours — funds likely moved on`,
    },
    {
      ok: answers.recipientBlockedMe || independentReports >= 2,
      text: answers.recipientBlockedMe
        ? 'Recipient blocked you after receiving the payment'
        : independentReports >= 2
          ? `${independentReports} independent reports against this account`
          : 'No corroborating signal against the recipient',
    },
    {
      ok: !answers.sharedCredentials,
      text: answers.sharedCredentials
        ? 'You shared a PIN or OTP — this needs manual review'
        : 'No credentials were shared',
    },
    {
      ok: txn.status === 'successful',
      text: txn.status === 'successful'
        ? 'Payment completed and is disputable'
        : 'Payment never completed, so nothing to reverse',
    },
  ];

  const eligible = checks.every((c) => c.ok);

  if (eligible) {
    return {
      eligible: true,
      outcome: 'reversed',
      amount: txn.amount,
      checks,
      explanation:
        `Simulated outcome: the beneficiary bank found ${inr(txn.amount)} still sitting in the ` +
        `recipient's account, marked a lien on it and returned it to your source account. ` +
        `In reality this step needs the beneficiary bank to act and typically takes days, ` +
        `not seconds — a settled UPI transfer cannot be reversed by the payer alone.`,
    };
  }

  // Partial credit: enough corroboration to freeze, not enough to return.
  const strong = checks[1].ok && checks[3].ok;
  if (strong) {
    return {
      eligible: false,
      outcome: 'lien_marked',
      amount: txn.amount,
      checks,
      explanation:
        `Simulated outcome: there is enough corroboration to flag the account, but not to ` +
        `return the funds automatically. The case moves to manual review with your ` +
        `complaint and evidence attached.`,
    };
  }

  return {
    eligible: false,
    outcome: 'not_eligible',
    amount: txn.amount,
    checks,
    explanation:
      `Simulated outcome: this case does not meet the bar for an automatic return, so it ` +
      `goes to a human reviewer. That is deliberate — an automatic refund on request alone ` +
      `would let anyone pay for something, report it, and keep both.`,
  };
}

/* -------------------------------------------------------------------------
 * Complaint letter
 * ---------------------------------------------------------------------- */

/**
 * Builds a formal complaint addressed to the payer's bank. The wording follows
 * the structure Indian banks expect for an unauthorised/fraudulent transaction
 * dispute: identification of the transaction, the sequence of events, what the
 * customer is asking for, and the statutory reference.
 */
export function draftComplaint(
  txn: Transaction,
  answers: ComplaintAnswers,
  opts: { customerName: string; bank: string; accountLast4?: string; reference: string },
): string {
  const date = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  const txnDate = new Date(txn.createdAt).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const lines = [
    `Date: ${date}`,
    ``,
    `To,`,
    `The Branch Manager`,
    `${opts.bank}`,
    ``,
    `Subject: Complaint regarding a fraudulent UPI transaction of ${inr(txn.amount)} ` +
      `and request for reversal — Reference ${opts.reference}`,
    ``,
    `Respected Sir/Madam,`,
    ``,
    `I, ${opts.customerName}, hold an account with your bank` +
      (opts.accountLast4 ? ` bearing the last four digits ${opts.accountLast4}` : '') +
      `. I am writing to report a fraudulent transaction carried out from my account and ` +
      `to request your urgent assistance in recovering the amount.`,
    ``,
    `Transaction details`,
    ``,
    `  Amount              : ${inr(txn.amount)}`,
    `  Date and time       : ${txnDate}`,
    `  Beneficiary name    : ${txn.recipientName}`,
    `  Beneficiary UPI ID  : ${txn.recipientHandle}`,
    `  Payment method      : ${txn.rail.toUpperCase()}`,
    `  App reference       : ${opts.reference}`,
    ``,
    `Nature of the fraud`,
    ``,
    `  Category            : ${answers.category}`,
    `  First contacted via : ${answers.howContacted}`,
    `  Fraud noticed on    : ${answers.noticedAt}`,
    ``,
    `Sequence of events`,
    ``,
    wrap(answers.whatHappened, 78, '  '),
    ``,
    ...(answers.recipientBlockedMe
      ? [`Following the transfer, the beneficiary blocked all further contact with me. ` +
         `I submit that this conduct is consistent with a deliberate act of deception ` +
         `rather than a commercial dispute.`, ``]
      : []),
    ...(answers.sharedCredentials
      ? [`I wish to state candidly that I disclosed a PIN or OTP during this incident. ` +
         `I am reporting this immediately so that my account may be secured without delay.`, ``]
      : [`I confirm that I did not disclose my UPI PIN, OTP, card details or net banking ` +
         `credentials to any person at any stage.`, ``]),
    `Request`,
    ``,
    `I request that you kindly:`,
    ``,
    `  1. Register this complaint and provide me a written acknowledgement with a ` +
      `complaint reference number.`,
    `  2. Take up the matter with the beneficiary bank immediately and request that a ` +
      `lien be marked on the beneficiary account so that the funds are not withdrawn ` +
      `or transferred further.`,
    `  3. Initiate the chargeback or reversal process for the above transaction.`,
    `  4. Keep me informed of the progress of this complaint in writing.`,
    ``,
    `I am aware that under the Reserve Bank of India's circular on Customer Protection ` +
    `(DBR.No.Leg.BC.78/09.07.005/2017-18) dated 6 July 2017, a customer's liability in ` +
    `cases of unauthorised electronic transactions is limited where the incident is ` +
    `reported promptly. I am therefore reporting this matter without delay and request ` +
    `that it be treated as time-sensitive.`,
    ``,
    `I have also lodged, or will lodge, a report on the National Cyber Crime Reporting ` +
    `Portal (cybercrime.gov.in) and with the national cyber crime helpline 1930. I will ` +
    `share the acknowledgement number with you as soon as it is issued.`,
    ``,
    `Should this complaint not be resolved within thirty days, I reserve my right to ` +
    `approach the RBI Ombudsman under the Reserve Bank — Integrated Ombudsman Scheme, 2021.`,
    ``,
    `I request your prompt intervention in this matter.`,
    ``,
    `Yours faithfully,`,
    ``,
    ``,
    `${opts.customerName}`,
    ``,
    `Enclosures: transaction receipt, screenshots of communication with the beneficiary.`,
  ];

  return lines.join('\n');
}

/** Simple greedy wrap so the letter reads correctly in a monospace block. */
function wrap(text: string, width: number, indent = ''): string {
  const words = (text || '').trim().split(/\s+/);
  const out: string[] = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > width) { out.push(indent + line.trim()); line = w; }
    else line += ' ' + w;
  }
  if (line.trim()) out.push(indent + line.trim());
  return out.join('\n');
}

export const STATUS_COPY: Record<ComplaintStatus, { label: string; tone: string }> = {
  submitted: { label: 'Submitted', tone: 'bg-ink/8 text-ink-mute' },
  acknowledged: { label: 'Acknowledged by bank', tone: 'bg-brass-wash text-brass' },
  under_review: { label: 'Under review', tone: 'bg-watch-wash text-watch' },
  funds_recovered: { label: 'Funds recovered', tone: 'bg-calm-wash text-calm' },
  closed_no_recovery: { label: 'Closed — not recovered', tone: 'bg-alert-wash text-alert' },
};
