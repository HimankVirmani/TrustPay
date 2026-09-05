export const inr = (n: number, opts: { compact?: boolean } = {}) => {
  if (opts.compact && n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (opts.compact && n >= 1000) return `₹${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

export const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

export const dayOf = (iso: string) => {
  const d = new Date(iso); const now = new Date();
  const diff = Math.floor((now.setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export const stamp = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

export const initials = (name: string) =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

export const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export const maskPhone = (p: string) => p.replace(/(\+91\s?\d{2})\d{5}(\d{3})/, '$1XXXXX$2');

/**
 * Money out reads as -, money in as +. Stopped and failed payments carry no
 * sign at all: nothing moved, so a minus would misrepresent the balance.
 */
export function signedAmount(t: {
  amount: number;
  direction?: 'debit' | 'credit';
  status?: string;
}): string {
  const moved = t.status === 'successful' || t.status === 'refunded' || t.status === 'recovery';
  if (!moved) return inr(t.amount);
  return t.direction === 'credit' ? `+${inr(t.amount)}` : `-${inr(t.amount)}`;
}
