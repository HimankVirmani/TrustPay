export type RiskLevel = 'low' | 'medium' | 'high';
export type RecipientState = 'trusted' | 'known' | 'new' | 'suspicious' | 'reported';

export interface Recipient {
  id: string;
  name: string;
  phone: string;
  upiId: string;
  /** Synthetic reputation — generated demo data, not a real credit signal. */
  accountAgeDays: number;
  successfulTxns: number;
  reportCount: number;
  trustScore: number;      // 0-100, higher is safer
  state: RecipientState;
  paymentsFromUser: number;
  lastPaidAt?: string;
  recentSuspiciousActivity: boolean;
  avatarTone: string;
}

export interface RiskFactor {
  code: string;
  label: string;
  points: number;          // negative points reduce risk
  detail: string;
}

export interface RiskAssessment {
  score: number;           // 0-100
  level: RiskLevel;
  factors: RiskFactor[];
  summary: string;
  recommendation: string;
  modelScore?: number;     // ML probability * 100, when available
}

export type PolicyDecision = 'allow' | 'verify' | 'guardian_required' | 'block';

export interface PolicyResult {
  decision: PolicyDecision;
  reasons: string[];
  limitBreached: boolean;
  requiredGuardianId?: string;
}

export type TxnStatus =
  | 'successful' | 'protected' | 'flagged' | 'blocked'
  | 'failed' | 'pending_guardian' | 'recovery' | 'refunded';

export type PaymentRail = 'upi' | 'qr' | 'bank' | 'recharge' | 'bill';

export interface Transaction {
  id: string;
  rail: PaymentRail;
  recipientId?: string;
  recipientName: string;
  recipientHandle: string;
  amount: number;
  note?: string;
  createdAt: string;
  status: TxnStatus;
  risk?: RiskAssessment;
  policy?: PolicyResult;
  guardianId?: string;
  guardianOutcome?: 'approved' | 'rejected' | 'pending';
  audit: AuditEvent[];
  fraudReportId?: string;
  recoveryCaseId?: string;
  failureReason?: string;
  direction?: 'debit' | 'credit';
  purposeId?: string;
  sourceAccountId?: string;
}

export interface AuditEvent {
  at: string;
  event: string;
  detail?: string;
  actor: 'user' | 'system' | 'risk_engine' | 'policy_engine' | 'guardian' | 'adapter' | 'ai';
}

export interface GuardianContact {
  id: string;
  name: string;
  relation: string;
  phone: string;
  approvesAboveAmount?: number;
  approvesHighRisk: boolean;
  approvesNewRecipients: boolean;
  approvesTravelPayments: boolean;
  avatarTone: string;
}

export interface ApprovalRequest {
  id: string;
  transactionId: string;
  guardianId: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  decidedAt?: string;
}

export interface ScamSignal {
  category: 'urgency' | 'secrecy' | 'emotional' | 'credential' | 'context';
  label: string;
  level: 'none' | 'low' | 'medium' | 'high';
  matches: string[];
}

export interface ScamAnalysis {
  score: number;           // 0-100
  signals: ScamSignal[];
  verdict: string;
  flaggedTerms: string[];
}

export interface FraudReport {
  id: string;
  transactionId: string;
  category: string;
  description: string;
  evidenceName?: string;
  createdAt: string;
  confidence: number;
  findings: string[];
  status: 'investigating' | 'complete';
}

export interface RecoveryCase {
  id: string;
  transactionId: string;
  reportId: string;
  amount: number;
  eligibility: 'high' | 'medium' | 'low' | 'ineligible';
  eligibilityReasons: { ok: boolean; text: string }[];
  status: 'assessing' | 'requested' | 'recovered' | 'manual_review' | 'withdrawn';
  attempts: number;
  recoveredAmount: number;
  timeline: AuditEvent[];
}

export type BankAccount = {
  id: string;
  bank: string;
  last4: string;
  type: 'savings' | 'current';
  balance: number;
  primary?: boolean;
  tone?: 'brass' | 'neutral';
};

export type AppNotification = {
  id: string;
  kind: 'approval' | 'blocked' | 'recovery' | 'protected' | 'info';
  title: string;
  body: string;
  at: string;
  href?: string;
  read?: boolean;
};
