import type { BankAccount } from './types';

/** Demo funding sources. Balances sum to the user's total test balance. */
export const SEED_ACCOUNTS: BankAccount[] = [
  { id: 'a_hdfc', bank: 'HDFC Bank', last4: '4321', type: 'savings',
    balance: 68_300, primary: true, tone: 'brass' },
  { id: 'a_sbi', bank: 'State Bank of India', last4: '9981', type: 'savings',
    balance: 12_450, tone: 'neutral' },
  { id: 'a_icici', bank: 'ICICI Bank', last4: '7702', type: 'current',
    balance: 3_570, tone: 'neutral' },
];

/**
 * Payment purposes. Some of these are not neutral labels: in India, "job
 * registration", "prize claim", "refund processing", "KYC update" and
 * "investment scheme" are the standard cover stories for advance-fee fraud.
 * A user who selects one is telling us something useful, so `riskySignal`
 * feeds the risk engine rather than sitting in the receipt as decoration.
 */
export const PURPOSES: { id: string; label: string; riskySignal?: string }[] = [
  { id: 'p_none', label: 'Not specified' },
  { id: 'p_family', label: 'Family or friends' },
  { id: 'p_rent', label: 'Rent' },
  { id: 'p_bills', label: 'Bills and utilities' },
  { id: 'p_shopping', label: 'Shopping' },
  { id: 'p_loan', label: 'Loan repayment' },
  { id: 'p_job', label: 'Job registration',
    riskySignal: 'Legitimate employers do not charge a registration fee.' },
  { id: 'p_kyc', label: 'KYC update',
    riskySignal: 'Banks never ask you to pay to complete KYC.' },
  { id: 'p_refund', label: 'Refund processing',
    riskySignal: 'A genuine refund never requires you to send money first.' },
  { id: 'p_prize', label: 'Prize or lottery claim',
    riskySignal: 'Real winnings are never released against an upfront payment.' },
  { id: 'p_invest', label: 'Investment opportunity',
    riskySignal: 'Guaranteed-return schemes collected over UPI are a common fraud.' },
  { id: 'p_other', label: 'Other' },
];

export const purposeById = (id?: string) => PURPOSES.find((p) => p.id === id);
