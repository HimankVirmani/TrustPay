'use client';
import { useState } from 'react';

/** Synthetic cluster view. These are generated demo accounts linked by shared
 *  signals in the seed data -- device fingerprint, funding source, timing. It
 *  makes no claim about any real person or account. */
const NODES = [
  { id: 'A', label: 'refund.help@upi', x: 50, y: 42, reports: 7, seed: true },
  { id: 'B', label: 'quickcash.pay@upi', x: 22, y: 20, reports: 4 },
  { id: 'C', label: 'kyc.update@upi', x: 80, y: 22, reports: 3 },
  { id: 'D', label: 'rahul@upi', x: 18, y: 72, reports: 2 },
  { id: 'E', label: 'winner.claim@upi', x: 78, y: 74, reports: 5 },
  { id: 'F', label: 'support.desk@upi', x: 50, y: 88, reports: 1 },
];
const EDGES = [
  { a: 'A', b: 'B', why: 'Same device fingerprint' },
  { a: 'A', b: 'C', why: 'Funds forwarded within 4 minutes' },
  { a: 'A', b: 'D', why: 'Shared beneficiary account' },
  { a: 'B', b: 'C', why: 'Registered 40 minutes apart' },
  { a: 'A', b: 'E', why: 'Same message template' },
  { a: 'E', b: 'F', why: 'Funds forwarded within 9 minutes' },
];

export function FraudNetwork() {
  const [sel, setSel] = useState<string | null>('A');
  const node = NODES.find((n) => n.id === sel);
  const links = EDGES.filter((e) => e.a === sel || e.b === sel);

  return (
    <div>
      <svg viewBox="0 0 100 100" className="h-[240px] w-full" role="img"
        aria-label="Network of synthetic accounts linked by shared risk signals">
        {EDGES.map((e, i) => {
          const A = NODES.find((n) => n.id === e.a)!, B = NODES.find((n) => n.id === e.b)!;
          const on = sel === e.a || sel === e.b;
          return <line key={i} x1={A.x} y1={A.y} x2={B.x} y2={B.y}
            stroke={on ? '#B23A2F' : '#12212F'} strokeOpacity={on ? 0.5 : 0.14}
            strokeWidth={on ? 0.7 : 0.4} />;
        })}
        {NODES.map((n) => {
          const on = sel === n.id;
          const r = 3.4 + Math.min(n.reports, 7) * 0.55;
          return (
            <g key={n.id} onClick={() => setSel(n.id)} className="cursor-pointer">
              {on && <circle cx={n.x} cy={n.y} r={r + 2.6} fill="#B23A2F" opacity={0.14} />}
              <circle cx={n.x} cy={n.y} r={r}
                fill={n.reports >= 4 ? '#B23A2F' : n.reports >= 2 ? '#D2830E' : '#7A8CA0'} />
              <text x={n.x} y={n.y + r + 3.6} textAnchor="middle"
                fontSize="2.7" fill="#3A526A" fontWeight="600">{n.label}</text>
            </g>
          );
        })}
      </svg>

      {node && (
        <div className="mt-1 rounded-xl bg-paper-sink p-3.5">
          <div className="flex items-baseline justify-between">
            <p className="text-[13px] font-extrabold text-ink">{node.label}</p>
            <p className="text-[12px] font-bold text-alert">{node.reports} reports</p>
          </div>
          <ul className="mt-2 space-y-1">
            {links.map((l, i) => (
              <li key={i} className="text-[11px] text-ink-mute">
                ↔ {l.a === sel ? NODES.find((n) => n.id === l.b)!.label : NODES.find((n) => n.id === l.a)!.label}
                {' · '}{l.why}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] font-bold text-alert">
            Potential coordinated risk cluster — {links.length} shared signal(s)
          </p>
        </div>
      )}
      <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">
        Entirely synthetic accounts generated for this prototype. Tap a node to see its links. No
        claim is made about any real person or account.
      </p>
    </div>
  );
}
