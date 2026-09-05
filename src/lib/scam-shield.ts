import type { ScamAnalysis, ScamSignal } from './types';

/** Purely defensive text analysis. Scam Shield only ever reads a message the
 *  user chose to check and tells them what manipulation patterns it contains.
 *  It never generates persuasive text. */

const LEXICON: Record<ScamSignal['category'], { label: string; terms: string[] }> = {
  urgency: {
    label: 'Time pressure',
    terms: ['urgent', 'urgently', 'immediately', 'right now', 'act now', 'hurry',
      'quickly', 'asap', 'emergency', 'last chance', 'expires', 'within 10 minutes',
      'before it is too late', 'limited time', 'jaldi'],
  },
  secrecy: {
    label: 'Secrecy',
    terms: ["don't tell", 'do not tell', 'dont tell', 'keep this between us',
      'nobody should know', 'no one should know', 'do not call', "don't call",
      'dont call', 'secret', 'confidential', 'delete this message', 'without telling'],
  },
  emotional: {
    label: 'Emotional pressure',
    terms: ['trust me', 'i am in trouble', 'help me', 'accident', 'hospital',
      'stuck', 'please please', 'i will explain later', 'ill explain later',
      'disappointed', 'if you love me', 'begging', 'desperate'],
  },
  credential: {
    label: 'Credential request',
    terms: ['otp', 'one time password', 'pin', 'upi pin', 'password', 'cvv',
      'card number', 'share the code', 'send the code', 'verification code',
      'aadhaar number', 'net banking login'],
  },
  context: {
    label: 'Suspicious payment context',
    terms: ['account will be blocked', 'kyc expired', 'kyc update', 'refund pending',
      'lottery', 'you have won', 'prize', 'processing fee', 'unblock your account',
      'electricity will be disconnected', 'customer care', 'remote access',
      'anydesk', 'teamviewer', 'screen share', 'scan to receive', 'cashback offer'],
  },
};

const WEIGHTS: Record<ScamSignal['category'], number> = {
  urgency: 22, secrecy: 24, emotional: 16, credential: 28, context: 20,
};

function levelFor(hits: number): ScamSignal['level'] {
  if (hits === 0) return 'none';
  if (hits === 1) return 'medium';
  return 'high';
}

export function analyseMessage(raw: string): ScamAnalysis {
  const text = (raw || '').toLowerCase();
  const signals: ScamSignal[] = [];
  const flagged: string[] = [];
  let score = 0;

  (Object.keys(LEXICON) as ScamSignal['category'][]).forEach((cat) => {
    const matches = LEXICON[cat].terms.filter((t) => text.includes(t));
    matches.forEach((m) => flagged.push(m));
    const level = levelFor(matches.length);
    if (level !== 'none') {
      // First match carries full weight, additional matches add less.
      score += WEIGHTS[cat] * (1 + Math.min(matches.length - 1, 2) * 0.35);
    }
    signals.push({ category: cat, label: LEXICON[cat].label, level, matches });
  });

  // ALL-CAPS shouting is a weak signal on its own but compounds with others.
  const letters = (raw || '').replace(/[^A-Za-z]/g, '');
  const caps = letters.length > 8 &&
    (raw.replace(/[^A-Z]/g, '').length / letters.length) > 0.55;
  if (caps && score > 0) score += 8;

  score = Math.max(0, Math.min(100, Math.round(score)));

  const high = signals.filter((s) => s.level === 'high').length;
  const active = signals.filter((s) => s.level !== 'none').length;

  let verdict: string;
  if (score === 0) verdict = 'No manipulation patterns found in this message.';
  else if (score < 30) verdict = 'One mild pattern found. Probably fine, but read it again.';
  else if (score < 60) verdict = `${active} manipulation patterns found. Verify who sent this.`;
  else verdict = `Multiple social-engineering indicators detected across ${active} categories${high ? `, ${high} of them strong` : ''}. Treat this message as untrusted.`;

  return { score, signals, verdict, flaggedTerms: Array.from(new Set(flagged)) };
}

/** Returns the message split into segments so the UI can highlight matches. */
export function highlightSegments(raw: string, terms: string[]) {
  if (!raw || terms.length === 0) return [{ text: raw, flagged: false }];
  const sorted = [...terms].sort((a, b) => b.length - a.length);
  const esc = sorted.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`(${esc.join('|')})`, 'gi');
  return raw.split(re).filter(Boolean).map((part) => ({
    text: part,
    flagged: sorted.some((t) => t.toLowerCase() === part.toLowerCase()),
  }));
}
