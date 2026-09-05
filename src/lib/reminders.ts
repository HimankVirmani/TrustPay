export type Reminder = {
  id: string;
  label: string;
  biller: string;
  amount: number;
  dueOn: string;      // ISO date
  category: 'electricity' | 'mobile' | 'gas' | 'broadband' | 'rent' | 'card';
  paid?: boolean;
};

/** A pending payment parked while a Guardian decides. Keeping the whole payload
 *  means the payment resumes with the exact amount and recipient that were
 *  approved — nothing is re-entered, so nothing can quietly change. */
export type PendingPayment = {
  txnId: string;
  amount: number;
  rail: string;
  recipientId?: string;
  recipientName: string;
  recipientHandle: string;
  note?: string;
  purposeId?: string;
  sourceAccountId?: string;
  guardianId: string;
  approvalToken?: string;
  decided?: 'approved' | 'rejected';
};

const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

export const SEED_REMINDERS: Reminder[] = [
  { id: 'rm_elec', label: 'Electricity bill', biller: 'TNEB', amount: 1_840,
    dueOn: day(2), category: 'electricity' },
  { id: 'rm_mobile', label: 'Mobile recharge', biller: 'Airtel prepaid', amount: 299,
    dueOn: day(5), category: 'mobile' },
  { id: 'rm_broadband', label: 'Broadband', biller: 'ACT Fibernet', amount: 1_099,
    dueOn: day(9), category: 'broadband' },
  { id: 'rm_gas', label: 'Gas cylinder', biller: 'Indane', amount: 905,
    dueOn: day(14), category: 'gas' },
  { id: 'rm_rent', label: 'Rent', biller: 'S. Venkatesan', amount: 18_000,
    dueOn: day(21), category: 'rent' },
];

/** Days remaining, negative when overdue. */
export function daysUntil(iso: string): number {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.round((new Date(iso).getTime() - now.getTime()) / 864e5);
}

export function dueLabel(iso: string): { text: string; tone: 'alert' | 'watch' | 'calm' } {
  const d = daysUntil(iso);
  if (d < 0) return { text: `Overdue by ${Math.abs(d)}d`, tone: 'alert' };
  if (d === 0) return { text: 'Due today', tone: 'alert' };
  if (d === 1) return { text: 'Due tomorrow', tone: 'watch' };
  if (d <= 5) return { text: `Due in ${d} days`, tone: 'watch' };
  return { text: `Due in ${d} days`, tone: 'calm' };
}
