import { useId } from "react";

interface Props {
  values: (number | null)[];
  domain?: [number, number]; // sinon auto (min/max des points présents)
  height?: number;
  accent?: boolean; // violet vs neutre
}

// Courbe douce + aire, gère les trous (points manquants ignorés).
export function Sparkline({ values, domain, height = 56, accent = true }: Props) {
  const id = useId();
  const w = 240;
  const h = height;
  const pad = 4;
  const present = values.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v !== null);

  if (present.length === 0) {
    return <div className="spark-empty">Pas encore de données</div>;
  }

  const nums = present.map((p) => p.v);
  let [lo, hi] = domain ?? [Math.min(...nums), Math.max(...nums)];
  if (lo === hi) { lo -= 1; hi += 1; }
  const n = values.length;
  const x = (i: number) => pad + (i / Math.max(n - 1, 1)) * (w - pad * 2);
  const y = (v: number) => pad + (1 - (v - lo) / (hi - lo)) * (h - pad * 2);

  const pts = present.map((p) => `${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`);
  const line = `M ${pts.join(" L ")}`;
  const area = `${line} L ${x(present[present.length - 1].i).toFixed(1)},${h - pad} L ${x(present[0].i).toFixed(1)},${h - pad} Z`;
  const stroke = accent ? "var(--accent-purple)" : "var(--text-secondary)";

  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" width="100%" height={h}>
      <defs>
        <linearGradient id={`sg-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${id})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {present.length > 0 && (
        <circle
          cx={x(present[present.length - 1].i)}
          cy={y(present[present.length - 1].v)}
          r="3"
          fill={stroke}
        />
      )}
    </svg>
  );
}
